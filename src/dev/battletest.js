// Dev battle test: full combat loop without menus.
//   ?battle=foundry&p1=titanus&p2=viper&p3=vulcan&auto=1
// auto=1 makes P1 an AI too (spectator soak test).
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { World } from '../game/world.js';
import { Arena } from '../arena/arena.js';
import { THEMES_BY_ID, THEMES } from '../arena/themes.js';
import { ROSTER_BY_ID, ROSTER } from '../mechs/roster.js';
import { Fighter } from '../combat/fighter.js';
import { AIController } from '../game/ai.js';
import { Input } from '../game/input.js';
import { CameraSystem } from '../game/camera.js';
import { pick } from '../core/utils.js';

export function runBattleTest() {
  const params = new URLSearchParams(location.search);
  const themeId = params.get('battle') || 'neon';
  const theme = THEMES_BY_ID[themeId] || THEMES[0];
  const auto = params.get('auto') === '1';

  const engine = new Engine(document.getElementById('game-canvas'));
  const world = new World(engine, null);
  const arena = new Arena(engine, theme);
  world.arena = arena;
  arena.bind(world);
  world.spawnAmmoBoxes(4, arena.bounds * 0.6);

  const input = new Input();
  world.input = input;

  const ids = [];
  for (let i = 1; i <= 4; i++) {
    const p = params.get('p' + i);
    if (p) ids.push(p === 'random' ? pick(ROSTER).id : p);
  }
  if (ids.length === 0) ids.push('titanus', 'viper');

  const spawns = arena.spawnPoints(ids.length);
  const fighters = [];
  const ais = [];
  ids.forEach((id, i) => {
    const def = ROSTER_BY_ID[id] || pick(ROSTER);
    const f = new Fighter(world, def, {
      pos: spawns[i].pos, yaw: spawns[i].yaw, playerIndex: i, isAI: auto || i > 0,
    });
    fighters.push(f);
    world.fighters.push(f);
    if (auto || i > 0) ais.push(new AIController(f, params.get('diff') || 'veteran'));
  });

  let humans = auto ? [] : [fighters[0]];
  const cameraSys = new CameraSystem(engine, world);
  if (params.get('forcesplit') === '1') {
    humans = fighters.slice(0, Math.min(4, fighters.length));
    fighters.forEach((f, i) => f.pos.set((i % 2) * 90 - 45, 0, (i >> 1) * 60 - 30));
  }
  const layoutParam = params.get('layout'); // lr | tb (2-human split preview)
  if (layoutParam === 'lr' || layoutParam === 'tb') cameraSys.layout2p = layoutParam;

  // simple debug HUD
  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;top:10px;left:10px;color:#8fe8ff;font:13px monospace;z-index:20;white-space:pre;text-shadow:0 1px 2px #000';
  document.getElementById('ui-root').appendChild(hud);

  engine.onUpdate = (dt) => {
    input.poll();
    if (!auto && fighters[0].alive) {
      const yawIn = cameraSys.inputYawFor(fighters[0], 0);
      input.readIntent('kb1', fighters[0].intent, yawIn);
    }
    for (const ai of ais) ai.update(dt);
    world.update(dt);
    input.endFrame();

    hud.textContent = fighters.map((f) =>
      `${f.def.name.padEnd(9)} hp:${Math.max(0, f.hp | 0).toString().padStart(4)} ult:${(f.ult * 100) | 0}% ${f.state}`
    ).join('\n') + `\ncam:${cameraSys.mode} draws:${engine.renderer.info.render.calls}`;
  };
  engine.onRender = (dtReal) => {
    cameraSys.update(dtReal, fighters, humans);
  };
  engine.start();
  window.__world = world; // debug hooks
  window.__ais = ais;
  window.__cam = cameraSys;
  window.__fighters = fighters;
  return engine;
}
