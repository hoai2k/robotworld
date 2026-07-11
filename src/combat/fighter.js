// Fighter: movement physics, combat state machine, resources, hit reactions.
// Driven each frame by an intent (from human input or AI).
import * as THREE from 'three';
import { clamp, clamp01, lerp, angleDamp, angleDiff, TAU, rand } from '../core/utils.js';
import { buildMech } from '../mechs/factory.js';
import { Animator } from '../mechs/animator.js';
import { SPECIALS, ULTS } from './specials.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const GRAVITY = 34;
const WALK_MULT = 1.2;   // global ground-speed boost over roster stats
const JUMP_MULT = 1.18;  // global jump boost

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
      ranged: false, special: false, ult: false, block: false, dash: false, taunt: false,
      strafe: false, aimYaw: undefined,
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

  // nearest living enemy
  nearestEnemy() {
    let best = null, bestD = Infinity;
    for (const f of this.world.fighters) {
      if (f === this || !f.alive) continue;
      const d = this.pos.distanceToSquared(f.pos);
      if (d < bestD) { best = f; bestD = d; }
    }
    return best;
  }

  faceNearestEnemy(snap = false) {
    const e = this.nearestEnemy();
    if (!e) return;
    const yaw = Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
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
    const names = ['light1', 'light2', 'light3'];
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
    const dur = this.animator.play('heavy', {
      onEvent: (type, arg) => this.onAttackEvent(type, arg, {
        dmg: mv.dmg * this.dmgMult(),
        knock: mv.knock,
        range: mv.range * this.scale,
        launch: mv.launch,
        heavy: true,
      }),
    });
    this.setState('attack', dur * 0.9);
    this.comboIdx = 0;
  }

  // Humans aim where the CAMERA points (no horizontal auto-aim); the AI
  // squares up on its target as its stand-in for aiming skill.
  faceAim() {
    if (!this.isAI && this.intent.aimYaw !== undefined) {
      this.yaw = this.targetYaw = this.intent.aimYaw;
    } else {
      this.faceNearestEnemyIfClose(60, true);
    }
  }

  doRanged() {
    const mv = this.def.moves.ranged;
    if (this.rangedCd > 0) return;
    this.uncloak();
    const isChannel = mv.type === 'gatling' || mv.type === 'flame';
    this.faceAim();

    if (isChannel) {
      if (!this.animator.isPlaying('shootLoop')) this.animator.play('shootLoop');
      this.setState('channel', 0.1);
      this.firing = true;
      this.rangedCd = mv.cooldown;
      this.world.fireRanged(this, mv);
    } else {
      const clip = mv.type === 'mortar' ? 'brace' : mv.type === 'railgun' ? 'aim' : 'shoot';
      this.rangedCd = mv.cooldown;
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

  doDash() {
    if (this.dashCd > 0) return;
    const ix = this.intent.moveX, iz = this.intent.moveZ;
    let dir;
    if (Math.abs(ix) + Math.abs(iz) > 0.2) dir = _v.set(ix, 0, iz).normalize();
    else dir = _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const sp = this.def.stats.speed * 4.2 * this.speedMult();
    this.vel.x = dir.x * sp;
    this.vel.z = dir.z * sp;
    // strafe dash: keep facing a nearby enemy instead of the travel
    // direction, so sideways dashes read as combat sidesteps
    const e = this.nearestEnemy();
    if (e && this.pos.distanceTo(e.pos) < 34) {
      this.targetYaw = Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
    }
    this.dashCd = 0.9;
    this.dashT = 0.3;
    this.iframes = Math.max(this.iframes, 0.26);
    this.setState('dash', 0.3);
    this.world.audio?.play('dash');
    this.world.effects.rings.spawn(this.pos, {
      from: 0.5, to: 3.5, dur: 0.3, color: PLAYER_COLORS[this.playerIndex % 4], y: 0.4,
    });
  }

  faceNearestEnemyIfClose(maxDist, always = false) {
    const e = this.nearestEnemy();
    if (!e) return;
    if (always || this.pos.distanceTo(e.pos) < maxDist) {
      this.targetYaw = Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      this.yaw = this.targetYaw;
    }
  }

  // melee hit event from animation
  onAttackEvent(type, arg, atk) {
    if (type === 'sfx') { this.world.audio?.play(arg); return; }
    if (type === 'shake') { this.world.effects.addShake(arg || 0.4); return; }
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
    let hitAny = false;
    for (const f of this.world.fighters) {
      if (f === this || !f.alive) continue;
      const c = f.center();
      const dx = c.x - cx, dy = c.y - cy, dz = c.z - cz;
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

  // ================= damage =================
  takeHit(dmg, attacker, { knock = 8, launch = 0, srcPos = null, heavy = false, status = null, silent = false } = {}) {
    if (!this.alive || this.iframes > 0) return;
    this.uncloak();

    const src = srcPos || (attacker ? attacker.pos : this.pos);
    const dirX = this.pos.x - src.x, dirZ = this.pos.z - src.z;
    const dLen = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

    // blocking: facing the source & holding block
    if (this.blocking && this.state !== 'hitstun') {
      const toSrc = Math.atan2(-dirX, -dirZ);
      if (Math.abs(angleDiff(this.yaw, toSrc)) < 1.5) {
        dmg *= 0.12;
        knock *= 0.35;
        this.world.effects.blockSpark(this.center(), 0x7fd8ff);
        this.world.audio?.play('block');
        this.hp = Math.max(1, this.hp - dmg);
        this.vel.x += (dirX / dLen) * knock * 0.5;
        this.vel.z += (dirZ / dLen) * knock * 0.5;
        this.ult = clamp01(this.ult + dmg / 3000);
        return;
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
        if (this.stateT <= 0) {
          this.setState('getup', this.animator.play('getup') * 0.9);
          this.iframes = 0.5;
        }
        break;
      case 'getup':
        if (this.stateT <= 0) this.setState('normal');
        break;
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
        this.vel.y = st.jump * JUMP_MULT * (this.status.buff ? 1.1 : 1);
        this.grounded = false;
        this.world.audio?.play('jump');
        this.world.effects.dustPuff(this.pos, 6);
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
      // keep channel while held
      if (I.ranged) {
        this.stateT = 0.1;
        this.firing = true;
        if (this.rangedCd <= 0) {
          this.rangedCd = this.def.moves.ranged.cooldown;
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
    const canMove = (this.state === 'normal' || this.state === 'channel') && !this.blocking;
    if (canMove) {
      ax = I.moveX; az = I.moveZ;
      const len = Math.hypot(ax, az);
      if (len > 1) { ax /= len; az /= len; }
      if (I.strafe && I.aimYaw !== undefined) {
        // strafe lock: face where the camera points, glide sideways
        this.targetYaw = I.aimYaw;
      } else if (len > 0.15 && this.state !== 'channel') {
        this.targetYaw = Math.atan2(ax, az);
      }
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
    });
    if (this.state !== 'channel') this.firing = false;

    // face target yaw
    this.yaw = angleDamp(this.yaw, this.targetYaw, 14, dt);
    this.group.rotation.y = this.yaw;
  }

  applyPhysics(dt, ax, az) {
    const st = this.def.stats;
    const speedCap = st.speed * WALK_MULT * this.speedMult() * (this.state === 'channel' ? 0.45 : 1);

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

    // arena bounds & buildings
    this.world.arena?.collideFighter(this);

    // fighter-fighter push out
    for (const f of this.world.fighters) {
      if (f === this || !f.alive) continue;
      const dx = this.pos.x - f.pos.x, dz = this.pos.z - f.pos.z;
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

    // high-speed body slam into buildings (launched mechs wreck facades)
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if ((this.state === 'launched' || this.state === 'dash' || this.state === 'special') && hSpeed > 14) {
      _v.set(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z);
      this.world.arena?.damageSphere(_v, this.radius * 2.2, hSpeed * 3, _v2.copy(this.vel).normalize(), true);
    }
  }

  resetForRound(pos, yaw) {
    this.hp = this.maxHp;
    this.alive = true;
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
    this.animator.action = null;
  }
}
