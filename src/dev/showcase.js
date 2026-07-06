// Dev showcase: renders all 12 mechs in a line-up for visual verification.
// Open with ?showcase (all) or ?showcase=viper (one, rotating).
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { ROSTER } from '../mechs/roster.js';
import { buildMech } from '../mechs/factory.js';

export function runShowcase(which) {
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera } = engine;

  scene.background = new THREE.Color(0x141a26);
  scene.fog = new THREE.Fog(0x141a26, 60, 220);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.9, metalness: 0.1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const defs = which && which !== 'true' && which !== '1'
    ? ROSTER.filter((m) => m.id === which)
    : ROSTER;

  const mechs = [];
  const spacing = 7.5;
  defs.forEach((def, i) => {
    const mech = buildMech(def);
    if (defs.length === 1) {
      mech.group.position.set(0, 0, 0);
    } else {
      const row = i < 6 ? 0 : 1;
      const col = i % 6;
      mech.group.position.set((col - 2.5) * spacing, 0, row * -10);
    }
    scene.add(mech.group);
    mechs.push(mech);
  });

  if (defs.length === 1) {
    camera.position.set(0, 6.5, 16);
    camera.lookAt(0, 4.5, 0);
  } else {
    camera.position.set(0, 8, 34);
    camera.lookAt(0, 5, -4);
  }

  engine.onUpdate = (dt) => {
    if (defs.length === 1) mechs[0].group.rotation.y += dt * 0.5;
  };
  engine.start();
  return engine;
}
