// AI opponent controller: writes an intent into its fighter each frame.
// Behavior: range management per archetype, strafing, combos, blocking,
// dodging, special/ult usage. Three difficulty tiers.
import { rand, clamp, angleDiff } from '../core/utils.js';

export const DIFFICULTY = {
  rookie: { react: 0.55, aggression: 0.45, blockP: 0.15, dodgeP: 0.12, ultDelay: 2.5, err: 0.5 },
  veteran: { react: 0.3, aggression: 0.7, blockP: 0.38, dodgeP: 0.3, ultDelay: 1.2, err: 0.25 },
  ace: { react: 0.14, aggression: 0.9, blockP: 0.6, dodgeP: 0.5, ultDelay: 0.4, err: 0.1 },
};

// preferred fighting range by ranged-weapon type
function preferredRange(def) {
  const t = def.moves.ranged.type;
  if (t === 'railgun' || t === 'mortar') return 26;
  if (t === 'gatling' || t === 'plasma' || t === 'shell' || t === 'lightning' || t === 'water') return 16;
  if (t === 'shard' || t === 'slime' || t === 'flea') return 14;
  if (t === 'flame') return 8;
  return 5; // brawlers (dart, wave, rocket, feather)
}

// self-centered AoE moves only connect up close — gate them by their radius
// instead of the weapon's preferred range
const SELF_AOE_SPECIALS = new Set(['groundPound', 'staticField']);
const SELF_AOE_ULTS = new Set(['supernova', 'backdraft', 'absoluteZero']);

export class AIController {
  constructor(fighter, difficulty = 'veteran') {
    this.f = fighter;
    this.d = DIFFICULTY[difficulty] || DIFFICULTY.veteran;
    this.target = null;
    this.decideT = 0;
    this.mode = 'approach';   // approach | strafe | retreat | engage
    this.strafeDir = 1;
    this.jumpT = rand(2, 5);
    this.rangedPref = preferredRange(fighter.def);
    this.thinkNoise = rand(100);
  }

  update(dt) {
    const f = this.f;
    const I = f.intent;
    // clear one-shot intents
    I.jump = I.light = I.heavy = I.special = I.ult = I.dash = I.taunt = false;
    I.ranged = false;
    I.block = false;
    I.duck = false;
    I.specialHeld = false;
    if (!f.alive || f.controlsLocked) { I.moveX = I.moveZ = 0; return; }

    // retarget occasionally
    if (!this.target || !this.target.alive || Math.random() < dt * 0.4) {
      this.target = f.nearestEnemy();
    }
    const t = this.target;
    if (!t) { I.moveX = I.moveZ = 0; return; }

    // downed? spring clear sometimes instead of eating the loop
    if (f.state === 'knockdown' && Math.random() < dt * (1.5 + this.d.aggression * 2)) {
      I.jump = true;
      return;
    }

    // nearest-image pursuit — chases straight through the arena seam
    const dx = f.world.wrapDelta(t.pos.x - f.pos.x), dz = f.world.wrapDelta(t.pos.z - f.pos.z);
    const dist = Math.hypot(dx, dz);
    const nx = dx / (dist || 1), nz = dz / (dist || 1);

    // periodic mode decisions
    this.decideT -= dt;
    if (this.decideT <= 0) {
      this.decideT = this.d.react + rand(0, this.d.react);
      const r = Math.random();
      const hurt = f.hp / f.maxHp < 0.3;
      if (hurt && r < 0.25) this.mode = 'retreat';
      else if (dist > this.rangedPref * 1.5) this.mode = 'approach';
      else if (r < this.d.aggression) this.mode = 'engage';
      else this.mode = 'strafe';
      if (Math.random() < 0.3) this.strafeDir *= -1;
    }

    // ---- movement ----
    let mx = 0, mz = 0;
    const melee = this.rangedPref <= 6;
    const wantDist = this.mode === 'engage' && melee ? 2.5 : this.rangedPref;
    if (this.mode === 'approach' || (this.mode === 'engage' && dist > wantDist + 1)) {
      mx = nx; mz = nz;
    } else if (this.mode === 'retreat') {
      mx = -nx; mz = -nz;
    } else if (this.mode === 'strafe') {
      mx = -nz * this.strafeDir + nx * 0.15;
      mz = nx * this.strafeDir + nz * 0.15;
    }
    // spacing: don't hug when ranged
    if (!melee && dist < wantDist * 0.6) { mx = -nx; mz = -nz; }

    // dry burst weapon: detour to the nearest ammo crate
    if (f.ammoMax !== undefined && f.ammo <= 0) {
      let box = null, boxD = Infinity;
      for (const p of f.world.pickups) {
        if (!p.active) continue;
        const bx = f.world.wrapDelta(p.pos.x - f.pos.x), bz = f.world.wrapDelta(p.pos.z - f.pos.z);
        const d = Math.hypot(bx, bz);
        if (d < boxD) { box = { bx, bz, d }; boxD = d; }
      }
      if (box && box.d > 2) { mx = box.bx / box.d; mz = box.bz / box.d; }
    }
    I.moveX = mx; I.moveZ = mz;

    // occasional hops
    this.jumpT -= dt;
    if (this.jumpT <= 0) {
      this.jumpT = rand(2.5, 6);
      if (Math.random() < 0.5) I.jump = true;
    }

    // ---- defense: react to attacking enemies ----
    const threat = t.state === 'attack' || t.state === 'special' || t.state === 'ult';
    if (threat && dist < 8) {
      if (Math.random() < this.d.dodgeP) I.dash = true;
      else if (Math.random() < this.d.blockP) I.block = true;
    }
    // dodge incoming projectiles
    if (Math.random() < this.d.dodgeP * dt * 6) {
      for (const p of f.world.projectiles.active) {
        if (p.owner === f) continue;
        const toF = f.pos.distanceTo(p.mesh.position);
        if (toF < 12) { I.dash = true; break; }
      }
    }
    if (I.block) { I.moveX = I.moveZ = 0; }

    // Rhino's bull rush is a HELD charge — keep the button down once it's
    // rolling so it plows for its full duration (a few seconds, then let go)
    if (f.state === 'special' && f._charging) {
      this._holdCharge = (this._holdCharge || 0) + dt;
      if (this._holdCharge < 2.5 + Math.random() * 2) { I.special = true; I.specialHeld = true; }
      return;
    }
    this._holdCharge = 0;

    // if the target is turtling behind a facing block, crouch to slip the
    // next attack UNDER their high guard (unless we out-tier them at breaking)
    const targetBlocking = t.blocking && dist < 7;
    const canBreak = (f.def.stats.guardBreak || 0) > 0.3;
    if (targetBlocking && !canBreak && Math.random() < 0.6) I.duck = true;

    // ---- offense ----
    if (f.canAct() && !I.block) {
      const err = Math.random() < this.d.err; // fumble: do nothing
      if (!err) {
        const uMv = f.def.moves.ult;
        const ultRange = SELF_AOE_ULTS.has(uMv.id) ? (uMv.radius || 12) - 2 : 24;
        const spMv = f.def.moves.special;
        const spRange = SELF_AOE_SPECIALS.has(spMv.id) ? (spMv.radius || 8) - 1 : this.rangedPref * 1.6;
        if (f.ult >= 1 && dist < ultRange && Math.random() < dt / this.d.ultDelay) {
          I.ult = true;
        } else if (f.specialCd <= 0 && dist < spRange && Math.random() < dt * 1.4) {
          I.special = true;
        } else if (melee || dist < 6) {
          if (dist < f.def.moves.light.range * f.scale + 1.2) {
            if (Math.random() < 0.25) I.heavy = true;
            else I.light = true;
          }
        } else if (dist < this.rangedPref * 1.7 && f.rangedCd <= 0 &&
                   !(f.ammoMax !== undefined && f.ammo <= 0)) {
          // face target implicitly via fighter auto-aim
          I.ranged = true;
          I.duck = false; // can't fire mid-crouch reliably; stand to shoot
        }
      }
    }
  }
}
