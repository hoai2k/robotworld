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
      '<b>←→</b> player&nbsp;&nbsp;<b>↑↓</b> change&nbsp;&nbsp;<b>ENTER / A</b> continue&nbsp;&nbsp;<b>ESC / B</b> back&nbsp;&nbsp;·&nbsp;&nbsp;need at least 2 fighters'));
    root.appendChild(this.el);

    this.slots = prev || this.defaultSlots();
    // once the player has made choices (or brought previous ones), stop
    // auto-assigning newly connected controllers over them
    this._touched = !!prev;
    this._padCount = this.input.connectedPadCount();
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

  connectedPads() {
    const pads = [];
    for (let i = 0; i < 4; i++) if (this.input.padConnected(i)) pads.push('pad' + i);
    return pads;
  }

  // Controllers plugged in? They ARE the players: first two pads take the
  // first two slots. Otherwise touch or keyboard vs one AI.
  defaultSlots() {
    const pads = this.connectedPads();
    if (pads.length >= 2) {
      return [{ kind: 'human', device: pads[0] }, { kind: 'human', device: pads[1] }, { kind: 'off' }, { kind: 'off' }];
    }
    if (pads.length === 1) {
      return [{ kind: 'human', device: pads[0] }, { kind: 'ai', diff: 'veteran' }, { kind: 'off' }, { kind: 'off' }];
    }
    if (this.touch) {
      return [{ kind: 'human', device: 'touch' }, { kind: 'ai', diff: 'veteran' }, { kind: 'off' }, { kind: 'off' }];
    }
    return [{ kind: 'human', device: 'kb1' }, { kind: 'ai', diff: 'veteran' }, { kind: 'off' }, { kind: 'off' }];
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
    this._touched = true;
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
    if (s.device.startsWith('pad')) {
      // number pads by their order among CONNECTED controllers, not their
      // raw browser slot — two pads at indices 1 & 2 read GAMEPAD 1 & 2
      return { v: `GAMEPAD ${this.padOrdinal(s.device)}`, sub: 'Xbox controller' };
    }
    const map = {
      touch: ['TOUCH', 'On-screen joystick + buttons'],
      kb1: ['KEYBOARD 1', 'WASD + F/G/H/R/T/Y · Space · Shift'],
      kb2: ['KEYBOARD 2', 'Arrows + Numpad 1-6 · Num0 jump'],
    };
    return { v: map[s.device][0], sub: map[s.device][1] };
  }

  padOrdinal(device) {
    const idx = +device[3];
    let n = 0;
    for (let i = 0; i < 4; i++) {
      if (this.input.padConnected(i)) {
        n++;
        if (i === idx) return n;
      }
    }
    return idx + 1; // disconnected pad: fall back to its raw slot number
  }

  render() {
    this.slots.forEach((s, i) => {
      const { v, sub } = this.label(s);
      const c = this.cards[i];
      c.classList.toggle('sel', i === this.cursor);
      c.innerHTML = `
        <div class="slot-label" style="color:${COLOR_CSS[i]}">PLAYER ${i + 1}</div>
        <div class="slot-arrows">▲</div>
        <div class="slot-value" style="color:${s.kind === 'off' ? '#4e6478' : '#fff'}">${v}</div>
        <div class="slot-arrows">▼</div>
        <div class="slot-sub">${sub}</div>`;
    });
  }

  activeCount() { return this.slots.filter((s) => s.kind !== 'off').length; }

  update(ev) {
    // controllers often only register after a button press — when one shows
    // up mid-screen, re-apply the pad defaults (unless the player already
    // customized the slots) and refresh the ordinal labels
    const padCount = this.input.connectedPadCount();
    if (padCount !== this._padCount) {
      this._padCount = padCount;
      if (!this._touched) this.slots = this.defaultSlots();
      this.render();
    }
    // cards are laid out left-to-right: ←→ picks the player, ↑↓ changes it
    if (ev.left) { this.cursor = (this.cursor + 3) % 4; this.audio?.play('uiMove'); this.render(); }
    if (ev.right) { this.cursor = (this.cursor + 1) % 4; this.audio?.play('uiMove'); this.render(); }
    if (ev.up) this.cycle(this.cursor, 1);
    if (ev.down) this.cycle(this.cursor, -1);
    if (ev.confirm) this.tryContinue();
    if (ev.back) { this.audio?.play('uiBack'); this.onBack(); }
  }
  destroy() { this.el.remove(); }
}

// ---------------- MECH SELECT ----------------
// ALL human players pick simultaneously — each has their own colored cursor
// and 3D preview; AI slots randomize once everyone locks in.
export class MechSelectScreen {
  constructor(root, { slots, input, audio, onDone, onBack, onPreview }) {
    this.slots = slots;
    this.input = input;
    this.audio = audio;
    this.onDone = onDone;
    this.onBack = onBack;
    this.onPreview = onPreview;
    this.touch = isTouchDevice();
    this.el = el('div', 'screen fade-in');
    this.el.appendChild(el('div', 'screen-heading', 'CHOOSE YOUR MECH'));

    // one picker per human slot, all live at once
    this.pickers = [];
    this.slots.forEach((s, i) => {
      if (s.kind === 'human') {
        this.pickers.push({ slotIdx: i, device: s.device, cursor: this.pickers.length, locked: false });
      }
    });
    this.picks = new Array(4).fill(null);
    this.finished = false;
    // mouse/tap drives the touch picker if present, else kb1, else the first
    this.mousePicker = this.pickers.find((p) => p.device === 'touch')
      || this.pickers.find((p) => p.device === 'kb1') || this.pickers[0];

    this.grid = el('div', 'roster-grid');
    this.cells = ROSTER.map((m, i) => {
      const c = el('div', 'roster-cell');
      c.innerHTML = `
        <div class="cell-tint" style="background:linear-gradient(150deg, #${m.colors.primary.toString(16).padStart(6, '0')}, transparent)"></div>
        <div class="cell-icon">${m.icon}</div>
        <div class="cell-name">${m.name}</div>`;
      c.addEventListener('mouseenter', () => {
        if (this.mousePicker && !this.mousePicker.locked) { this.mousePicker.cursor = i; this.refresh(); }
      });
      // On touch, a tap previews (so you can read stats first); the LOCK IN
      // button commits. On desktop, clicking the highlighted tile locks in.
      c.addEventListener('click', () => {
        const pk = this.mousePicker;
        if (!pk || pk.locked) return;
        if (this.touch) {
          if (pk.cursor !== i) { pk.cursor = i; this.audio?.play('uiMove'); this.refresh(); }
        } else if (pk.cursor === i) this.lockIn(pk);
      });
      this.grid.appendChild(c);
      return c;
    });
    this.el.appendChild(this.grid);

    this.card = el('div', 'panel mech-info-card');
    this.el.appendChild(this.card);

    this.status = el('div', 'picker-status');
    this.el.appendChild(this.status);
    this.el.appendChild(el('div', 'hint-bar',
      this.pickers.length > 1
        ? 'everyone picks at once!&nbsp;&nbsp;<b>ARROWS / STICK</b> move&nbsp;&nbsp;<b>A / ENTER</b> lock in&nbsp;&nbsp;<b>B / ESC</b> unlock · back'
        : '<b>ARROWS / STICK</b> move&nbsp;&nbsp;<b>A / ENTER</b> lock in&nbsp;&nbsp;<b>B / ESC</b> back'));
    root.appendChild(this.el);
    // On touch: tap a tile to preview, then BACK / LOCK IN drive the pick.
    if (this.touch) {
      const bar = el('div', 'touch-navbar');
      bar.appendChild(touchBtn('◀ BACK', 'nav-back', () => this.input.touchMenuEvent('back')));
      bar.appendChild(touchBtn('LOCK IN ▶', 'nav-next', () => { if (this.mousePicker) this.lockIn(this.mousePicker); }));
      this.el.appendChild(bar);
    }
    this.refresh();
  }

  refresh() {
    this.cells.forEach((c, i) => {
      c.className = 'roster-cell';
      for (const pk of this.pickers) {
        if (pk.cursor === i && !pk.locked) c.classList.add(`cursor-p${pk.slotIdx + 1}`);
        if (pk.locked && pk.cursor === i) c.classList.add('locked-pick');
      }
    });
    this.renderCard();
    this.renderChips();
    this.onPreview?.(this.pickers.map((pk) => ({
      id: ROSTER[pk.cursor].id, slotIdx: pk.slotIdx, locked: pk.locked,
    })));
  }

  renderCard() {
    if (this.pickers.length === 1) {
      const m = ROSTER[this.pickers[0].cursor];
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
      return;
    }
    // multi-player: one compact card per picker, tinted with player color
    this.card.innerHTML = this.pickers.map((pk) => {
      const m = ROSTER[pk.cursor];
      const pc = COLOR_CSS[pk.slotIdx % 4];
      return `
        <div style="border-left:3px solid ${pc}; padding:8px 12px; margin-bottom:10px;
                    background:rgba(10,18,30,0.45); border-radius:0 6px 6px 0;">
          <div style="font-size:11px;letter-spacing:0.2em;color:${pc};font-weight:800;">
            PLAYER ${pk.slotIdx + 1} ${pk.locked ? '· LOCKED ✓' : ''}</div>
          <div class="mi-name" style="font-size:clamp(17px,1.8vw,24px);color:#${m.colors.glow.toString(16).padStart(6, '0')}">${m.icon} ${m.name}</div>
          <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--hud-cyan);">${m.title}</div>
          <div class="mi-moves" style="margin-top:6px;">
            <b>RNG</b> ${m.moves.ranged.name} · <b>SPC</b> ${m.moves.special.name} · <b>ULT</b> ${m.moves.ult.name}
          </div>
        </div>`;
    }).join('');
  }

  renderChips() {
    this.status.innerHTML = '';
    this.slots.forEach((s, i) => {
      if (s.kind === 'off') return;
      const chip = el('div', 'picker-chip');
      chip.style.borderColor = COLOR_CSS[i];
      const pk = this.pickers.find((p) => p.slotIdx === i);
      if (s.kind === 'ai') {
        chip.textContent = `P${i + 1} · CPU`;
        chip.classList.add('done');
      } else if (pk?.locked) {
        chip.textContent = `P${i + 1} ✓ ${ROSTER[pk.cursor].name}`;
        chip.classList.add('done');
      } else {
        chip.textContent = `P${i + 1} PICKING...`;
        chip.classList.add('active');
      }
      this.status.appendChild(chip);
    });
  }

  statRow(label, v) {
    return `<div class="stat-row"><div class="stat-label">${label}</div>
      <div class="stat-bar"><div class="stat-fill" style="width:${v * 10}%"></div></div></div>`;
  }

  lockIn(pk) {
    if (pk.locked || this.finished) return;
    pk.locked = true;
    this.picks[pk.slotIdx] = ROSTER[pk.cursor].id;
    this.audio?.play('uiSelect');
    if (pk.device.startsWith('pad')) this.input.rumble(+pk.device[3], 0.45, 130);
    this.refresh();
    if (this.pickers.every((p) => p.locked)) this.finish();
  }

  finish() {
    this.finished = true;
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
    // brief beat so the last lock-in lands before the screen changes
    setTimeout(() => this.onDone(this.picks), 450);
  }

  update(evAll) {
    if (this.finished) return;
    const solo = this.pickers.length === 1;
    let anyBack = false;
    for (const pk of this.pickers) {
      const ev = this.input.menuEventsFor(pk.device);
      // the only human may navigate with any device
      const left = ev.left || (solo && evAll?.left);
      const right = ev.right || (solo && evAll?.right);
      const up = ev.up || (solo && evAll?.up);
      const down = ev.down || (solo && evAll?.down);
      const confirm = ev.confirm || (solo && evAll?.confirm);
      const back = ev.back || (solo && evAll?.back);

      if (!pk.locked) {
        const cols = 3;
        let moved = false;
        if (left) { pk.cursor = (pk.cursor + 11) % 12; moved = true; }
        if (right) { pk.cursor = (pk.cursor + 1) % 12; moved = true; }
        if (up) { pk.cursor = (pk.cursor + 12 - cols) % 12; moved = true; }
        if (down) { pk.cursor = (pk.cursor + cols) % 12; moved = true; }
        if (moved) { this.audio?.play('uiMove'); this.refresh(); }
        if (confirm) this.lockIn(pk);
        if (back) anyBack = true;
      } else if (back) {
        // unlock and keep picking
        pk.locked = false;
        this.picks[pk.slotIdx] = null;
        this.audio?.play('uiBack');
        this.refresh();
      }
    }
    // back only exits the screen when nobody has locked anything
    if (anyBack && !this.pickers.some((p) => p.locked)) {
      this.audio?.play('uiBack');
      this.onBack();
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

    const wrap = el('div', 'arena-grid');
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
  constructor(root, { audio, onResume, onQuit, onFullscreen = null, splitToggle = null, soundToggle = null }) {
    this.audio = audio;
    this.el = el('div', 'screen dim fade-in');
    this.el.innerHTML = `<div class="mega-title pause-title">PAUSED</div>`;
    this.menu = el('div', 'menu-list');
    this.items = [
      { t: 'RESUME', fn: onResume },
      { t: 'CONTROLS', fn: () => this.toggleControls() },
    ];
    if (onFullscreen) this.items.push({ t: 'FULLSCREEN', fn: onFullscreen });
    // relabeling toggles stay open when activated
    const addToggle = (toggle, key) => {
      if (!toggle) return;
      this.items.push({
        t: toggle.label(),
        fn: () => {
          toggle.fn();
          const i = this.items.findIndex((it) => it.key === key);
          this.items[i].t = toggle.label();
          this.itemEls[i].textContent = this.items[i].t;
        },
        key,
      });
    };
    addToggle(splitToggle, 'split');
    addToggle(soundToggle, 'sound');
    this.items.push({ t: 'QUIT TO MENU', fn: onQuit });
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
      <b style="color:#fff">KEYBOARD P1</b> — WASD move · SPACE jump · F light · G heavy · H block · R ranged · T special · Y ultimate · SHIFT dash · Q strafe-lock · B taunt<br>
      <b style="color:#fff">KEYBOARD P2</b> — Arrows move · Num0 jump · Num1 light · Num2 heavy · Num3 block · Num4 ranged · Num5 special · Num6 ult · NumEnter dash · Num7 strafe-lock<br>
      <b style="color:#fff">XBOX PAD</b> — L-stick move · R-stick camera · A jump · X light · Y heavy · B special · RT ranged · LT block · RB dash · LB strafe-lock · D-pad ↑ ultimate · VIEW taunt<br>
      <b style="color:#fff">AIM</b> — shots fire where the camera points (hold strafe-lock to face it while moving sideways)<br>
      <b style="color:#fff">HOVER JETS</b> — press JUMP again in mid-air and HOLD to fly (lighter mechs fly higher)<br>
      <b style="color:#fff">VIEW</b> — F9 flips the 2-player split (side-by-side ↔ stacked) · F10 fullscreen`;
    this.el.appendChild(this.controls);
    root.appendChild(this.el);
  }
  toggleControls() {
    this.controls.style.display = this.controls.style.display === 'none' ? 'block' : 'none';
  }
  refresh() { this.itemEls.forEach((e, i) => e.classList.toggle('selected', i === this.sel)); }
  confirm() { this.audio?.play('uiSelect'); this.items[this.sel].fn(); }
  update(ev) {
    const n = this.items.length;
    if (ev.up) { this.sel = (this.sel + n - 1) % n; this.audio?.play('uiMove'); this.refresh(); }
    if (ev.down) { this.sel = (this.sel + 1) % n; this.audio?.play('uiMove'); this.refresh(); }
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
