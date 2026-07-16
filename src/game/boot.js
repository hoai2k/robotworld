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
import { TitleScreen, MechSelectScreen, ArenaSelectScreen, PauseScreen, ResultsScreen } from '../ui/menus.js';
import { GameAudio } from '../core/audio.js';
import { createMech, preloadMechModels } from '../mechs/gltf.js';
import { TouchControls } from './touch.js';
import { isTouchDevice } from '../core/utils.js';

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
    this.t = 0;
  }

  // title line-up: three hero mechs
  showLineup(ids = ['titanus', 'viper', 'nova']) {
    this.clearMechs();
    ids.forEach((id, i) => {
      const mech = buildMech(ROSTER_BY_ID[id]);
      mech.group.position.set((i - 1) * 10, 0, i === 1 ? 0 : -4);
      mech.group.rotation.y = (i - 1) * -0.4;
      mech.animator = new Animator(mech);
      this.group.add(mech.group);
      this.mechs.push(mech);
    });
    this.previewId = null;
    this._previewKey = null;
    this.engine.camera.position.set(0, 7.5, 26);
    this.engine.camera.lookAt(0, 6, 0);
  }

  showPreview(id) {
    this.showPreviews([{ id, slotIdx: 0 }]);
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
      const mech = buildMech(applyColorScheme(ROSTER_BY_ID[e.id], e.variant || 0));
      mech.animator = new Animator(mech);
      const x = cx + (i - (n - 1) / 2) * spacing;
      mech.group.position.set(x, 0, 0);
      this.group.add(mech.group);
      this.mechs.push(mech);
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
    this.engine.camera.position.set(n === 1 ? 5.5 : cx, n > 2 ? 8 : 6.5, dist);
    this.engine.camera.lookAt(cx, 5, 0);
  }

  clearMechs() {
    for (const m of this.mechs) this.group.remove(m.group);
    this.mechs = [];
    for (const r of this.rings) {
      this.group.remove(r);
      r.geometry.dispose();
      r.material.dispose();
    }
    this.rings = [];
  }

  update(dt) {
    this.t += dt;
    for (const m of this.mechs) {
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

export async function bootGame() {
  const engine = new Engine(document.getElementById('game-canvas'));
  const input = new Input();
  const uiRoot = document.getElementById('ui-root');

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
    'position:absolute;right:16px;bottom:14px;z-index:40;cursor:pointer;font-size:26px;' +
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
  let muteVisible = true;
  function updateMuteBtn() {
    const show = !(S.mode === 'battle' && S.battle && !S.battle.paused);
    if (show !== muteVisible) {
      muteVisible = show;
      muteBtn.style.display = show ? '' : 'none';
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
    S.screen?.destroy();
    S.screen = screen;
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
      audio,
      onPlay: () => goMechSelect(),
      onFullscreen: toggleFullscreen,
    }));
  }

  function goMechSelect() {
    ensureStage('lineup');
    S.mode = 'mechselect';
    setScreen(new MechSelectScreen(uiRoot, {
      input, audio, prev: S.slots,
      onPreview: (entries) => S.stage?.showPreviews(entries),
      onDone: (picks, variants, slots) => { S.picks = picks; S.variants = variants; S.slots = slots; goArenaSelect(); },
      onBack: () => goTitle(),
    }));
  }

  function goArenaSelect() {
    S.mode = 'arenaselect';
    preloadMechModels(S.picks.filter(Boolean)); // warm GLB cache while browsing arenas
    setScreen(new ArenaSelectScreen(uiRoot, {
      audio,
      onDone: (themeId) => { S.themeId = themeId; startBattle(); },
      onBack: () => goMechSelect(),
    }));
  }

  // ---------------- battle ----------------
  async function startBattle() {
    setScreen(null);
    S.stage?.destroy();
    S.stage = null;
    resetScene();
    S.mode = 'battle';

    const theme = THEMES_BY_ID[S.themeId];
    const world = new World(engine, audio);
    const arena = new Arena(engine, theme, (Math.random() * 9999) | 0);
    world.arena = arena;
    arena.bind(world);
    world.input = input;
    world.spawnAmmoBoxes(6, arena.bounds * 0.6);
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
    const mechs = await Promise.all(finalDefs.map((d) => createMech(d)));
    active.forEach((a, i) => {
      const def = finalDefs[i];
      const f = new Fighter(world, def, {
        pos: spawns[i].pos, yaw: spawns[i].yaw,
        playerIndex: a.slotIdx, isAI: a.slot.kind === 'ai',
        mech: mechs[i],
      });
      fighters.push(f);
      world.fighters.push(f);
      if (a.slot.kind === 'ai') ais.push(new AIController(f, a.slot.diff));
      else humans.push({ fighter: f, device: a.slot.device, idx: humans.length });
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

    const usesTouch = humans.some((h) => h.device === 'touch');
    S.battle = { world, arena, fighters, humans, ais, cameraSys, hud, match, paused: false, usesTouch };
    if (touchControls) touchControls.setVisible(usesTouch);
    audio.music(theme.music);
    match.begin();

    // pad rumble helper reaches humans by playerIndex
    world.input.rumble = ((orig) => (playerIndex, s, ms) => {
      const h = humans.find((h) => h.fighter.playerIndex === playerIndex);
      if (h && h.device.startsWith('pad')) orig.call(input, +h.device[3], s, ms);
    })(Input.prototype.rumble);
  }

  function teardownBattle() {
    if (!S.battle) return;
    touchControls?.setVisible(false);
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
      audio,
      onResume: () => { S.battle.paused = false; setScreen(null); if (S.battle.usesTouch) touchControls?.setVisible(true); },
      onQuit: () => goTitle(),
      onFullscreen: toggleFullscreen,
      soundToggle: {
        label: () => (muted ? 'SOUND: OFF' : 'SOUND: ON'),
        fn: () => setMuted(!muted),
      },
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

    if (S.mode === 'battle' && B) {
      if (!B.paused) {
        for (const h of B.humans) {
          if (h.fighter.alive && !h.fighter.controlsLocked) {
            input.readIntent(h.device, h.fighter.intent, B.cameraSys.inputYawFor(h.fighter, h.idx));
          } else {
            h.fighter.intent.moveX = h.fighter.intent.moveZ = 0;
          }
        }
        for (const ai of B.ais) ai.update(dt);
        world_update(B, dt);
        B.match.update(dt);
        const ev = input.menuEvents();
        if (ev.pause) pauseBattle();
      } else {
        S.screen?.update(input.menuEvents());
      }
    } else if (S.mode === 'results' && B) {
      // battle keeps simmering behind the results panel
      world_update(B, dt * 0.4);
      S.screen?.update(input.menuEvents());
    } else {
      S.stage?.update(dt);
      S.screen?.update(input.menuEvents());
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
