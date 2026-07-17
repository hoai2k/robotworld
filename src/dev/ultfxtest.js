// Dev ult-FX demo: judge the tidal wave and fire tornado candidates for
// CRANKY's and INFERNO's ultimates before wiring them in.
//   ?ultfx=wave        — ring tidal wave cycling: swell -> sweep -> die out
//   ?ultfx=nado        — roaming fire tornado, ~7s life then reforms
//   &t=<sec>           — warp the sim and FREEZE (headless shots)
//   &orbit=0           — lock the camera still
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { Effects } from '../combat/effects.js';
import { TidalWaveFX } from '../combat/wavefx.js';
import { FireTornadoFX } from '../combat/nadofx.js';
import { rand } from '../core/utils.js';

export function runUltFxTest(which) {
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera } = engine;
  const params = new URLSearchParams(location.search);
  const mode = which === 'nado' ? 'nado' : 'wave';

  scene.background = new THREE.Color(0x0d1118);
  scene.fog = new THREE.Fog(0x0d1118, 80, 260);
  engine.hemi.intensity = 0.35;
  engine.sun.intensity = 0.9;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.95, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // scattered rubble so the effect's scale reads
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a443b, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 22; i++) {
    const a = rand(Math.PI * 2), r = rand(8, 36);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.5, 1.8), 0), rockMat);
    rock.position.set(Math.cos(a) * r, rand(0.1, 0.5), Math.sin(a) * r);
    rock.rotation.set(rand(Math.PI), rand(Math.PI), rand(Math.PI));
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
  }

  const effects = new Effects(scene);
  const origin = new THREE.Vector3(0, 0, 0);
  let fxObj = null;
  let restT = 0.8;
  let simT = 0;

  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;top:12px;left:12px;color:#8fe8ff;font:16px monospace;z-index:20';
  document.getElementById('ui-root')?.appendChild(label);

  function spawn() {
    fxObj = mode === 'wave'
      ? new TidalWaveFX(scene, effects, origin, { height: 8.5, r1: 36, speed: 14 })
      : new FireTornadoFX(scene, effects, origin.clone(), { height: 18, radius: 1.6, wander: 2.2, life: 7 });
  }

  function sim(dt) {
    simT += dt;
    if (fxObj) {
      if (!fxObj.update(dt)) {
        fxObj.dispose();
        fxObj = null;
        restT = 1.2;
      }
    } else {
      restT -= dt;
      if (restT <= 0) spawn();
    }
    effects.update(dt);
    label.textContent = `${mode}  t=${simT.toFixed(2)}` + (fxObj ? '' : '  (rest)');
  }

  const orbit = params.get('orbit') !== '0';
  let camA = 0.4;
  const camDist = mode === 'wave' ? 46 : 34;
  const camH = mode === 'wave' ? 15 : 11;
  const lookY = mode === 'wave' ? 3 : 7.5;
  const placeCamera = () => {
    camera.position.set(Math.sin(camA) * camDist, camH, Math.cos(camA) * camDist);
    camera.lookAt(0, lookY, 0);
  };
  placeCamera();

  engine.onUpdate = (dt) => {
    sim(dt);
    if (orbit) { camA += dt * 0.06; placeCamera(); }
  };

  const warp = parseFloat(params.get('t') || '0');
  if (warp > 0) {
    for (let t = 0; t < warp; t += 1 / 60) sim(1 / 60);
    engine.paused = true;
  }
  engine.start();
  window.__ultfxEngine = engine; // capture hook
  return engine;
}
