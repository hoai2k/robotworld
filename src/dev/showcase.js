// Dev showcase: verify mech visuals & animation.
//   ?showcase            — all 12, idling
//   ?showcase=viper      — one mech rotating, cycling through action clips
//   ?showcase=viper&anim=walk  — locomotion ramp test
//   ?showcase=all&anim=<clip>  — all 12 playing one clip in sync
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { ROSTER } from '../mechs/roster.js';
import { buildMech } from '../mechs/factory.js';
import { Animator } from '../mechs/animator.js';
import { CLIPS } from '../mechs/animations.js';

export function runShowcase(which) {
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera } = engine;
  const params = new URLSearchParams(location.search);
  const animParam = params.get('anim');

  scene.background = new THREE.Color(0x141a26);
  scene.fog = new THREE.Fog(0x141a26, 60, 220);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.9, metalness: 0.1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const single = which && which !== 'true' && which !== '1' && which !== 'all';
  const defs = single ? ROSTER.filter((m) => m.id === which) : ROSTER;

  const mechs = [];
  const spacing = 8.5;
  defs.forEach((def, i) => {
    const mech = buildMech(def);
    if (defs.length === 1) {
      mech.group.position.set(0, 0, 0);
    } else {
      const row = i < 6 ? 0 : 1;
      const col = i % 6;
      mech.group.position.set((col - 2.5) * spacing, 0, row * -11);
    }
    mech.animator = new Animator(mech);
    scene.add(mech.group);
    mechs.push(mech);
  });

  if (defs.length === 1) {
    camera.position.set(0, 6.5, 17);
    camera.lookAt(0, 4.5, 0);
  } else {
    camera.position.set(0, 9, 38);
    camera.lookAt(0, 5, -4);
  }

  // clip cycling for single-mech mode
  const clipNames = Object.keys(CLIPS);
  let clipIdx = 0, clipTimer = 1.5;
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;top:12px;left:12px;color:#8fe8ff;font:16px monospace;z-index:20';
  document.getElementById('ui-root').appendChild(label);

  let t = 0;
  engine.onUpdate = (dt) => {
    t += dt;
    const ctx = { speed: 0, maxSpeed: 10, grounded: true, vy: 0 };
    if (animParam === 'walk') {
      ctx.speed = (Math.sin(t * 0.35) * 0.5 + 0.5) * 10;
      label.textContent = `locomotion speed=${ctx.speed.toFixed(1)}`;
    }
    for (const mech of mechs) {
      if (single && !animParam) {
        clipTimer -= dt / mechs.length;
        if (clipTimer <= 0) {
          const name = clipNames[clipIdx % clipNames.length];
          label.textContent = `clip: ${name}`;
          mech.animator.play(name);
          clipTimer = CLIPS[name].dur + 0.7;
          clipIdx++;
        }
      } else if (animParam && animParam !== 'walk' && CLIPS[animParam] && !mech.animator.action) {
        mech.animator.play(animParam);
        label.textContent = `clip: ${animParam}`;
      }
      mech.animator.update(dt, ctx);
    }
  };
  engine.start();
  return engine;
}
