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
import { applyCustomRig, setWeights, rebindRest, buildRigPosts } from '../mechs/reskin.js';
import { JOINT_ORDER } from '../mechs/rigadapter.js';

const VIEW = 10;                 // display scale for the small raw model
const JOINT_SET = new Set(JOINT_ORDER);
// distinct colors per bone role (game joints get vivid hues; struts gray)
function boneColor(name, i) {
  if (name.startsWith('shoulderL') || name.startsWith('elbowL') || name.startsWith('handL') || name === 'clawL') return [1.0, 0.15, 0.12];
  if (name.startsWith('shoulderR') || name.startsWith('elbowR') || name.startsWith('handR') || name === 'clawR') return [1.0, 0.62, 0.05];
  if (name.startsWith('thighL') || name.startsWith('kneeL') || name.startsWith('ankleL') || name === 'footL') return [0.15, 0.35, 1.0];
  if (name.startsWith('thighR') || name.startsWith('kneeR') || name.startsWith('ankleR') || name === 'footR') return [0.1, 0.8, 1.0];
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
    if (e.value) dragSnap = snapshotRig();   // capture pre-drag state for undo
    else onEditCommit();                     // reweight when the drag ends
  });
  gizmo.addEventListener('objectChange', onGizmoMove);

  // ---- state ----
  let mesh = null, armature = null, container = null;
  let rigObj = null, bones = null, byName = null, root = null;
  let selName = null;
  let skelHelper = null;
  let postMeshes = [];             // black rig posts (reskin.buildRigPosts)
  const handles = [];              // {mesh, name}
  let origMat = null, colorMat = null, colorOn = false;
  let swing = 0, swinging = false;
  let soloRoot = null;             // solo a bone's subtree (declutter the rest)
  let undoStack = [], redoStack = [];
  let dragSnap = null;             // rig snapshot captured at gizmo drag-start

  const LS_KEY = () => `rigedit:${id}`;

  // ---- undo/redo (snapshots of rigObj) ----
  const snapshotRig = () => JSON.parse(JSON.stringify(rigObj));
  function pushUndo() {
    undoStack.push(snapshotRig());
    if (undoStack.length > 200) undoStack.shift();
    redoStack.length = 0;
  }
  function restoreRig(snap) {
    rigObj = snap;
    rebuild(true); buildBoneUI();
    if (selName && rigObj.bones.some((b) => b.name === selName)) selectBone(selName);
    else { gizmo.detach(); selName = null; }
    if (soloRoot && !rigObj.bones.some((b) => b.name === soloRoot)) soloRoot = null;
    updateSolo();
    saveRig();
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshotRig());
    restoreRig(undoStack.pop());
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshotRig());
    restoreRig(redoStack.pop());
  }

  // ---- solo a bone's subtree (bone + all descendants) ----
  function subtreeSet(rootName) {
    const set = new Set();
    if (!rootName) return set;
    const kids = new Map();
    for (const b of rigObj.bones) {
      if (!kids.has(b.parent)) kids.set(b.parent, []);
      kids.get(b.parent).push(b.name);
    }
    const stack = [rootName];
    while (stack.length) {
      const n = stack.pop();
      if (set.has(n)) continue;
      set.add(n);
      for (const k of (kids.get(n) || [])) stack.push(k);
    }
    return set;
  }
  // Solo just DECLUTTERS: it hides the other bones' dots and the skeleton
  // connections between them so you can focus on one subtree. It does NOT
  // touch the robot rendering (no dimming, no forced color view) — the mesh
  // looks exactly the same.
  function toggleSolo(name) {
    soloRoot = soloRoot === name ? null : name;
    updateSolo();
    styleList();
    refreshModeButtons();
  }
  function updateSolo() {
    const sub = soloRoot ? subtreeSet(soloRoot) : null;
    for (const h of handles) h.mesh.visible = !sub || sub.has(h.name);
    // hide the full skeleton and, while soloing, draw ONLY the subtree's
    // connections in a dedicated line set (masking the shared helper buffer is
    // unreliable across GL backends, so use real geometry instead)
    if (skelHelper) skelHelper.visible = !soloRoot;
    buildSoloLines(sub);
  }
  // list of [{child, parent}] connections, one per skeleton segment
  let helperSeg = [];
  let soloLines = null;   // THREE.LineSegments of just the solo subtree
  let soloSeg = [];       // the {child,parent} pairs currently in soloLines
  function refreshHelperSeg() {
    helperSeg = [];
    if (!skelHelper) return;
    for (const b of skelHelper.bones) {
      if (b.parent && b.parent.isBone) helperSeg.push({ child: b.name, parent: b.parent.name });
    }
  }
  function disposeSoloLines() {
    if (!soloLines) return;
    scene.remove(soloLines);
    soloLines.geometry.dispose(); soloLines.material.dispose();
    soloLines = null; soloSeg = [];
  }
  function buildSoloLines(sub) {
    disposeSoloLines();
    if (!sub) return;
    soloSeg = helperSeg.filter((s) => sub.has(s.child) && sub.has(s.parent));
    if (!soloSeg.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(soloSeg.length * 6), 3));
    // draw on top like the handles so the focused chain reads clearly
    const mat = new THREE.LineBasicMaterial({ color: 0x8fe6b0, depthTest: false, transparent: true });
    soloLines = new THREE.LineSegments(geo, mat);
    soloLines.renderOrder = 998;
    scene.add(soloLines);
    updateSoloLines();
  }
  const _wa = new THREE.Vector3(), _wb = new THREE.Vector3();
  function updateSoloLines() {
    if (!soloLines) return;
    const pos = soloLines.geometry.attributes.position;
    for (let i = 0; i < soloSeg.length; i++) {
      const cb = byName[soloSeg[i].child], pb = byName[soloSeg[i].parent];
      if (!cb || !pb) continue;
      cb.getWorldPosition(_wa); pb.getWorldPosition(_wb);
      pos.setXYZ(i * 2, _wa.x, _wa.y, _wa.z);
      pos.setXYZ(i * 2 + 1, _wb.x, _wb.y, _wb.z);
    }
    pos.needsUpdate = true;
  }

  function loadRig() {
    const saved = localStorage.getItem(LS_KEY());
    if (saved) { try { return JSON.parse(saved); } catch { /* ignore */ } }
    const r = rigFor(id);
    return r ? JSON.parse(JSON.stringify(r)) : { bones: [] };
  }
  function saveRig() { localStorage.setItem(LS_KEY(), JSON.stringify(rigObj)); }

  const useAlt = new URLSearchParams(location.search).get('alt') === '1';
  async function load() {
    const raw = await loadRawGlbScene(id, { alt: useAlt });
    if (!raw) { alert(`no GLB for ${id}${useAlt ? ' (alt)' : ''}`); return; }
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
      refreshHelperSeg();
      buildHandles();
    }
    regenPosts();
    updateColors();
  }

  // (re)wire the black posts from the current bone positions (they're parented
  // to the bones, so this reflects every move/add the user makes). This runs on
  // structural changes (add/del/reset); the per-frame updatePostsLive() below
  // keeps the rods glued to the bones WHILE you drag.
  function regenPosts() {
    for (const m of postMeshes) { m.parent?.remove(m); m.geometry?.dispose?.(); }
    postMeshes = buildRigPosts(byName, rigObj);
  }

  // The posts are an add-on for rendering, not core geometry — they must track
  // the back-leg bones live. Each rod cylinder is parented to its PARENT bone
  // and points at the CHILD bone; every frame we re-length + re-orient it from
  // the bones' current positions so moving a joint drags its rod with it. (Cap
  // spheres are parented to the child bone, so they follow on their own.)
  const _PU = new THREE.Vector3(0, 1, 0);
  const _pc = new THREE.Vector3();
  function updatePostsLive() {
    for (const m of postMeshes) {
      const childName = m.userData.rigPost;               // set only on rod cylinders
      if (!childName || !m.geometry?.parameters?.height) continue;
      const child = byName[childName];
      const parentBone = m.parent;                        // the bone the rod hangs off
      if (!child || !parentBone) continue;
      child.getWorldPosition(_pc);
      parentBone.worldToLocal(_pc);                       // child offset in parent space
      const len = _pc.length();
      if (len < 1e-4) continue;
      m.scale.set(1, len / m.geometry.parameters.height, 1); // geometry base sits at origin
      m.quaternion.setFromUnitVectors(_PU, _pc.normalize());
      m.position.set(0, 0, 0);
    }
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
    // record the pre-drag snapshot on the undo stack only if the drag actually
    // moved something
    if (dragSnap && JSON.stringify(dragSnap) !== JSON.stringify(rigObj)) {
      undoStack.push(dragSnap);
      if (undoStack.length > 200) undoStack.shift();
      redoStack.length = 0;
    }
    dragSnap = null;
    setWeights(mesh, rigObj);   // reassign vertices to the nearest new bone
    rebindRest(mesh, bones);
    regenPosts();               // posts follow the moved bones
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
    refreshModeButtons();
  }

  // ---- picking ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (gizmo.dragging) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // only pick VISIBLE handles — when soloing, the dimmed-out bones aren't
    // selectable, so you can only move the joints you're focused on
    const hit = ray.intersectObjects(handles.filter((h) => h.mesh.visible).map((h) => h.mesh), false)[0];
    if (hit) selectBone(hit.object.userData.name);
  });

  // ---- keyboard: undo/redo + solo ----
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === addName) return;   // don't hijack the name field
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault(); if (e.shiftKey) redo(); else undo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault(); redo(); return;
    }
    if (e.key === 's' || e.key === 'S') {
      if (selName) toggleSolo(selName);
    }
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
  const bSolo = tog('Solo subtree (S)', () => { if (selName) toggleSolo(selName); });
  modeRow.append(bMove, bColor, bSolo); panel.appendChild(modeRow);

  const histRow = el('div', 'display:flex;gap:6px;margin:0 0 6px');
  histRow.append(tog('↶ Undo', undo), tog('↷ Redo', redo));
  panel.appendChild(histRow);

  // background color of the 3D viewer — the black posts vanish on a black
  // backdrop, so let the user recolor it (persisted across reloads)
  const BG_KEY = 'rigedit:bg';
  const savedBg = localStorage.getItem(BG_KEY) || '#1a1f29';
  scene.background = new THREE.Color(savedBg);
  const bgRow = el('div', 'display:flex;gap:5px;align-items:center;margin:0 0 6px');
  const bgLab = el('span', 'color:#7d8ea3;font-size:10px;text-transform:uppercase;letter-spacing:.05em');
  bgLab.textContent = 'BG';
  const bgInput = el('input', 'width:30px;height:22px;border:1px solid #2c3648;border-radius:4px;background:#0e131b;cursor:pointer;padding:1px');
  bgInput.type = 'color'; bgInput.value = savedBg;
  const setBg = (hex) => { scene.background = new THREE.Color(hex); bgInput.value = hex; try { localStorage.setItem(BG_KEY, hex); } catch { /* ignore */ } };
  bgInput.oninput = () => setBg(bgInput.value);
  bgRow.append(bgLab, bgInput);
  for (const [name, hex] of [['dark', '#1a1f29'], ['slate', '#4a5568'], ['light', '#c8d0da'], ['teal', '#123a3a']]) {
    const sw = el('button', `width:20px;height:20px;border-radius:4px;border:1px solid #2c3648;cursor:pointer;background:${hex}`);
    sw.title = name; sw.onclick = () => setBg(hex);
    bgRow.appendChild(sw);
  }
  panel.appendChild(bgRow);
  function refreshModeButtons() {
    bColor.style.background = colorOn ? '#24405e' : '#1a2433';
    bSolo.style.background = soloRoot ? '#1f7a4d' : '#1a2433';
    bSolo.textContent = soloRoot ? `Solo: ${soloRoot} (S)` : 'Solo subtree (S)';
  }

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
  panel.appendChild(btn('Reset to file rig', () => {
    pushUndo();
    localStorage.removeItem(LS_KEY());
    rigObj = loadRig(); rebuild(true); groundIt(); buildBoneUI();
    if (soloRoot && !rigObj.bones.some((b) => b.name === soloRoot)) soloRoot = null;
    updateSolo();
  }));
  const out = el('textarea', `width:100%;height:150px;margin-top:8px;background:#0b0f16;color:#8fe;border:1px solid #2c3648;font:10.5px/1.35 ui-monospace,monospace;display:none`);
  panel.appendChild(out);
  const help = el('div', 'margin-top:8px;color:#69788c;font-size:10.5px;line-height:1.5');
  help.innerHTML = 'Orbit: drag empty space · Zoom: wheel<br>Red/orange = claws (arms) · blue/cyan = legs · gray = struts.<br>'
    + 'Drag a bone into the geometry it should drive, then Color view to check ownership.<br>'
    + 'Undo/redo: Ctrl+Z / Ctrl+Shift+Z · Solo a bone’s subtree: select + S, or right-click a bone (hides the other dots + connections so only those joints are pickable; the robot render is untouched).';
  panel.appendChild(help);

  function buildBoneUI() {
    jointList.innerHTML = '';
    rigObj.bones.forEach((bd) => {
      const c = boneColor(bd.name, 0);
      const b = el('button', `padding:3px 5px;font-size:10.5px;border-radius:4px;cursor:pointer;border:1px solid #2c3648;background:#1a2433;color:#cfe0f5`);
      b.textContent = bd.name; b.dataset.name = bd.name;
      b.style.borderLeft = `4px solid rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`;
      b.onclick = () => selectBone(bd.name);
      b.oncontextmenu = (e) => { e.preventDefault(); toggleSolo(bd.name); }; // right-click = solo
      b.title = 'click: select · right-click: solo subtree';
      jointList.appendChild(b);
    });
    styleList();
  }
  function styleList() {
    const sub = soloRoot ? subtreeSet(soloRoot) : null;
    for (const c of jointList.children) {
      const on = c.dataset.on === 'true';
      const solo = sub && sub.has(c.dataset.name);
      c.style.outline = on ? '2px solid #48b0ff' : (c.dataset.name === soloRoot ? '2px solid #6ee7a0' : '');
      c.style.background = on ? '#24405e' : (solo ? '#255c3f' : '#1a2433');
      c.style.opacity = (sub && !solo) ? '0.4' : '1';
    }
  }
  function posReadout() {
    const bd = rigObj.bones.find((b) => b.name === selName);
    posEl.textContent = bd ? `${selName}  [${bd.pos.map((v) => v.toFixed(2)).join(', ')}]  parent: ${bd.parent || '—'}` : '';
  }
  function addBone() {
    const name = (addName.value || '').trim();
    if (!name || rigObj.bones.some((b) => b.name === name)) return;
    pushUndo();
    const parent = selName || 'hips';
    const pp = rigObj.bones.find((b) => b.name === parent)?.pos || [0, 0.3, 0];
    rigObj.bones.push({ name, parent, pos: [pp[0], pp[1] + 0.05, pp[2]] });
    addName.value = '';
    rebuild(true); buildBoneUI(); selectBone(name); updateSolo(); saveRig();
  }
  function delBone() {
    if (!selName || selName === 'hips') return;
    pushUndo();
    if (soloRoot === selName) soloRoot = null;
    rigObj.bones = rigObj.bones.filter((b) => b.name !== selName && b.parent !== selName);
    gizmo.detach(); selName = null;
    rebuild(true); buildBoneUI(); updateSolo(); saveRig();
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
    updateSoloLines();   // keep the solo subtree's connections on the bones
    updatePostsLive();   // keep the black rods glued to the back-leg bones
  };
  engine.onRender = () => orbit.update();
  engine.start();
  window.__rigedit = { get rig() { return rigObj; }, byName: () => byName,
    solo: toggleSolo, undo, redo, select: selectBone };
  return engine;
}
