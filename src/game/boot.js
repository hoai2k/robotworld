// Game boot: owns the engine, audio, input and the screen state machine.
// Title → Setup → Mech Select → Arena Select → Battle → Results → loop.
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Arena } from '../arena/arena.js';
import { THEMES_BY_ID } from '../arena/themes.js';
import { ROSTER_BY_ID, ROSTER, applyColorScheme, SCHEME_COUNT } from '../mechs/roster.js';
import { buildMech } from '../mechs/factory.js';
import { Animator } from '../mechs/animator.js';
import { Fighter, PLAYER_COLORS } from '../combat/fighter.js';
import { AIController } from './ai.js';
import { CameraSystem } from './camera.js';
import { Match } from './match.js';
import { Hud, toast } from '../ui/hud.js';
import { TitleScreen, MechSelectScreen, ArenaSelectScreen, PauseScreen, ResultsScreen, SettingsScreen } from '../ui/menus.js';
import { CONFIG, setInfiniteUltimates } from '../core/config.js';
import { GameAudio } from '../core/audio.js';
import { createMech, preloadMechModels, loadManifest, is3dMode, manifestHasGlb } from '../mechs/gltf.js';
import { TouchControls } from './touch.js';
import { isTouchDevice } from '../core/utils.js';

// Loading spinner shown in place of a mech while its GLB downloads (only in
// ?debug=3d, where we suppress the procedural stand-in). Two counter-rotating
// rings + a soft core, tinted by the mech's glow color. Tagged isSpinner so
// the stage's update() spins it instead of running an animator.
function makeSpinner(color = 0x8fd8ff) {
  const g = new THREE.Group();
  g.isSpinner = true;
  const mat = (o) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o, side: THREE.DoubleSide });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 8, 40), mat(0.85));
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 36), mat(0.5));
  r2.rotation.x = Math.PI / 2;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), mat(0.9));
  g.add(r1, r2, core);
  g.userData.spin = { r1, r2, core, t: 0 };
  g.position.y = 4.2; // float at torso height
  return g;
}
function disposeSpinner(g) {
  g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
}

// Menu backdrop: dark stage with a rotating mech line-up / preview.
class MenuStage {
  constructor(engine) {
    this.engine = engine;
    this.group = new THREE.Group();
    engine.scene.add(this.group);
    engine.scene.fog = new THREE.Fog(0x0a0e18, 40, 140);
    engine.scene.background = new THREE.Color(0x0a0e18);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(60, 48),
      new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.6, metalness: 0.5 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(11.5, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0x38e8ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    this.group.add(ring);

    this.mechs = [];
    this.rings = [];
    this.previewId = null;
    this._previewKey = null;
    this._gen = 0; // bumped on clearMechs; stale GLB swaps check against it
    this.t = 0;
  }

  // spawn one display unit at pos with base yaw rotY. In ?debug=3d with a GLB
  // available, shows a spinner and swaps the GLB in when it loads (never the
  // procedural stand-in); otherwise builds the procedural mech immediately.
  spawnUnit(def, pos, rotY = 0) {
    const gen = this._gen;
    if (is3dMode() && manifestHasGlb(def.id)) {
      const spin = makeSpinner(def.colors?.glow ?? 0x8fd8ff);
      spin.position.set(pos.x, pos.y + 4.2, pos.z);
      const unit = { group: spin, isSpinner: true };
      this.group.add(spin);
      this.mechs.push(unit);
      createMech(def).then((glb) => {
        if (this._gen !== gen || !glb.isGLB) return;
        const idx = this.mechs.indexOf(unit);
        if (idx < 0) return;
        glb.animator = glb.premadeAnimator;
        glb.group.position.copy(pos);
        glb.group.rotation.y = rotY;
        this.group.remove(spin);
        disposeSpinner(spin);
        this.group.add(glb.group);
        this.mechs[idx] = glb;
      });
      return unit;
    }
    const mech = buildMech(def);
    mech.animator = new Animator(mech);
    mech.group.position.copy(pos);
    mech.group.rotation.y = rotY;
    this.group.add(mech.group);
    this.mechs.push(mech);
    return mech;
  }

  // title line-up: three hero mechs
  showLineup(ids = ['titanus', 'viper', 'nova']) {
    this.clearMechs();
    ids.forEach((id, i) => {
      this.spawnUnit(ROSTER_BY_ID[id], new THREE.Vector3((i - 1) * 10, 0, i === 1 ? 0 : -4), (i - 1) * -0.4);
    });
    this.previewId = null;
    this._previewKey = null;
    this.engine.camera.position.set(0, 7.5, 26);
    this.engine.camera.lookAt(0, 6, 0);
  }

  showPreview(id) {
    this.showPreviews([{ id, slotIdx: 0 }]);
  }

  // big floating "?" stand-in for the RANDOM roster pick, tinted by the
  // chosen color scheme (the scheme carries onto whatever robot is dealt)
  questionSprite(variant = 0) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.font = '900 italic 104px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(160,220,255,0.9)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#eaf6ff';
    ctx.fillText('?', 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    const RANDOM_TINTS = [0x9fd8ef, 0xff7a28, 0x3fc8ff, 0x6a7280]; // stock/ember/tide/midnight
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false,
      color: RANDOM_TINTS[variant % RANDOM_TINTS.length],
    }));
    spr.scale.set(5.2, 5.2, 1);
    return spr;
  }

  // one preview mech per human picker, each on a player-colored ring
  showPreviews(entries) {
    if (!entries || !entries.length) return;
    const key = entries.map((e) => `${e.id}:${e.slotIdx}:${e.variant || 0}`).join('|');
    if (this._previewKey === key) return;
    this._previewKey = key;
    this.previewId = key;
    this.clearMechs();
    const n = entries.length;
    const cx = n === 1 ? 6.5 : 2.5;
    const spacing = 6.5;
    entries.forEach((e, i) => {
      const x = cx + (i - (n - 1) / 2) * spacing;
      if (e.id === 'random') {
        // mystery unit: a hovering "?" instead of a mech
        const spr = this.questionSprite(e.variant || 0);
        spr.position.set(x, 4.8, 0);
        this.group.add(spr);
        this.extras = this.extras || [];
        this.extras.push(spr);
      } else {
        // spawnUnit shows the procedural body, or (in ?debug=3d) a spinner
        // that swaps to the GLB when it loads — the exact body the battle uses
        const def = applyColorScheme(ROSTER_BY_ID[e.id], e.variant || 0);
        this.spawnUnit(def, new THREE.Vector3(x, 0, 0), 0);
      }
      if (n > 1) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(2.3, 2.7, 40),
          new THREE.MeshBasicMaterial({
            color: PLAYER_COLORS[e.slotIdx % 4], transparent: true, opacity: 0.7, side: THREE.DoubleSide,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.06, 0);
        this.group.add(ring);
        this.rings.push(ring);
      }
    });
    const dist = n === 1 ? 20 : 18 + n * 5;
    // UI chrome flanks the stage (roster grid left, info card right); the
    // clear band between them is centered a little right of mid-screen, so
    // aim the camera to drop the mechs there (~56% across → +0.12 NDC)
    const cam = this.engine.camera;
    const halfW = Math.tan((cam.fov * Math.PI) / 360) * dist * cam.aspect;
    const tx = cx - halfW * 0.12;
    cam.position.set(n === 1 ? tx - 1 : tx, n > 2 ? 8 : 6.5, dist);
    cam.lookAt(tx, 5, 0);
  }

  clearMechs() {
    this._gen++; // invalidate any in-flight GLB swaps from a prior screen
    for (const m of this.mechs) {
      this.group.remove(m.group);
      if (m.isSpinner) disposeSpinner(m.group);
    }
    this.mechs = [];
    for (const r of this.rings) {
      this.group.remove(r);
      r.geometry.dispose();
      r.material.dispose();
    }
    this.rings = [];
    for (const s of this.extras || []) {
      this.group.remove(s);
      s.material.map?.dispose();
      s.material.dispose();
    }
    this.extras = [];
  }

  update(dt) {
    this.t += dt;
    for (const m of this.mechs) {
      if (m.isSpinner) {
        const s = m.group.userData.spin;
        s.t += dt;
        s.r1.rotation.z += dt * 2.4; s.r1.rotation.x += dt * 1.2;
        s.r2.rotation.y += dt * 3.2;
        s.core.scale.setScalar(0.85 + Math.sin(s.t * 4) * 0.15);
        continue;
      }
      if (this.previewId) m.group.rotation.y = Math.sin(this.t * 0.4) * 0.55 + 0.15;
      // lineup & select previews always show the combat-ready carriage
      m.animator.update(dt, { speed: 0, grounded: true, alwaysReady: true });
    }
  }

  destroy() {
    this.clearMechs();
    this.engine.scene.remove(this.group);
  }
}

// Block the browser's built-in zoom gestures on touch devices. iOS Safari
// ignores `user-scalable=no` in the viewport meta, so pinch-zoom and (the
// common offender) double-tap-to-zoom while mashing buttons still fire and
// wreck the fixed layout. touch-action:none handles Android; these listeners
// handle iOS. Deliberately narrow so real gameplay multitouch is untouched:
// gameplay buttons use pointer events, which none of this cancels.
function installTouchZoomGuards() {
  // iOS pinch-zoom arrives as gesture* events — cancel them.
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(t, (e) => e.preventDefault(), { passive: false });
  }
  // Double-tap-to-zoom: only suppress a second tap that lands in the same
  // spot in quick succession (a zoom gesture), not two taps on different
  // controls — so rapid, distinct button/menu taps keep working.
  let lastT = 0, lastX = 0, lastY = 0;
  document.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const now = performance.now();
    if (now - lastT <= 320 && Math.hypot(touch.clientX - lastX, touch.clientY - lastY) < 40) {
      e.preventDefault();
    }
    lastT = now; lastX = touch.clientX; lastY = touch.clientY;
  }, { passive: false });
}

// Virtual mouse pointers for controllers, menu screens only. The SELECT/VIEW
// button toggles a per-pad cursor; both sticks (and the d-pad) steer it and A
// clicks whatever it hovers. While a pad's pointer is up its normal menu
// events are muted (input.pointerPads), so the sticks don't also drive menu
// cursors — SELECT again (or a battle starting) puts the pad back to normal.
class PadPointers {
  constructor(input, root, audio) {
    this.input = input;
    this.root = root;
    this.audio = audio;
    this.ptrs = [null, null, null, null];
  }

  toggle(i) {
    const p = this.ptrs[i];
    if (p) {
      p.el.remove();
      this.ptrs[i] = null;
      this.audio?.play('uiBack');
      return;
    }
    const col = '#' + PLAYER_COLORS[i % 4].toString(16).padStart(6, '0');
    const el = document.createElement('div');
    el.className = 'pad-pointer';
    el.innerHTML = `
      <svg width="24" height="30" viewBox="0 0 24 30">
        <path d="M2 1 L2 24 L8 18.5 L12 28.5 L16.5 26.5 L12.5 17 L21 17 Z"
              fill="${col}" stroke="#06101c" stroke-width="1.6" stroke-linejoin="round"/>
      </svg>`;
    this.root.appendChild(el);
    this.ptrs[i] = { el, x: window.innerWidth / 2, y: window.innerHeight / 2, chain: [] };
    this.place(this.ptrs[i]);
    this.audio?.play('uiSelect');
    this.input.rumble(i, 0.3, 90);
  }

  place(p) { p.el.style.transform = `translate(${p.x}px, ${p.y}px)`; }

  // active = a menu screen is up (title/select/pause/results — not live combat)
  update(dt, active) {
    for (let i = 0; i < 4; i++) {
      if (!this.input.padConnected(i)) {
        if (this.ptrs[i]) { this.ptrs[i].el.remove(); this.ptrs[i] = null; }
        this.input.pointerPads.delete(i);
        continue;
      }
      if (active && this.input.padPressed(i, 'BACK')) this.toggle(i);
      const p = this.ptrs[i];
      if (p && active) this.input.pointerPads.add(i);
      else this.input.pointerPads.delete(i);
      if (!p) continue;
      p.el.style.display = active ? '' : 'none';
      if (!active) continue;
      const pad = this.input.padsCur[i];
      let dx = (pad.lx || 0) + (pad.rx || 0);
      let dy = (pad.ly || 0) + (pad.ry || 0);
      if (this.input.padHeld(i, 'DL')) dx -= 1;
      if (this.input.padHeld(i, 'DR')) dx += 1;
      if (this.input.padHeld(i, 'DU')) dy -= 1;
      if (this.input.padHeld(i, 'DD')) dy += 1;
      if (dx || dy) {
        const spd = Math.max(window.innerWidth, window.innerHeight) * 0.85;
        p.x = Math.min(window.innerWidth - 2, Math.max(0, p.x + dx * spd * dt));
        p.y = Math.min(window.innerHeight - 2, Math.max(0, p.y + dy * spd * dt));
        this.place(p);
        this.hover(p);
      }
      if (this.input.padPressed(i, 'A')) this.click(p);
    }
  }

  // synthesize mouseenter down the ancestor chain under the pointer, so
  // hover-driven menus (roster cells, menu items) track it like a mouse
  hover(p) {
    const chain = [];
    for (let n = document.elementFromPoint(p.x, p.y); n && n !== document.documentElement; n = n.parentElement) chain.push(n);
    for (const n of chain) {
      if (!p.chain.includes(n)) n.dispatchEvent(new MouseEvent('mouseenter', { clientX: p.x, clientY: p.y }));
    }
    p.chain = chain;
  }

  click(p) {
    const el = document.elementFromPoint(p.x, p.y);
    if (!el) return;
    el.dispatchEvent(new MouseEvent('click', {
      clientX: p.x, clientY: p.y, bubbles: true, cancelable: true, view: window,
    }));
  }
}

export async function bootGame() {
  const engine = new Engine(document.getElementById('game-canvas'));
  const input = new Input();
  const uiRoot = document.getElementById('ui-root');

  // In ?debug=3d, resolve the manifest before any screen builds so
  // manifestHasGlb() can decide spinner-vs-procedural synchronously.
  if (is3dMode()) { try { await loadManifest(); } catch (e) { /* falls back to procedural */ } }

  let audio;
  try {
    audio = new GameAudio();
  } catch (e) {
    console.warn('audio unavailable', e);
    audio = { play() {}, music() {}, stopMusic() {}, resume() {}, setSfxVolume() {}, setMusicVolume() {} };
  }
  const resumeAudio = () => audio.resume();
  window.addEventListener('pointerdown', resumeAudio);
  window.addEventListener('keydown', resumeAudio);

  // ---- sound on/off: corner button on menus, mirrored in the pause menu ----
  let muted = false;
  try { muted = localStorage.getItem('rw.muted') === '1'; } catch (e) { /* ok */ }
  const muteBtn = document.createElement('div');
  muteBtn.id = 'mute-btn';
  muteBtn.title = 'sound on/off';
  muteBtn.style.cssText =
    'position:absolute;right:16px;bottom:58px;z-index:40;cursor:pointer;font-size:26px;' +
    'opacity:0.8;user-select:none;text-shadow:0 2px 6px #000;pointer-events:auto;';
  uiRoot.appendChild(muteBtn);
  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('rw.muted', m ? '1' : '0'); } catch (e) { /* ok */ }
    audio.setSfxVolume(muted ? 0 : 0.8);
    audio.setMusicVolume(muted ? 0 : 0.35);
    muteBtn.textContent = muted ? '🔇' : '🔊';
  }
  muteBtn.addEventListener('click', () => setMuted(!muted));
  setMuted(muted);

  // ---- settings: gear button beside the sound button; opens a modal
  // panel that floats over whatever screen is up (incl. the pause menu) ----
  const gearBtn = document.createElement('div');
  gearBtn.id = 'settings-btn';
  gearBtn.title = 'settings';
  gearBtn.textContent = '⚙️';
  gearBtn.style.cssText =
    'position:absolute;right:56px;bottom:58px;z-index:40;cursor:pointer;font-size:26px;' +
    'opacity:0.8;user-select:none;text-shadow:0 2px 6px #000;pointer-events:auto;';
  uiRoot.appendChild(gearBtn);
  const settingsItems = () => [
    { label: () => (muted ? 'SOUND: OFF' : 'SOUND: ON'), fn: () => setMuted(!muted) },
    {
      label: () => (CONFIG.debugUltimates ? 'INFINITE ULTIMATES: ON' : 'INFINITE ULTIMATES: OFF'),
      fn: () => setInfiniteUltimates(!CONFIG.debugUltimates),
    },
    // controller-reachable page reload (via LB/RB → settings → this item)
    { label: () => 'RELOAD PAGE', fn: () => window.location.reload() },
  ];
  function openSettings() {
    if (S.modal) return;
    audio.play('uiSelect');
    S.modal = new SettingsScreen(uiRoot, {
      audio,
      items: settingsItems(),
      onBack: () => closeModal(),
    });
  }
  function closeModal() {
    S.modal?.destroy();
    S.modal = null;
  }
  gearBtn.addEventListener('click', () => openSettings());

  // corner buttons as controller-selectable stops: the LB/RB slot selector
  // (mech select) and the title screen both walk this list, and pad pointers
  // can click the elements directly
  const hotButtons = [
    { id: 'settings', el: gearBtn, activate: () => openSettings() },
    { id: 'mute', el: muteBtn, activate: () => setMuted(!muted) },
  ];

  // controller SELECT/VIEW button ↔ per-pad mouse pointer on menu screens
  const padPointers = new PadPointers(input, uiRoot, audio);

  let muteVisible = true;
  function updateMuteBtn() {
    const show = !(S.mode === 'battle' && S.battle && !S.battle.paused);
    if (show !== muteVisible) {
      muteVisible = show;
      muteBtn.style.display = show ? '' : 'none';
      gearBtn.style.display = show ? '' : 'none';
    }
  }

  // On-screen touch controls (phones/tablets). Mounting sets input.touchAvailable,
  // which unlocks the TOUCH device option on the setup screen.
  const touchControls = isTouchDevice()
    ? new TouchControls(input, {
        onPause: () => pauseBattle(),
        onLook: (dx, dy) => {
          if (S.mode !== 'battle' || !S.battle || S.battle.paused) return;
          const B = S.battle;
          if (B.cameraSys.mode === 'split') {
            // drag steers the touch player's own viewport
            const h = B.humans.find((x) => x.device === 'touch');
            if (h) B.cameraSys.applyLookFor(h.idx, dx, dy);
          } else {
            B.cameraSys.applyLook(dx, dy);
          }
        },
      })
    : null;
  if (isTouchDevice()) {
    document.body.classList.add('touch-mode');
    installTouchZoomGuards();
  }

  input.onPadConnect = (gp) => toast(`🎮 Controller connected: ${gp.id.slice(0, 34)}`);
  input.onPadDisconnect = (gp) => {
    toast(`🎮 Controller disconnected`);
    // pause if that pad was driving a fighter
    if (S.mode === 'battle' && S.battle && !S.battle.paused) {
      const inUse = S.battle.humans.some((h) => h.device === 'pad' + gp.index);
      if (inUse) pauseBattle();
    }
  };

  // lighting defaults captured for menu restoration
  const defaults = {
    sun: { color: engine.sun.color.clone(), intensity: engine.sun.intensity, pos: engine.sun.position.clone() },
    hemi: { color: engine.hemi.color.clone(), ground: engine.hemi.groundColor.clone(), intensity: engine.hemi.intensity },
    rim: { color: engine.rim.color.clone(), intensity: engine.rim.intensity, pos: engine.rim.position.clone() },
  };
  function resetScene() {
    const keep = new Set([engine.hemi, engine.sun, engine.sun.target, engine.rim]);
    for (const c of [...engine.scene.children]) if (!keep.has(c)) engine.scene.remove(c);
    engine.sun.color.copy(defaults.sun.color);
    engine.sun.intensity = defaults.sun.intensity;
    engine.sun.position.copy(defaults.sun.pos);
    engine.hemi.color.copy(defaults.hemi.color);
    engine.hemi.groundColor.copy(defaults.hemi.ground);
    engine.hemi.intensity = defaults.hemi.intensity;
    engine.rim.color.copy(defaults.rim.color);
    engine.rim.intensity = defaults.rim.intensity;
    engine.rim.position.copy(defaults.rim.pos);
    engine.renderer.toneMappingExposure = 1.05;
    engine.views = null;
    engine.backdrop = null;
    engine.onBeforeView = null;
    engine.onAfterView = null;
    engine.timeScale = 1;
    engine.scene.fog = null;
    engine.scene.background = new THREE.Color(0x0a0e18);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F10') { e.preventDefault(); toggleFullscreen(); }
    if (e.code === 'F9') { e.preventDefault(); toggleSplitLayout(); }
  });

  // flip the 2-player split between side-by-side and stacked
  function toggleSplitLayout() {
    const B = S.battle;
    if (!B || B.humans.length !== 2) return;
    B.cameraSys.toggleLayout2p();
    B.hud.positionPlates(
      B.cameraSys.layoutKind(B.humans.length),
      B.humans.map((h) => B.fighters.indexOf(h.fighter))
    );
  }

  // ---------------- state machine ----------------
  const S = {
    screen: null,        // active menu screen object (has update/destroy)
    stage: null,         // MenuStage
    battle: null,        // battle context
    slots: null,
    picks: null,
    variants: null,      // color scheme per slot
    themeId: null,
    mode: 'title',
  };

  function setScreen(screen) {
    closeModal(); // a floating settings panel never outlives a screen change
    S.screen?.destroy();
    S.screen = screen;
  }

  // menu input goes to the settings modal when one is open, else the screen
  function screenUpdate(ev) {
    if (S.modal) S.modal.update(ev);
    else S.screen?.update(ev);
  }

  function ensureStage(kind) {
    if (!S.stage) {
      resetScene();
      S.stage = new MenuStage(engine);
    }
    if (kind === 'lineup') S.stage.showLineup();
  }

  function goTitle() {
    teardownBattle();
    ensureStage('lineup');
    S.mode = 'title';
    audio.music('menu');
    setScreen(new TitleScreen(uiRoot, {
      audio, hotButtons,
      onPlay: () => goMechSelect(),
      onFullscreen: toggleFullscreen,
    }));
  }

  function goMechSelect() {
    ensureStage('lineup');
    S.mode = 'mechselect';
    setScreen(new MechSelectScreen(uiRoot, {
      input, audio, hotButtons, prev: S.slots,
      onPreview: (entries) => S.stage?.showPreviews(entries),
      onDone: (picks, variants, slots) => { S.picks = picks; S.variants = variants; S.slots = slots; goArenaSelect(); },
      onBack: () => goTitle(),
    }));
  }

  function goArenaSelect() {
    S.mode = 'arenaselect';
    preloadMechModels(S.picks.filter((p) => p && p !== 'random')); // warm GLB cache while browsing arenas
    setScreen(new ArenaSelectScreen(uiRoot, {
      audio,
      onDone: (themeId) => { S.themeId = themeId; startBattle(); },
      onBack: () => goMechSelect(),
    }));
  }

  // ---------------- pre-fight warm-up (asset loading) ----------------
  // While the arena's texture pack streams in, the match holds on a
  // "get ready" screen: the board title up top, and each fighter in its
  // own camera view shadow-boxing with its intro quote — meanwhile the
  // real scene renders behind it all, compiling shaders and uploading
  // textures so the fight starts with zero pop-in.
  let texBusy = false, texDone = 0, texTotal = 0;
  THREE.DefaultLoadingManager.onStart = () => { texBusy = true; };
  THREE.DefaultLoadingManager.onLoad = () => { texBusy = false; texDone = texTotal; };
  THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
    texDone = loaded; texTotal = total;
  };

  function startWarmup(B, theme) {
    const { fighters } = B;
    const n = fighters.length;
    const rects = n === 2
      ? [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }]
      : n === 3
        ? [{ x: 0, y: 0, w: 1 / 3, h: 1 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 1 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 1 }]
        : [{ x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
          { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }];
    const W = Math.max(1, window.innerWidth), H = Math.max(1, window.innerHeight);
    engine.views = fighters.map((f, i) => {
      const r = rects[i];
      const cam = new THREE.PerspectiveCamera(42, (r.w * W) / (r.h * H), 0.5, 2200);
      const dx = Math.sin(f.yaw), dz = Math.cos(f.yaw);
      const d = 5.5 + f.height * 1.45; // pulled back — whole mech with breathing room
      cam.position.set(f.pos.x + dx * d, f.height * 0.78, f.pos.z + dz * d);
      cam.lookAt(f.pos.x, f.height * 0.75, f.pos.z); // aim at the chest/head, not the waist
      return { camera: cam, ...r };
    });
    for (const f of fighters) {
      f.controlsLocked = true;
      f.animator.play('intro');
      f._wuNext = 2.6 + Math.random() * 1.2;
      f._wuSeq = 0;
      f._wuSpawn = f.pos.clone();
    }
    // the loading screen is a playground: HUMANS get their controls early —
    // run, punch, block, crouch, jump around the stage while it loads.
    // Everyone is leashed near their spawn and invulnerable (see
    // updateWarmup); ranged/special/ult stay disabled (intent scrub in the
    // read loop). match.begin() re-locks everybody for the countdown.
    for (const h of B.humans) h.fighter.controlsLocked = false;
    const ov = document.createElement('div');
    ov.className = 'warmup-overlay';
    const caps = fighters.map((f, i) => {
      const r = rects[i];
      const glow = '#' + f.def.colors.glow.toString(16).padStart(6, '0');
      return `<div class="wu-cap" style="left:${r.x * 100}%;width:${r.w * 100}%;bottom:calc(${r.y * 100}% + 4vh);">
        <div class="wu-name" style="color:${glow}">${f.def.name}</div>
        <div class="wu-quote">${f.def.quotes.intro}</div>
      </div>`;
    }).join('');
    ov.innerHTML = `
      <div class="wu-head"><div class="wu-sub">NOW ENTERING</div><div class="wu-arena">${theme.name}</div>
        <div class="wu-bar"><div class="wu-bar-fill"></div></div></div>
      ${caps}
      <div class="wu-loading">LOADING ARENA… &nbsp;·&nbsp; warm up! <b>MOVE</b> · <b>ATTACK</b> · <b>BLOCK</b> · <b>CROUCH</b></div>`;
    uiRoot.appendChild(ov);
    // a fighter whose model is still downloading is hidden — its panel
    // shows a spinner until the swap-in reveals it (see startBattle)
    fighters.forEach((f, i) => {
      if (!f._modelPending) return;
      const r = rects[i];
      const sp = document.createElement('div');
      sp.className = 'wu-spinwrap';
      sp.style.left = `${(r.x + r.w / 2) * 100}%`;
      sp.style.top = `${(1 - r.y - r.h / 2) * 100}%`;
      sp.innerHTML = '<div class="wu-spin"></div><div class="wu-spinlabel">LOADING MODEL</div>';
      ov.appendChild(sp);
      f._wuSpin = sp;
    });
    B.hud.el.style.display = 'none';

    // menu-style neutral backdrop: the whole arena hides while it streams
    // in, and the fighters shadow-box on a dark stage floor instead — no
    // half-textured scenery on show. Saved fog/background come back (and
    // every shader/texture is prewarmed) at the reveal.
    const scene = engine.scene;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900),
      new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.6, metalness: 0.5 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const hidden = B.arenaObjs.map((o) => ({ o, vis: o.visible }));
    for (const h of hidden) h.o.visible = false;

    B.loading = {
      // the gate holds for as long as the texture pack streams — the match
      // must start 100% loaded, never with scenery popping in later.
      // maxStall is a hung-request escape hatch ONLY: it fires when the
      // loader makes NO progress at all for that long (loader errors count
      // as completed items, so failed downloads can't trap us here).
      t: 0, settle: 0, minT: 3.4, maxStall: 25, progDone: -1, progT: 0, ov,
      floor, hidden, fog: scene.fog, bg: scene.background,
      barFill: ov.querySelector('.wu-bar-fill'), barK: 0,
    };
    scene.fog = new THREE.Fog(0x0a0e18, 60, 220);
    scene.background = new THREE.Color(0x0a0e18);
  }

  function updateWarmup(B, dt) {
    const L = B.loading;
    L.t += dt;
    L.settle = texBusy ? 0 : L.settle + dt;

    // loading bar under the arena name: blend of time-gate progress and the
    // texture loader's real item count, eased; pinned to 100% for the fade
    const texK = texTotal > 0 ? texDone / texTotal : texBusy ? 0 : 1;
    const wantK = L.fade !== undefined || L.prewarmed
      ? 1
      : Math.min(0.97, 0.45 * Math.min(1, L.t / L.minT) + 0.45 * texK + (L.settle > 0 ? 0.07 : 0));
    L.barK = Math.max(L.barK, L.barK + (wantK - L.barK) * Math.min(1, dt * 5));
    if (L.barFill) L.barFill.style.width = `${(L.barK * 100).toFixed(1)}%`;

    // the playground rules: humans are unlocked (run/punch/block/crouch for
    // fun) but invulnerable, healed, and leashed near their spawn so nobody
    // leaves their camera or lands a real hit before the bell
    for (const f of B.fighters) {
      f.iframes = Math.max(f.iframes, 0.2);
      f.hp = f.maxHp;
      if (f._wuSpawn && !f.controlsLocked) {
        const dx = f.pos.x - f._wuSpawn.x, dz = f.pos.z - f._wuSpawn.z;
        const d = Math.hypot(dx, dz), R = 7 * f.scale;
        if (d > R) {
          f.pos.x = f._wuSpawn.x + (dx / d) * R;
          f.pos.z = f._wuSpawn.z + (dz / d) * R;
        }
      }
    }
    // each warm-up camera keeps its fighter framed while they romp around
    if (engine.views) {
      B.fighters.forEach((f, i) => {
        const v = engine.views[i];
        if (v) v.camera.lookAt(f.pos.x, f.pos.y + f.height * 0.75, f.pos.z);
      });
    }
    // shadow-boxing beats for the CPU fighters (humans entertain themselves)
    for (const f of B.fighters) {
      if (f.alive && f.controlsLocked && L.t >= f._wuNext) {
        f._wuNext = L.t + 2.2 + Math.random() * 1.3;
        const seq = ['light1', 'taunt', 'light2'];
        f.animator.play(seq[f._wuSeq++ % seq.length]);
      }
    }

    // FADE phase: the arena is compiled and uploaded — let it emerge behind
    // the fighters out of the receding grey fog before the camera flips
    if (L.fade !== undefined) {
      L.fade += dt;
      const k = Math.min(1, L.fade / 0.9);
      const e = k * k * (3 - 2 * k);
      const themeFog = L.fog;
      L.fadeFog.color.copy(L.greyCol).lerp(L.themeFogCol, e);
      L.fadeFog.near = 4 + (themeFog.near - 4) * e;
      L.fadeFog.far = 26 + (themeFog.far - 26) * e;
      L.fadeBg.copy(L.greyCol).lerp(L.skyCol, e);
      if (L.fade < 1.05) return;
      // the flip: exact theme atmosphere back, sky dome on, cameras over
      const scene = engine.scene;
      scene.fog = L.fog;
      scene.background = L.bg;
      B.arena.sky.visible = true;
      L.ov.remove();
      engine.views = null;
      B.hud.el.style.display = '';
      B.loading = null;
      if (B.usesTouch) touchControls?.setVisible(true);
      B.match.begin();
      return;
    }

    // go when the loader has been idle for a beat (and never before the
    // quotes have had their moment). No time cap while downloads flow:
    // the reveal waits for 100% — the only escape is the stall watchdog,
    // which fires after maxStall seconds with zero loader progress.
    // Fighters still waiting on a model download hold the gate — createMech
    // always settles (failed GLBs fall back procedurally), so no deadlock.
    if (texDone !== L.progDone) { L.progDone = texDone; L.progT = L.t; }
    const stalled = texBusy && L.t - L.progT > L.maxStall;
    const modelsPending = B.fighters.some((f) => f._modelPending);
    if (L.t >= L.minT && !modelsPending && (L.settle > 0.45 || stalled)) {
      const scene = engine.scene;
      if (!L.prewarmed) {
        // ONE hidden long frame before the reveal: compile every shader and
        // upload every texture with the REAL arena fog/background active
        // (fog toggles shader defines — compiling under the grey stage
        // state would recompile at the flip). compile() traverses hidden
        // objects, so the arena never appears on screen for this.
        L.prewarmed = true;
        const grayFog = scene.fog, grayBg = scene.background;
        scene.fog = L.fog;
        scene.background = L.bg;
        engine.renderer.compile(scene, engine.camera);
        const TEX_SLOTS = ['map', 'bumpMap', 'normalMap', 'roughnessMap',
          'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'envMap', 'lightMap'];
        scene.traverse((o) => {
          const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
          for (const m of mats) {
            for (const k of TEX_SLOTS) if (m[k]?.isTexture) engine.renderer.initTexture(m[k]);
            if (m.uniforms) {
              for (const u of Object.values(m.uniforms)) {
                if (u?.value?.isTexture) engine.renderer.initTexture(u.value);
              }
            }
          }
        });
        scene.fog = grayFog;
        scene.background = grayBg;
        return; // reveal next frame — the stall stays behind the overlay
      }
      // begin the FADE-IN: stage floor out, arena visible, but wrapped in
      // dense grey fog that recedes over ~1s (buildings emerge behind the
      // fighters). The sky dome stays hidden until the flip — the lerping
      // background color stands in for it.
      scene.remove(L.floor);
      L.floor.geometry.dispose();
      L.floor.material.dispose();
      for (const h of L.hidden) h.o.visible = h.vis;
      B.arena.sky.visible = false;
      L.greyCol = new THREE.Color(0x0a0e18);
      L.themeFogCol = new THREE.Color(B.arena.theme.fog.color);
      L.skyCol = new THREE.Color(B.arena.theme.sky.top);
      L.fadeFog = new THREE.Fog(0x0a0e18, 4, 26);
      L.fadeBg = new THREE.Color(0x0a0e18);
      scene.fog = L.fadeFog;
      scene.background = L.fadeBg;
      L.fade = 0;
    }
  }

  // ---------------- battle ----------------
  async function startBattle() {
    setScreen(null);
    S.stage?.destroy();
    S.stage = null;
    resetScene();
    S.mode = 'battle';

    const theme = THEMES_BY_ID[S.themeId];
    // snapshot the scene so everything the arena adds can be hidden behind
    // the warm-up's neutral backdrop (and revealed fully-warmed later)
    const preArena = engine.scene.children.slice();
    const world = new World(engine, audio);
    const arena = new Arena(engine, theme, (Math.random() * 9999) | 0);
    world.arena = arena;
    arena.bind(world);
    world.input = input;
    world.spawnAmmoBoxes(6, arena.bounds * 0.6);
    const arenaObjs = engine.scene.children.filter((o) => !preArena.includes(o));
    // per-view seam rendering: dynamic entities show their nearest image
    engine.onBeforeView = (cam) => world.applyViewWrap(cam);
    engine.onAfterView = () => world.clearViewWrap();

    const active = [];
    S.slots.forEach((s, i) => { if (s.kind !== 'off') active.push({ slot: s, slotIdx: i }); });
    const spawns = arena.spawnPoints(active.length);
    const fighters = [], humans = [], ais = [];
    // build mechs up-front: GLB-backed where the model manifest has one.
    // Each fighter wears its chosen paint scheme; anyone sharing a mech id
    // with an identical scheme (e.g. random AI picks) gets auto-bumped.
    const defs = active.map((a) => {
      const base = ROSTER_BY_ID[S.picks[a.slotIdx]] || ROSTER[(Math.random() * ROSTER.length) | 0];
      return { base, variant: S.variants?.[a.slotIdx] || 0 };
    });
    defs.forEach((d, i) => {
      const clash = () => defs.some((o, j) =>
        j < i && o.base.id === d.base.id && o.variant === d.variant);
      for (let t = 0; clash() && t < SCHEME_COUNT; t++) d.variant = (d.variant + 1) % SCHEME_COUNT;
    });
    const finalDefs = defs.map((d) => applyColorScheme(d.base, d.variant));
    // never gate the warm-up screen on slow model downloads: whoever's
    // model is ready within the grace window (procedural, or a GLB already
    // cached by the arena-select preload) spawns now; the rest spawn as
    // hidden procedural placeholders that swap to the real model mid-warm-up
    // (a spinner marks their panel until then — see startWarmup)
    const mechPromises = finalDefs.map((d) => createMech(d));
    const grace = new Promise((res) => setTimeout(() => res(null), 400));
    const mechs = await Promise.all(mechPromises.map((p) => Promise.race([p, grace])));
    active.forEach((a, i) => {
      const def = finalDefs[i];
      const f = new Fighter(world, def, {
        pos: spawns[i].pos, yaw: spawns[i].yaw,
        playerIndex: a.slotIdx, isAI: a.slot.kind === 'ai',
        mech: mechs[i] || undefined,
      });
      if (!mechs[i]) {
        f._modelPending = true;
        f.group.visible = false;
        mechPromises[i].then((m) => {
          f._modelPending = false;
          f._wuSpin?.remove();
          f._wuSpin = null;
          if (!world.fighters.includes(f)) return; // battle torn down
          if (m.isGLB) f.swapMech(m);
          f.group.visible = true;
          if (S.battle?.loading) f.animator.play('intro');
        });
      }
      fighters.push(f);
      world.fighters.push(f);
      if (a.slot.kind === 'ai') {
        const ctrl = new AIController(f, a.slot.diff);
        ctrl.diffName = a.slot.diff;
        ais.push(ctrl);
      } else humans.push({ fighter: f, device: a.slot.device, idx: humans.length });
    });

    const cameraSys = new CameraSystem(engine, world);
    world.cameraSys = cameraSys; // fighters + HUD reach the aim ray through this
    const hud = new Hud(uiRoot, world);
    hud.buildPlates(fighters);
    hud.positionPlates(cameraSys.layoutKind(humans.length), humans.map((h) => fighters.indexOf(h.fighter)));
    world.camera = engine.camera;

    const match = new Match({
      engine, world, fighters, hud,
      onEnd: (winner) => {
        S.mode = 'results';
        touchControls?.setVisible(false);
        setScreen(new ResultsScreen(uiRoot, {
          winner, audio,
          onRematch: () => { setScreen(null); match.begin(); S.mode = 'battle'; },
          onChangeMechs: () => { teardownBattle(); ensureStage(); goMechSelect(); },
          onMenu: () => goTitle(),
        }));
      },
    });

    // ---- RANDOM roster picks: a fresh robot is dealt every round ----
    const randomIdx = active
      .map((a, i) => (S.picks[a.slotIdx] === 'random' ? i : -1))
      .filter((i) => i >= 0);
    match.onRoundStart = (round) => {
      if (round < 2 || !randomIdx.length) return;
      for (const i of randomIdx) {
        const old = fighters[i];
        const exclude = new Set(fighters.filter((f) => f !== old).map((f) => f.def.id));
        const pool = ROSTER.filter((m) => !exclude.has(m.id));
        const base = pool.length ? pool[(Math.random() * pool.length) | 0]
          : ROSTER[(Math.random() * ROSTER.length) | 0];
        let variant = S.variants?.[old.playerIndex] || 0;
        for (let t = 0; fighters.some((o) => o !== old && o.def.id === base.id && (o.def.variant || 0) === variant) && t < SCHEME_COUNT; t++) {
          variant = (variant + 1) % SCHEME_COUNT;
        }
        const def = applyColorScheme(base, variant);
        // retire the old body cleanly (patches, quills, scene, geometry)
        world.effects.clearGlitchOn(old);
        world.scene.remove(old.group);
        old.group.traverse((o) => { if (o.isMesh) o.geometry?.dispose?.(); });
        const nf = new Fighter(world, def, {
          pos: old.pos.clone(), yaw: old.yaw,
          playerIndex: old.playerIndex, isAI: old.isAI,
        });
        // freshly-dealt robots fight in their procedural body until their
        // manifest GLB (if any) arrives in the background, then swap in
        createMech(def).then((m) => {
          if (m.isGLB && world.fighters.includes(nf)) nf.swapMech(m);
        });
        nf.wins = old.wins;
        fighters[i] = nf;
        const wi = world.fighters.indexOf(old);
        if (wi >= 0) world.fighters[wi] = nf;
        const h = humans.find((x) => x.fighter === old);
        if (h) h.fighter = nf;
        const ci = ais.findIndex((x) => x.f === old);
        if (ci >= 0) {
          const ctrl = new AIController(nf, ais[ci].diffName);
          ctrl.diffName = ais[ci].diffName;
          ais[ci] = ctrl;
        }
      }
      hud.buildPlates(fighters);
      hud.positionPlates(cameraSys.layoutKind(humans.length), humans.map((h) => fighters.indexOf(h.fighter)));
    };

    const usesTouch = humans.some((h) => h.device === 'touch');
    S.battle = { world, arena, fighters, humans, ais, cameraSys, hud, match, paused: false, usesTouch, loading: null, arenaObjs };
    if (touchControls) touchControls.setVisible(false); // hidden until the bell
    audio.music(theme.music);
    // pre-fight warm-up screen: the match is gated behind it while the
    // texture pack streams in and the first frames compile every shader
    startWarmup(S.battle, theme);

    // pad rumble helper reaches humans by playerIndex
    world.input.rumble = ((orig) => (playerIndex, s, ms) => {
      const h = humans.find((h) => h.fighter.playerIndex === playerIndex);
      if (h && h.device.startsWith('pad')) orig.call(input, +h.device[3], s, ms);
    })(Input.prototype.rumble);
  }

  function teardownBattle() {
    if (!S.battle) return;
    touchControls?.setVisible(false);
    if (S.battle.loading) { // quit mid-warm-up: drop the overlay + cameras
      S.battle.loading.ov.remove();
      S.battle.loading = null;
      engine.views = null;
    }
    S.battle.match.destroy();
    S.battle.hud.destroy();
    S.battle.cameraSys.dividerEl.remove();
    S.battle.arena.dispose();
    S.battle = null;
    resetScene();
    setScreen(null);
  }

  function pauseBattle() {
    if (!S.battle || S.battle.paused) return;
    S.battle.paused = true;
    touchControls?.setVisible(false);
    audio.play('pause');
    setScreen(new PauseScreen(uiRoot, {
      audio, hotButtons,
      onResume: () => { S.battle.paused = false; setScreen(null); if (S.battle.usesTouch) touchControls?.setVisible(true); },
      onQuit: () => goTitle(),
      onFullscreen: toggleFullscreen,
      onSettings: () => openSettings(),
      splitToggle: S.battle.humans.length === 2 ? {
        label: () => S.battle.cameraSys.layout2p === 'lr' ? 'SPLIT: SIDE BY SIDE' : 'SPLIT: STACKED',
        fn: () => toggleSplitLayout(),
      } : null,
    }));
  }

  // ---------------- main loop ----------------
  engine.onUpdate = (dt) => {
    input.poll();
    const B = S.battle;
    // pad pointers first: clicks land and pointer pads go quiet BEFORE the
    // screens read this frame's menu events
    padPointers.update(dt, !(S.mode === 'battle' && B && !B.paused));

    if (S.mode === 'battle' && B) {
      if (!B.paused) {
        for (const h of B.humans) {
          if (h.fighter.alive && !h.fighter.controlsLocked) {
            input.readIntent(h.device, h.fighter.intent, B.cameraSys.inputYawFor(h.fighter, h.idx));
            if (B.loading) {
              // warm-up playground: melee/movement only — no shots, no
              // specials, no ults before the bell
              const I = h.fighter.intent;
              I.ranged = I.rangedHeld = I.special = I.specialHeld = I.ult = false;
            }
          } else {
            h.fighter.intent.moveX = h.fighter.intent.moveZ = 0;
          }
        }
        for (const ai of B.ais) ai.update(dt);
        world_update(B, dt);
        if (B.loading) updateWarmup(B, dt);
        B.match.update(dt);
        const ev = input.menuEvents();
        if (ev.pause) pauseBattle();
      } else {
        screenUpdate(input.menuEvents());
      }
    } else if (S.mode === 'results' && B) {
      // battle keeps simmering behind the results panel
      world_update(B, dt * 0.4);
      screenUpdate(input.menuEvents());
    } else {
      S.stage?.update(dt);
      screenUpdate(input.menuEvents());
    }
    updateMuteBtn();
    input.endFrame();
  };

  function world_update(B, dt) {
    B.world.update(dt);
    B.hud.update(dt, engine.camera, B.match.state === 'fight' ? B.match.timeLeft : undefined);
  }

  engine.onRender = (dtReal) => {
    const B = S.battle;
    if (B?.loading) return; // warm-up owns the fixed per-fighter cameras
    if ((S.mode === 'battle' || S.mode === 'results') && B) {
      // right stick = camera control, per player
      if (!B.paused) {
        for (const h of B.humans) {
          if (!h.device.startsWith('pad')) continue;
          const pad = input.padsCur[+h.device[3]];
          const rx = pad.rx || 0, ry = pad.ry || 0;
          if (B.cameraSys.mode === 'split') {
            B.cameraSys.setLook(h.idx, rx, ry);
          } else if (rx || ry) {
            // solo combined view: stick feeds the shared look offsets
            B.cameraSys.applyLook(rx * 420 * dtReal, ry * 380 * dtReal);
          }
        }
      }
      B.cameraSys.update(B.paused ? 0.0001 : dtReal, B.fighters, B.humans.map((h) => h.fighter));
      world_updateCameraRef(B);
    }
  };

  function world_updateCameraRef(B) {
    B.world.camera = B.cameraSys.mode === 'combined' ? engine.camera : null; // popups only in combined view
  }

  goTitle();
  engine.start();
  window.__game = { S, engine, tick: (dt) => engine.onUpdate(dt) }; // debug hook
}
