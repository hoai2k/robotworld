// Dev geyser demo: judge the GeyserFX water simulation on its own, in a
// hot-spring diorama, before wiring it into CRANKY's special.
//   ?geyser              — looping cycle: boil telegraph -> eruption -> collapse
//   ?geyser&t=3.2        — warp the sim to t seconds and FREEZE (headless shots)
//   ?geyser&orbit=0      — lock the camera still
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { Effects } from '../combat/effects.js';
import { GeyserFX } from '../combat/geyserfx.js';
import { rand } from '../core/utils.js';

const IDLE = 1.0;      // quiet pool before the telegraph starts
const WARN = 0.85;     // matches the in-game evade window
const SUSTAIN = 3.5;
const REST = 1.4;      // dead vent between cycles

export function runGeyserTest() {
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera } = engine;
  const params = new URLSearchParams(location.search);

  scene.background = new THREE.Color(0x101722);
  scene.fog = new THREE.Fog(0x101722, 70, 240);

  // ---- hot-spring diorama ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x3a3630, roughness: 0.95, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // mineral sinter terrace around the vent
  const sinter = new THREE.Mesh(
    new THREE.CircleGeometry(9, 40),
    new THREE.MeshStandardMaterial({ color: 0x6f7d76, roughness: 0.7, metalness: 0.05 })
  );
  sinter.rotation.x = -Math.PI / 2;
  sinter.position.y = 0.02;
  sinter.receiveShadow = true;
  scene.add(sinter);

  // standing pool (the geyser's puddle decal lands on top of this)
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 36),
    new THREE.MeshStandardMaterial({
      color: 0x1d4a66, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.9,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.04;
  scene.add(pool);

  // crater rim rocks
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4c463c, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand(-0.15, 0.15);
    const r = rand(4.8, 6.2);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.5, 1.3), 0), rockMat);
    rock.position.set(Math.cos(a) * r, rand(0.1, 0.4), Math.sin(a) * r);
    rock.rotation.set(rand(Math.PI), rand(Math.PI), rand(Math.PI));
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
  }
  for (let i = 0; i < 10; i++) {
    const a = rand(Math.PI * 2), r = rand(10, 30);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.8, 2.4), 0), rockMat);
    rock.position.set(Math.cos(a) * r, rand(0.2, 0.7), Math.sin(a) * r);
    rock.rotation.set(rand(Math.PI), rand(Math.PI), rand(Math.PI));
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
  }

  const effects = new Effects(scene);
  const origin = new THREE.Vector3(0, 0, 0);

  // ---- cycle state machine ----
  let geyser = null;
  let restT = IDLE;
  let simT = 0;
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;top:12px;left:12px;color:#8fe8ff;font:16px monospace;z-index:20';
  document.getElementById('ui-root')?.appendChild(label);

  function sim(dt) {
    simT += dt;
    if (geyser) {
      if (!geyser.update(dt)) {
        geyser.dispose();
        geyser = null;
        restT = REST;
      }
    } else {
      // idle vent: lazy steam wisps + the occasional burp
      if (Math.random() < dt * 6) effects.steamVent(origin);
      if (Math.random() < dt * 1.5) effects.splash(origin, 3, 2, 1);
      restT -= dt;
      if (restT <= 0) {
        geyser = new GeyserFX(scene, effects, origin, {
          height: 22, radius: 1.5, warn: WARN, sustain: SUSTAIN, boilRadius: 4.5,
        });
      }
    }
    effects.update(dt);
    label.textContent = geyser
      ? `geyser: ${geyser.phase}  t=${simT.toFixed(2)}`
      : `geyser: idle (${Math.max(0, restT).toFixed(1)}s)  t=${simT.toFixed(2)}`;
  }

  // ---- camera: frame the full column, slow orbit unless &orbit=0 ----
  const orbit = params.get('orbit') !== '0';
  const camDist = 34, camH = 12, lookY = 8.5;
  let camA = 0.55;
  function placeCamera() {
    camera.position.set(Math.sin(camA) * camDist, camH, Math.cos(camA) * camDist);
    camera.lookAt(0, lookY, 0);
  }
  placeCamera();

  engine.onUpdate = (dt) => {
    sim(dt);
    if (orbit) { camA += dt * 0.07; placeCamera(); }
  };

  // headless capture: &t=<sec> warps the sim deterministically then freezes,
  // so SwiftShader's ~20x slowdown can't smear the phase we want to judge
  const warp = parseFloat(params.get('t') || '0');
  if (warp > 0) {
    for (let t = 0; t < warp; t += 1 / 60) sim(1 / 60);
    engine.paused = true;
  }
  engine.start();
  return engine;
}
