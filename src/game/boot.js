// Game boot: owns the engine, audio, input and the screen state machine.
// Title → Setup → Mech Select → Arena Select → Battle → Results → loop.
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Arena } from '../arena/arena.js';
import { THEMES_BY_ID } from '../arena/themes.js';
import { ROSTER_BY_ID, ROSTER } from '../mechs/roster.js';
import { buildMech } from '../mechs/factory.js';
import { Animator } from '../mechs/animator.js';
import { Fighter } from '../combat/fighter.js';
import { AIController } from './ai.js';
import { CameraSystem } from './camera.js';
import { Match } from './match.js';
import { Hud, toast } from '../ui/hud.js';
import { TitleScreen, SetupScreen, MechSelectScreen, ArenaSelectScreen, PauseScreen, ResultsScreen } from '../ui/menus.js';
import { GameAudio } from '../core/audio.js';

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
    this.previewId = null;
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
    this.engine.camera.position.set(0, 7.5, 26);
    this.engine.camera.lookAt(0, 6, 0);
  }

  showPreview(id) {
    if (this.previewId === id) return;
    this.previewId = id;
    this.clearMechs();
    const mech = buildMech(ROSTER_BY_ID[id]);
    mech.animator = new Animator(mech);
    mech.group.position.set(6.5, 0, 0);
    this.group.add(mech.group);
    this.mechs.push(mech);
    this.engine.camera.position.set(5.5, 6.5, 20);
    this.engine.camera.lookAt(6.5, 5, 0);
  }

  clearMechs() {
    for (const m of this.mechs) this.group.remove(m.group);
    this.mechs = [];
  }

  update(dt) {
    this.t += dt;
    for (const m of this.mechs) {
      if (this.previewId) m.group.rotation.y = Math.sin(this.t * 0.4) * 0.55 + 0.15;
      m.animator.update(dt, { speed: 0, grounded: true });
    }
  }

  destroy() {
    this.clearMechs();
    this.engine.scene.remove(this.group);
  }
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
  });

  // ---------------- state machine ----------------
  const S = {
    screen: null,        // active menu screen object (has update/destroy)
    stage: null,         // MenuStage
    battle: null,        // battle context
    slots: null,
    picks: null,
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
      onPlay: () => goSetup(),
      onFullscreen: toggleFullscreen,
    }));
  }

  function goSetup() {
    ensureStage('lineup');
    S.mode = 'setup';
    setScreen(new SetupScreen(uiRoot, {
      input, audio, prev: S.slots,
      onNext: (slots) => { S.slots = slots; goMechSelect(); },
      onBack: () => goTitle(),
    }));
  }

  function goMechSelect() {
    ensureStage();
    S.mode = 'mechselect';
    setScreen(new MechSelectScreen(uiRoot, {
      slots: S.slots, input, audio,
      onHover: (id) => S.stage?.showPreview(id),
      onDone: (picks) => { S.picks = picks; goArenaSelect(); },
      onBack: () => goSetup(),
    }));
  }

  function goArenaSelect() {
    S.mode = 'arenaselect';
    setScreen(new ArenaSelectScreen(uiRoot, {
      audio,
      onDone: (themeId) => { S.themeId = themeId; startBattle(); },
      onBack: () => goMechSelect(),
    }));
  }

  // ---------------- battle ----------------
  function startBattle() {
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

    const active = [];
    S.slots.forEach((s, i) => { if (s.kind !== 'off') active.push({ slot: s, slotIdx: i }); });
    const spawns = arena.spawnPoints(active.length);
    const fighters = [], humans = [], ais = [];
    active.forEach((a, i) => {
      const def = ROSTER_BY_ID[S.picks[a.slotIdx]] || ROSTER[(Math.random() * 12) | 0];
      const f = new Fighter(world, def, {
        pos: spawns[i].pos, yaw: spawns[i].yaw,
        playerIndex: a.slotIdx, isAI: a.slot.kind === 'ai',
      });
      fighters.push(f);
      world.fighters.push(f);
      if (a.slot.kind === 'ai') ais.push(new AIController(f, a.slot.diff));
      else humans.push({ fighter: f, device: a.slot.device, idx: humans.length });
    });

    const cameraSys = new CameraSystem(engine, world);
    const hud = new Hud(uiRoot, world);
    hud.buildPlates(fighters);
    world.camera = engine.camera;

    const match = new Match({
      engine, world, fighters, hud,
      onEnd: (winner) => {
        S.mode = 'results';
        setScreen(new ResultsScreen(uiRoot, {
          winner, audio,
          onRematch: () => { setScreen(null); match.begin(); S.mode = 'battle'; },
          onChangeMechs: () => { teardownBattle(); ensureStage(); goMechSelect(); },
          onMenu: () => goTitle(),
        }));
      },
    });

    S.battle = { world, arena, fighters, humans, ais, cameraSys, hud, match, paused: false };
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
    audio.play('pause');
    setScreen(new PauseScreen(uiRoot, {
      audio,
      onResume: () => { S.battle.paused = false; setScreen(null); },
      onQuit: () => goTitle(),
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
    input.endFrame();
  };

  function world_update(B, dt) {
    B.world.update(dt);
    B.hud.update(dt, engine.camera, B.match.state === 'fight' ? B.match.timeLeft : undefined);
  }

  engine.onRender = (dtReal) => {
    const B = S.battle;
    if ((S.mode === 'battle' || S.mode === 'results') && B) {
      B.cameraSys.update(B.paused ? 0.0001 : dtReal, B.fighters, B.humans.map((h) => h.fighter));
      world_updateCameraRef(B);
    }
  };

  function world_updateCameraRef(B) {
    B.world.camera = B.cameraSys.mode === 'combined' ? engine.camera : null; // popups only in combined view
  }

  goTitle();
  engine.start();
}
