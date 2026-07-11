// Menu screens: Title → Setup → Mech Select → Arena Select → (battle) → Results.
// Each screen builds DOM into #ui-root and consumes aggregated menu events.
import { ROSTER, SCHEME_NAMES, SCHEME_COUNT, schemeSwatch } from '../mechs/roster.js';
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

// ---------------- FIGHTER SELECT (join + pick, one screen) ----------------
// Players JOIN by connecting/pressing a controller, pressing a keyboard
// confirm, or via the ADD PLAYER card (which can become KB / CPU / pad /
// touch). Every joined human picks a mech + color simultaneously; CPU slots
// randomize a mech once all humans lock in.
export class MechSelectScreen {
  constructor(root, { input, audio, onDone, onBack, onPreview, prev }) {
    this.input = input;
    this.audio = audio;
    this.onDone = onDone;
    this.onBack = onBack;
    this.onPreview = onPreview;
    this.touch = isTouchDevice();
    this.el = el('div', 'screen fade-in');
    this.el.appendChild(el('div', 'screen-heading', 'CHOOSE YOUR FIGHTER'));

    // slot state (managed here now — the old separate setup screen is gone)
    this.slots = prev || this.defaultSlots();
    this.pickers = [];             // one per human slot (built by syncPickers)
    this.picks = new Array(4).fill(null);
    this.variants = new Array(4).fill(0);
    this.finished = false;
    this._padCount = this.input.connectedPadCount();

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

    // players bar: join / device / CPU controls, one card per slot
    this.playersBar = el('div', 'players-bar');
    this.playerCards = [];
    for (let i = 0; i < 4; i++) {
      const pc = el('div', 'player-card');
      pc.addEventListener('click', (e) => this.onCardClick(i, e));
      this.playersBar.appendChild(pc);
      this.playerCards.push(pc);
    }
    this.el.appendChild(this.playersBar);

    this.el.appendChild(el('div', 'hint-bar',
      'press <b>A</b> / <b>ENTER</b> on a controller or keyboard to JOIN&nbsp;&nbsp;·&nbsp;&nbsp;' +
      '<b>MOVE</b> pick&nbsp;&nbsp;<b>X / R</b> color&nbsp;&nbsp;<b>A / ENTER</b> lock in&nbsp;&nbsp;<b>B / ESC</b> leave · back'));
    root.appendChild(this.el);

    if (this.touch) {
      const bar = el('div', 'touch-navbar');
      bar.appendChild(touchBtn('◀ BACK', 'nav-back', () => this.input.touchMenuEvent('back')));
      bar.appendChild(touchBtn('🎨 COLOR', 'nav-back', () => this.input.touchMenuEvent('alt')));
      bar.appendChild(touchBtn('LOCK IN ▶', 'nav-next', () => { if (this.mousePicker) this.lockIn(this.mousePicker); }));
      this.el.appendChild(bar);
    }

    this.syncPickers();
    this.refresh();
  }

  // ---- join / slot management (folded in from the old SetupScreen) ----
  connectedPads() {
    const pads = [];
    for (let i = 0; i < 4; i++) if (this.input.padConnected(i)) pads.push('pad' + i);
    return pads;
  }

  // Seed: connected controllers ARE players; otherwise the local keyboard/
  // touch human + one CPU, so a lone player has an opponent to fight.
  defaultSlots() {
    const off = () => ({ kind: 'off' });
    const pads = this.connectedPads();
    if (pads.length >= 2) return [{ kind: 'human', device: pads[0] }, { kind: 'human', device: pads[1] }, off(), off()];
    const solo = pads.length === 1 ? { kind: 'human', device: pads[0] }
      : this.touch ? { kind: 'human', device: 'touch' } : { kind: 'human', device: 'kb1' };
    return [solo, { kind: 'ai', diff: 'veteran' }, off(), off()];
  }

  // options the ADD PLAYER / cycle affordance walks through
  options() {
    const opts = [];
    if (this.input.touchAvailable) opts.push({ kind: 'human', device: 'touch' });
    opts.push({ kind: 'human', device: 'kb1' }, { kind: 'human', device: 'kb2' });
    for (let i = 0; i < 4; i++) if (this.input.padConnected(i)) opts.push({ kind: 'human', device: 'pad' + i });
    opts.push({ kind: 'ai', diff: 'rookie' }, { kind: 'ai', diff: 'veteran' }, { kind: 'ai', diff: 'ace' }, { kind: 'off' });
    return opts;
  }

  optIndex(slot) {
    return this.options().findIndex((o) => o.kind === slot.kind &&
      (o.kind !== 'human' || o.device === slot.device) && (o.kind !== 'ai' || o.diff === slot.diff));
  }

  deviceTaken(device, exceptSlot) {
    return this.slots.some((s, i) => i !== exceptSlot && s.kind === 'human' && s.device === device);
  }

  firstOff() { return this.slots.findIndex((s) => s.kind === 'off'); }
  activeCount() { return this.slots.filter((s) => s.kind !== 'off').length; }

  // cycle a slot to the next valid option (skips already-taken devices)
  cycleSlot(i, dir = 1) {
    const opts = this.options();
    let idx = this.optIndex(this.slots[i]);
    if (idx < 0) idx = opts.length - 1;
    for (let n = 0; n < opts.length; n++) {
      idx = (idx + dir + opts.length) % opts.length;
      const o = opts[idx];
      if (o.kind === 'human' && this.deviceTaken(o.device, i)) continue;
      this.slots[i] = { ...o };
      break;
    }
    this.audio?.play('uiMove');
    this.syncPickers();
    this.refresh();
  }

  // add a human bound to `device` in the first free slot (join-by-press)
  joinDevice(device) {
    if (this.deviceTaken(device, -1)) return false;
    const slot = this.firstOff();
    if (slot < 0) return false;
    this.slots[slot] = { kind: 'human', device };
    this.audio?.play('uiSelect');
    if (device.startsWith('pad')) this.input.rumble(+device[3], 0.4, 120);
    this.syncPickers();
    // the picker just created should not also consume this frame's confirm
    const pk = this.pickers.find((p) => p.slotIdx === slot);
    if (pk) pk.justJoined = true;
    this.refresh();
    return true;
  }

  onCardClick(i, e) {
    const s = this.slots[i];
    if (s.kind === 'off') { this.cycleSlot(i, 1); return; }      // ADD PLAYER
    if (s.kind === 'ai') {
      // left third = prev difficulty, right third = next, else remove
      const r = this.playerCards[i].getBoundingClientRect();
      const f = (e.clientX - r.left) / r.width;
      if (f < 0.33) this.cycleAiDiff(i, -1);
      else if (f > 0.66) this.cycleAiDiff(i, 1);
      else this.removeSlot(i);
      return;
    }
    // human card click = leave (mouse users); pickers otherwise use B
    this.removeSlot(i);
  }

  cycleAiDiff(i, dir) {
    const order = ['rookie', 'veteran', 'ace'];
    const cur = order.indexOf(this.slots[i].diff);
    this.slots[i] = { kind: 'ai', diff: order[(cur + dir + 3) % 3] };
    this.audio?.play('uiMove');
    this.refresh();
  }

  removeSlot(i) {
    this.slots[i] = { kind: 'off' };
    this.audio?.play('uiBack');
    this.syncPickers();
    this.refresh();
    if (this.activeCount() === 0) this.onBack();
  }

  // rebuild pickers to match the human slots, preserving per-slot state
  syncPickers() {
    const keep = new Map(this.pickers.map((p) => [p.slotIdx, p]));
    this.pickers = [];
    this.slots.forEach((s, i) => {
      if (s.kind !== 'human') return;
      let p = keep.get(i);
      if (!p || p.device !== s.device) {
        p = { slotIdx: i, device: s.device, cursor: this.pickers.length % ROSTER.length, locked: false, variant: 0 };
      }
      this.pickers.push(p);
    });
    this.mousePicker = this.pickers.find((p) => p.device === 'touch')
      || this.pickers.find((p) => p.device === 'kb1') || this.pickers[0];
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
    this.renderPlayers();
    this.onPreview?.(this.pickers.map((pk) => ({
      id: ROSTER[pk.cursor].id, slotIdx: pk.slotIdx, locked: pk.locked, variant: pk.variant,
    })));
  }

  deviceLabel(device) {
    if (device.startsWith('pad')) {
      let n = 0;
      for (let i = 0; i < 4; i++) { if (this.input.padConnected(i)) { n++; if (i === +device[3]) return `GAMEPAD ${n}`; } }
      return `GAMEPAD ${+device[3] + 1}`;
    }
    return { touch: 'TOUCH', kb1: 'KEYBOARD 1', kb2: 'KEYBOARD 2' }[device] || device.toUpperCase();
  }

  // players bar: join prompts, device/CPU controls, live pick + lock state
  renderPlayers() {
    this.slots.forEach((s, i) => {
      const pc = this.playerCards[i];
      const col = COLOR_CSS[i];
      pc.className = 'player-card';
      if (s.kind === 'off') {
        pc.classList.add('empty');
        pc.style.borderColor = 'rgba(120,150,180,0.28)';
        pc.innerHTML = `<div class="pc-role" style="color:#6f8aa2">PLAYER ${i + 1}</div>
          <div class="pc-add">＋ ADD PLAYER</div>
          <div class="pc-sub">press A / ENTER to join · click to add CPU / KB</div>`;
        return;
      }
      pc.style.borderColor = col;
      if (s.kind === 'ai') {
        pc.innerHTML = `<div class="pc-role" style="color:${col}">PLAYER ${i + 1}</div>
          <div class="pc-dev">🤖 CPU · ${s.diff.toUpperCase()}</div>
          <div class="pc-sub">◀ difficulty ▶ &nbsp;·&nbsp; tap center to remove</div>`;
        return;
      }
      const pk = this.pickers.find((p) => p.slotIdx === i);
      const m = ROSTER[pk.cursor];
      const mc = '#' + m.colors.glow.toString(16).padStart(6, '0');
      pc.classList.toggle('locked', pk.locked);
      pc.innerHTML = `<div class="pc-role" style="color:${col}">PLAYER ${i + 1} · ${this.deviceLabel(s.device)}</div>
        <div class="pc-dev" style="color:${mc}">${m.icon} ${m.name}${pk.locked ? ' ✓' : ''}</div>
        <div class="pc-sub">${pk.locked ? `LOCKED · ${SCHEME_NAMES[pk.variant]}` : 'picking…'}</div>`;
    });
  }

  // scheme selector row: 4 swatches for the hovered mech, current one framed
  schemeRow(m, pk) {
    const sw = (v) => {
      const col = '#' + schemeSwatch(m, v).toString(16).padStart(6, '0');
      const on = pk.variant === v;
      return `<span title="${SCHEME_NAMES[v]}" style="display:inline-block;width:15px;height:15px;border-radius:3px;
        margin-right:5px;vertical-align:middle;background:${col};
        border:2px solid ${on ? '#fff' : 'rgba(255,255,255,0.18)'};"></span>`;
    };
    let row = '';
    for (let v = 0; v < SCHEME_COUNT; v++) row += sw(v);
    return `<div style="margin-top:6px;font-size:11px;letter-spacing:0.14em;color:#b8d4e6;">
      COLOR ${row}<span style="opacity:0.8;">${SCHEME_NAMES[pk.variant]}</span></div>`;
  }

  renderCard() {
    if (this.pickers.length === 1) {
      const pk = this.pickers[0];
      const m = ROSTER[pk.cursor];
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
        </div>
        ${this.schemeRow(m, pk)}`;
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
          ${this.schemeRow(m, pk)}
        </div>`;
    }).join('');
  }

  statRow(label, v) {
    return `<div class="stat-row"><div class="stat-label">${label}</div>
      <div class="stat-bar"><div class="stat-fill" style="width:${v * 10}%"></div></div></div>`;
  }

  lockIn(pk) {
    if (pk.locked || this.finished) return;
    // duplicate mech: auto-bump to the next free paint scheme so two
    // players on the same robot can always tell each other apart
    const clash = () => this.pickers.some((o) =>
      o !== pk && o.locked && o.cursor === pk.cursor && o.variant === pk.variant);
    for (let tries = 0; clash() && tries < SCHEME_COUNT; tries++) {
      pk.variant = (pk.variant + 1) % SCHEME_COUNT;
    }
    pk.locked = true;
    this.picks[pk.slotIdx] = ROSTER[pk.cursor].id;
    this.variants[pk.slotIdx] = pk.variant;
    this.audio?.play('uiSelect');
    if (pk.device.startsWith('pad')) this.input.rumble(+pk.device[3], 0.45, 130);
    this.refresh();
    // everyone locked AND at least two fighters in the match → go
    if (this.pickers.every((p) => p.locked) && this.activeCount() >= 2) this.finish();
  }

  finish() {
    if (this.finished) return;
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
    // brief beat so the last lock-in lands before the screen changes;
    // hand back the slots so returning here restores the same line-up
    setTimeout(() => this.onDone(this.picks, this.variants, this.slots.map((s) => ({ ...s }))), 450);
  }

  // devices that could still join (not already a human slot)
  joinCandidates() {
    const taken = new Set(this.slots.filter((s) => s.kind === 'human').map((s) => s.device));
    const list = [];
    if (!taken.has('kb1')) list.push('kb1');
    if (!taken.has('kb2')) list.push('kb2');
    for (let i = 0; i < 4; i++) if (this.input.padConnected(i) && !taken.has('pad' + i)) list.push('pad' + i);
    return list;
  }

  update(evAll) {
    if (this.finished) return;

    // a freshly connected controller auto-joins the next free slot
    const padCount = this.input.connectedPadCount();
    if (padCount !== this._padCount) {
      if (padCount > this._padCount) {
        for (let i = 0; i < 4; i++) {
          if (this.input.padConnected(i) && !this.deviceTaken('pad' + i, -1) && this.firstOff() >= 0) this.joinDevice('pad' + i);
        }
      }
      this._padCount = padCount;
      this.refresh(); // ordinal labels shift when pads come and go
    }

    // join-by-press: an unassigned device that hits confirm joins the match
    if (this.firstOff() >= 0) {
      for (const dev of this.joinCandidates()) {
        if (this.input.menuEventsFor(dev).confirm) { this.joinDevice(dev); break; }
      }
    }

    const solo = this.pickers.length === 1;
    for (const pk of this.pickers) {
      const ev = this.input.menuEventsFor(pk.device);
      // a lone human may also drive with the shared keyboard/mouse events
      const left = ev.left || (solo && evAll?.left);
      const right = ev.right || (solo && evAll?.right);
      const up = ev.up || (solo && evAll?.up);
      const down = ev.down || (solo && evAll?.down);
      const confirm = (ev.confirm || (solo && evAll?.confirm)) && !pk.justJoined;
      const back = ev.back || (solo && evAll?.back);
      const alt = ev.alt || (solo && evAll?.alt);
      pk.justJoined = false;

      if (!pk.locked) {
        const N = ROSTER.length, cols = 4;
        let moved = false;
        if (left) { pk.cursor = (pk.cursor + N - 1) % N; moved = true; }
        if (right) { pk.cursor = (pk.cursor + 1) % N; moved = true; }
        if (up) { pk.cursor = (pk.cursor + N - cols) % N; moved = true; }
        if (down) { pk.cursor = (pk.cursor + cols) % N; moved = true; }
        if (alt) { pk.variant = (pk.variant + 1) % SCHEME_COUNT; this.variants[pk.slotIdx] = pk.variant; moved = true; }
        if (moved) { this.audio?.play('uiMove'); this.refresh(); }
        if (confirm) this.lockIn(pk);
        // unlocked: back LEAVES the match (frees the slot); syncPickers
        // mutates this.pickers, so bail out of the loop after
        if (back) { this.removeSlot(pk.slotIdx); return; }
      } else {
        if (alt || left || right) {
          pk.variant = (pk.variant + 1) % SCHEME_COUNT;
          this.variants[pk.slotIdx] = pk.variant;
          this.audio?.play('uiMove');
          this.refresh();
        }
        if (back) { // unlock and keep picking
          pk.locked = false;
          this.picks[pk.slotIdx] = null;
          this.audio?.play('uiBack');
          this.refresh();
        }
      }
    }

    // with zero humans left, the shared ESC/B backs out to the title
    if (!this.pickers.length && evAll?.back) { this.audio?.play('uiBack'); this.onBack(); }
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
      <b style="color:#fff">KEYBOARD P1</b> — WASD move · SPACE jump · F light · G heavy · H block · R ranged · T special · Y ultimate · SHIFT dash · Q strafe-lock · C duck · B taunt<br>
      <b style="color:#fff">KEYBOARD P2</b> — Arrows move · Num0 jump · Num1 light · Num2 heavy · Num3 block · Num4 ranged · Num5 special · Num6 ult · NumEnter dash · Num7 strafe-lock · Num8 duck<br>
      <b style="color:#fff">XBOX PAD</b> — L-stick move · R-stick camera · A jump · X light · Y heavy · B special · RT ranged · LT block · RB dash · LB strafe-lock · L-stick click duck · D-pad ↑ ultimate · VIEW taunt<br>
      <b style="color:#fff">AIM</b> — shots fire where the camera points (hold strafe-lock to face it while moving sideways)<br>
      <b style="color:#fff">HOVER JETS</b> — press JUMP again in mid-air and HOLD to fly (lighter mechs fly higher)<br>
      <b style="color:#fff">DOWNED?</b> — press JUMP while knocked down to spring clear · every ranged weapon runs on AMMO — grab the yellow crates<br>
      <b style="color:#fff">WORLD</b> — the arena wraps: walk off any side and you come around the other<br>
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
