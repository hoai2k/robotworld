// ?debug=skin — GLB skin-repair workbench.
//
// Shows a mech's raw GLB colored BY DOMINANT BONE, so auto-rig weight
// mistakes read as wrong-colored patches (an arm-colored banner, a hip plate
// in forearm color). Click a patch to select its bone-island, then rebind it
// to the right bone; wiggle any bone to see exactly what moves with it.
// "Export ops" downloads a manifest patch: { "<id>": { "skinOps": [...] } } —
// paste into public/models/manifest.json (replaces the mech's skinOps).
// The SAME engine (skinops.js) applies those ops at game load, so what you
// see here is what ships.
//
//   ?debug=skin[&id=<mechId>]
//
// Controls: orbit = drag · zoom = wheel · pan = right-drag
//   click patch = select island · T = textures on/off · W = wiggle bone
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Engine } from '../core/engine.js';
import { ROSTER, ROSTER_BY_ID } from '../mechs/roster.js';
import { loadRawGlbScene, fetchRawManifest, skinnedBox } from '../mechs/gltf.js';
import { analyzeSkin, applySkinOps } from '../mechs/skinops.js';

export async function runSkinTool(startId) {
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera, renderer } = engine;
  scene.background = new THREE.Color(0x252a34);
  // dim, flat-ish lighting: the bone-color view must stay below the engine's
  // bloom threshold or every patch washes out into pastel glow
  scene.add(new THREE.HemisphereLight(0xdfe6f2, 0x565c66, 1.15));
  const dir = new THREE.DirectionalLight(0xffffff, 1.25);
  dir.position.set(6, 11, 8);
  scene.add(dir);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x333844, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  scene.add(new THREE.GridHelper(40, 40, 0x38445a, 0x2a3242));

  camera.position.set(0, 5.2, 11.5);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 3.6, 0);
  orbit.update();

  const manifest = await fetchRawManifest();
  const glbIds = ROSTER.map((r) => r.id).filter((id) => manifest[id]?.url);
  let curId = (startId && manifest[startId]?.url) ? startId : (glbIds[0] || ROSTER[0].id);

  // ---- state ----
  let holder = null;         // scaled group containing the raw scene
  let mesh = null;           // the SkinnedMesh
  let bones = [];            // skeleton bones
  let pristine = null;       // {skinIndex, skinWeight} copies of the raw file
  let analysis = null;       // pristine analysis — ALL ops select against this
  let colorAttr = null;      // Float32BufferAttribute vertexColors
  let ops = [];              // current op list (manifest skinOps replacement)
  let selComp = null;        // selected island (from pristine analysis)
  let mode = 'select';       // select | picktarget
  let texturedMat = null, boneMat = null, showTex = false;
  let wiggle = null;         // {bone, orig} while wiggling
  let hoverInfo = '';
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const boneColor = (bi) => new THREE.Color().setHSL(((bi * 137.508) % 360) / 360, 0.8, 0.42);

  function rebuildColors() {
    const n = mesh.geometry.attributes.position.count;
    if (!colorAttr) {
      colorAttr = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
      mesh.geometry.setAttribute('color', colorAttr);
    }
    // colors reflect the CURRENT (post-ops) dominant bone so a rebind is
    // instantly visible; islands still come from the pristine analysis.
    const live = analyzeSkin(mesh);
    for (let i = 0; i < n; i++) {
      const c = boneColor(live.domBone[i]);
      colorAttr.setXYZ(i, c.r, c.g, c.b);
    }
    if (selComp) {
      for (const v of selComp.verts) colorAttr.setXYZ(v, 1, 1, 1);
    }
    colorAttr.needsUpdate = true;
  }

  function applyAllOps() {
    // restore pristine weights, then re-apply the FULL ops list against the
    // pristine analysis — matches exactly how the game loader applies them.
    // (array.set, not copyArray: saurion's GLB packs skin attributes as
    // InterleavedBufferAttribute, which has no copyArray)
    mesh.geometry.attributes.skinIndex.array.set(pristine.skinIndex);
    mesh.geometry.attributes.skinWeight.array.set(pristine.skinWeight);
    mesh.geometry.attributes.skinIndex.needsUpdate = true;
    mesh.geometry.attributes.skinWeight.needsUpdate = true;
    applySkinOps(mesh, ops, analysis);
    rebuildColors();
    renderOps();
  }

  async function load(id) {
    curId = id;
    if (holder) { scene.remove(holder); holder = null; }
    selComp = null; wiggle = null; ops = []; colorAttr = null;
    const raw = await loadRawGlbScene(id);
    if (!raw) { setStatus('no GLB for ' + id); return; }
    mesh = null;
    raw.scene.traverse((o) => {
      if (o.isSkinnedMesh && !mesh) mesh = o;
      if (o.isMesh || o.isSkinnedMesh) o.frustumCulled = false;
    });
    if (!mesh) { setStatus('no skinned mesh in ' + id); return; }
    bones = mesh.skeleton.bones;
    pristine = {
      skinIndex: mesh.geometry.attributes.skinIndex.array.slice(),
      skinWeight: mesh.geometry.attributes.skinWeight.array.slice(),
    };
    analysis = analyzeSkin(mesh);
    // normalize display size: ~7 units tall, grounded, facing camera.
    // Measure the RENDERED skin (skinnedBox), not the geometry box — Tripo
    // rigs carry an Armature offset on the mesh node that skinning cancels,
    // so a geometry-box ground sinks the rendered mech into the floor.
    holder = new THREE.Group();
    holder.add(raw.scene);
    if (raw.entry.yawOffset) raw.scene.rotation.y = raw.entry.yawOffset * Math.PI / 180;
    const box = skinnedBox(raw.scene);
    const size = box.getSize(new THREE.Vector3());
    const k = 7 / Math.max(0.01, size.y);
    holder.scale.setScalar(k);
    holder.updateMatrixWorld(true);
    const b2 = skinnedBox(holder);
    const c = b2.getCenter(new THREE.Vector3());
    holder.position.set(-c.x, -b2.min.y, -c.z);
    scene.add(holder);
    texturedMat = mesh.material;
    boneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
    mesh.material = showTex ? texturedMat : boneMat;
    // preload the mech's committed ops so Export is a full replacement
    ops = (raw.entry.skinOps || []).map((o) => ({ ...o }));
    applyAllOps();
    buildBoneList();
    setStatus(`${id.toUpperCase()} — ${analysis.comps.length} islands, ${bones.length} bones.` +
      `\nClick a wrong-colored patch to select it.`);
  }

  // ---- picking ----
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(mesh, false);
    if (!hits.length) return null;
    const f = hits[0].face;
    // pick the face vertex whose island is smallest — clicks near seams favor
    // the small (usually miscolored) patch the user is aiming at
    let best = null;
    for (const vi of [f.a, f.b, f.c]) {
      const comp = analysis.comps[analysis.compId[vi]];
      if (!best || comp.count < best.comp.count) best = { vi, comp };
    }
    return best;
  }

  renderer.domElement.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev._downX = ev.clientX; ev._downY = ev.clientY;
    renderer.domElement._down = { x: ev.clientX, y: ev.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (ev) => {
    const d = renderer.domElement._down;
    if (!d || Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 6) return; // it was a drag
    if (!mesh) return;
    const hit = pick(ev);
    if (!hit) return;
    if (mode === 'picktarget') {
      // rebind the selected island to the clicked point's CURRENT bone
      const live = analyzeSkin(mesh);
      const targetBone = bones[live.domBone[hit.vi]];
      if (selComp && targetBone) addOp(selComp, targetBone.name);
      mode = 'select';
      updateModeUI();
      return;
    }
    selComp = hit.comp;
    stopWiggle();
    rebuildColors();
    setStatus(`Selected: island #${selComp.id} of ${selComp.boneName}` +
      `\n${selComp.count} verts · centroid [${selComp.centroid.map((v) => v.toFixed(2))}]` +
      `\nNow: "Rebind → click target" or pick a bone in the list.`);
  });

  renderer.domElement.addEventListener('pointermove', (ev) => {
    if (!mesh || ev.buttons) return;
    const hit = pick(ev);
    hoverInfo = hit ? `${hit.comp.boneName} · island ${hit.comp.id} · ${hit.comp.count}v` : '';
    hoverEl.textContent = hoverInfo;
  });

  function addOp(comp, toBone) {
    if (comp.boneName === toBone) { setStatus('That island already belongs to ' + toBone); return; }
    ops.push({ sel: { comp: comp.id }, to: toBone });
    selComp = null;
    applyAllOps();
    setStatus(`Rebound island #${comp.id} (${comp.count}v) → ${toBone}`);
  }

  // ---- bone wiggle (verify what moves) ----
  function startWiggle(bone) {
    stopWiggle();
    wiggle = { bone, orig: bone.quaternion.clone(), t: 0 };
    setStatus(`Wiggling ${bone.name} — watch what moves. W or click list to stop.`);
  }
  function stopWiggle() {
    if (wiggle) { wiggle.bone.quaternion.copy(wiggle.orig); wiggle = null; }
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 't' || ev.key === 'T') {
      showTex = !showTex;
      if (mesh) mesh.material = showTex ? texturedMat : boneMat;
    } else if (ev.key === 'w' || ev.key === 'W') {
      if (wiggle) stopWiggle();
      else if (selComp) startWiggle(bones[selComp.boneIndex]);
    } else if (ev.key === 'Escape') {
      selComp = null; mode = 'select'; stopWiggle(); rebuildColors(); updateModeUI();
    }
  });

  // ---- UI ----
  const panel = document.createElement('div');
  panel.style.cssText = `position:fixed;top:10px;left:10px;z-index:50;font:12px/1.45 system-ui,sans-serif;
    color:#dfe8f5;background:rgba(14,18,26,0.94);border:1px solid #2c3648;border-radius:8px;
    padding:10px;width:270px;max-height:94vh;overflow:auto;user-select:none`;
  document.body.appendChild(panel);

  const mechSel = document.createElement('select');
  mechSel.style.cssText = 'width:100%;margin-bottom:6px;background:#0e131b;color:#dfe8f5;border:1px solid #2c3648;padding:4px';
  for (const id of glbIds) {
    const o = document.createElement('option'); o.value = id; o.textContent = id; mechSel.appendChild(o);
  }
  mechSel.value = curId;
  mechSel.onchange = () => load(mechSel.value);
  panel.appendChild(label('Mech'));
  panel.appendChild(mechSel);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:6px;margin:4px 0';
  const rebindBtn = actionBtn('Rebind → click target', () => {
    if (!selComp) { setStatus('Select an island first (click a patch).'); return; }
    mode = mode === 'picktarget' ? 'select' : 'picktarget';
    updateModeUI();
  }, true);
  btnRow.appendChild(rebindBtn);
  panel.appendChild(btnRow);
  function updateModeUI() {
    rebindBtn.style.background = mode === 'picktarget' ? '#b0702b' : '#1f7a4d';
    rebindBtn.textContent = mode === 'picktarget' ? 'Click the CORRECT part…' : 'Rebind → click target';
  }

  const texRow = document.createElement('div');
  texRow.style.cssText = 'display:flex;gap:6px;margin:4px 0';
  texRow.appendChild(actionBtn('Colors/Textures (T)', () => {
    showTex = !showTex;
    if (mesh) mesh.material = showTex ? texturedMat : boneMat;
  }));
  texRow.appendChild(actionBtn('Wiggle bone (W)', () => {
    if (wiggle) stopWiggle();
    else if (selComp) startWiggle(bones[selComp.boneIndex]);
    else setStatus('Select an island first, then Wiggle shows what its bone moves.');
  }));
  panel.appendChild(texRow);

  panel.appendChild(label('Ops (this session + committed)'));
  const opsEl = document.createElement('div');
  opsEl.style.cssText = 'margin-bottom:6px;max-height:150px;overflow:auto';
  panel.appendChild(opsEl);
  function renderOps() {
    opsEl.innerHTML = '';
    if (!ops.length) {
      const d = document.createElement('div');
      d.style.color = '#69788c'; d.textContent = '(none)';
      opsEl.appendChild(d);
      return;
    }
    ops.forEach((op, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;align-items:center;margin:2px 0';
      const t = document.createElement('span');
      t.style.cssText = 'flex:1;font:11px ui-monospace,monospace;color:#9fdcc0';
      // ops without a `sel` are global weight-hygiene passes (purgeFar)
      if (op.purgeFar) {
        t.textContent = `purgeFar (strip far-hierarchy weights)`;
      } else if (!op.sel) {
        t.textContent = JSON.stringify(op);
      } else {
        const selTxt = op.sel.comp !== undefined && op.sel.bone === undefined
          ? `#${op.sel.comp}` : `${op.sel.bone}[${op.sel.comp ?? '*'}]`;
        t.textContent = `${selTxt} → ${op.to}`;
      }
      const x = document.createElement('button');
      x.textContent = '✕';
      x.style.cssText = 'background:#3a2027;color:#ff9c9c;border:1px solid #553;border-radius:4px;cursor:pointer;font-size:10px;padding:1px 6px';
      x.onclick = () => { ops.splice(i, 1); applyAllOps(); };
      row.append(t, x);
      opsEl.appendChild(row);
    });
  }

  panel.appendChild(actionBtn('Export ops ▶', () => {
    const json = JSON.stringify({ [curId]: { skinOps: ops } }, null, 2);
    out.style.display = 'block';
    out.value = json;
    out.select();
    navigator.clipboard?.writeText(json).catch(() => {});
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `skin-${curId}.json`;
    a.click();
    setStatus('Ops copied + downloaded. Merge into manifest.json under "' + curId + '".');
  }, true));

  const out = document.createElement('textarea');
  out.style.cssText = `width:100%;height:110px;margin-top:6px;background:#0b0f16;color:#8fe;border:1px solid #2c3648;
    font:11px/1.35 ui-monospace,monospace;display:none`;
  panel.appendChild(out);

  panel.appendChild(label('Bones (click = wiggle · dbl-click = rebind sel here)'));
  const boneList = document.createElement('div');
  boneList.style.cssText = 'max-height:230px;overflow:auto;font:11px ui-monospace,monospace';
  panel.appendChild(boneList);
  function buildBoneList() {
    boneList.innerHTML = '';
    const counts = new Map();
    for (const c of analysis.comps) counts.set(c.boneName, (counts.get(c.boneName) || 0) + c.count);
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name, cnt] of rows) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:1px 2px;cursor:pointer;border-radius:3px';
      const bi = bones.findIndex((b) => b.name === name);
      const sw = document.createElement('span');
      sw.style.cssText = `width:10px;height:10px;border-radius:2px;background:#${boneColor(bi).getHexString()};flex:none`;
      const t = document.createElement('span');
      t.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      t.textContent = name;
      const n = document.createElement('span');
      n.style.cssText = 'color:#69788c';
      n.textContent = cnt;
      row.append(sw, t, n);
      row.onmouseenter = () => { row.style.background = '#1a2433'; };
      row.onmouseleave = () => { row.style.background = ''; };
      row.onclick = () => { const b = bones[bi]; if (b) (wiggle?.bone === b) ? stopWiggle() : startWiggle(b); };
      row.ondblclick = () => { if (selComp) addOp(selComp, name); };
      boneList.appendChild(row);
    }
  }

  const status = document.createElement('div');
  status.style.cssText = 'margin-top:8px;color:#9fb2c8;font-size:11px;min-height:3.6em;white-space:pre-line';
  panel.appendChild(status);
  function setStatus(s) { status.textContent = s; }

  const help = document.createElement('div');
  help.style.cssText = 'margin-top:6px;color:#69788c;font-size:10.5px;line-height:1.5';
  help.innerHTML = 'Colors = which bone owns each patch.<br>'
    + '1. Click a wrong-colored patch (selects it, turns white)<br>'
    + '2. “Rebind → click target”, then click the part it should move with<br>'
    + '3. Wiggle (W) to verify · Export when happy.<br>'
    + 'Orbit: drag · Zoom: wheel · Pan: right-drag · Esc: deselect';
  panel.appendChild(help);

  const hoverEl = document.createElement('div');
  hoverEl.style.cssText = `position:fixed;right:12px;top:10px;z-index:50;color:#8fe8ff;
    font:12px ui-monospace,monospace;text-shadow:0 1px 2px #000;pointer-events:none`;
  document.body.appendChild(hoverEl);

  function label(t) { const d = document.createElement('div'); d.textContent = t;
    d.style.cssText = 'color:#7d8ea3;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:6px 0 2px'; return d; }
  function actionBtn(text, fn, primary) { const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `flex:1;padding:6px;border-radius:5px;border:1px solid #2c3648;cursor:pointer;font-size:11px;width:100%;
      background:${primary ? '#1f7a4d' : '#1a2433'};color:${primary ? '#fff' : '#cfe0f5'}`;
    b.onclick = fn; return b; }

  await load(curId);
  updateModeUI();
  engine.onUpdate = (dt) => {
    orbit.update();
    if (wiggle) {
      wiggle.t += dt;
      const a = Math.sin(wiggle.t * 3.2) * 0.55;
      wiggle.bone.quaternion.copy(wiggle.orig)
        .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(a, 0, 0)));
    }
  };
  engine.start();
  window.__skinTool = { engine, panel, get mesh() { return mesh; }, get ops() { return ops; }, get analysis() { return analysis; }, addOpByComp: (cid, to) => { const c = analysis.comps[cid]; if (c) addOp(c, to); }, load };
  return engine;
}
