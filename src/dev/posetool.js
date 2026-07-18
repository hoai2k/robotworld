// ?debug=models — GLB pose-matching tool.
//
// Shows the procedural (fallback) mech on the LEFT and the Tripo GLB on the
// RIGHT, both frozen at the same combat-rest pose. Pick a joint, then rotate
// (or translate) that bone with the on-screen gizmo until the GLB matches the
// procedural silhouette. "Output config" prints a manifest patch
// (boneCorrections / bonePos) you can merge into public/models/manifest.json;
// the runtime (rigadapter.js) applies boneCorrections as a fixed local
// rotation on top of retargeting, and buildGlbMech applies bonePos to the
// bone rest offset. So whatever you pose here reproduces in-game.
//
//   ?debug=models[&id=<mechId>]
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Engine } from '../core/engine.js';
import { buildMech } from '../mechs/factory.js';
import { Animator } from '../mechs/animator.js';
import { buildGlbForTool, fetchRawManifest } from '../mechs/gltf.js';
import { ROSTER, ROSTER_BY_ID } from '../mechs/roster.js';
import { JOINT_ORDER } from '../mechs/rigadapter.js';

const REST_CTX = { speed: 0, grounded: true, alwaysReady: true };
const R2D = 180 / Math.PI;

export async function runPoseTool(startId) {
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera, renderer } = engine;
  scene.background = new THREE.Color(0x232833);
  scene.add(new THREE.HemisphereLight(0xdfe6f2, 0x565c66, 2.0));
  const dir = new THREE.DirectionalLight(0xffffff, 2.2);
  dir.position.set(6, 11, 8);
  scene.add(dir);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x353a44, roughness: 0.96 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  camera.position.set(0, 6.5, 20);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 4.5, 0);
  orbit.update();

  const gizmo = new TransformControls(camera, renderer.domElement);
  gizmo.setSpace('local');
  gizmo.setMode('rotate');
  gizmo.setSize(0.7);
  scene.add(gizmo.getHelper ? gizmo.getHelper() : gizmo); // r166: add gizmo directly
  gizmo.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; });

  // manifest → list of mechs that actually have a GLB
  const manifest = await fetchRawManifest();
  const glbIds = ROSTER.map((r) => r.id).filter((id) => manifest[id]?.url);
  let curId = (startId && manifest[startId]?.url) ? startId : (glbIds[0] || ROSTER[0].id);

  // ---- state for the currently loaded pair ----
  let procMech = null, glbMech = null;
  let selJoint = null;
  const base = {};        // jname -> { q: Quaternion, p: Vector3 } captured at rest
  const groupL = new THREE.Group(); scene.add(groupL); // procedural (left)
  const groupR = new THREE.Group(); scene.add(groupR); // GLB (right)

  function clearGroup(g, mech) {
    if (mech) g.remove(mech.group);
  }

  async function load(id) {
    curId = id;
    gizmo.detach();
    selJoint = null;
    clearGroup(groupL, procMech); clearGroup(groupR, glbMech);
    for (const k of Object.keys(base)) delete base[k];

    const def = ROSTER_BY_ID[id];
    // LEFT: procedural, frozen at rest
    procMech = buildMech(def);
    procMech.animator = new Animator(procMech);
    procMech.animator.update(0.016, REST_CTX);
    procMech.group.position.set(-5.5, 0, 0);
    groupL.add(procMech.group);

    // RIGHT: GLB (forced, ignores ?debug gate), frozen at rest
    const built = await buildGlbForTool(def);
    glbMech = built.mech;
    glbMech.animator = glbMech.premadeAnimator || new Animator(glbMech);
    glbMech.animator.update(0.016, REST_CTX);
    glbMech.postAnimate?.();
    glbMech.group.position.set(5.5, 0, 0);
    groupR.add(glbMech.group);

    // capture the rest pose of every mapped bone as the correction baseline
    if (glbMech.boneMap) {
      for (const [j, b] of Object.entries(glbMech.boneMap)) {
        base[j] = { q: b.quaternion.clone(), p: b.position.clone() };
      }
    }
    buildJointButtons();
    setStatus(`${id.toUpperCase()} — ${glbMech.isGLB ? 'GLB loaded' : 'NO GLB (procedural only)'}`);
  }

  // ---- UI ----
  const panel = document.createElement('div');
  panel.style.cssText = `position:fixed;top:10px;left:10px;z-index:50;font:12px/1.4 system-ui,sans-serif;
    color:#dfe8f5;background:rgba(16,20,28,0.92);border:1px solid #2c3648;border-radius:8px;
    padding:10px;width:260px;max-height:94vh;overflow:auto;user-select:none`;
  document.body.appendChild(panel);

  const mechSel = document.createElement('select');
  mechSel.style.cssText = 'width:100%;margin-bottom:8px;background:#0e131b;color:#dfe8f5;border:1px solid #2c3648;padding:4px';
  for (const id of glbIds) {
    const o = document.createElement('option'); o.value = id; o.textContent = id; mechSel.appendChild(o);
  }
  mechSel.value = curId;
  mechSel.onchange = () => load(mechSel.value);
  panel.appendChild(label('Mech'));
  panel.appendChild(mechSel);

  const modeRow = document.createElement('div');
  modeRow.style.cssText = 'display:flex;gap:6px;margin:6px 0';
  const btnRotate = toggleBtn('Rotate', true, () => { setMode('rotate'); });
  const btnMove = toggleBtn('Translate', false, () => { setMode('translate'); });
  const btnSpace = toggleBtn('Local', true, () => {
    const local = gizmo.space === 'local';
    gizmo.setSpace(local ? 'world' : 'local');
    btnSpace.textContent = local ? 'World' : 'Local';
  });
  modeRow.append(btnRotate, btnMove, btnSpace);
  panel.appendChild(label('Gizmo'));
  panel.appendChild(modeRow);
  function setMode(m) {
    gizmo.setMode(m);
    btnRotate.dataset.on = String(m === 'rotate');
    btnMove.dataset.on = String(m === 'translate');
    styleToggle(btnRotate); styleToggle(btnMove);
  }

  panel.appendChild(label('Joint'));
  const jointGrid = document.createElement('div');
  jointGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px';
  panel.appendChild(jointGrid);

  function buildJointButtons() {
    jointGrid.innerHTML = '';
    const map = glbMech?.boneMap || {};
    for (const j of JOINT_ORDER) {
      const has = !!map[j];
      const b = document.createElement('button');
      b.textContent = j;
      b.disabled = !has;
      b.style.cssText = `padding:3px 2px;font-size:11px;border-radius:4px;cursor:${has ? 'pointer' : 'not-allowed'};
        background:${has ? '#1a2433' : '#141821'};color:${has ? '#cfe0f5' : '#55606f'};border:1px solid #2c3648`;
      if (has) b.onclick = () => selectJoint(j, b);
      b.dataset.joint = j;
      jointGrid.appendChild(b);
    }
  }

  function selectJoint(j, btn) {
    selJoint = j;
    const bone = glbMech.boneMap[j];
    gizmo.attach(bone);
    for (const el of jointGrid.children) el.style.outline = '';
    if (btn) btn.style.outline = '2px solid #48b0ff';
    setStatus(`Editing ${j} — drag the gizmo. Base captured at rest.`);
  }

  const actRow = document.createElement('div');
  actRow.style.cssText = 'display:flex;gap:6px;margin:6px 0';
  actRow.appendChild(actionBtn('Reset joint', () => {
    if (!selJoint || !base[selJoint]) return;
    const b = glbMech.boneMap[selJoint];
    b.quaternion.copy(base[selJoint].q); b.position.copy(base[selJoint].p);
  }));
  actRow.appendChild(actionBtn('Reset all', () => {
    for (const [j, b] of Object.entries(glbMech.boneMap || {})) {
      if (base[j]) { b.quaternion.copy(base[j].q); b.position.copy(base[j].p); }
    }
  }));
  panel.appendChild(actRow);

  panel.appendChild(actionBtn('Output config ▶', () => outputConfig(), true));

  const out = document.createElement('textarea');
  out.style.cssText = `width:100%;height:150px;margin-top:8px;background:#0b0f16;color:#8fe;border:1px solid #2c3648;
    font:11px/1.35 ui-monospace,monospace;display:none`;
  panel.appendChild(out);

  const status = document.createElement('div');
  status.style.cssText = 'margin-top:8px;color:#9fb2c8;font-size:11px;min-height:2.4em';
  panel.appendChild(status);
  function setStatus(s) { status.textContent = s; }

  const help = document.createElement('div');
  help.style.cssText = 'margin-top:8px;color:#69788c;font-size:10.5px;line-height:1.5';
  help.innerHTML = 'Orbit: drag empty space · Zoom: wheel<br>'
    + 'Left = procedural target, Right = GLB.<br>Rotate the GLB bones to match, then Output.';
  panel.appendChild(help);

  function outputConfig() {
    const boneCorrections = {}, bonePos = {};
    for (const [j, b] of Object.entries(glbMech.boneMap || {})) {
      const bs = base[j]; if (!bs) continue;
      // correction quaternion in bone-local: base^-1 * current
      const corr = bs.q.clone().invert().multiply(b.quaternion);
      const e = new THREE.Euler().setFromQuaternion(corr, 'XYZ');
      const dx = e.x * R2D, dy = e.y * R2D, dz = e.z * R2D;
      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15 || Math.abs(dz) > 0.15) {
        boneCorrections[j] = [round(dx), round(dy), round(dz)];
      }
      const pd = b.position.clone().sub(bs.p);
      if (pd.length() > 1e-3) bonePos[j] = [round(pd.x, 4), round(pd.y, 4), round(pd.z, 4)];
    }
    const patch = {};
    if (Object.keys(boneCorrections).length) patch.boneCorrections = boneCorrections;
    if (Object.keys(bonePos).length) patch.bonePos = bonePos;
    const json = JSON.stringify({ [curId]: patch }, null, 2);
    out.style.display = 'block';
    out.value = json;
    out.select();
    navigator.clipboard?.writeText(json).catch(() => {});
    // also offer a download
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pose-${curId}.json`;
    a.click();
    setStatus('Config copied to clipboard + downloaded. Paste into manifest.json.');
    console.log('[posetool] config for', curId, json);
  }

  // ---- helpers ----
  function label(t) { const d = document.createElement('div'); d.textContent = t;
    d.style.cssText = 'color:#7d8ea3;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:4px 0 2px'; return d; }
  function styleToggle(b) { const on = b.dataset.on === 'true';
    b.style.background = on ? '#2b6cb0' : '#1a2433'; b.style.color = on ? '#fff' : '#9fb2c8'; }
  function toggleBtn(text, on, fn) { const b = document.createElement('button');
    b.textContent = text; b.dataset.on = String(on);
    b.style.cssText = 'flex:1;padding:4px;border-radius:4px;border:1px solid #2c3648;cursor:pointer;font-size:11px';
    styleToggle(b); b.onclick = () => { fn(); styleToggle(b); }; return b; }
  function actionBtn(text, fn, primary) { const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `flex:1;padding:6px;border-radius:5px;border:1px solid #2c3648;cursor:pointer;font-size:11px;width:100%;
      background:${primary ? '#1f7a4d' : '#1a2433'};color:${primary ? '#fff' : '#cfe0f5'}`;
    b.onclick = fn; return b; }
  function round(v, d = 2) { const m = 10 ** d; return Math.round(v * m) / m; }

  setMode('rotate');
  await load(curId);
  // keep camera controls live; do NOT re-pose the mechs (edits must persist)
  engine.onUpdate = () => { orbit.update(); };
  engine.start();
  return engine;
}
