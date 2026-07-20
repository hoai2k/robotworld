// ?rigedit=<mech> — interactive rig editor for a GLB mech.
//
// Loads the raw GLB mesh, drops a clean hand-placed skeleton onto it (from
// src/mechs/rigs/<id>.rig.js), and lets you DRAG each bone with an on-screen
// gizmo. The mesh re-skins live (per-part nearest-bone), a color view shows
// which bone owns each shell, a Test-swing animates the claws so you can judge
// articulation, and Export emits the bones array to paste back into the rig
// file. Edits persist to localStorage so a reload keeps your work.
//
//   ?rigedit=cranky
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Engine } from '../core/engine.js';
import { loadRawGlbScene } from '../mechs/gltf.js';
import { rigFor } from '../mechs/rigs/index.js';
import { applyCustomRig, setWeights, rebindRest } from '../mechs/reskin.js';
import { JOINT_ORDER } from '../mechs/rigadapter.js';

const VIEW = 10;                 // display scale for the small raw model
const JOINT_SET = new Set(JOINT_ORDER);
// distinct colors per bone role (game joints get vivid hues; struts gray)
function boneColor(name, i) {
  if (name.startsWith('shoulderL') || name.startsWith('elbowL') || name.startsWith('handL')) return [1.0, 0.15, 0.12];
  if (name.startsWith('shoulderR') || name.startsWith('elbowR') || name.startsWith('handR')) return [1.0, 0.62, 0.05];
  if (name.startsWith('thighL') || name.startsWith('kneeL') || name.startsWith('ankleL')) return [0.15, 0.35, 1.0];
  if (name.startsWith('thighR') || name.startsWith('kneeR') || name.startsWith('ankleR')) return [0.1, 0.8, 1.0];
  if (name === 'head') return [0.9, 0.9, 0.2];
  if (name === 'torso' || name === 'hips') return [0.55, 0.55, 0.6];
  // struts / extras — muted grays, slightly varied so neighbours differ
  const g = 0.28 + 0.08 * (i % 3);
  return [g, g, g * 1.1];
}

export async function runRigEdit(startId) {
  const id = startId && startId !== 'true' && startId !== '1' ? startId : 'cranky';
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera, renderer } = engine;
  scene.background = new THREE.Color(0x1a1f29);
  scene.add(new THREE.HemisphereLight(0xdfe6f2, 0x565c66, 2.2));
  const dl = new THREE.DirectionalLight(0xffffff, 2.0); dl.position.set(6, 12, 8); scene.add(dl);
  const grid = new THREE.GridHelper(40, 40, 0x33445e, 0x223040); scene.add(grid);

  camera.position.set(9, 7, 12);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 4, 0); orbit.update();

  const gizmo = new TransformControls(camera, renderer.domElement);
  gizmo.setMode('translate'); gizmo.setSpace('world'); gizmo.setSize(0.8);
  scene.add(gizmo.getHelper ? gizmo.getHelper() : gizmo);
  gizmo.addEventListener('dragging-changed', (e) => {
    orbit.enabled = !e.value;
    if (!e.value) onEditCommit();     // reweight when the drag ends
  });
  gizmo.addEventListener('objectChange', onGizmoMove);

  // ---- state ----
  let mesh = null, armature = null, container = null;
  let rigObj = null, bones = null, byName = null, root = null;
  let selName = null;
  let skelHelper = null;
  const handles = [];              // {mesh, name}
  let origMat = null, colorMat = null, colorOn = false;
  let swing = 0, swinging = false;

  const LS_KEY = () => `rigedit:${id}`;

  function loadRig() {
    const saved = localStorage.getItem(LS_KEY());
    if (saved) { try { return JSON.parse(saved); } catch { /* ignore */ } }
    const r = rigFor(id);
    return r ? JSON.parse(JSON.stringify(r)) : { bones: [] };
  }
  function saveRig() { localStorage.setItem(LS_KEY(), JSON.stringify(rigObj)); }

  async function load() {
    const raw = await loadRawGlbScene(id);
    if (!raw) { alert(`no GLB for ${id}`); return; }
    container = new THREE.Group();
    container.scale.setScalar(VIEW);
    container.add(raw.scene);
    scene.add(container);
    raw.scene.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
    armature = mesh.parent;
    container.updateMatrixWorld(true);
    // ground it: drop so the lowest skinned vertex sits on y=0
    origMat = mesh.material;
    rigObj = loadRig();
    rebuild(true);
    groundIt();
    buildBoneUI();
  }

  // (re)build the skeleton + weights from rigObj, refresh helpers/handles
  function rebuild(full) {
    if (full) {
      // remove any prior custom bone root
      if (root && root.parent) root.parent.remove(root);
      const res = applyCustomRig(mesh, rigObj);
      bones = res.bones; byName = res.byName; root = res.root;
      if (skelHelper) { scene.remove(skelHelper); skelHelper.dispose?.(); }
      skelHelper = new THREE.SkeletonHelper(root);
      skelHelper.material.linewidth = 2;
      scene.add(skelHelper);
      buildHandles();
    }
    updateColors();
  }

  function groundIt() {
    container.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    container.position.y -= box.min.y;
    container.updateMatrixWorld(true);
  }

  // clickable sphere per bone, positioned each frame at the bone's world pos
  function buildHandles() {
    for (const h of handles) scene.remove(h.mesh);
    handles.length = 0;
    rigObj.bones.forEach((bd, i) => {
      const col = boneColor(bd.name, i);
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 10),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(col[0], col[1], col[2]), depthTest: false }));
      m.renderOrder = 999;
      m.userData.name = bd.name;
      scene.add(m);
      handles.push({ mesh: m, name: bd.name });
    });
  }

  function syncHandles() {
    for (const h of handles) {
      const b = byName[h.name];
      if (b) b.getWorldPosition(h.mesh.position);
      const on = h.name === selName;
      h.mesh.scale.setScalar(on ? 1.6 : 1);
    }
  }

  // recompute rigObj positions from the live bones (mesh-local, unscaled)
  function syncRigFromBones() {
    const p = new THREE.Vector3();
    for (const bd of rigObj.bones) {
      const b = byName[bd.name];
      if (!b) continue;
      b.getWorldPosition(p);
      armature.worldToLocal(p);
      bd.pos = [round(p.x), round(p.y), round(p.z)];
    }
  }

  function onGizmoMove() {
    if (!selName) return;
    // moving the bind: keep the mesh at REST (don't deform while editing)
    if (!swinging) rebindRest(mesh, bones);
  }
  function onEditCommit() {
    if (!selName || swinging) return;
    syncRigFromBones();
    setWeights(mesh, rigObj);   // reassign vertices to the nearest new bone
    rebindRest(mesh, bones);
    updateColors();
    saveRig();
  }

  function selectBone(name) {
    selName = name;
    const b = byName[name];
    if (b) gizmo.attach(b);
    for (const c of jointList.children) c.dataset.on = String(c.dataset.name === name);
    styleList();
    posReadout();
  }

  // color the mesh by which bone owns each vertex
  function makeColorMat() {
    return new THREE.MeshBasicMaterial({ vertexColors: true }); // flat, no bloom
  }
  function updateColors() {
    if (!colorOn) return;
    const geo = mesh.geometry;
    const jnt = geo.attributes.skinIndex;
    const n = jnt.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const bi = jnt.getX(i);
      const bd = rigObj.bones[bi];
      const c = bd ? boneColor(bd.name, bi) : [0.3, 0.3, 0.3];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }
  function setColorMode(on) {
    colorOn = on;
    if (on) {
      colorMat = colorMat || makeColorMat();
      mesh.material = colorMat;
      updateColors();
    } else {
      mesh.material = origMat;
    }
  }

  // ---- picking ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (gizmo.dragging) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(handles.map((h) => h.mesh), false)[0];
    if (hit) selectBone(hit.object.userData.name);
  });

  // ---- test swing (rotate the claw + leg joints to check articulation) ----
  function applyTestPose(k) {
    // k: 0 rest .. 1 full. claws pitch forward, legs take a step.
    const set = (name, x, y, z) => { const b = byName[name]; if (b) b.rotation.set(x, y, z); };
    for (const s of ['L', 'R']) {
      set('shoulder' + s, -0.5 * k, 0, 0);
      set('elbow' + s, -0.35 * k, 0, 0);
      set('hand' + s, -0.2 * k, 0, 0);
    }
    set('thighL', 0.3 * k, 0, 0); set('kneeL', -0.4 * k, 0, 0);
    set('thighR', -0.3 * k, 0, 0); set('kneeR', 0.4 * k, 0, 0);
    mesh.updateMatrixWorld(true);
  }
  function resetPose() {
    for (const b of bones) b.rotation.set(0, 0, 0);
    mesh.updateMatrixWorld(true);
  }

  // ---- export ----
  function exportRig() {
    syncRigFromBones();
    const lines = rigObj.bones.map((b) =>
      `    { name: '${b.name}', parent: ${b.parent ? `'${b.parent}'` : 'null'}, pos: [${b.pos.map((v) => v.toFixed(2)).join(', ')}] },`);
    const txt = `export const ${id.toUpperCase()}_RIG = {\n  bones: [\n${lines.join('\n')}\n  ],\n};\n`;
    out.value = txt; out.style.display = 'block'; out.select();
    navigator.clipboard?.writeText(txt).catch(() => {});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/javascript' }));
    a.download = `${id}.rig.js`; a.click();
  }

  // ================= UI =================
  const panel = el('div', `position:fixed;top:10px;left:10px;z-index:50;font:12px/1.4 system-ui,sans-serif;
    color:#dfe8f5;background:rgba(16,20,28,0.94);border:1px solid #2c3648;border-radius:8px;
    padding:10px;width:260px;max-height:96vh;overflow:auto;user-select:none`);
  document.body.appendChild(panel);
  panel.appendChild(hdr(`RIG EDITOR · ${id}`));

  const modeRow = el('div', 'display:flex;gap:6px;margin:6px 0');
  const bMove = tog('Move', () => gizmo.setMode('translate'));
  const bColor = tog('Color view', () => setColorMode(!colorOn));
  modeRow.append(bMove, bColor); panel.appendChild(modeRow);

  panel.appendChild(lbl('Bones (click to select, drag gizmo to place)'));
  const jointList = el('div', 'display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px');
  panel.appendChild(jointList);
  const posEl = el('div', 'color:#9fb2c8;font-size:11px;margin-bottom:6px;min-height:14px'); panel.appendChild(posEl);

  const addRow = el('div', 'display:flex;gap:4px;margin-bottom:6px');
  const addName = el('input', 'flex:1;background:#0e131b;color:#dfe8f5;border:1px solid #2c3648;padding:3px;font-size:11px');
  addName.placeholder = 'new bone name';
  addRow.append(addName, btn('+ add', addBone)); panel.appendChild(addRow);
  panel.appendChild(btn('Delete selected bone', delBone));

  panel.appendChild(lbl('Test'));
  const swRow = el('label', 'display:flex;gap:6px;align-items:center;margin-bottom:4px;cursor:pointer');
  const swChk = document.createElement('input'); swChk.type = 'checkbox';
  swChk.onchange = () => { swinging = swChk.checked; if (!swinging) resetPose(); };
  swRow.append(swChk, document.createTextNode(' Swing claws/legs (loop)')); panel.appendChild(swRow);

  panel.appendChild(btn('Export rig ▶', exportRig, true));
  panel.appendChild(btn('Reset to file rig', () => { localStorage.removeItem(LS_KEY()); rigObj = loadRig(); rebuild(true); groundIt(); buildBoneUI(); }));
  const out = el('textarea', `width:100%;height:150px;margin-top:8px;background:#0b0f16;color:#8fe;border:1px solid #2c3648;font:10.5px/1.35 ui-monospace,monospace;display:none`);
  panel.appendChild(out);
  const help = el('div', 'margin-top:8px;color:#69788c;font-size:10.5px;line-height:1.5');
  help.innerHTML = 'Orbit: drag empty space · Zoom: wheel<br>Red/orange = claws (arms) · blue/cyan = legs · gray = struts.<br>Drag a bone into the geometry it should drive, then Color view to check ownership.';
  panel.appendChild(help);

  function buildBoneUI() {
    jointList.innerHTML = '';
    rigObj.bones.forEach((bd) => {
      const c = boneColor(bd.name, 0);
      const b = el('button', `padding:3px 5px;font-size:10.5px;border-radius:4px;cursor:pointer;border:1px solid #2c3648;background:#1a2433;color:#cfe0f5`);
      b.textContent = bd.name; b.dataset.name = bd.name;
      b.style.borderLeft = `4px solid rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`;
      b.onclick = () => selectBone(bd.name);
      jointList.appendChild(b);
    });
    styleList();
  }
  function styleList() {
    for (const c of jointList.children) {
      const on = c.dataset.on === 'true';
      c.style.outline = on ? '2px solid #48b0ff' : '';
      c.style.background = on ? '#24405e' : '#1a2433';
    }
  }
  function posReadout() {
    const bd = rigObj.bones.find((b) => b.name === selName);
    posEl.textContent = bd ? `${selName}  [${bd.pos.map((v) => v.toFixed(2)).join(', ')}]  parent: ${bd.parent || '—'}` : '';
  }
  function addBone() {
    const name = (addName.value || '').trim();
    if (!name || rigObj.bones.some((b) => b.name === name)) return;
    const parent = selName || 'hips';
    const pp = rigObj.bones.find((b) => b.name === parent)?.pos || [0, 0.3, 0];
    rigObj.bones.push({ name, parent, pos: [pp[0], pp[1] + 0.05, pp[2]] });
    addName.value = '';
    rebuild(true); buildBoneUI(); selectBone(name); saveRig();
  }
  function delBone() {
    if (!selName || selName === 'hips') return;
    rigObj.bones = rigObj.bones.filter((b) => b.name !== selName && b.parent !== selName);
    gizmo.detach(); selName = null;
    rebuild(true); buildBoneUI(); saveRig();
  }

  function el(t, css) { const e = document.createElement(t); e.style.cssText = css; return e; }
  function hdr(t) { const d = el('div', 'font-weight:600;color:#cfe3ff;margin-bottom:4px'); d.textContent = t; return d; }
  function lbl(t) { const d = el('div', 'color:#7d8ea3;font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin:6px 0 2px'); d.textContent = t; return d; }
  function tog(t, fn) { const b = el('button', 'flex:1;padding:5px;border-radius:4px;border:1px solid #2c3648;cursor:pointer;font-size:11px;background:#1a2433;color:#cfe0f5'); b.textContent = t; b.onclick = fn; return b; }
  function btn(t, fn, primary) { const b = el('button', `width:100%;padding:6px;margin-top:4px;border-radius:5px;border:1px solid #2c3648;cursor:pointer;font-size:11px;background:${primary ? '#1f7a4d' : '#1a2433'};color:${primary ? '#fff' : '#cfe0f5'}`); b.textContent = t; b.onclick = fn; return b; }
  function round(v) { return Math.round(v * 100) / 100; }

  await load();

  engine.onUpdate = (dt) => {
    if (swinging && !gizmo.dragging) {
      swing += dt * 1.4;
      applyTestPose((Math.sin(swing) * 0.5 + 0.5));
    }
    syncHandles();
    skelHelper?.update?.();
  };
  engine.onRender = () => orbit.update();
  engine.start();
  window.__rigedit = { get rig() { return rigObj; }, byName: () => byName };
  return engine;
}
