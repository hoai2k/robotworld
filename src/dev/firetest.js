// Dev fire demo: judge FlameFX (shader-card fire) against the current
// flipbook-particle fire, side by side, before wiring it into INFERNO.
//   ?fire            — LEFT: current effects.firePatch/fire()  RIGHT: FlameFX
//   ?fire&t=2.5      — warp the sim to t seconds and FREEZE (headless shots)
//   ?fire&orbit=0    — lock the camera still
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { Effects } from '../combat/effects.js';
import { FlameFX } from '../combat/flamefx.js';
import { rand } from '../core/utils.js';

export function runFireTest() {
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera } = engine;
  const params = new URLSearchParams(location.search);

  scene.background = new THREE.Color(0x0b0e14);
  scene.fog = new THREE.Fog(0x0b0e14, 60, 200);
  engine.hemi.intensity = 0.25;      // night scene — let the fires light it
  engine.sun.intensity = 0.5;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x35312c, roughness: 0.95, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // scorched fuel beds under each fire
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x191512, roughness: 0.9 });
  for (const x of [-7, 7]) {
    const bed = new THREE.Mesh(new THREE.CircleGeometry(3, 28), bedMat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(x, 0.02, 0);
    scene.add(bed);
    for (let i = 0; i < 8; i++) { // rubble ring
      const a = (i / 8) * Math.PI * 2 + rand(-0.2, 0.2);
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rand(0.3, 0.6), 0),
        new THREE.MeshStandardMaterial({ color: 0x3d372f, roughness: 0.9, flatShading: true })
      );
      rock.position.set(x + Math.cos(a) * rand(2.4, 3), 0.15, Math.sin(a) * rand(2.4, 3));
      rock.castShadow = rock.receiveShadow = true;
      scene.add(rock);
    }
  }

  const effects = new Effects(scene);
  const oldPos = new THREE.Vector3(-7, 0, 0);
  const flame = new FlameFX(scene, effects, new THREE.Vector3(7, 0, 0), {
    radius: 1.6, scale: 1.4, cards: 8,
  });

  // labels over each fire
  const ui = document.getElementById('ui-root');
  const mkLabel = (text, xf) => {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `position:absolute;top:12px;left:${xf}%;transform:translateX(-50%);color:#ffb066;font:16px monospace;z-index:20`;
    ui?.appendChild(el);
  };
  mkLabel('CURRENT (flipbook particles)', 28);
  mkLabel('NEW FlameFX (shader cards)', 72);

  const UPV = new THREE.Vector3(0, 1, 0);
  function sim(dt) {
    // LEFT: exactly what the game does today for ground fire, plus the
    // upward fire() ticks the flamethrower/specials use
    effects.firePatch(oldPos, 1.8);
    if (Math.random() < dt * 30) effects.fire(new THREE.Vector3(oldPos.x, 0.4, oldPos.z), UPV, 7, 0.35);
    // RIGHT: the shader-card burn
    flame.update(dt);
    effects.update(dt);
  }

  const orbit = params.get('orbit') !== '0';
  let camA = 0;
  const camDist = 20, camH = 5.2, lookY = 2.6;
  const placeCamera = () => {
    camera.position.set(Math.sin(camA) * 6, camH, camDist);
    camera.lookAt(0, lookY, 0);
  };
  placeCamera();

  engine.onUpdate = (dt) => {
    sim(dt);
    if (orbit) { camA += dt * 0.05; placeCamera(); }
  };

  // headless capture: warp deterministically, then freeze
  const warp = parseFloat(params.get('t') || '0');
  if (warp > 0) {
    for (let t = 0; t < warp; t += 1 / 60) sim(1 / 60);
    engine.paused = true;
  }
  engine.start();
  window.__fireEngine = engine; // capture hook
  return engine;
}
