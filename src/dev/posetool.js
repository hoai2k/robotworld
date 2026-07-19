// ?debug=models — side-by-side PROCEDURAL vs GLB debugger for a mech.
//
// Two modes (toggle top-left):
//  • ACTION — both models are live Fighters on a bare stage. A controller or
//    the keyboard triggers the SAME attack on BOTH at once, with real
//    projectiles, so you can compare the two renderings in motion. A speed
//    slider slow-mos everything; a status panel names the current action and
//    its known characteristics, tagging any that apply to only one version.
//    Each model faces an invincible dummy stood just in front (attacks that
//    need a target engage it; ground attacks hit the floor here too).
//  • POSE — both models frozen at the deterministic rest. A per-bone gizmo
//    poses the GLB to match the procedural; "Output config" emits a manifest
//    patch (boneCorrections / bonePos). A head-height guide shows the
//    canonical size (GLB head matched to procedural head-top).
//
//   ?debug=models[&mech=<id>][&mode=action|pose]
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Engine } from '../core/engine.js';
import { World } from '../game/world.js';
import { Fighter } from '../combat/fighter.js';
import { Input } from '../game/input.js';
import { buildMech } from '../mechs/factory.js';
import { Animator } from '../mechs/animator.js';
import { buildGlbForTool, fetchRawManifest, measureHeadTop } from '../mechs/gltf.js';
import { ROSTER, ROSTER_BY_ID, applyColorScheme } from '../mechs/roster.js';
import { JOINT_ORDER } from '../mechs/rigadapter.js';
import { describeAction, ACTIONS } from './actionchars.js';

const R2D = 180 / Math.PI;
const PAIR_X = 6;              // half-separation of the two models
const INTENT_BTNS = ['light', 'lightHeld', 'heavy', 'heavyHeld', 'ranged', 'rangedHeld',
  'special', 'specialHeld', 'block', 'dash', 'jump', 'jumpHeld', 'duck'];

export async function runPoseTool(startId) {
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera, renderer } = engine;
  scene.background = new THREE.Color(0x232833);
  scene.add(new THREE.HemisphereLight(0xdfe6f2, 0x565c66, 2.0));
  const dir = new THREE.DirectionalLight(0xffffff, 2.2);
  dir.position.set(6, 11, 8);
  scene.add(dir);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x353a44, roughness: 0.96 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  scene.add(new THREE.GridHelper(60, 60, 0x38445a, 0x222c3a));

  // bare world (no arena — clean stage; World's arena hooks are all optional)
  const world = new World(engine, null);
  const input = new Input();
  world.input = input;

  camera.position.set(14, 8, 15);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 4, 2);
  orbit.update();

  const gizmo = new TransformControls(camera, renderer.domElement);
  gizmo.setSpace('local'); gizmo.setMode('rotate'); gizmo.setSize(0.7);
  scene.add(gizmo.getHelper ? gizmo.getHelper() : gizmo);
  gizmo.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; });

  const params = new URLSearchParams(location.search);
  const manifest = await fetchRawManifest();
  const glbIds = ROSTER.map((r) => r.id).filter((id) => manifest[id]?.url);
  let curId = (startId && manifest[startId]?.url) ? startId : (glbIds[0] || ROSTER[0].id);
  let mode = params.get('mode') === 'pose' ? 'pose' : 'action';
  let timeScale = 1;

  // ---- live state ----
  let procF = null, glbF = null, procDummy = null, glbDummy = null;
  let selJoint = null;
  const base = {};                         // gizmo baseline (pose mode)
  const refGroup = new THREE.Group(); scene.add(refGroup);
  const scratch = blankIntent(), pad = blankIntent(), prev = {};
  let lastAction = 'idle';
  let dummyPost = 8;   // z distance of the invisible aim targets
  let idleT = 0;       // real seconds both fighters have been back at rest
  let lastWasWalk = false; // last displacement came from stick movement (2s reset)

  // Actions that translate the mech (lunges, dashes) move it only
  // TEMPORARILY: positions snap back home 3s after the action settles, or
  // the moment the next action starts — so the animation can be studied
  // without chasing the mechs around the stage.
  function resetPositions() {
    for (const [f, x] of [[procF, -PAIR_X], [glbF, PAIR_X]]) {
      if (!f) continue;
      f.pos.set(x, 0, 0);
      f.vel.set(0, 0, 0);
      f.yaw = f.targetYaw = f.torsoYaw = 0;
      f.grounded = true;
    }
    idleT = 0;
  }
  function fighterBusy(f) {
    return !!f && (f.state !== 'normal' || (f.animator.action && !f.animator.action.fadingOut));
  }
  function displaced(f, x) {
    return !!f && (Math.abs(f.pos.x - x) > 0.05 || Math.abs(f.pos.z) > 0.05 || f.pos.y > 0.05 ||
      Math.abs(f.yaw) > 0.02);
  }

  function blankIntent() {
    return { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, light: false, heavy: false,
      ranged: false, rangedHeld: false, special: false, specialHeld: false, ult: false,
      block: false, dash: false, taunt: false, strafe: false, duck: false, aimYaw: undefined };
  }

  function disposeFighter(f) {
    if (!f) return;
    scene.remove(f.group);
    f.group.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of mats) m?.dispose?.();
    });
  }

  function makeFighter(def, x, opts = {}) {
    const f = new Fighter(world, def, {
      pos: new THREE.Vector3(x, 0, 0), yaw: 0, playerIndex: opts.pi ?? 0, isAI: false, mech: opts.mech,
    });
    return f;
  }

  async function load(id) {
    curId = id;
    const u = new URL(location.href);
    u.searchParams.set('mech', id); u.searchParams.set('mode', mode);
    history.replaceState(null, '', u);
    gizmo.detach(); selJoint = null;
    for (const k of Object.keys(base)) delete base[k];
    for (const f of [procF, glbF, procDummy, glbDummy]) disposeFighter(f);
    world.fighters.length = 0;
    if (Array.isArray(world.projectiles)) world.projectiles.length = 0;

    const def = ROSTER_BY_ID[id];
    procF = makeFighter(def, -PAIR_X, { pi: 0 });
    const built = await buildGlbForTool(def);
    glbF = makeFighter(def, PAIR_X, { pi: 1, mech: built.mech });
    // dummies stand just in front (heavy reach + a hair) as attack targets
    const drange = (def.moves?.heavy?.range ?? 4) + 1.5;
    const ddef = applyColorScheme(ROSTER_BY_ID.titanus, 3);
    procDummy = new Fighter(world, ddef, { pos: new THREE.Vector3(-PAIR_X, 0, drange), yaw: Math.PI, playerIndex: 2, isAI: true });
    glbDummy = new Fighter(world, ddef, { pos: new THREE.Vector3(PAIR_X, 0, drange), yaw: Math.PI, playerIndex: 3, isAI: true });
    procDummy.controlsLocked = glbDummy.controlsLocked = true;
    // the dummies are pure AIM TARGETS: never rendered, pinned to their posts
    // every frame (dummyPost) so targeted attacks aim as if an enemy stood
    // just in front — without an enemy cluttering the comparison view
    procDummy.group.visible = glbDummy.group.visible = false;
    dummyPost = drange;
    world.fighters.push(procF, glbF, procDummy, glbDummy);

    window.__poseDebug = { proc: procF.mech, glb: glbF.mech, procF, glbF, world };
    applyMode();
    buildJointButtons();
    setStatus('idle');
  }

  // ---- mode handling ----
  function applyMode() {
    const poseMode = mode === 'pose';
    gizmo.visible = poseMode;
    if (!poseMode) gizmo.detach();
    refGroup.visible = poseMode;
    poseModeUI.style.display = poseMode ? 'block' : 'none';
    actionModeUI.style.display = poseMode ? 'none' : 'block';
    if (poseMode) {
      // freeze both at the deterministic rest and capture the gizmo baseline
      procF.animator.poseStatic();
      glbF.animator.poseStatic();
      drawSizeRef();
      for (const [j, b] of Object.entries(glbF.mech.boneMap || {})) {
        base[j] = { q: b.quaternion.clone(), p: b.position.clone() };
      }
    }
    const u = new URL(location.href); u.searchParams.set('mode', mode); history.replaceState(null, '', u);
  }

  // ---- action input ----
  function orIntent(dst, src) { for (const k of INTENT_BTNS) if (src[k]) dst[k] = src[k]; }
  function readCombined(out) {
    input.readIntent('kb1', out, 0);
    for (let i = 0; i < 4; i++) { input.readIntent('pad' + i, pad, 0); orIntent(out, pad); }
  }
  function copyIntent(dstIntent, src) {
    for (const k of INTENT_BTNS) dstIntent[k] = src[k];
    // movement passes through (left stick / WASD) so the walk/run cycle can be
    // compared too; both mechs stride in the same direction in lockstep
    dstIntent.moveX = src.moveX; dstIntent.moveZ = src.moveZ;
    dstIntent.aimYaw = undefined;
  }
  const ACTION_FROM_INTENT = [
    ['special', (s) => s.special], ['heavy', (s) => s.heavy], ['light', (s) => s.light],
    ['dash', (s) => s.dash], ['ranged', (s) => s.ranged || s.rangedHeld], ['block', (s) => s.block],
  ];
  function detectAction() {
    let pressed = false;
    for (const [name, test] of ACTION_FROM_INTENT) {
      const now = !!test(scratch), was = !!prev[name];
      if (now && !was) { lastAction = name; setStatus(name); pressed = true; }
      prev[name] = now;
    }
    return pressed;
  }

  // ---- status panel ----
  function setStatus(action) {
    const d = describeAction(ROSTER_BY_ID[curId], action);
    let html = `<div style="font-weight:600;color:#cfe3ff;margin-bottom:3px">▶ ${d.title}</div>`;
    for (const ln of d.lines) {
      const tag = ln.v === 'proc' ? ' <span style="color:#8fd8ff">(Procedural only)</span>'
        : ln.v === 'glb' ? ' <span style="color:#ffd060">(GLB only)</span>' : '';
      html += `<div style="color:#9fb2c8;font-size:11px">• ${ln.t}${tag}</div>`;
    }
    statusPanel.innerHTML = html;
  }

  // ---- pose-mode size reference ----
  function drawSizeRef() {
    while (refGroup.children.length) {
      const c = refGroup.children.pop(); c.geometry?.dispose?.(); c.material?.dispose?.();
    }
    if (!procF?.mech?.joints?.head) return;
    const procHeadY = measureHeadTop(procF.mech);
    const glbHeadY = glbF?.mech?.isGLB ? measureHeadTop(glbF.mech) : procHeadY;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-9, procHeadY, 0), new THREE.Vector3(9, procHeadY, 0)]),
      new THREE.LineBasicMaterial({ color: 0x48b0ff }));
    refGroup.add(line);
    const dot = (x, y, col) => {
      const mm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: col }));
      mm.position.set(x, y, 0); refGroup.add(mm);
    };
    dot(-PAIR_X, procHeadY, 0x8fd8ff); dot(PAIR_X, glbHeadY, 0xffd060);
    sizeReadout = `head top  proc ${procHeadY.toFixed(2)}  ·  glb ${glbHeadY.toFixed(2)}  (Δ ${(glbHeadY - procHeadY >= 0 ? '+' : '') + (glbHeadY - procHeadY).toFixed(2)})`;
    if (sizeEl) sizeEl.textContent = sizeReadout;
  }
  let sizeReadout = '';

  // ---- UI ----
  const panel = el('div', `position:fixed;top:10px;left:10px;z-index:50;font:12px/1.4 system-ui,sans-serif;
    color:#dfe8f5;background:rgba(16,20,28,0.93);border:1px solid #2c3648;border-radius:8px;
    padding:10px;width:270px;max-height:95vh;overflow:auto;user-select:none`);
  document.body.appendChild(panel);

  panel.appendChild(label('Mech'));
  const mechSel = el('select', 'width:100%;margin-bottom:8px;background:#0e131b;color:#dfe8f5;border:1px solid #2c3648;padding:4px');
  for (const id of glbIds) { const o = document.createElement('option'); o.value = id; o.textContent = id; mechSel.appendChild(o); }
  mechSel.value = curId; mechSel.onchange = () => load(mechSel.value);
  panel.appendChild(mechSel);

  // mode toggle
  const modeRow = el('div', 'display:flex;gap:6px;margin-bottom:8px');
  const bAction = toggle('▶ Action', () => setMode('action'));
  const bPose = toggle('✋ Pose', () => setMode('pose'));
  modeRow.append(bAction, bPose); panel.appendChild(modeRow);
  function setMode(m) { mode = m; styleMode(); applyMode(); }
  function styleMode() {
    for (const [b, m] of [[bAction, 'action'], [bPose, 'pose']]) {
      const on = mode === m;
      b.style.background = on ? '#2b6cb0' : '#1a2433'; b.style.color = on ? '#fff' : '#9fb2c8';
    }
  }

  // ---------- ACTION-mode UI ----------
  const actionModeUI = el('div', '');
  panel.appendChild(actionModeUI);
  actionModeUI.appendChild(label('Trigger action'));
  const btnGrid = el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px');
  const BTNS = [['light', 'Light (F/✕)'], ['heavy', 'Heavy (G/△)'], ['ranged', 'Ranged (R/RB)'],
    ['special', 'Special (T/RT)'], ['block', 'Block (H/LB)'], ['dash', 'Dash (⇧/B)']];
  for (const [act, txt] of BTNS) {
    const b = el('button', `padding:5px 3px;font-size:11px;border-radius:4px;cursor:pointer;background:#1a2433;color:#cfe0f5;border:1px solid #2c3648`);
    b.textContent = txt;
    // hold-to-fire so held moves (block/ranged) behave; tap fires once
    b.onpointerdown = () => { uiPress[act] = true; };
    const up = () => { uiPress[act] = false; };
    b.onpointerup = up; b.onpointerleave = up;
    btnGrid.appendChild(b);
  }
  actionModeUI.appendChild(btnGrid);
  const uiPress = {};

  actionModeUI.appendChild(label('Animation time scale'));
  const spdRow = el('div', 'display:flex;gap:6px;align-items:center;margin-bottom:6px');
  const slider = el('input', 'flex:1'); slider.type = 'range'; slider.min = '5'; slider.max = '150'; slider.value = '100';
  const spdNum = el('input', 'width:56px;background:#0e131b;color:#dfe8f5;border:1px solid #2c3648;padding:2px'); spdNum.type = 'number';
  spdNum.min = '5'; spdNum.max = '300'; spdNum.step = '5'; spdNum.value = '100';
  const setSpeed = (pct) => {
    pct = Math.max(1, +pct || 100); timeScale = pct / 100;
    engine.timeScale = timeScale; slider.value = String(Math.min(150, pct)); spdNum.value = String(pct);
  };
  slider.oninput = () => setSpeed(slider.value);
  spdNum.oninput = () => setSpeed(spdNum.value);
  const pct = el('span', 'color:#9fb2c8;font-size:11px'); pct.textContent = '%';
  spdRow.append(slider, spdNum, pct); actionModeUI.appendChild(spdRow);
  const quickRow = el('div', 'display:flex;gap:4px;margin-bottom:8px');
  for (const p of [10, 25, 50, 100]) {
    const b = el('button', 'flex:1;padding:3px;font-size:11px;border-radius:4px;cursor:pointer;background:#1a2433;color:#cfe0f5;border:1px solid #2c3648');
    b.textContent = (p / 100) + '×'; b.onclick = () => setSpeed(p); quickRow.appendChild(b);
  }
  actionModeUI.appendChild(quickRow);

  actionModeUI.appendChild(label('Current action'));
  const statusPanel = el('div', 'background:#0b0f16;border:1px solid #2c3648;border-radius:5px;padding:7px;min-height:60px');
  actionModeUI.appendChild(statusPanel);

  // ---------- POSE-mode UI ----------
  const poseModeUI = el('div', 'display:none');
  panel.appendChild(poseModeUI);
  const gizRow = el('div', 'display:flex;gap:6px;margin:2px 0 6px');
  const bRot = toggle('Rotate', () => { gizmo.setMode('rotate'); markGiz(); });
  const bMov = toggle('Translate', () => { gizmo.setMode('translate'); markGiz(); });
  const bSpace = toggle('Local', () => { const l = gizmo.space === 'local'; gizmo.setSpace(l ? 'world' : 'local'); bSpace.textContent = l ? 'World' : 'Local'; });
  gizRow.append(bRot, bMov, bSpace); poseModeUI.appendChild(label('Gizmo')); poseModeUI.appendChild(gizRow);
  function markGiz() { for (const [b, m] of [[bRot, 'rotate'], [bMov, 'translate']]) { const on = gizmo.mode === m; b.style.background = on ? '#2b6cb0' : '#1a2433'; b.style.color = on ? '#fff' : '#9fb2c8'; } }
  poseModeUI.appendChild(label('Joint'));
  const jointGrid = el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px');
  poseModeUI.appendChild(jointGrid);
  const actRow = el('div', 'display:flex;gap:6px;margin:6px 0');
  actRow.appendChild(btn('Reset joint', () => { if (selJoint && base[selJoint]) { const b = glbF.mech.boneMap[selJoint]; b.quaternion.copy(base[selJoint].q); b.position.copy(base[selJoint].p); } }));
  actRow.appendChild(btn('Reset all', () => { for (const [j, b] of Object.entries(glbF.mech.boneMap || {})) if (base[j]) { b.quaternion.copy(base[j].q); b.position.copy(base[j].p); } }));
  poseModeUI.appendChild(actRow);
  poseModeUI.appendChild(btn('Output config ▶', outputConfig, true));
  const out = el('textarea', `width:100%;height:130px;margin-top:8px;background:#0b0f16;color:#8fe;border:1px solid #2c3648;font:11px/1.35 ui-monospace,monospace;display:none`);
  poseModeUI.appendChild(out);
  const sizeEl = el('div', 'margin-top:8px;color:#9fb2c8;font-size:11px'); poseModeUI.appendChild(sizeEl);

  function buildJointButtons() {
    jointGrid.innerHTML = '';
    const map = glbF?.mech?.boneMap || {};
    for (const j of JOINT_ORDER) {
      const has = !!map[j];
      const b = el('button', `padding:3px 2px;font-size:11px;border-radius:4px;cursor:${has ? 'pointer' : 'not-allowed'};background:${has ? '#1a2433' : '#141821'};color:${has ? '#cfe0f5' : '#55606f'};border:1px solid #2c3648`);
      b.textContent = j; b.disabled = !has;
      if (has) b.onclick = () => { selJoint = j; gizmo.attach(map[j]); for (const c of jointGrid.children) c.style.outline = ''; b.style.outline = '2px solid #48b0ff'; };
      jointGrid.appendChild(b);
    }
  }
  function outputConfig() {
    const boneCorrections = {}, bonePos = {};
    for (const [j, b] of Object.entries(glbF.mech.boneMap || {})) {
      const bs = base[j]; if (!bs) continue;
      const corr = bs.q.clone().invert().multiply(b.quaternion);
      const e = new THREE.Euler().setFromQuaternion(corr, 'XYZ');
      const dx = e.x * R2D, dy = e.y * R2D, dz = e.z * R2D;
      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15 || Math.abs(dz) > 0.15) boneCorrections[j] = [rnd(dx), rnd(dy), rnd(dz)];
      const pd = b.position.clone().sub(bs.p);
      if (pd.length() > 1e-3) bonePos[j] = [rnd(pd.x, 4), rnd(pd.y, 4), rnd(pd.z, 4)];
    }
    const patch = {};
    if (Object.keys(boneCorrections).length) patch.boneCorrections = boneCorrections;
    if (Object.keys(bonePos).length) patch.bonePos = bonePos;
    const json = JSON.stringify({ [curId]: patch }, null, 2);
    out.style.display = 'block'; out.value = json; out.select();
    navigator.clipboard?.writeText(json).catch(() => {});
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `pose-${curId}.json`; a.click();
  }

  const help = el('div', 'margin-top:8px;color:#69788c;font-size:10.5px;line-height:1.5');
  help.innerHTML = 'Orbit: drag empty space · Zoom: wheel<br>Left = procedural · Right = GLB<br>'
    + 'Action: keyboard F/G/R/T/H + ⇧ or a gamepad, or the buttons above.';
  panel.appendChild(help);

  // ---- helpers ----
  function el(tag, css) { const e = document.createElement(tag); e.style.cssText = css; return e; }
  function label(t) { const d = el('div', 'color:#7d8ea3;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:4px 0 2px'); d.textContent = t; return d; }
  function toggle(text, fn) { const b = el('button', 'flex:1;padding:5px;border-radius:4px;border:1px solid #2c3648;cursor:pointer;font-size:11px;background:#1a2433;color:#9fb2c8'); b.textContent = text; b.onclick = fn; return b; }
  function btn(text, fn, primary) { const b = el('button', `width:100%;flex:1;padding:6px;border-radius:5px;border:1px solid #2c3648;cursor:pointer;font-size:11px;background:${primary ? '#1f7a4d' : '#1a2433'};color:${primary ? '#fff' : '#cfe0f5'}`); b.textContent = text; b.onclick = fn; return b; }
  function rnd(v, d = 2) { const m = 10 ** d; return Math.round(v * m) / m; }

  styleMode(); markGiz(); setSpeed(100);
  await load(curId);

  // ---- loop ----
  engine.onUpdate = (dt) => {
    input.poll();
    if (mode === 'action') {
      readCombined(scratch);
      // fold in on-screen button presses (held-style)
      for (const [k, v] of Object.entries(uiPress)) {
        if (!v) continue;
        if (k === 'ranged') { scratch.ranged = scratch.rangedHeld = true; }
        else if (k === 'block') scratch.block = true;
        else { scratch[k] = true; scratch[k + 'Held'] = true; }
      }
      // a NEW action press snaps everyone home first, so the move plays out
      // from the reference spot (translation from the previous move is temporary)
      if (detectAction()) { resetPositions(); lastWasWalk = false; }
      for (const f of [procF, glbF]) {
        copyIntent(f.intent, scratch);
        f.hp = f.maxHp; f.ult = 1; f.specialCd = 0; f.rangedCd = 0; f.iframes = 0;
        if (f.ammoMax !== undefined) f.ammo = f.ammoMax;
      }
      // pin the invisible aim targets to their posts (knockback would drift
      // them, and a drifted target skews the next attack's aim)
      for (const [d, x] of [[procDummy, -PAIR_X], [glbDummy, PAIR_X]]) {
        d.hp = d.maxHp;
        if (!d.alive) { d.alive = true; d.hp = d.maxHp; d.state = 'normal'; }
        d.pos.set(x, 0, dummyPost);
        d.vel.set(0, 0, 0);
        d.yaw = d.targetYaw = Math.PI;
      }
      world.update(dt);      // dt pre-scaled by engine.timeScale
      input.endFrame();
      // settle-reset: snap home a few REAL seconds after everything is at
      // rest (slow-mo doesn't stretch the wait) — 2s after the stick is
      // released from a walk, 3s after an action finishes
      const walking = Math.abs(scratch.moveX) > 0.08 || Math.abs(scratch.moveZ) > 0.08;
      if (walking) lastWasWalk = true;
      const busy = walking || fighterBusy(procF) || fighterBusy(glbF);
      const moved = displaced(procF, -PAIR_X) || displaced(glbF, PAIR_X);
      if (busy) idleT = 0;
      else if (moved) {
        idleT += dt / (engine.timeScale || 1);
        if (idleT > (lastWasWalk ? 2 : 3)) resetPositions();
      } else idleT = 0;
    } else {
      input.endFrame();
    }
  };
  engine.onRender = () => { orbit.update(); };
  engine.start();
  return engine;
}
