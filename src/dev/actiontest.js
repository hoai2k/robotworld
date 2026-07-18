// Dev action sandbox: one mech, free run-around, every power unrestricted.
//   ?debug=actions[&mech=<id>][&battle=<arena>][&dummy=0]
// Resources (ult / special & ranged cooldowns / ammo) refill every frame so
// any move can be spammed, and a speed slider slow-mos the whole sim so each
// action can be studied frame by frame. A padded invincible dummy stands in
// as a target (toggle with the DUMMY checkbox / &dummy=0).
import { Engine } from '../core/engine.js';
import { World } from '../game/world.js';
import { Arena } from '../arena/arena.js';
import { THEMES_BY_ID, THEMES } from '../arena/themes.js';
import { ROSTER_BY_ID, ROSTER, applyColorScheme } from '../mechs/roster.js';
import { Fighter } from '../combat/fighter.js';
import { Input } from '../game/input.js';
import { CameraSystem } from '../game/camera.js';

export function runActionTest() {
  const params = new URLSearchParams(location.search);
  const mechId = params.get('mech') || ROSTER[0].id;
  const themeId = params.get('battle') || 'neon';
  const theme = THEMES_BY_ID[themeId] || THEMES[0];
  const useDummy = params.get('dummy') !== '0';

  const engine = new Engine(document.getElementById('game-canvas'));
  const world = new World(engine, null);
  const arena = new Arena(engine, theme);
  world.arena = arena;
  arena.bind(world);
  world.spawnAmmoBoxes(6, arena.bounds * 0.6);
  engine.onBeforeView = (cam) => world.applyViewWrap(cam);
  engine.onAfterView = () => world.clearViewWrap();

  const input = new Input();
  world.input = input;

  const spawns = arena.spawnPoints(2);
  const def = applyColorScheme(ROSTER_BY_ID[mechId] || ROSTER[0], +params.get('c1') || 0);
  const player = new Fighter(world, def, {
    pos: spawns[0].pos, yaw: spawns[0].yaw, playerIndex: 0, isAI: false,
  });
  world.fighters.push(player);
  const fighters = [player];

  let dummy = null;
  if (useDummy) {
    const ddef = applyColorScheme(ROSTER_BY_ID.titanus || ROSTER[0], 1);
    dummy = new Fighter(world, ddef, {
      pos: spawns[1].pos, yaw: spawns[1].yaw, playerIndex: 1, isAI: true,
    });
    dummy.controlsLocked = true; // stands there and takes it
    world.fighters.push(dummy);
    fighters.push(dummy);
  }

  const cameraSys = new CameraSystem(engine, world);
  world.cameraSys = cameraSys;

  // ---- settings bar (mech / arena choosers, speed slider, dummy toggle) ----
  let timeScale = 1;
  const ui = document.createElement('div');
  ui.style.cssText = 'position:absolute;top:10px;right:10px;z-index:30;display:flex;flex-direction:column;gap:6px;align-items:flex-end;font:12px monospace;color:#8fe8ff;text-shadow:0 1px 2px #000;pointer-events:auto';
  const row = () => {
    const r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:6px;align-items:center';
    ui.appendChild(r);
    return r;
  };
  const mkSel = (parent, label, opts, cur, onPick) => {
    const sel = document.createElement('select');
    sel.style.cssText = 'background:#0b1420;color:#8fe8ff;border:1px solid #2a4a60;border-radius:4px;font:12px monospace;padding:2px 4px';
    for (const o of opts) {
      const e = document.createElement('option');
      e.value = o.id;
      e.textContent = `${label} ${o.name || o.id}`;
      if (o.id === cur) e.selected = true;
      sel.appendChild(e);
    }
    sel.addEventListener('change', () => onPick(sel.value));
    parent.appendChild(sel);
    return sel;
  };
  const reload = (k, v) => {
    const q = new URLSearchParams(location.search);
    q.set('debug', 'actions');
    q.set(k, v);
    location.search = q.toString();
  };
  const r1 = row();
  mkSel(r1, 'MECH:', ROSTER, player.def.id, (v) => reload('mech', v));
  mkSel(r1, 'MAP:', THEMES, themeId, (v) => reload('battle', v));
  const dumToggle = document.createElement('label');
  dumToggle.style.cssText = 'display:flex;gap:4px;align-items:center;cursor:pointer';
  dumToggle.innerHTML = `<input type="checkbox" ${useDummy ? 'checked' : ''}> DUMMY`;
  dumToggle.querySelector('input').addEventListener('change', (e) => reload('dummy', e.target.checked ? '1' : '0'));
  r1.appendChild(dumToggle);

  const r2 = row();
  const speedLabel = document.createElement('span');
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '5'; slider.max = '150'; slider.value = '100'; // percent
  slider.style.width = '160px';
  const setSpeed = (pct) => {
    timeScale = pct / 100;
    engine.timeScale = timeScale; // engine pre-scales dt (hit-stop included)
    slider.value = String(pct);
    speedLabel.textContent = `SPEED ${timeScale.toFixed(2)}×`;
  };
  slider.addEventListener('input', () => setSpeed(+slider.value));
  r2.appendChild(speedLabel);
  r2.appendChild(slider);
  const r3 = row();
  for (const pct of [10, 25, 50, 100]) {
    const b = document.createElement('button');
    b.textContent = pct === 100 ? '1×' : `${pct / 100}×`;
    b.style.cssText = 'background:#0b1420;color:#8fe8ff;border:1px solid #2a4a60;border-radius:4px;font:12px monospace;padding:2px 8px;cursor:pointer';
    b.addEventListener('click', () => setSpeed(pct));
    r3.appendChild(b);
  }
  setSpeed(100);
  document.getElementById('ui-root').appendChild(ui);

  // debug HUD + controls hint
  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;top:10px;left:10px;color:#8fe8ff;font:13px monospace;z-index:20;white-space:pre;text-shadow:0 1px 2px #000';
  document.getElementById('ui-root').appendChild(hud);
  const hint = document.createElement('div');
  hint.style.cssText = 'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#8fe8ff;font:12px monospace;z-index:20;text-shadow:0 1px 2px #000;opacity:0.8';
  hint.textContent = 'WASD move · SPACE jump · SHIFT dash · F light · G heavy · H block · R ranged · T special · Y ult · C duck — everything refills, go wild';
  document.getElementById('ui-root').appendChild(hint);

  engine.onUpdate = (dt) => {
    input.poll();
    if (player.alive) {
      const yawIn = cameraSys.inputYawFor(player, 0);
      input.readIntent('kb1', player.intent, yawIn);
    }
    // the whole point: no restrictions — everything is always ready
    player.hp = player.maxHp;
    player.ult = 1;
    player.specialCd = 0;
    player.rangedCd = 0;
    if (player.ammoMax !== undefined) player.ammo = player.ammoMax;
    if (dummy) { // unkillable target; pops back up if a move flings it
      dummy.hp = dummy.maxHp;
      if (!dummy.alive) {
        const sp = arena.spawnPoints(2)[1];
        dummy.resetForRound(sp.pos, sp.yaw);
        dummy.controlsLocked = true;
      }
    }
    world.update(dt); // dt arrives pre-scaled by engine.timeScale
    input.endFrame();
    hud.textContent = `${player.def.name}  ${player.state}  speed:${timeScale.toFixed(2)}×`;
  };
  engine.onRender = (dtReal) => {
    cameraSys.update(dtReal, fighters, [player]); // camera glides at real speed even in slow-mo
  };
  engine.start();
  window.__world = world;
  window.__fighters = fighters;
  return engine;
}
