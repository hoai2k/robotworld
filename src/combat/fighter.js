// Fighter: movement physics, combat state machine, resources, hit reactions.
// Driven each frame by an intent (from human input or AI).
import * as THREE from 'three';
import { clamp, clamp01, lerp, angleDamp, angleDiff, TAU, rand } from '../core/utils.js';
import { buildMech } from '../mechs/factory.js';
import { Animator } from '../mechs/animator.js';
import { SPECIALS, ULTS } from './specials.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _palmTmp = new THREE.Vector3();
const _palmTmp2 = new THREE.Vector3();
const _carryTmp = new THREE.Vector3();
const _carryOff = new THREE.Vector3();
const _white = new THREE.Color(0xf4faff);
const GRAVITY = 34;
const WALK_MULT = 1.2;   // global ground-speed boost over roster stats
const JUMP_MULT = 1.18;  // global jump boost
const CHARGE_DASH_MAX = 3; // seconds of crouch that fully winds a charged dash

export const PLAYER_COLORS = [0x38e8ff, 0xff4d5e, 0x62ff9a, 0xffb43c];

export class Fighter {
  constructor(world, def, { pos = new THREE.Vector3(), yaw = 0, playerIndex = 0, isAI = false, mech = null } = {}) {
    this.world = world;
    this.def = def;
    this.playerIndex = playerIndex;
    this.isAI = isAI;

    // mech may be prebuilt (async GLB pipeline); otherwise procedural
    this.mech = mech || buildMech(def);
    this.group = this.mech.group;
    this.group.position.copy(pos);
    this.animator = this.mech.premadeAnimator || new Animator(this.mech);
    world.scene.add(this.group);

    // physique
    const s = def.body.scale;
    this.scale = s;
    this.radius = 1.15 * s;
    this.height = (this.mech.dims.hipHeight + this.mech.dims.torsoH + this.mech.dims.headSize * 2) * 1.02;
    this.hitRadius = 1.7 * s;

    // ducking: hold to crouch — smaller/lower hitbox, slower movement.
    // duckDepth 1 = a full frog squat (FROGGER), default is a half-crouch.
    this.baseHeight = this.height;
    this.baseHitRadius = this.hitRadius;
    this.duckDepth = def.stats.duck ?? 0.55;
    this.duckT = 0;
    this.ducking = false;

    // kinematics
    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.yaw = yaw;
    this.targetYaw = yaw;
    this.grounded = true;

    // resources
    this.maxHp = def.stats.hp;
    this.hp = this.maxHp;
    this.ult = 0;              // 0..1
    this.specialCd = 0;
    this.rangedCd = 0;
    this.dashCd = 0;
    this.iframes = 0;

    // every ranged weapon runs on ammo, refilled at crates
    if (def.moves.ranged.ammo) {
      this.ammoMax = def.moves.ranged.ammo;
      this.ammo = this.ammoMax;
    }

    // hover jets: double-tap jump and HOLD to fly. Lighter mechs get more
    // fuel and stronger jets — the little ones really take to the air.
    const lightness = 1 - def.stats.weight;
    this.hoverFuelMax = 1.5 + lightness * 1.9;   // seconds of thrust
    this.hoverFuel = this.hoverFuelMax;
    this.hoverRise = 7 + lightness * 8;          // max climb speed
    this.hovering = false;
    this.jetT = 0;

    // state machine
    this.state = 'normal';     // normal|attack|channel|special|ult|dash|hitstun|launched|knockdown|getup|dead|intro|victory|frozen
    this.stateT = 0;
    this.comboIdx = 0;
    this.comboWindow = 0;
    this.queuedLight = false;
    this.blocking = false;
    this.firing = false;
    this.dashT = 0;

    // status effects: {burn:{dps,t}, slow:{f,t}, buff:{spd,dmg,t}, guard:{f,t}, cloak:{t}}
    this.status = {};

    this.intent = {
      moveX: 0, moveZ: 0, jump: false, jumpHeld: false, light: false, heavy: false,
      ranged: false, special: false, specialHeld: false, ult: false, block: false, dash: false,
      taunt: false, strafe: false, duck: false, aimYaw: undefined,
    };
    this.plunging = false;   // aerial ground-smash riding down to impact
    this._plungeVy = 0;
    this.alive = true;
    this.wins = 0;
    this.lastAttacker = null;
    this.controlsLocked = false; // during intro/outro
  }

  center(out = _v2) {
    return out.set(this.pos.x, this.pos.y + this.height * 0.55, this.pos.z).clone();
  }

  // world-space midpoint of both palms — where hoisted cargo rests. Falls
  // back to an overhead point for rigs without hand joints.
  palmsMid(out) {
    const J = this.mech.joints;
    if (!J.handL || !J.handR) {
      return out.set(this.pos.x, this.pos.y + this.height + 0.4 * this.scale, this.pos.z);
    }
    J.handL.getWorldPosition(out);
    return out.add(J.handR.getWorldPosition(_palmTmp)).multiplyScalar(0.5);
  }

  // where a body-slammed victim's ORIGIN goes so the torso lies IN the
  // palms: subtract the victim's feet->torso offset through their CURRENT
  // rotation, so the center rides the hands exactly at any roll angle.
  carryPoint(prey, out) {
    this.palmsMid(out);
    _carryOff.set(0, prey.height * 0.5, 0).applyEuler(prey.group.rotation);
    out.sub(_carryOff);
    out.y += 0.24 * this.scale; // palms cradle UNDER the torso
    return out;
  }

  // IK-lite palm press: pull the hands in until they touch the carried
  // body instead of hovering at the rig's natural width. Runs AFTER the
  // animator pose each frame (direct joint writes would otherwise be
  // clobbered); the inward roll direction is re-probed every frame since
  // it flips as the arms sweep from reach to overhead.
  clampPalmsTo(prey) {
    const J = this.mech.joints;
    if (!(J.handL && J.handR && J.shoulderL && J.shoulderR)) return;
    const want = Math.max(0.9, prey.hitRadius * 1.05);
    const meas = () =>
      J.handL.getWorldPosition(_palmTmp).distanceTo(J.handR.getWorldPosition(_palmTmp2));
    const d0 = meas();
    const inward = (sh) => {
      sh.rotation.z += 0.06;
      const d = meas();
      sh.rotation.z -= 0.06;
      return d < d0 ? 1 : -1;
    };
    const dL = inward(J.shoulderL), dR = inward(J.shoulderR);
    let fix = this._palmFix || 0;
    J.shoulderL.rotation.z += dL * fix;
    J.shoulderR.rotation.z += dR * fix;
    const sep = meas();
    const arm = (this.mech.dims.upperArmLen || 1.5) + (this.mech.dims.foreArmLen || 1.5);
    const step = clamp((sep - want) / (2 * arm), -0.12, 0.12); // servo rate
    const nfix = clamp(fix + step, 0, 1.0);
    J.shoulderL.rotation.z += dL * (nfix - fix);
    J.shoulderR.rotation.z += dR * (nfix - fix);
    this._palmFix = nfix;
  }

  // nearest living enemy (through the arena seam when wrapping)
  nearestEnemy() {
    let best = null, bestD = Infinity;
    const w = this.world;
    for (const f of w.fighters) {
      if (f === this || !f.alive) continue;
      const dx = w.wrapDelta(f.pos.x - this.pos.x);
      const dz = w.wrapDelta(f.pos.z - this.pos.z);
      const d = dx * dx + dz * dz;
      if (d < bestD) { best = f; bestD = d; }
    }
    return best;
  }

  // yaw toward another fighter via the shortest (possibly wrapped) path
  yawTo(e) {
    return Math.atan2(
      this.world.wrapDelta(e.pos.x - this.pos.x),
      this.world.wrapDelta(e.pos.z - this.pos.z)
    );
  }

  faceNearestEnemy(snap = false) {
    const e = this.nearestEnemy();
    if (!e) return;
    const yaw = this.yawTo(e);
    this.targetYaw = yaw;
    if (snap) this.yaw = yaw;
  }

  speedMult() {
    let m = 1;
    if (this.status.slow) m *= this.status.slow.f;
    if (this.status.buff) m *= this.status.buff.spd;
    if (this.status.cloak) m *= this.status.cloak.spd || 1.25;
    return m;
  }
  dmgMult() {
    let m = 1;
    if (this.status.buff) m *= this.status.buff.dmg;
    // NOVA: every attack surges while her halo burns at apex alignment —
    // a full-apex strike hits TWICE as hard as a dark-halo one
    if (this.def.id === 'nova') m *= 1 + 1.0 * (this.animator?.novaGlow || 0);
    return m;
  }

  // ================= state helpers =================
  setState(s, t = 0) {
    this.state = s;
    this.stateT = t;
  }

  lockFor(t) { this.setState('attack', t); }

  canAct() {
    return this.alive && !this.controlsLocked &&
      (this.state === 'normal' || (this.state === 'attack' && this.stateT <= 0));
  }

  // ================= actions =================
  doLight() {
    const mv = this.def.moves.light;
    // hold-to-charge haymaker (TITANUS/COLOSSUS): the wind-up pose HOLDS
    // while X stays down; the punch itself fires on release (updatePunchHold)
    if (this.def.punchHold) {
      this._punchIdx = this.comboIdx % 2; // alternate arms
      this._punchHold = 0.0001;
      this._punchFull = false;
      this.faceNearestEnemyIfClose(12);
      this.animator.play(this._punchIdx ? 'punchHold2' : 'punchHold1');
      this.setState('attack', 9);
      this.world.audio?.play('servo');
      return;
    }
    // per-mech combo clips (sword forms, spear forms, haymakers...) — the
    // shared punch trio is only the default
    const names = this.def.lightClips || ['light1', 'light2', 'light3'];
    const idx = this.comboIdx % 3;
    this.faceNearestEnemyIfClose(12);
    const dur = this.animator.play(names[idx], {
      onEvent: (type, arg) => this.onAttackEvent(type, arg, {
        dmg: mv.dmg[idx] * this.dmgMult(),
        knock: mv.knock[idx],
        range: mv.range * this.scale,
        launch: idx === 2 ? 10 : 0,
      }),
    });
    this.setState('attack', dur * 0.82);
    this.comboIdx++;
    this.comboWindow = dur + 0.35;
    this.world.audio?.play('servo');
  }

  doHeavy() {
    const mv = this.def.moves.heavy;
    if (!this.grounded && this.pos.y > 2.5) {
      // aerial ground smash: ride the swing all the way down and detonate
      // on landing — fall speed feeds the damage
      this.plunging = true;
      this.hovering = false;
      this.vel.y = Math.min(this.vel.y, -14);
      this.animator.play('heavy', { speed: 1.5 });
      this.setState('attack', 9); // held until impact (cleared on landing/hit)
      this.world.audio?.play('whooshBig');
      return;
    }
    this.faceNearestEnemyIfClose(14);
    // hold-to-charge heavy (AEGIS whirl, TITANUS/COLOSSUS raised pound):
    // the hold clip LOOPS while Y stays down, banking power; the strike and
    // the hit come on release (updateHeavyHold)
    if (this.def.heavyHold) {
      this._whirlHold = 0.0001;
      this._whirlFull = false;
      this.animator.play(this.def.heavyClip);
      this.setState('attack', 9);
      this.comboIdx = 0;
      return;
    }
    const dur = this.animator.play(this.def.heavyClip || 'heavy', {
      onEvent: (type, arg) => this.onAttackEvent(type, arg, {
        dmg: mv.dmg * this.dmgMult(),
        knock: mv.knock,
        range: mv.range * this.scale,
        launch: mv.launch,
        heavy: true,
        fx: this.def.heavyFx,
      }),
    });
    this.setState('attack', dur * 0.9);
    this.comboIdx = 0;
    // track the actual victim through the whole swing: torso twists and the
    // fists CONVERGE onto their body, so a landed pound visibly LANDS
    // instead of slamming down on both sides of a slim target
    const prey = this.nearestEnemy();
    if (prey) {
      const dx = this.world.wrapDelta(prey.pos.x - this.pos.x);
      const dz = this.world.wrapDelta(prey.pos.z - this.pos.z);
      if (Math.hypot(dx, dz) < mv.range * this.scale * 2 &&
          Math.abs(angleDiff(this.yaw, Math.atan2(dx, dz))) < 1.1) {
        this._strikeAim = { f: prey, t: dur * 0.95 };
        this._aimYaw = 0;
      }
    }
  }

  // post-pose strike tracking: torso yaw slides the palms along an arc
  // around our own root, so the lateral miss is corrected DIRECTLY — the
  // azimuth of the palms' midpoint vs the victim's azimuth is the exact
  // angle the torso must twist (rate-limited, capped at +-0.6 rad so the
  // pose never contorts). Fist separation then narrows via the palm clamp.
  aimStrikeAt(prey) {
    const J = this.mech.joints;
    const w = this.world;
    // steer ONLY during the strike descent — palms dropped below shoulder
    // height. Steering through the overhead windup (where the fists are
    // nowhere near the target line) twists the pose the wrong way and the
    // rate-limited servo can't recover before impact.
    let striking = true;
    if (J.handL && J.handR && J.shoulderL) {
      const hy = Math.min(J.handL.getWorldPosition(_palmTmp).y,
        J.handR.getWorldPosition(_palmTmp).y);
      striking = hy < J.shoulderL.getWorldPosition(_palmTmp).y + 0.1 * this.scale;
    }
    if (J.torso) {
      this.palmsMid(_palmTmp);
      const pmx = _palmTmp.x - this.pos.x, pmz = _palmTmp.z - this.pos.z;
      const vx = w.wrapDelta(prey.pos.x - this.pos.x);
      const vz = w.wrapDelta(prey.pos.z - this.pos.z);
      let fix = this._aimYaw || 0;
      const dAz = (pmx * pmx + pmz * pmz > 0.09)
        ? angleDiff(Math.atan2(pmx, pmz), Math.atan2(vx, vz)) : 99;
      if (striking && Math.abs(dAz) < 1.1) { // fists driving through the front arc
        fix = clamp(fix + clamp(dAz - fix, -0.2, 0.2), -0.6, 0.6);
      } else {
        fix *= 0.75; // windup: don't chase, unwind
      }
      J.torso.rotation.y += fix;
      this._aimYaw = fix;
    }
    if (striking) this.clampPalmsTo(prey);
    else this._palmFix = (this._palmFix || 0) * 0.8;
  }

  // Firing NEVER turns a human's mech — the shot goes wherever the mech is
  // already facing (movement owns the facing). Only the AI squares up on
  // its target, as its stand-in for aiming skill.
  faceAim() {
    if (this.isAI) this.faceNearestEnemyIfClose(60, true);
  }

  doRanged() {
    const mv = this.def.moves.ranged;
    if (this.rangedCd > 0) return;
    if (mv.type === 'fist' && this._fistOut) return; // fist still in flight
    if (this.ammoMax !== undefined && this.ammo <= 0) {
      this.world.audio?.play('uiBack'); // dry click — find an ammo crate
      this.rangedCd = 0.4;
      return;
    }
    this.uncloak();
    const isChannel = mv.type === 'gatling' || mv.type === 'flame' || mv.type === 'hose';
    this.faceAim();

    if (isChannel) {
      const cclip = this.def.channelClip || 'shootLoop';
      if (!this.animator.isPlaying(cclip)) this.animator.play(cclip);
      this.setState('channel', 0.1);
      this.firing = true;
      this.rangedCd = mv.cooldown;
      if (this.ammoMax !== undefined) this.ammo--;
      this.world.fireRanged(this, mv);
    } else {
      // twin-cannon mechs alternate sides shot to shot (mirrored animation)
      if (mv.type === 'mortar' && this.mech.anchors.muzzleL) this._altSide = !this._altSide;
      const clip = this.def.rangedClip
        || (mv.type === 'mortar' ? (this._altSide ? 'braceL' : 'brace')
        : mv.type === 'railgun' ? 'aim'
        : mv.type === 'groundpound' ? 'groundPound' : 'shoot');
      this.rangedCd = mv.cooldown;
      // single-shot weapons spend ammo too (channel weapons decrement in
      // their own loop) — without this they never drain and never refill
      if (this.ammoMax !== undefined) this.ammo--;
      const dur = this.animator.play(clip, {
        onEvent: (type) => {
          if (type === 'fire') this.world.fireRanged(this, mv);
          else if (type === 'shake') this.world.effects.addShake(0.3);
        },
      });
      // upper-body clips let you keep moving; only brief lock for heavy shots
      if (clip !== 'shoot') this.setState('attack', dur * 0.6);
    }
  }

  doSpecial() {
    if (this.specialCd > 0) return;
    const sp = this.def.moves.special;
    const impl = SPECIALS[sp.id];
    if (!impl) return;
    this.uncloak();
    this.specialCd = sp.cooldown;
    this.faceNearestEnemyIfClose(40, true);
    impl(this, sp);
    this.world.events.emit('special', { fighter: this, name: sp.name });
  }

  doUlt() {
    if (this.ult < 1) return;
    const u = this.def.moves.ult;
    const impl = ULTS[u.id];
    if (!impl) return;
    this.uncloak();
    this.ult = 0;
    this.faceNearestEnemyIfClose(80, true);
    this.world.events.emit('ult', { fighter: this, name: u.name });
    this.world.audio?.play('ultReady');
    impl(this, u);
  }

  // charge (seconds of crouch wind-up, 0..CHARGE_DASH_MAX) scales the dash:
  // an uncharged tap is the classic dodge, a full coil is a screaming lunge
  doDash(charge = 0) {
    if (this.dashCd > 0 && charge < 0.2) return;
    const k = clamp(charge / CHARGE_DASH_MAX, 0, 1);
    const ix = this.intent.moveX, iz = this.intent.moveZ;
    let dir;
    if (Math.abs(ix) + Math.abs(iz) > 0.2) dir = _v.set(ix, 0, iz).normalize();
    else dir = _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const sp = this.def.stats.speed * 4.2 * (1 + 0.95 * k) * this.speedMult();
    this.vel.x = dir.x * sp;
    this.vel.z = dir.z * sp;
    // strafe dash (AI only — players own their facing): keep facing a
    // nearby enemy so sideways dashes read as combat sidesteps
    if (this.isAI) {
      const e = this.nearestEnemy();
      if (e && this.pos.distanceTo(e.pos) < 34) {
        this.targetYaw = Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      }
    }
    this.dashCd = 0.9;
    this.dashT = 0.3 + 0.32 * k;
    this.iframes = Math.max(this.iframes, 0.26 + 0.28 * k);
    this.setState('dash', this.dashT);
    this.world.audio?.play('dash');
    this.world.effects.rings.spawn(this.pos, {
      from: 0.5, to: 3.5 + 3 * k, dur: 0.3, color: PLAYER_COLORS[this.playerIndex % 4], y: 0.4,
    });
    if (k > 0.35) { // a wound-up release detonates off the line
      this.world.audio?.play('whooshBig');
      this.world.effects.dustPuff(this.pos, 6 + 8 * k);
    }
  }

  faceNearestEnemyIfClose(maxDist, always = false) {
    // HUMANS NEVER TURN when using a weapon — every attack (melee, ranged,
    // special, ult) fires along the mech's CURRENT facing; movement owns
    // the orientation. Only the AI snaps toward its target, as its
    // stand-in for aiming skill.
    if (!this.isAI) return;
    const e = this.nearestEnemy();
    if (!e) return;
    const dx = this.world.wrapDelta(e.pos.x - this.pos.x);
    const dz = this.world.wrapDelta(e.pos.z - this.pos.z);
    if (always || Math.hypot(dx, dz) < maxDist) {
      // the AI's aim snap carries a per-difficulty yaw ERROR — humans aim
      // with the camera and miss; a pixel-perfect snap felt unbeatable
      const err = this._aimErr ? (Math.random() * 2 - 1) * this._aimErr : 0;
      this.targetYaw = Math.atan2(dx, dz) + err;
      this.yaw = this.targetYaw;
    }
  }

  // melee hit event from animation
  onAttackEvent(type, arg, atk) {
    if (type === 'sfx') { this.world.audio?.play(arg); return; }
    if (type === 'shake') { this.world.effects.addShake(arg || 0.4); return; }
    if (type === 'fx') { this.heavyChargeFx(atk); return; } // pre-impact charge beat
    if (type !== 'hit') return;
    this.uncloak();
    // kinetic bonus: real momentum behind a punch (dash, dive) hits harder
    const mom = Math.hypot(this.vel.x, this.vel.y, this.vel.z);
    const momMult = 1 + Math.min(0.7, Math.max(0, mom - 8) * 0.045);
    atk = { ...atk, dmg: atk.dmg * momMult, knock: (atk.knock || 8) * (0.7 + 0.3 * momMult) };
    const reach = atk.range || 3.5;
    const cx = this.pos.x + Math.sin(this.yaw) * reach * 0.75;
    const cz = this.pos.z + Math.cos(this.yaw) * reach * 0.75;
    const cy = this.pos.y + this.height * 0.5;
    // an airborne punch HELD when the fist meets a building face becomes a
    // WALL GRAB instead of a strike — jump, punch-hold, hang, jump again:
    // that's how mechs climb
    if (!this.grounded && !this.isAI && this.intent.lightHeld && !atk.heavy &&
        this.world.arena?.grabProbe) {
      const g = this.world.arena.grabProbe(cx, cy, cz);
      if (g) { this.startHang(g); return; }
    }
    // signature heavy impact FX (visuals + any bonus area effect)
    if (atk.fx) this.heavyImpactFx(atk, cx, cy, cz, reach);
    let hitAny = false;
    for (const f of this.world.fighters) {
      if (f === this || !f.alive) continue;
      const c = f.center();
      const dx = this.world.wrapDelta(c.x - cx), dy = c.y - cy, dz = this.world.wrapDelta(c.z - cz);
      const rr = reach * 0.8 + f.hitRadius;
      if (dx * dx + dy * dy + dz * dz < rr * rr) {
        f.takeHit(atk.dmg, this, {
          knock: atk.knock, launch: atk.launch,
          srcPos: this.pos, heavy: atk.heavy,
        });
        hitAny = true;
      }
    }
    // collateral: melee cracks buildings
    _v.set(cx, cy, cz);
    this.world.arena?.damageSphere(_v, reach * 0.9, atk.dmg * 1.4, _v2.set(Math.sin(this.yaw), 0.2, Math.cos(this.yaw)));
    if (hitAny) {
      this.world.engine.addHitStop(atk.heavy ? 0.09 : 0.045);
      this.world.effects.addShake(atk.heavy ? 0.5 : 0.2);
    }
  }

  // ---- signature heavy FX: the mid-clip charge beat ('fx' event) ----
  heavyChargeFx(atk) {
    const w = this.world;
    if (atk.fx === 'starSmash') {
      // NOVA: a shaft of starlight strikes the raised staff and sets it blazing
      const tip = this.mech.anchors.muzzleR?.getWorldPosition(_v) || this.center();
      w.effects.beams.spawn(new THREE.Vector3(tip.x, tip.y + 36, tip.z), tip.clone(),
        { radius: 0.5, dur: 0.45, color: 0xffd8f8 });
      const g = this.animator?.novaGlow || 0.5;
      for (let i = 0; i < 14; i++) {
        const a = rand(TAU), rr = rand(0, 1.2);
        w.effects.glows.emit(tip.x + Math.cos(a) * rr, tip.y + rand(-0.4, 0.8), tip.z + Math.sin(a) * rr,
          Math.cos(a) * 2, rand(1, 4), Math.sin(a) * 2,
          { life: rand(0.3, 0.6), size: rand(0.6, 1.4) * (1 + g), color: i % 3 ? 0xff3ce8 : 0xfff0ff, alpha: 0.95 });
      }
      w.effects.glows.emit(tip.x, tip.y, tip.z, 0, 0, 0,
        { life: 0.4, size: 3 + 2.5 * g, color: 0xffffff, alpha: 0.95 });
    }
  }

  // ---- signature heavy FX: on the impact frame ----
  heavyImpactFx(atk, cx, cy, cz, reach) {
    const w = this.world;
    if (atk.fx === 'starSmash') {
      // NOVA: the staff hits like a falling star — area burst around the point
      const g = this.animator?.novaGlow || 0;
      const p = new THREE.Vector3(cx, 0, cz);
      w.effects.rings.spawn(p, { from: 0.6, to: 7 + 4 * g, dur: 0.5, color: 0xff3ce8, y: 0.35 });
      w.effects.explosion(new THREE.Vector3(cx, 1, cz), 3.5 + 2 * g, { color: 0xff5ce8, smoke: false });
      w.groundShockwave(this, p, 5.5 + 2 * g, atk.dmg * 0.35, 10, 0xff3ce8);
      w.audio?.play('plasma');
    } else if (atk.fx === 'wingLasers') {
      // WRAITH: every spread wing-tip fires a red beam converging on the mark
      const target = new THREE.Vector3(cx, Math.max(1.5, cy * 0.7), cz);
      for (let k = 0; k < 6; k++) {
        const a = this.mech.anchors['wing' + k];
        if (!a) continue;
        w.effects.beams.spawn(a.getWorldPosition(new THREE.Vector3()), target.clone(),
          { radius: 0.11, dur: 0.32, color: 0xff2030 });
      }
      w.effects.glows.emit(target.x, target.y, target.z, 0, 0, 0,
        { life: 0.35, size: 3.4, color: 0xff2030, alpha: 0.95 });
      w.effects.impactSparks(target, 0xff2030, 16, 10);
      w.audio?.play('zap');
    }
  }

  // ---- hold-to-charge heavy: while the hold clip loops and the button
  // stays down, power banks (capped); releasing fires the lunge with the
  // banked damage/knock/launch — the longer the whirl, the harder it lands
  updateHeavyHold(dt) {
    const cap = 2.4;
    if (!this.alive || this.state !== 'attack' || !this.animator.isPlaying(this.def.heavyClip)) {
      this._whirlHold = null;
      return;
    }
    if (this.intent.heavyHeld) {
      this._whirlHold = Math.min(cap, this._whirlHold + dt);
      this.stateT = Math.max(this.stateT, 0.3); // stay in the hold
      // charge tell: rings tighten and quicken as the whirl banks power
      const k = this._whirlHold / cap;
      this._whirlFxT = (this._whirlFxT ?? 0) - dt;
      if (this._whirlFxT <= 0) {
        this._whirlFxT = 0.42 - 0.24 * k;
        this.world.effects.rings.spawn(this.pos, {
          from: 2.6, to: 0.8, dur: 0.26, color: this.def.colors.glow, y: 0.4,
        });
      }
      if (k >= 1 && !this._whirlFull) {
        this._whirlFull = true;
        this.world.audio?.play('powerup');
        this.world.effects.rings.spawn(this.pos, { from: 0.5, to: 4.5, dur: 0.35, color: 0xffffff, y: 0.5 });
      }
      return;
    }
    // released: discharge the banked hold into the strike
    const k = clamp01(this._whirlHold / cap);
    this._whirlHold = null;
    this._heavyLungeK = k;
    this.faceNearestEnemyIfClose(14); // re-square: they moved during the hold
    const mv = this.def.moves.heavy;
    const dur = this.animator.play(this.def.heavyReleaseClip, {
      onEvent: (type, arg) => this.onAttackEvent(type, arg, {
        dmg: mv.dmg * (0.8 + 0.8 * k) * this.dmgMult(),
        knock: mv.knock * (1 + 0.9 * k),
        range: mv.range * this.scale * (1 + 0.15 * k),
        launch: mv.launch * (1 + 0.5 * k),
        heavy: true,
      }),
    });
    this.setState('attack', dur * 0.9);
    if (k > 0.4) this.world.audio?.play('whooshBig');
  }

  // ---- hold-to-charge haymaker (TITANUS/COLOSSUS): same contract as the
  // heavy hold — the wind-up loop keeps the fist cocked while X stays down,
  // and releasing throws the punch with the banked damage/knock. A full
  // charge sends the victim across the street like nothing else ----
  updatePunchHold(dt) {
    const cap = 1.8;
    const idx = this._punchIdx || 0;
    const holdClip = idx ? 'punchHold2' : 'punchHold1';
    if (!this.alive || this.state !== 'attack' || !this.animator.isPlaying(holdClip)) {
      this._punchHold = null;
      return;
    }
    if (this.intent.lightHeld) {
      this._punchHold = Math.min(cap, this._punchHold + dt);
      this.stateT = Math.max(this.stateT, 0.3); // stay in the hold
      const k = this._punchHold / cap;
      // charge tell: energy crackles off the cocked fist as power banks
      this._punchFxT = (this._punchFxT ?? 0) - dt;
      if (this._punchFxT <= 0) {
        this._punchFxT = 0.3 - 0.18 * k;
        const j = this.mech.joints[idx ? 'handR' : 'handL'];
        if (j) {
          j.getWorldPosition(_v);
          this.world.effects.glows.emit(_v.x, _v.y, _v.z,
            rand(-1, 1), rand(0, 2), rand(-1, 1),
            { life: 0.22, size: 0.5 + 0.9 * k, color: this.def.colors.glow, alpha: 0.9 });
        }
      }
      if (k >= 1 && !this._punchFull) {
        this._punchFull = true;
        this.world.audio?.play('powerup');
        this.world.effects.rings.spawn(this.pos, { from: 0.5, to: 3.5, dur: 0.3, color: this.def.colors.glow, y: 0.5 });
      }
      return;
    }
    // released: throw the banked punch
    const k = clamp01(this._punchHold / cap);
    this._punchHold = null;
    const mv = this.def.moves.light;
    this.faceNearestEnemyIfClose(12);
    const dur = this.animator.play(idx ? 'punchRelease2' : 'punchRelease1', {
      onEvent: (type, arg) => this.onAttackEvent(type, arg, {
        dmg: mv.dmg[idx] * (1 + 1.1 * k) * this.dmgMult(),
        knock: mv.knock[idx] * (1 + 1.2 * k),
        range: mv.range * this.scale * (1 + 0.1 * k),
        launch: 10 * k,
        heavy: k > 0.55,
      }),
    });
    this.setState('attack', dur * 0.85);
    this.comboIdx++;
    if (k > 0.4) this.world.audio?.play('whooshBig');
  }

  // ---- signature heavy mechanics, driven every frame while the mech's own
  // heavy clip plays: heavySpin (post-pose joint whirl — rotor spear, drill
  // roll, tornado), heavyDrive (forward flight / leaps), heavyFlare
  // (porcupine mane / cloak wing-wall scaling), heavyAura (tornado debris) ----
  updateHeavySignature(dt) {
    const def = this.def;
    if (!def.heavySpin && !def.heavyDrive && !def.heavyFlare && !def.heavyAura) return;
    const act = this.animator.action;
    const playing = !!act && !act.fadingOut && act.clip.name === def.heavyClip;
    const t = playing ? act.t : 0;

    const sp = def.heavySpin;
    if (sp) {
      if (playing && t >= sp.t0 && t <= sp.t1) {
        this._spinAcc = (this._spinAcc || 0) + dt * sp.rate;
      } else if (this._spinAcc) {
        // wind down onto a whole turn so the pose lands where the clip left it
        const snap = Math.round(this._spinAcc / TAU) * TAU;
        this._spinAcc += (snap - this._spinAcc) * Math.min(1, dt * 14);
        if (Math.abs(this._spinAcc - snap) < 0.02) this._spinAcc = playing ? snap : 0;
      }
      if (this._spinAcc) {
        const j = this.mech.joints[sp.joint];
        if (j) j.rotation[sp.axis] += this._spinAcc; // on top of the posed value
      }
    }

    const dr = def.heavyDrive;
    if (dr) {
      // the drive may live on a different clip (e.g. aegis' release lunge)
      const driveClip = dr.clip || def.heavyClip;
      const drivePlaying = !!act && !act.fadingOut && act.clip.name === driveClip;
      const dTime = drivePlaying ? act.t : 0;
      if (drivePlaying && this.state === 'attack' && dTime >= dr.t0 && dTime <= dr.t1) {
        // a banked hold-charge boosts the drive speed too
        const sp = dr.speed * (1 + (dr.kBoost || 0) * (this._heavyLungeK || 0));
        this.vel.x = Math.sin(this.yaw) * sp;
        this.vel.z = Math.cos(this.yaw) * sp;
        if (dr.up && !this._droveUp) {
          this._droveUp = true;
          this.vel.y = dr.up;
          this.grounded = false;
        }
        if (dr.hold) this.vel.y = Math.max(this.vel.y, -2); // skim, don't faceplant
      }
      if (!drivePlaying) this._droveUp = false;
    }

    const fl = def.heavyFlare;
    if (fl) {
      const j = this.mech.joints[fl.joint];
      if (j) {
        let want = 0;
        if (playing) {
          want = clamp((t - fl.t0) / 0.22, 0, 1) * clamp((fl.t1 - t) / 0.16, 0, 1);
          want = clamp(want, 0, 1);
        }
        this._flareK = lerp(this._flareK || 0, want, 1 - Math.exp(-12 * dt));
        j.scale.set(
          1 + (fl.scale[0] - 1) * this._flareK,
          1 + (fl.scale[1] - 1) * this._flareK,
          1 + (fl.scale[2] - 1) * this._flareK
        );
      }
    }

    if (def.heavyAura === 'tornado' && playing && t > 0.24 && t < 0.9) {
      // storm debris spiraling up around the spinning frame
      this._auraT = (this._auraT ?? 0) - dt;
      if (this._auraT <= 0) {
        this._auraT = 0.03;
        const fx = this.world.effects;
        const a = rand(TAU), rr = rand(1.2, 3.2) * this.scale;
        const h = rand(0, this.height * 1.3);
        fx.glows.emit(this.pos.x + Math.cos(a) * rr, this.pos.y + h, this.pos.z + Math.sin(a) * rr,
          -Math.sin(a) * rand(8, 14), rand(3, 7), Math.cos(a) * rand(8, 14),
          { life: rand(0.3, 0.55), size: rand(0.5, 1.1), color: 0x3fd8ff, alpha: 0.75, drag: 0.6 });
        fx.smoke.emit(this.pos.x + Math.cos(a) * rr * 1.15, this.pos.y + h * 0.5, this.pos.z + Math.sin(a) * rr * 1.15,
          -Math.sin(a) * rand(6, 10), rand(2, 5), Math.cos(a) * rand(6, 10),
          { life: rand(0.4, 0.8), size: rand(1.2, 2.2), color: 0x9fb8c8, alpha: 0.22, grow: 1.5 });
      }
    }
  }

  // ---- ROCKET FIST (TITANUS): the punching fist detaches and flies as a
  // boomerang projectile; the hand stays hidden until it thunks back on ----
  launchFist() {
    this.mech.joints.handR?.scale.setScalar(0.001);
    this._fistOut = true;
  }

  catchFist() {
    if (!this._fistOut) return;
    this._fistOut = false;
    const j = this.mech.joints.handR;
    if (j) {
      j.scale.setScalar(1);
      j.getWorldPosition(_v);
      this.world.effects.impactSparks(_v, this.def.colors.glow, 8, 5);
    }
    this.world.audio?.play('servo');
  }

  // ---- thrown-weapon regrow: hide the weapon group, then rebuild it in the
  // grip over half a second (viper's swords, aegis' javelin) ----
  regrowWeapon(joint) {
    const j = this.mech.joints[joint];
    if (!j) return;
    j.scale.setScalar(0.001);
    this._regrow = { joint, t: 0 };
  }

  updateRegrow(dt) {
    const rg = this._regrow;
    if (!rg) return;
    rg.t += dt;
    const j = this.mech.joints[rg.joint];
    if (!j) { this._regrow = null; return; }
    const k = clamp((rg.t - 0.18) / 0.5, 0, 1);
    j.scale.setScalar(Math.max(0.001, k));
    if (k > 0.05 && Math.random() < 0.5) {
      // re-forging shimmer at the grip
      j.getWorldPosition(_v);
      this.world.effects.glows.emit(_v.x + rand(-0.4, 0.4), _v.y + rand(-0.3, 0.3), _v.z + rand(-0.4, 0.4),
        0, rand(0.5, 2), 0,
        { life: 0.25, size: rand(0.3, 0.7), color: this.def.colors.glow, alpha: 0.9 });
    }
    if (k >= 1) this._regrow = null;
  }

  // ================= wall grab =================
  // latch onto a building face at the fist's contact point and hang there —
  // frozen EXACTLY where and how the punch connected (no snap, no turn; the
  // fist may intersect the wall, that's the grip)
  startHang(g) {
    this.hanging = {
      chunk: g.chunk, nx: g.nx, nz: g.nz,
      x: this.pos.x, y: this.pos.y, z: this.pos.z,
    };
    this.vel.set(0, 0, 0);
    this.plunging = false;
    this.hovering = false;
    this.grounded = false;
    this.comboIdx = 0;
    this.setState('normal');
    this.animator.play('hangGrab');
    this.world.audio?.play('servo');
    this.world.effects.dustPuff(_v.set(g.x, g.y, g.z), 4, 0xa8a8a8);
  }

  endHang() {
    this.hanging = null;
    this._hangCoyote = 0.35; // short grace: a jump still fires just after letting go
    this.animator.stop(0.12);
  }

  // ================= damage =================
  takeHit(dmg, attacker, { knock = 8, launch = 0, srcPos = null, heavy = false, status = null, silent = false, soft = false } = {}) {
    if (!this.alive || this.iframes > 0) return;
    this.uncloak();

    const src = srcPos || (attacker ? attacker.pos : this.pos);
    const dirX = this.pos.x - src.x, dirZ = this.pos.z - src.z;
    const dLen = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

    // blocking: facing the source & holding block. Two ways an attack still
    // gets through a raised guard:
    //   • a CROUCHING attack slips under a STANDING block (crouch to block
    //     low yourself) — this is the core crouch dynamic
    //   • a guard-BREAKER (Saurion) shatters the block outright, more often
    //     than anyone else
    if (this.blocking && this.state !== 'hitstun') {
      const toSrc = Math.atan2(-dirX, -dirZ);
      if (Math.abs(angleDiff(this.yaw, toSrc)) < 1.5) {
        const low = !!(attacker && attacker.ducking);       // crouched attack
        const gb = attacker ? (attacker.def.stats.guardBreak || 0) : 0;
        const underGuard = low && !this.ducking;            // high block vs low hit
        const shattered = gb > 0 && Math.random() < gb;
        if (!underGuard && !shattered) {
          const pass = this.def.stats.blockMult ?? 0.12;    // fraction that leaks through
          dmg *= pass;
          knock *= 0.25 + pass;
          this.world.effects.blockSpark(this.center(), 0x7fd8ff);
          this.world.audio?.play('block');
          this.hp = Math.max(1, this.hp - dmg);
          this.vel.x += (dirX / dLen) * knock * 0.5;
          this.vel.z += (dirZ / dLen) * knock * 0.5;
          this.ult = clamp01(this.ult + dmg / 3000);
          return;
        }
        // guard beaten: orange spark, a jolt of extra hitstun, full damage
        this.world.effects.blockSpark(this.center(), 0xff5a3c);
        this.world.audio?.play(shattered ? 'hitHeavy' : 'hit');
        if (shattered) { knock *= 1.15; heavy = true; }
      }
    }

    if (this.status.guard) dmg *= 1 - this.status.guard.f;
    dmg *= 1 - this.def.stats.armor;
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg;
    this.lastAttacker = attacker;
    this.ult = clamp01(this.ult + dmg / (this.maxHp * 1.35));
    if (attacker) attacker.ult = clamp01(attacker.ult + dmg / (attacker.maxHp * 2.6));

    if (status) this.applyStatus(status);

    this.world.events.emit('damage', { fighter: this, attacker, dmg, pos: this.center() });
    this.world.audio?.play(heavy ? 'hitHeavy' : 'hit');
    this.world.effects.impactSparks(this.center(), 0xffb060, heavy ? 18 : 10, heavy ? 13 : 9);

    if (this.hp <= 0) { this.die(attacker); return; }

    // frozen solid: no knockback and no flinch — the ice holds them in
    // place (whether this very hit froze them or they were already iced),
    // otherwise the next beam tick would knock them straight out of frozen
    if (this.state === 'frozen') return;

    // knockback & reactions (weight resists)
    const resist = 1 - this.def.stats.weight * 0.45;
    const kb = knock * resist;
    this.vel.x += (dirX / dLen) * kb;
    this.vel.z += (dirZ / dLen) * kb;

    if (launch > 0 && this.state !== 'launched') {
      this.vel.y = launch * resist + 4;
      this.grounded = false;
      this.setState('launched', 3);
      this.animator.play('launched');
    } else if (soft) {
      // rapid-tick chip (flame, cryo beam, gatling, hose, ground fire):
      // the body rocks under the stream but NEVER stun-locks — the target
      // keeps full control so they can break away instead of standing
      // there eating the whole magazine
      if (Math.random() < 0.35) this.animator.addImpulse('torso', [-0.22, 0, 0], 30, 11);
    } else if (this.state !== 'launched' && this.state !== 'knockdown') {
      const stun = heavy ? 0.42 : 0.24;
      this.setState('hitstun', stun);
      this.animator.play('hitFlinch', { speed: heavy ? 0.8 : 1.15 });
      this.animator.addImpulse('torso', [-0.25, 0, 0], 30, 11);
    }
    if (this.isAI === false && navigator.getGamepads) this.world.input?.rumble(this.playerIndex, heavy ? 0.7 : 0.35, heavy ? 220 : 120);
  }

  applyStatus(st) {
    if (st.burn) this.status.burn = { dps: st.burn, t: st.burnT || 3 };
    if (st.slow) this.status.slow = { f: st.slow, t: st.slowT || 2 };
    if (st.freeze) {
      this.status.frozen = { t: st.freeze };
      this.setState('frozen', st.freeze);
      this.animator.stop(0.05);
      this.world.freezeOverlay?.(this, st.freeze);
    }
  }

  // lerp every body material toward frost-white (w=1 fully iced over);
  // w=0 restores the exact original colors. Emissive does the heavy
  // lifting so even textured panels blank out.
  applyWhiteout(w) {
    if (!this._matBase) {
      this._matBase = [];
      for (const m of Object.values(this.mech.materials)) {
        if (!m || !m.color) continue;
        this._matBase.push({
          m, color: m.color.clone(),
          emissive: m.emissive ? m.emissive.clone() : null,
        });
      }
    }
    for (const b of this._matBase) {
      b.m.color.copy(b.color).lerp(_white, w);
      if (b.emissive) b.m.emissive.copy(b.emissive).lerp(_white, w * 0.85);
    }
  }

  uncloak() {
    if (this.status.cloak) {
      delete this.status.cloak;
      this.setOpacity(1);
    }
  }

  setOpacity(op) {
    this.group.traverse((o) => {
      if (o.isMesh) {
        o.material.transparent = op < 1;
        o.material.opacity = op;
      }
    });
  }

  die(attacker) {
    this.hp = 0;
    this.alive = false;
    this.setState('dead', 999);
    this.blocking = false;
    this.firing = false;
    this.animator.play('dead');
    this.world.audio?.play('explosionBig');
    const c = this.center();
    this.world.effects.explosion(c, 6, { color: 0xff9040 });
    this.world.effects.addShake(0.9);
    this.world.engine.addHitStop(0.12);
    // secondary pops
    setTimeout(() => { if (this.world.effects) this.world.effects.explosion(this.center(), 3.5, { color: 0xffc060 }); }, 350);
    this.world.events.emit('ko', { fighter: this, attacker });
  }

  // ================= per-frame =================
  update(dt) {
    if (this.cinePuppet) return; // a cinematic finisher owns this body
    const st = this.def.stats;
    const I = this.intent;
    this.stateT -= dt;
    this.specialCd = Math.max(0, this.specialCd - dt);
    this.rangedCd = Math.max(0, this.rangedCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.comboWindow -= dt;
    this.dashT = Math.max(0, this.dashT - dt);
    if (this.comboWindow <= 0) this.comboIdx = 0;

    // status ticks
    for (const key of Object.keys(this.status)) {
      const s = this.status[key];
      s.t -= dt;
      if (s.t <= 0) {
        if (key === 'cloak') this.setOpacity(1);
        delete this.status[key];
        continue;
      }
      if (key === 'burn') {
        this.hp -= s.dps * dt;
        if (Math.random() < dt * 20) {
          this.world.effects.glows.emit(this.pos.x, this.pos.y + Math.random() * this.height * 0.8, this.pos.z,
            0, 3, 0, { life: 0.4, size: 1.4, color: 0xff7a20, alpha: 0.8 });
        }
        if (this.hp <= 0 && this.alive) this.die(this.lastAttacker);
      }
    }

    // frost white-out: the whole body blanks to white while the cryo beam
    // is ON them (_beamWhiteT is re-armed by every beam tick) or while
    // frozen solid (ult), then the colors thaw straight back in
    if (this._beamWhiteT > 0) this._beamWhiteT -= dt;
    const wantWhite = this.state === 'frozen' || this._beamWhiteT > 0 ? 1 : 0;
    if (wantWhite || this._whiteW > 0.001) {
      this._whiteW = wantWhite
        ? Math.min(1, (this._whiteW || 0) + dt * 12)
        : Math.max(0, (this._whiteW || 0) - dt * 4);
      this.applyWhiteout(this._whiteW);
    }

    if (!this.alive) {
      this.applyPhysics(dt, 0, 0);
      this.animator.update(dt, { speed: 0, grounded: this.grounded, dead: true });
      return;
    }

    if (this.state === 'frozen') {
      if (this.stateT <= 0) this.setState('normal');
      this.applyPhysics(dt, 0, 0);
      return; // no animator update: frozen solid
    }

    // ---- state timers / transitions ----
    switch (this.state) {
      case 'attack':
      case 'special':
      case 'ult':
      case 'dash':
        if (this.stateT <= 0) this.setState('normal');
        break;
      case 'channel':
        if (this.stateT <= 0 && !I.ranged) {
          this.firing = false;
          this.animator.stop();
          this.setState('normal');
        }
        break;
      case 'hitstun':
        if (this.stateT <= 0) this.setState('normal');
        break;
      case 'launched':
        if (this.grounded) {
          this.setState('knockdown', 0.75);
          this.animator.play('knockdown');
          this.world.effects.dustPuff(this.pos, 10);
          this.world.audio?.play('bodyfall');
        }
        break;
      case 'knockdown':
        // escape jump: mash jump while downed to spring clear instead of
        // eating the same knockdown loop again
        if (I.jump) {
          const ex = Math.abs(I.moveX) + Math.abs(I.moveZ) > 0.2
            ? _v.set(I.moveX, 0, I.moveZ).normalize()
            : _v.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); // default: backward
          this.vel.x = ex.x * this.def.stats.speed * 2.6;
          this.vel.z = ex.z * this.def.stats.speed * 2.6;
          this.vel.y = 13;
          this.grounded = false;
          this.iframes = 0.9;
          this.setState('getup', 0.3);
          this.animator.play('getup', { speed: 2.4 });
          this.world.audio?.play('jump');
          this.world.effects.dustPuff(this.pos, 8);
          this.world.effects.rings.spawn(this.pos, { from: 0.5, to: 4, dur: 0.35, color: PLAYER_COLORS[this.playerIndex % 4], y: 0.3 });
          break;
        }
        if (this.stateT <= 0) {
          this.setState('getup', this.animator.play('getup') * 0.9);
          this.iframes = 0.5;
        }
        break;
      case 'getup':
        if (this.stateT <= 0) this.setState('normal');
        break;
    }

    // ---- wall hang: pinned to a building face by a held airborne punch.
    // Release drops, jump springs off the wall (punch-hold again mid-air to
    // grab higher — that's the climb loop), losing the wall knocks you off.
    if (this.hanging) {
      const h = this.hanging;
      if ((h.chunk && !h.chunk.alive) || this.state !== 'normal') {
        this.endHang();
      } else if (I.jump) {
        this.endHang();
        this.vel.y = this.def.stats.jump * JUMP_MULT;
        this.vel.x = h.nx * 4;
        this.vel.z = h.nz * 4;
        this.grounded = false;
        this.world.audio?.play('jump');
        this.world.effects.dustPuff(this.pos, 5);
      } else if (!I.lightHeld) {
        this.endHang();
      } else {
        this.pos.set(h.x, h.y, h.z);
        this.vel.set(0, 0, 0);
        this.grounded = false;
        this.animator.update(dt, { speed: 0, grounded: true, vy: 0 });
        return;
      }
    }

    // ---- carried: hoisted overhead by a grab-and-throw. Pinned every
    // FRAME (schedule-tick pinning let gravity sag between ticks = jiggle)
    // and the rise itself is a smoothstep, not a teleport ----
    if (this._carry) {
      const c = this._carry;
      const carrier = c.by;
      c.t -= dt;
      if (!this.alive || !carrier.alive || carrier.state !== 'special' || c.t <= 0) {
        this._carry = null; // thrown (the special clears us) or lift broken
      } else {
        // snap INTO the hands fast (0.12s), then ride the palms' own sweep
        // up — the liftHold arm swing IS the lift trajectory, so body and
        // hands stay in constant contact the whole way
        c.riseT = Math.min(1, (c.riseT || 0) + dt / 0.12);
        const k = c.riseT * c.riseT * (3 - 2 * c.riseT); // smoothstep grip
        const tp = carrier.carryPoint(this, _carryTmp);
        carrier._palmPrey = this; // carrier's post-pose palm press hooks on
        this.pos.x = c.x0 + (tp.x - c.x0) * k;
        this.pos.y = c.y0 + (tp.y - c.y0) * k;
        this.pos.z = c.z0 + (tp.z - c.z0) * k;
        this.vel.set(0, 0, 0);
        this.grounded = false;
        // rolled flat ACROSS the press: a Z-roll under the carrier's yaw
        // lays the body along the carrier's left<->right line whatever way
        // they face — head off one hand, legs off the other
        this.yaw = this.targetYaw = carrier.yaw;
        this.group.rotation.y = carrier.yaw;
        this.group.rotation.x += (0 - this.group.rotation.x) * Math.min(1, dt * 10);
        this.group.rotation.z += (1.45 * k - this.group.rotation.z) * Math.min(1, dt * 10);
        this.animator.update(dt, { speed: 0, grounded: false, vy: 0 });
        return;
      }
    }

    // ---- aerial plunge: heavy smash rides down to the ground ----
    if (this.plunging) {
      if (!this.alive || this.state !== 'attack') {
        this.plunging = false;
      } else if (this.grounded) {
        this.plunging = false;
        const mv = this.def.moves.heavy;
        const fall = Math.abs(this._plungeVy);
        const dmg = mv.dmg * (1 + Math.min(0.9, fall * 0.02)) * this.dmgMult();
        this.world.groundShockwave(this, this.pos, mv.range * this.scale * 1.6, dmg, mv.knock, 0xffc060);
        this.world.effects.addShake(0.7);
        this.world.engine.addHitStop(0.08);
        this.world.audio?.play('slam');
        this.animator.play('groundPound', { speed: 2.2 });
        this.setState('attack', 0.35);
      } else {
        this.vel.y -= 55 * dt;          // slam acceleration
        this._plungeVy = this.vel.y;    // captured before landing zeroes it
      }
    }

    // ---- intents ----
    const acting = this.canAct();
    this.blocking = acting && I.block; // blocking works airborne/hovering too

    // ---- crouch-charged dash (pad B): HOLD to wind up a dash coil (up to
    // CHARGE_DASH_MAX seconds' worth). Standing STILL crouches and winds at
    // full rate; you can keep MOVING while holding B, but the coil winds
    // much slower on the move. RELEASE with a direction held to dash that
    // way; release with no direction and the charge just cancels ----
    this._dashCharging = !!I.chargeDash && this.alive && !this.blocking && this.grounded &&
      (this.state === 'normal' || this.state === 'attack');
    this._chargeStill = this._dashCharging && Math.hypot(I.moveX, I.moveZ) <= 0.25;
    if (this._dashCharging) {
      const was = this._dashCharge || 0;
      this._dashCharge = Math.min(CHARGE_DASH_MAX, was + dt * (this._chargeStill ? 1 : 0.35));
      // wind-up tells: rings pulse quicker and wider as the coil tightens,
      // and a flash marks the moment the charge tops out
      this._chargeFxT = (this._chargeFxT ?? 0) - dt;
      const k = this._dashCharge / CHARGE_DASH_MAX;
      if (this._chargeFxT <= 0) {
        this._chargeFxT = 0.5 - 0.3 * k;
        this.world.effects.rings.spawn(this.pos, {
          from: 3.5, to: 1 + (1 - k) * 1.5, dur: 0.28,
          color: PLAYER_COLORS[this.playerIndex % 4], y: 0.3,
        });
      }
      if (was < CHARGE_DASH_MAX && this._dashCharge >= CHARGE_DASH_MAX) {
        this.world.audio?.play('powerup');
        this.world.effects.rings.spawn(this.pos, { from: 0.5, to: 4.5, dur: 0.35, color: 0xffffff, y: 0.4 });
      }
    }
    if (!I.chargeDash && this._chargePrev) {
      // release: dash along the held direction, or cancel back to standing
      const charge = this._dashCharge || 0;
      this._dashCharge = 0;
      if (Math.hypot(I.moveX, I.moveZ) > 0.25 && this.alive &&
          (this.state === 'normal' || this.state === 'attack' || this.state === 'channel')) {
        this.doDash(charge);
      }
    }
    this._chargePrev = !!I.chargeDash;

    // ---- duck: hold to crouch. Ducking PERSISTS through an attack (so a
    // held-duck strike lands LOW and slips under a standing block); only
    // jumping/airborne or blocking pops you back up ----
    if (this._hangCoyote > 0) this._hangCoyote -= dt;
    const wantDuck = (I.duck || this._chargeStill) && this.grounded && !this.blocking &&
      (this.state === 'normal' || this.state === 'channel' || this.state === 'attack');
    this.duckT = clamp01(this.duckT + (wantDuck ? dt / 0.13 : -dt / 0.11));

    // ---- spring-loaded jump (JERRY): slam into a deep crouch first, then
    // launch — the wind-up is the tell, the leap is enormous ----
    if (this._jumpCharge) {
      this._jumpCharge -= dt;
      this.duckT = Math.min(1, this.duckT + dt / 0.06);
      if (this._jumpCharge <= 0) {
        this._jumpCharge = 0;
        if (this.grounded && this.alive) {
          this.vel.y = st.jump * JUMP_MULT * (this.status.buff ? 1.1 : 1);
          this.grounded = false;
          this.world.audio?.play('jump');
          this.world.effects.dustPuff(this.pos, 10);
          this.world.effects.rings.spawn(this.pos, { from: 0.6, to: 4.5, dur: 0.35, color: 0xff6a40, y: 0.3 });
        }
      }
    }

    this.ducking = this.duckT > 0.4;
    const dk = this.duckT * this.duckDepth;
    this.height = this.baseHeight * (1 - 0.42 * dk);
    this.hitRadius = this.baseHitRadius * (1 - 0.22 * dk);

    if (acting && !this.blocking) {
      if (I.ult && this.ult >= 1) this.doUlt();
      else if (I.special) this.doSpecial();
      else if (I.light) {
        if (this.state === 'attack') this.queuedLight = true;
        else this.doLight();
      } else if (I.heavy) this.doHeavy();
      else if (I.dash) this.doDash();
      else if (I.ranged) this.doRanged();
      else if (I.taunt && this.state === 'normal') {
        this.setState('attack', this.animator.play('taunt') * 0.9);
      }
      if (I.jump && this.grounded && this.state === 'normal') {
        if (st.jumpWindup) {
          // spring-loader: crouch first, launch when the wind-up expires
          if (!this._jumpCharge) this._jumpCharge = st.jumpWindup;
        } else {
          this.vel.y = st.jump * JUMP_MULT * (this.status.buff ? 1.1 : 1);
          this.grounded = false;
          this.world.audio?.play('jump');
          this.world.effects.dustPuff(this.pos, 6);
        }
      } else if (I.jump && !this.grounded && this._hangCoyote > 0 && this.state === 'normal') {
        // just let go of a wall: for a beat, a jump still fires in mid-air —
        // that's the release-then-jump climbing rhythm
        this._hangCoyote = 0;
        this.vel.y = st.jump * JUMP_MULT * (this.status.buff ? 1.1 : 1);
        this.world.audio?.play('jump');
      } else if (I.jump && !this.grounded && !this.hovering && this.hoverFuel > 0.2) {
        // second jump press in the air ignites the hover jets
        this.hovering = true;
        this.world.audio?.play('jump');
      }
    } else if (this.state === 'attack' && this.queuedLight && this.stateT < 0.14) {
      // combo chain
      this.queuedLight = false;
      if (this.comboIdx > 0 && this.comboIdx < 3) this.doLight();
    } else if (this.state === 'channel') {
      // keep channel while held (and while there's ammo for it)
      if (I.ranged && !(this.ammoMax !== undefined && this.ammo <= 0)) {
        this.stateT = 0.1;
        this.firing = true;
        if (this.rangedCd <= 0) {
          this.rangedCd = this.def.moves.ranged.cooldown;
          if (this.ammoMax !== undefined) this.ammo--;
          this.world.fireRanged(this, this.def.moves.ranged);
        }
        this.faceAim();
      }
    }
    if (this.state === 'normal') this.queuedLight = false;

    // ---- hover jets ----
    if (this.hovering) {
      // attacks don't cut the jets — punch, shoot and block mid-flight
      // (the aerial plunge is the exception: it's a controlled fall)
      const wantHover = I.jumpHeld && this.hoverFuel > 0 && !this.grounded && !this.plunging &&
        (this.state === 'normal' || this.state === 'channel' || this.state === 'attack');
      if (wantHover) {
        this.hoverFuel = Math.max(0, this.hoverFuel - dt);
        // thrust counters gravity and climbs toward the mech's rise cap
        this.vel.y = Math.min(this.vel.y + (GRAVITY + 26) * dt, this.hoverRise);
        this.jetT -= dt;
        if (this.jetT <= 0) {
          this.jetT = 0.05;
          const fx = this.world.effects;
          fx.glows.emit(this.pos.x + rand(-0.8, 0.8) * this.scale, this.pos.y + 0.6, this.pos.z + rand(-0.8, 0.8) * this.scale,
            0, -6, 0, { life: 0.28, size: 1.5 * this.scale, color: 0x7fd8ff, alpha: 0.85 });
          fx.smoke.emit(this.pos.x, this.pos.y + 0.3, this.pos.z,
            rand(-1, 1), -3, rand(-1, 1), { life: 0.5, size: 1.1 * this.scale, color: 0x445055, alpha: 0.3, grow: 2 });
        }
      } else {
        this.hovering = false;
      }
    }
    if (this.grounded) {
      this.hovering = false;
      this.hoverFuel = Math.min(this.hoverFuelMax, this.hoverFuel + dt * 0.9);
    }

    // block anim
    if (this.blocking && !this.animator.isPlaying('block')) this.animator.play('block');
    else if (!this.blocking && this.animator.isPlaying('block')) this.animator.stop(0.1);

    // ---- movement ----
    let ax = 0, az = 0;
    const canMove = (this.state === 'normal' || this.state === 'channel') &&
      !this.blocking; // charging a dash no longer roots you — it just winds slower
    if (canMove) {
      ax = I.moveX; az = I.moveZ;
      const len = Math.hypot(ax, az);
      if (len > 1) { ax /= len; az /= len; }
      if (this.lockTarget) {
        // target lock owns the facing (set below) — movement strafes
      } else if (I.strafe && I.aimYaw !== undefined) {
        // strafe lock: face where the camera points, glide sideways
        this.targetYaw = I.aimYaw;
      } else if (len > 0.15 && this.state !== 'channel') {
        this.targetYaw = Math.atan2(ax, az);
      }
    }

    // ---- target lock (pad LB, held): square up on the locked enemy and
    // stay squared — every sideways step becomes a natural strafe, and the
    // camera (camera.js) swings to keep the target in frame ----
    if (I.lockOn && this.alive) {
      if (!this.lockTarget || !this.lockTarget.alive) this.lockTarget = this.nearestEnemy();
      if (this.lockTarget) {
        this.targetYaw = this.yawTo(this.lockTarget);
        // lock reticle: a pulse in this player's color under the target
        this._lockFxT = (this._lockFxT ?? 0) - dt;
        if (this._lockFxT <= 0 && !this.isAI) {
          this._lockFxT = 0.55;
          this.world.effects.rings.spawn(this.lockTarget.pos, {
            from: 3.4, to: 2.2, dur: 0.5,
            color: PLAYER_COLORS[this.playerIndex % 4], y: 0.35,
          });
        }
      }
    } else {
      this.lockTarget = null;
    }
    this.applyPhysics(dt, ax, az);

    // dash trail
    if (this.dashT > 0) {
      this.world.effects.dashTrail(this.pos, PLAYER_COLORS[this.playerIndex % 4], this.scale);
    }

    // ---- animation ----
    const spd = Math.hypot(this.vel.x, this.vel.z);
    this.animator.update(dt, {
      speed: canMove ? spd : 0,
      maxSpeed: st.speed * WALK_MULT,
      grounded: this.grounded,
      vy: this.vel.y,
      dashT: this.dashT,
      firing: this.firing,
      hovering: this.hovering,
      duck: dk,
      charging: this._charging,
    });
    // palm press / strike tracking must land after the pose is applied
    // (direct joint writes before applyPose get clobbered)
    if (this._palmPrey) {
      this.clampPalmsTo(this._palmPrey);
      this._palmPrey = null;
    } else if (this._strikeAim) {
      const sa = this._strikeAim;
      sa.t -= dt;
      if (sa.t <= 0 || !sa.f.alive || this.state !== 'attack') {
        this._strikeAim = null;
      } else {
        this.aimStrikeAt(sa.f);
      }
    } else {
      this._palmFix = 0;
    }
    if (this.state !== 'channel') this.firing = false;

    // face target yaw
    this.yaw = angleDamp(this.yaw, this.targetYaw, 14, dt);
    this.group.rotation.y = this.yaw;

    // ---- hold-to-charge heavy (whirl banking power until release) ----
    if (this._whirlHold != null) this.updateHeavyHold(dt);
    if (this._punchHold != null) this.updatePunchHold(dt);
    // ---- signature heavy mechanics (post-pose joint spins, drives, flares) ----
    this.updateHeavySignature(dt);
    // ---- thrown weapons re-forging in the grip ----
    this.updateRegrow(dt);
    // ---- weapon trails: glowing streaks ride the blade/spear tips while a
    // one-shot attack clip swings, so cuts and thrusts read as EDGES ----
    if (this.def.bladeTrail) this.updateBladeTrail(dt);
    // NOVA: the staff apex crackles while the halo burns — brighter and
    // bigger the closer the crescents are to apex alignment
    if (this.def.id === 'nova' && this.alive) this.updateNovaAura(dt);
  }

  updateBladeTrail(dt) {
    const bt = this.def.bladeTrail;
    const swinging = this.state === 'attack' && this.animator.action &&
      !this.animator.action.fadingOut && !this.animator.action.clip.loop;
    if (!swinging) { this._trailPrev = null; return; }
    this.group.updateWorldMatrix(true, true);
    this._trailPrev = this._trailPrev || {};
    for (const name of bt.anchors) {
      const anchor = this.mech.anchors[name];
      if (!anchor) continue;
      const p = anchor.getWorldPosition(_v);
      const prev = this._trailPrev[name];
      if (prev) {
        const d = prev.distanceTo(p);
        if (d > 0.35 * this.scale && d < 8 * this.scale) {
          const n = Math.min(4, Math.ceil(d / (0.6 * this.scale)));
          for (let i = 0; i <= n; i++) {
            _v2.lerpVectors(prev, p, i / n);
            this.world.effects.glows.emit(_v2.x, _v2.y, _v2.z, 0, 0, 0,
              { life: 0.14, size: 0.55 * this.scale, color: bt.color, alpha: 0.85, grow: -1.5 });
          }
        }
        prev.copy(p);
      } else {
        this._trailPrev[name] = p.clone();
      }
    }
  }

  updateNovaAura(dt) {
    const g = this.animator?.novaGlow || 0;
    this._novaFxT = (this._novaFxT ?? 0) - dt;
    if (g < 0.45 || this._novaFxT > 0) return;
    this._novaFxT = 0.055;
    const fx = this.world.effects;
    const tip = this.mech.anchors.muzzleR;
    if (tip) {
      // orbiting star-motes swirl around the staff apex; their size and
      // spread scale with how bright the ring is burning
      tip.getWorldPosition(_v);
      const a = rand(TAU), rr = (0.25 + 0.9 * g) * this.scale;
      fx.glows.emit(_v.x + Math.cos(a) * rr, _v.y + rand(-0.3, 0.5) * g, _v.z + Math.sin(a) * rr,
        Math.cos(a + 1.6) * 2.2, rand(0.5, 2.2), Math.sin(a + 1.6) * 2.2,
        { life: rand(0.25, 0.5), size: (0.5 + 1.5 * g) * this.scale,
          color: Math.random() < 0.3 ? 0xfff0ff : 0xff3ce8, alpha: 0.9, drag: 1.2 });
    }
    // at full burn the halo itself sheds sparks
    if (g > 0.78 && this.mech.joints.halo && Math.random() < 0.6) {
      this.mech.joints.halo.getWorldPosition(_v);
      const a = rand(TAU);
      fx.glows.emit(_v.x + Math.cos(a) * 0.9 * this.scale, _v.y + rand(-0.2, 0.4), _v.z + Math.sin(a) * 0.9 * this.scale,
        Math.cos(a) * 1.5, rand(1, 3), Math.sin(a) * 1.5,
        { life: rand(0.3, 0.6), size: 0.4 * this.scale, color: 0xff9df2, alpha: 0.9 });
    }
  }

  applyPhysics(dt, ax, az) {
    const st = this.def.stats;
    const speedCap = st.speed * WALK_MULT * this.speedMult() *
      (this.state === 'channel' ? 0.45 : 1) * (1 - 0.55 * this.duckT);

    if (this.state !== 'dash') {
      // hover jets give strong air control; plain jumps keep loose drift
      const control = this.grounded ? 9 : this.hovering ? 6.5 : 3.2;
      this.vel.x = lerp(this.vel.x, ax * speedCap, 1 - Math.exp(-control * dt));
      this.vel.z = lerp(this.vel.z, az * speedCap, 1 - Math.exp(-control * dt));
    } else {
      const d = Math.max(0, 1 - 2.2 * dt);
      this.vel.x *= d; this.vel.z *= d;
    }

    this.vel.y -= GRAVITY * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    // ground
    if (this.pos.y <= 0) {
      const fallSpeed = -this.vel.y;
      this.pos.y = 0;
      this.vel.y = 0;
      if (!this.grounded) {
        this.grounded = true;
        if (fallSpeed > 9) {
          this.world.effects.dustPuff(this.pos, Math.min(16, fallSpeed));
          this.world.audio?.play('land');
          // heavy mechs crack the ground
          if (this.def.stats.weight > 0.8 && fallSpeed > 16) {
            this.world.effects.rings.spawn(this.pos, { from: 1, to: 6, dur: 0.4, color: 0xcbb590 });
            this.world.effects.addShake(0.35);
          }
        }
      }
    } else if (this.pos.y > 0.05) {
      this.grounded = false;
    }

    // toroidal wrap: fold back into the periodic cell; stash the offset so
    // this player's chase camera shifts with them (invisible to their view)
    if (this.world.wrapHalf) {
      const wx = this.world.wrapCoord(this.pos.x);
      const wz = this.world.wrapCoord(this.pos.z);
      if (wx !== this.pos.x || wz !== this.pos.z) {
        this._wrap = { dx: wx - this.pos.x, dz: wz - this.pos.z };
        this.pos.x = wx;
        this.pos.z = wz;
      }
    }

    // arena bounds & buildings
    this.world.arena?.collideFighter(this);

    // fighter-fighter push out (nearest image across the seam)
    for (const f of this.world.fighters) {
      if (f === this || !f.alive) continue;
      // carried/cinematic bodies are stacked ON others by design — the 2D
      // separation would shove the carrier backward through the whole lift
      if (f._carry || this._carry || f.cinePuppet || this.cinePuppet) continue;
      const dx = this.world.wrapDelta(this.pos.x - f.pos.x);
      const dz = this.world.wrapDelta(this.pos.z - f.pos.z);
      const rr = this.radius + f.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (rr - d) * 0.5;
        this.pos.x += (dx / d) * push;
        this.pos.z += (dz / d) * push;
        f.pos.x -= (dx / d) * push;
        f.pos.z -= (dz / d) * push;
      }
    }

    // high-speed body slam into structures (launched mechs wreck facades
    // and props) — and the structure hits BACK: a thrown mech that smashes
    // through something takes real impact damage of its own
    this._crashCd = Math.max(0, (this._crashCd || 0) - 1 / 60);
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if ((this.state === 'launched' || this.state === 'dash' || this.state === 'special') && hSpeed > 14) {
      // sphere projected AHEAD into whatever we're hitting — the wall
      // pushout otherwise keeps small mechs' reach just short of chunks
      const lead = (this.radius + 1.4) / hSpeed;
      _v.set(this.pos.x + this.vel.x * lead, this.pos.y + this.height * 0.5, this.pos.z + this.vel.z * lead);
      const smashed = this.world.arena?.damageSphere(
        _v, Math.max(3, this.radius * 2.2), hSpeed * 3, _v2.copy(this.vel).normalize(), true) || 0;
      if (smashed > 0 && this.state === 'launched' && this._crashCd <= 0) {
        this._crashCd = 0.6;
        this.takeHit(Math.min(85, hSpeed * 1.5), this.lastAttacker, {
          knock: 0, srcPos: _v, soft: true,
        });
        this.world.effects.impactSparks(this.center(), 0xffcf7a, 16, 12);
        this.world.effects.dustPuff(this.pos, 8);
        this.world.audio?.play('crumbleBig');
        this.world.effects.addShake(0.5);
        this.vel.x *= 0.55; // punching through wreckage bleeds momentum
        this.vel.z *= 0.55;
      }
    }
  }

  resetForRound(pos, yaw) {
    this.hp = this.maxHp;
    this.alive = true;
    this.hanging = null;
    this._carry = null;
    this.cinePuppet = false;
    this.group.rotation.set(0, yaw, 0); // clear any carry/slam roll
    if (this._whiteW > 0) { this._whiteW = 0; this.applyWhiteout(0); }
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = this.targetYaw = yaw;
    this.group.rotation.y = yaw;
    this.setState('normal');
    this.status = {};
    this.setOpacity(1);
    this.specialCd = 0;
    this.rangedCd = 0;
    this.iframes = 0;
    this.comboIdx = 0;
    this.hovering = false;
    this.hoverFuel = this.hoverFuelMax;
    this.plunging = false;
    this._wrap = null; // stale seam-fold offsets must not jolt the camera
    this._jumpCharge = 0;
    this.duckT = 0;
    this.ducking = false;
    this.height = this.baseHeight;
    this.hitRadius = this.baseHitRadius;
    if (this.ammoMax !== undefined) this.ammo = this.ammoMax;
    this._whirlHold = null;
    this._punchHold = null;
    if (this._fistOut) { // fist projectile died with the round — re-attach
      this._fistOut = false;
      this.mech.joints.handR?.scale.setScalar(1);
    }
    this.animator.action = null;
  }
}
