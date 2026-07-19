// Dev showcase: verify mech visuals & animation.
//   ?showcase            — all 12, idling
//   ?showcase=viper      — one mech rotating, cycling through action clips
//   ?showcase=viper&anim=walk  — locomotion ramp test
//   ?showcase=all&anim=<clip>  — all 12 playing one clip in sync
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { ROSTER } from '../mechs/roster.js';
import { Animator } from '../mechs/animator.js';
import { CLIPS } from '../mechs/animations.js';
import { createMech } from '../mechs/gltf.js';

export async function runShowcase(which) {
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
  window.__showcaseMechs = mechs; // probe hook
  window.__showcaseEngine = engine; // freeze hook for joint-isolation diagnostics
  const spacing = 8.5;
  // GLB-backed where the manifest says so, procedural otherwise — the
  // showcase judges exactly what the game will ship
  const built = await Promise.all(defs.map((def) => createMech(def)));
  built.forEach((mech, i) => {
    if (defs.length === 1) {
      mech.group.position.set(0, 0, 0);
    } else {
      const row = i < 6 ? 0 : 1;
      const col = i % 6;
      mech.group.position.set((col - 2.5) * spacing, 0, row * -11);
    }
    mech.animator = mech.premadeAnimator || new Animator(mech);
    scene.add(mech.group);
    mechs.push(mech);
  });

  // ?muzzle — mark every projectile-spawn anchor with a bright sphere that
  // tracks the pose, so a GLB's muzzles can be lined up with its cannon
  // geometry. Red = muzzleR, blue = muzzleL, green = any other cannon anchor.
  // Tuning (single mech): &mzj=<joint>&mzo=x,y,z re-pins muzzleR to that
  // virtual joint at that mech-scale offset (muzzleL mirrors X); read the
  // final numbers straight into the manifest "muzzles" field.
  if (params.has('muzzle')) {
    const markerAt = (anchor, color) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 10),
        new THREE.MeshBasicMaterial({ color, depthTest: false }));
      m.renderOrder = 999;
      anchor.add(m);
    };
    if (single && params.has('mzo')) {
      const mech = mechs[0];
      const useBone = params.has('mzbone'); // attach to a real GLB bone (boneMap)
      const jn = params.get('mzj') || 'handR';
      const jL = jn.endsWith('R') ? jn.slice(0, -1) + 'L' : jn;
      const [ox, oy, oz] = params.get('mzo').split(',').map(Number);
      // match installMuzzle's unit convention so tuned numbers drop into the
      // manifest verbatim: joint -> *dims.scale; bone -> *dims.scale/modelScale
      const modelScale = 1 / (mech.adapter?.hipsScale || 1);
      const s = useBone ? mech.dims.scale / modelScale : mech.dims.scale;
      const reAnchor = (name, key, sx) => {
        const old = mech.anchors[name];
        old?.parent?.remove(old);
        const parent = useBone ? mech.boneMap?.[key] : mech.joints[key];
        if (!parent) return;
        const a = new THREE.Object3D();
        a.position.set(sx * ox * s, oy * s, oz * s);
        parent.add(a);
        mech.anchors[name] = a;
      };
      reAnchor('muzzleR', jn, 1);
      reAnchor('muzzleL', jL, -1);
    }
    for (const mech of mechs) {
      for (const [name, a] of Object.entries(mech.anchors)) {
        if (!a?.isObject3D) continue;
        if (name === 'muzzleR') markerAt(a, 0xff2020);
        else if (name === 'muzzleL') markerAt(a, 0x2060ff);
        else if (/muzzle|barrel|cannon|spout|nozzle|mouth|pod/i.test(name)) markerAt(a, 0x20ff40);
      }
    }
  }

  if (defs.length === 1) {
    camera.position.set(4.2, 5.6, 12.2);
    camera.lookAt(0, 4.3, 0);
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
    const ctx = { speed: 0, maxSpeed: 10, grounded: true, vy: 0, alwaysReady: true };
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
