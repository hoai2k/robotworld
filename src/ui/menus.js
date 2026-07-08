// Menu screens: Title → Setup → Mech Select → Arena Select → (battle) → Results.
// Each screen builds DOM into #ui-root and consumes aggregated menu events.
import { ROSTER } from '../mechs/roster.js';
import { THEMES } from '../arena/themes.js';
import { isTouchDevice } from '../core/utils.js';

const COLOR_CSS = ['#38e8ff', '#ff4d5e', '#62ff9a', '#ffb43c'];

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

// On-screen nav button for touch devices (click fires on tap too).
function touchBtn(label, cls, onTap) {
  const b = el('div', 'touch-navbtn ' + cls, label);
  b.addEventListener('click', (e) => { e.preventDefault(); onTap(); });
  return b;
}

// A floating BACK button, bottom-left, shown only on touch screens.
function appendTouchBack(screenEl, onBack) {
  if (!isTouchDevice()) return;
  screenEl.appendChild(touchBtn('◀ BACK', 'nav-back', onBack));
}

// ---------------- TITLE ----------------
export class TitleScreen {
  constructor(root, { onPlay, onFullscreen, audio }) {
    this.audio = audio;
    this.onPlay = onPlay;
    this.onFullscreen = onFullscreen;
    this.el = el('div', 'screen fade-in');
    this.el.innerHTML = `
      <div style="text-align:center">
        <div class="mega-title">ROBOTWORLD</div>
        <div class="mega-sub">MECH BATTLE ARENA</div>
      </div>`;
    this.menu = el('div', 'menu-list');
    this.items = ['BATTLE', 'FULLSCREEN'];
    this.sel = 0;
    this.itemEls = this.items.map((t, i) => {
      const it = el('div', 'menu-item' + (i === 0 ? ' selected' : ''), t);
      it.addEventListener('click', () => { this.sel = i; this.confirm(); });
      it.addEventListener('mouseenter', () => { this.sel = i; this.refresh(); });
      this.menu.appendChild(it);
      return it;
    });
    this.el.appendChild(this.menu);
    this.el.appendChild(el('div', 'hint-bar',
      '<b>↑↓</b> select&nbsp;&nbsp;<b>ENTER / A</b> confirm&nbsp;&nbsp;·&nbsp;&nbsp;P1 <b>WASD</b> + <b>F G H R T Y</b> · <b>SPACE</b> jump · <b>SHIFT</b> dash&nbsp;&nbsp;·&nbsp;&nbsp;Xbox controllers supported'));
    root.appendChild(this.el);
  }
  refresh() {
    this.itemEls.forEach((e, i) => e.classList.toggle('selected', i === this.sel));
  }
  confirm() {
    this.audio?.play('uiSelect');
    if (this.items[this.sel] === 'BATTLE') this.onPlay();
    else this.onFullscreen();
  }
  update(ev) {
    if (ev.up) { this.sel = (this.sel + this.items.length - 1) % this.items.length; this.audio?.play('uiMove'); this.refresh(); }
    if (ev.down) { this.sel = (this.sel + 1) % this.items.length; this.audio?.play('uiMove'); this.refresh(); }
    if (ev.confirm) this.confirm();
  }
  destroy() { this.el.remove(); }
}

// ---------------- BATTLE SETUP ----------------
// 4 slots; each cycles: kb1, kb2, pads (connected), AI tiers, OFF.
export class SetupScreen {
  constructor(root, { input, audio, onNext, onBack, prev }) {
    this.input = input;
    this.audio = audio;
    this.onNext = onNext;
    this.onBack = onBack;
    this.el = el('div', 'screen dim fade-in');
    this.el.appendChild(el('div', 'screen-heading', 'BATTLE SETUP'));
    this.grid = el('div', 'setup-grid');
    this.el.appendChild(this.grid);
    this.touch = isTouchDevice();
    this.el.appendChild(el('div', 'hint-bar',
      '<b>←→</b> change&nbsp;&nbsp;<b>↑↓</b> slot&nbsp;&nbsp;<b>ENTER / A</b> continue&nbsp;&nbsp;<b>ESC / B</b> back&nbsp;&nbsp;·&nbsp;&nbsp;need at least 2 fighters'));
    root.appendChild(this.el);

    // On touch: default to solo play (you vs one AI) with the on-screen pad.
    const defaults = this.touch
      ? [{ kind: 'human', device: 'touch' }, { kind: 'ai', diff: 'veteran' }, { kind: 'off' }, { kind: 'off' }]
      : [{ kind: 'human', device: 'kb1' }, { kind: 'ai', diff: 'veteran' }, { kind: 'off' }, { kind: 'off' }];
    this.slots = prev || defaults;
    this.cursor = 0;
    this.cards = [];
    for (let i = 0; i < 4; i++) {
      const c = el('div', 'panel slot-card');
      // Tap/click a card to cycle: left half = previous option, right half = next.
      c.addEventListener('click', (e) => {
        this.cursor = i;
        const r = c.getBoundingClientRect();
        this.cycle(i, (e.clientX - r.left) < r.width / 2 ? -1 : 1);
      });
      this.grid.appendChild(c);
      this.cards.push(c);
    }

    if (this.touch) {
      const bar = el('div', 'touch-navbar');
      bar.appendChild(touchBtn('◀ BACK', 'nav-back', () => { this.audio?.play('uiBack'); this.onBack(); }));
      bar.appendChild(touchBtn('CONTINUE ▶', 'nav-next', () => this.tryContinue()));
      this.el.appendChild(bar);
    }
    this.render();
  }

  options() {
    const opts = [];
    if (this.input.touchAvailable) opts.push({ kind: 'human', device: 'touch' });
    opts.push({ kind: 'human', device: 'kb1' }, { kind: 'human', device: 'kb2' });
    for (let i = 0; i < 4; i++) {
      if (this.input.padConnected(i)) opts.push({ kind: 'human', device: 'pad' + i });
    }
    opts.push({ kind: 'ai', diff: 'rookie' }, { kind: 'ai', diff: 'veteran' }, { kind: 'ai', diff: 'ace' }, { kind: 'off' });
    return opts;
  }

  tryContinue() {
    if (this.activeCount() >= 2) { this.audio?.play('uiSelect'); this.onNext(this.slots); }
    else this.audio?.play('uiBack');
  }

  optIndex(slot) {
    const opts = this.options();
    return opts.findIndex((o) =>
      o.kind === slot.kind &&
      (o.kind !== 'human' || o.device === slot.device) &&
      (o.kind !== 'ai' || o.diff === slot.diff));
  }

  deviceTaken(device, exceptSlot) {
    return this.slots.some((s, i) => i !== exceptSlot && s.kind === 'human' && s.device === device);
  }

  cycle(slotIdx, dir) {
    const opts = this.options();
    let idx = this.optIndex(this.slots[slotIdx]);
    if (idx < 0) idx = opts.length - 1;
    for (let n = 0; n < opts.length; n++) {
      idx = (idx + dir + opts.length) % opts.length;
      const o = opts[idx];
      if (o.kind === 'human' && this.deviceTaken(o.device, slotIdx)) continue;
      this.slots[slotIdx] = { ...o };
      break;
    }
    this.audio?.play('uiMove');
    this.render();
  }

  label(s) {
    if (s.kind === 'off') return { v: '— OFF —', sub: '' };
    if (s.kind === 'ai') {
      const names = { rookie: 'AI · ROOKIE', veteran: 'AI · VETERAN', ace: 'AI · ACE' };
      return { v: names[s.diff], sub: 'computer-controlled fighter' };
    }
    const map = {
      touch: ['TOUCH', 'On-screen joystick + buttons'],
      kb1: ['KEYBOARD 1', 'WASD + F/G/H/R/T/Y · Space · Shift'],
      kb2: ['KEYBOARD 2', 'Arrows + Numpad 1-6 · Num0 jump'],
      pad0: ['GAMEPAD 1', 'Xbox controller'], pad1: ['GAMEPAD 2', 'Xbox controller'],
      pad2: ['GAMEPAD 3', 'Xbox controller'], pad3: ['GAMEPAD 4', 'Xbox controller'],
    };
    return { v: map[s.device][0], sub: map[s.device][1] };
  }

  render() {
    this.slots.forEach((s, i) => {
      const { v, sub } = this.label(s);
      const c = this.cards[i];
      c.classList.toggle('sel', i === this.cursor);
      c.innerHTML = `
        <div class="slot-label" style="color:${COLOR_CSS[i]}">PLAYER ${i + 1}</div>
        <div class="slot-arrows">◀&nbsp;&nbsp;&nbsp;▶</div>
        <div class="slot-value" style="color:${s.kind === 'off' ? '#4e6478' : '#fff'}">${v}</div>
        <div class="slot-sub">${sub}</div>`;
    });
  }

  activeCount() { return this.slots.filter((s) => s.kind !== 'off').length; }

  update(ev) {
    if (ev.left) this.cycle(this.cursor, -1);
    if (ev.right) this.cycle(this.cursor, 1);
    if (ev.up) { this.cursor = (this.cursor + 3) % 4; this.audio?.play('uiMove'); this.render(); }
    if (ev.down) { this.cursor = (this.cursor + 1) % 4; this.audio?.play('uiMove'); this.render(); }
    if (ev.confirm) this.tryContinue();
    if (ev.back) { this.audio?.play('uiBack'); this.onBack(); }
  }
  destroy() { this.el.remove(); }
}

// ---------------- MECH SELECT ----------------
// Human players pick in order; AI slots randomize.
export class MechSelectScreen {
  constructor(root, { slots, input, audio, onDone, onBack, onHover }) {
    this.slots = slots;
    this.input = input;
    this.audio = audio;
    this.onDone = onDone;
    this.onBack = onBack;
    this.onHover = onHover;
    this.el = el('div', 'screen fade-in');
    this.el.appendChild(el('div', 'screen-heading', 'CHOOSE YOUR MECH'));

    this.grid = el('div', 'roster-grid');
    this.cells = ROSTER.map((m, i) => {
      const c = el('div', 'roster-cell');
      c.innerHTML = `
        <div class="cell-tint" style="background:linear-gradient(150deg, #${m.colors.primary.toString(16).padStart(6, '0')}, transparent)"></div>
        <div class="cell-icon">${m.icon}</div>
        <div class="cell-name">${m.name}</div>`;
      c.addEventListener('mouseenter', () => { this.cursor = i; this.refresh(); });
      c.addEventListener('click', () => this.confirm());
      this.grid.appendChild(c);
      return c;
    });
    this.el.appendChild(this.grid);

    this.card = el('div', 'panel mech-info-card');
    this.el.appendChild(this.card);

    this.status = el('div', 'picker-status');
    this.el.appendChild(this.status);
    this.el.appendChild(el('div', 'hint-bar',
      '<b>ARROWS / STICK</b> move&nbsp;&nbsp;<b>ENTER / A</b> lock in&nbsp;&nbsp;<b>ESC / B</b> back'));
    root.appendChild(this.el);
    // On touch, tapping a mech tile locks it in; this handles going back.
    appendTouchBack(this.el, () => this.input.touchMenuEvent('back'));

    // picking order: humans in slot order
    this.pickOrder = [];
    this.slots.forEach((s, i) => { if (s.kind === 'human') this.pickOrder.push(i); });
    this.pickIdx = 0;
    this.picks = new Array(4).fill(null);
    this.cursor = 0;
    this.refresh();
  }

  currentSlot() { return this.pickOrder[this.pickIdx]; }

  refresh() {
    const slotIdx = this.currentSlot();
    this.cells.forEach((c, i) => {
      c.className = 'roster-cell';
      if (i === this.cursor && slotIdx !== undefined) c.classList.add(`cursor-p${slotIdx + 1}`);
      if (this.picks.some((p, si) => p === ROSTER[i].id && this.slots[si]?.kind === 'human')) c.classList.add('locked-pick');
    });
    const m = ROSTER[this.cursor];
    this.card.innerHTML = `
      <div class="mi-name" style="color:#${m.colors.glow.toString(16).padStart(6, '0')}">${m.icon} ${m.name}</div>
      <div class="mi-title">${m.title}</div>
      <div class="mi-blurb">${m.blurb}</div>
      <div class="mi-stats">
        ${this.statRow('POWER', m.ui.power)}
        ${this.statRow('SPEED', m.ui.speed)}
        ${this.statRow('DEFENSE', m.ui.defense)}
      </div>
      <div class="mi-moves">
        <b>RANGED</b> ${m.moves.ranged.name} &nbsp;·&nbsp; <b>SPECIAL</b> ${m.moves.special.name}<br>
        <b>ULTIMATE</b> ${m.moves.ult.name}
      </div>`;
    this.status.innerHTML = '';
    this.slots.forEach((s, i) => {
      if (s.kind === 'off') return;
      const chip = el('div', 'picker-chip');
      chip.style.borderColor = COLOR_CSS[i];
      if (s.kind === 'ai') {
        chip.textContent = `P${i + 1} · CPU`;
        chip.classList.add('done');
      } else if (this.picks[i]) {
        chip.textContent = `P${i + 1} ✓ ${this.picks[i].toUpperCase()}`;
        chip.classList.add('done');
      } else if (i === this.currentSlot()) {
        chip.textContent = `P${i + 1} PICKING...`;
        chip.classList.add('active');
      } else {
        chip.textContent = `P${i + 1} WAITING`;
      }
      this.status.appendChild(chip);
    });
    this.onHover?.(m.id);
  }

  statRow(label, v) {
    return `<div class="stat-row"><div class="stat-label">${label}</div>
      <div class="stat-bar"><div class="stat-fill" style="width:${v * 10}%"></div></div></div>`;
  }

  confirm() {
    const slotIdx = this.currentSlot();
    if (slotIdx === undefined) return;
    this.picks[slotIdx] = ROSTER[this.cursor].id;
    this.audio?.play('uiSelect');
    this.pickIdx++;
    if (this.pickIdx >= this.pickOrder.length) {
      // AI slots pick random distinct-ish mechs
      const taken = new Set(this.picks.filter(Boolean));
      this.slots.forEach((s, i) => {
        if (s.kind === 'ai') {
          const pool = ROSTER.filter((m) => !taken.has(m.id));
          const m = (pool.length ? pool : ROSTER)[(Math.random() * (pool.length ? pool.length : ROSTER.length)) | 0];
          this.picks[i] = m.id;
          taken.add(m.id);
        }
      });
      this.onDone(this.picks);
      return;
    }
    this.refresh();
  }

  update() {
    const slotIdx = this.currentSlot();
    if (slotIdx === undefined) return;
    const device = this.slots[slotIdx].device;
    const ev = this.input.menuEventsFor(device);
    // any device can also help navigate if it's the only human
    const evAll = this.pickOrder.length === 1 ? this.input.menuEvents() : ev;
    const cols = 3;
    let moved = false;
    if (ev.left || evAll.left) { this.cursor = (this.cursor + 11) % 12; moved = true; }
    if (ev.right || evAll.right) { this.cursor = (this.cursor + 1) % 12; moved = true; }
    if (ev.up || evAll.up) { this.cursor = (this.cursor + 12 - cols) % 12; moved = true; }
    if (ev.down || evAll.down) { this.cursor = (this.cursor + cols) % 12; moved = true; }
    if (moved) { this.audio?.play('uiMove'); this.refresh(); }
    if (ev.confirm || evAll.confirm) this.confirm();
    if (ev.back || evAll.back) {
      if (this.pickIdx > 0) {
        this.pickIdx--;
        this.picks[this.currentSlot()] = null;
        this.audio?.play('uiBack');
        this.refresh();
      } else {
        this.audio?.play('uiBack');
        this.onBack();
      }
    }
  }
  destroy() { this.el.remove(); }
}

// ---------------- ARENA SELECT ----------------
export class ArenaSelectScreen {
  constructor(root, { audio, onDone, onBack }) {
    this.audio = audio;
    this.onDone = onDone;
    this.onBack = onBack;
    this.el = el('div', 'screen dim fade-in');
    this.el.appendChild(el('div', 'screen-heading', 'SELECT ARENA'));

    const wrap = el('div', '');
    wrap.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:min(88vw,1240px);margin-top:8vh;';
    this.cards = THEMES.map((t, i) => {
      const c = el('div', 'arena-card');
      const art = document.createElement('canvas');
      art.className = 'arena-art';
      art.width = 256; art.height = 144;
      this.drawArt(art, t);
      c.appendChild(art);
      c.appendChild(el('div', 'arena-name', t.name));
      c.appendChild(el('div', 'arena-desc', t.desc));
      c.addEventListener('mouseenter', () => { this.cursor = i; this.refresh(); });
      c.addEventListener('click', () => this.confirm());
      wrap.appendChild(c);
      return c;
    });
    this.el.appendChild(wrap);
    this.el.appendChild(el('div', 'hint-bar', '<b>ARROWS</b> move&nbsp;&nbsp;<b>ENTER / A</b> fight!&nbsp;&nbsp;<b>ESC / B</b> back'));
    root.appendChild(this.el);
    // On touch, tapping an arena starts the fight; this handles going back.
    appendTouchBack(this.el, () => { this.audio?.play('uiBack'); this.onBack(); });
    this.cursor = 0;
    this.refresh();
  }

  drawArt(canvas, t) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const hx = (h) => '#' + h.toString(16).padStart(6, '0');
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, hx(t.sky.top));
    g.addColorStop(0.72, hx(t.sky.bottom));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (t.sky.stars) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * W, Math.random() * H * 0.5, 1, 1);
    }
    // skyline silhouette
    ctx.fillStyle = hx(t.fog.color);
    let x = 0;
    let sd = t.id.length * 7 + 3;
    const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    while (x < W) {
      const w = 14 + rnd() * 26, h = 20 + rnd() * 55;
      ctx.fillRect(x, H * 0.78 - h, w, h);
      x += w + 3;
    }
    // ground
    ctx.fillStyle = hx(t.ground.color);
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    ctx.fillStyle = hx(t.ground.accent || 0x53e8ff);
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, H * 0.78, W, 2.5);
    ctx.globalAlpha = 1;
  }

  refresh() {
    this.cards.forEach((c, i) => c.classList.toggle('selected', i === this.cursor));
    this.cards[this.cursor]?.scrollIntoView?.({ block: 'nearest' });
  }
  confirm() {
    this.audio?.play('uiSelect');
    this.onDone(THEMES[this.cursor].id);
  }
  update(ev) {
    let moved = false;
    if (ev.left) { this.cursor = (this.cursor + 11) % 12; moved = true; }
    if (ev.right) { this.cursor = (this.cursor + 1) % 12; moved = true; }
    if (ev.up) { this.cursor = (this.cursor + 8) % 12; moved = true; }
    if (ev.down) { this.cursor = (this.cursor + 4) % 12; moved = true; }
    if (moved) { this.audio?.play('uiMove'); this.refresh(); }
    if (ev.confirm) this.confirm();
    if (ev.back) { this.audio?.play('uiBack'); this.onBack(); }
  }
  destroy() { this.el.remove(); }
}

// ---------------- PAUSE ----------------
export class PauseScreen {
  constructor(root, { audio, onResume, onQuit }) {
    this.audio = audio;
    this.el = el('div', 'screen dim fade-in');
    this.el.innerHTML = `<div class="mega-title pause-title">PAUSED</div>`;
    this.menu = el('div', 'menu-list');
    this.items = [
      { t: 'RESUME', fn: onResume },
      { t: 'CONTROLS', fn: () => this.toggleControls() },
      { t: 'QUIT TO MENU', fn: onQuit },
    ];
    this.sel = 0;
    this.itemEls = this.items.map((it, i) => {
      const e = el('div', 'menu-item' + (i === 0 ? ' selected' : ''), it.t);
      e.addEventListener('click', () => { this.sel = i; this.confirm(); });
      e.addEventListener('mouseenter', () => { this.sel = i; this.refresh(); });
      this.menu.appendChild(e);
      return e;
    });
    this.el.appendChild(this.menu);
    this.controls = el('div', 'panel');
    this.controls.style.cssText = 'margin-top:20px;padding:16px 26px;display:none;font-size:13px;line-height:1.9;color:#b8d4e6;';
    this.controls.innerHTML = `
      <b style="color:#fff">KEYBOARD P1</b> — WASD move · SPACE jump · F light · G heavy · H block · R ranged · T special · Y ultimate · SHIFT dash · B taunt<br>
      <b style="color:#fff">KEYBOARD P2</b> — Arrows move · Num0 jump · Num1 light · Num2 heavy · Num3 block · Num4 ranged · Num5 special · Num6 ult · NumEnter dash<br>
      <b style="color:#fff">XBOX PAD</b> — Stick move · A jump · X light · Y heavy · B special · RT ranged · LT block · RB dash · LB ultimate · R-stick click taunt`;
    this.el.appendChild(this.controls);
    root.appendChild(this.el);
  }
  toggleControls() {
    this.controls.style.display = this.controls.style.display === 'none' ? 'block' : 'none';
  }
  refresh() { this.itemEls.forEach((e, i) => e.classList.toggle('selected', i === this.sel)); }
  confirm() { this.audio?.play('uiSelect'); this.items[this.sel].fn(); }
  update(ev) {
    if (ev.up) { this.sel = (this.sel + 2) % 3; this.audio?.play('uiMove'); this.refresh(); }
    if (ev.down) { this.sel = (this.sel + 1) % 3; this.audio?.play('uiMove'); this.refresh(); }
    if (ev.confirm) this.confirm();
    if (ev.back || ev.pause) this.items[0].fn();
  }
  destroy() { this.el.remove(); }
}

// ---------------- RESULTS ----------------
export class ResultsScreen {
  constructor(root, { winner, audio, onRematch, onChangeMechs, onMenu }) {
    this.audio = audio;
    this.el = el('div', 'screen dim fade-in');
    const panel = el('div', 'panel results-panel');
    panel.innerHTML = `
      <div class="winner-sub">CHAMPION</div>
      <div class="winner-name" style="color:#${winner.def.colors.glow.toString(16).padStart(6, '0')}">${winner.def.icon} ${winner.def.name}</div>
      <div class="winner-quote">${winner.def.quotes.win}</div>`;
    this.el.appendChild(panel);
    this.menu = el('div', 'menu-list');
    this.items = [
      { t: 'REMATCH', fn: onRematch },
      { t: 'CHANGE MECHS', fn: onChangeMechs },
      { t: 'MAIN MENU', fn: onMenu },
    ];
    this.sel = 0;
    this.itemEls = this.items.map((it, i) => {
      const e = el('div', 'menu-item' + (i === 0 ? ' selected' : ''), it.t);
      e.addEventListener('click', () => { this.sel = i; this.confirm(); });
      e.addEventListener('mouseenter', () => { this.sel = i; this.refresh(); });
      this.menu.appendChild(e);
      return e;
    });
    this.el.appendChild(this.menu);
    root.appendChild(this.el);
  }
  refresh() { this.itemEls.forEach((e, i) => e.classList.toggle('selected', i === this.sel)); }
  confirm() { this.audio?.play('uiSelect'); this.items[this.sel].fn(); }
  update(ev) {
    if (ev.up) { this.sel = (this.sel + 2) % 3; this.audio?.play('uiMove'); this.refresh(); }
    if (ev.down) { this.sel = (this.sel + 1) % 3; this.audio?.play('uiMove'); this.refresh(); }
    if (ev.confirm) this.confirm();
  }
  destroy() { this.el.remove(); }
}
