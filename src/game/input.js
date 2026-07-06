// Input: keyboard (2 local layouts) + Xbox controllers via Gamepad API.
// Produces per-fighter intents and aggregated menu navigation events.

const KB1 = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  jump: 'Space', light: 'KeyF', heavy: 'KeyG', block: 'KeyH',
  ranged: 'KeyR', special: 'KeyT', ult: 'KeyY', taunt: 'KeyB',
  dash: 'ShiftLeft',
};
const KB2 = {
  up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
  jump: 'Numpad0', light: 'Numpad1', heavy: 'Numpad2', block: 'Numpad3',
  ranged: 'Numpad4', special: 'Numpad5', ult: 'Numpad6', taunt: 'NumpadDecimal',
  dash: 'NumpadEnter',
  // right-cluster fallbacks for keyboards without a numpad
  alt: {
    jump: 'Enter', light: 'Comma', heavy: 'Period', block: 'Slash',
    ranged: 'KeyM', special: 'KeyN', ult: 'Quote', dash: 'ShiftRight', taunt: 'Semicolon',
  },
};

// Xbox standard mapping
const PAD = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7,
  BACK: 8, START: 9, LS: 10, RS: 11, DU: 12, DD: 13, DL: 14, DR: 15,
};

export class Input {
  constructor() {
    this.keys = new Set();
    this.keysPressed = new Set();   // edge (consumed per frame)
    this.padsPrev = [{}, {}, {}, {}];
    this.padsCur = [{}, {}, {}, {}];
    this.onPadConnect = null;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || (e.code === 'Space' && e.target === document.body)) e.preventDefault();
      if (!this.keys.has(e.code)) this.keysPressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('gamepadconnected', (e) => {
      this.onPadConnect?.(e.gamepad);
    });
  }

  // call once per frame before reading
  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < 4; i++) {
      this.padsPrev[i] = this.padsCur[i];
      const gp = pads[i];
      const cur = {};
      if (gp && gp.connected) {
        cur.connected = true;
        cur.lx = Math.abs(gp.axes[0]) > 0.18 ? gp.axes[0] : 0;
        cur.ly = Math.abs(gp.axes[1]) > 0.18 ? gp.axes[1] : 0;
        for (const [name, idx] of Object.entries(PAD)) {
          cur[name] = !!(gp.buttons[idx] && (gp.buttons[idx].pressed || gp.buttons[idx].value > 0.45));
        }
      }
      this.padsCur[i] = cur;
    }
  }

  endFrame() {
    this.keysPressed.clear();
  }

  key(code) { return this.keys.has(code); }
  keyPressed(code) { return this.keysPressed.has(code); }
  padHeld(i, btn) { return !!this.padsCur[i][btn]; }
  padPressed(i, btn) { return !!this.padsCur[i][btn] && !this.padsPrev[i][btn]; }
  padConnected(i) { return !!this.padsCur[i].connected; }

  connectedPadCount() {
    let n = 0;
    for (let i = 0; i < 4; i++) if (this.padConnected(i)) n++;
    return n;
  }

  // device: 'kb1' | 'kb2' | 'pad0'..'pad3'
  // camYaw rotates stick/key direction into world space
  readIntent(device, intent, camYaw = 0) {
    let mx = 0, mz = 0;
    const edge = (held, code) => held; // helper clarity

    if (device === 'kb1' || device === 'kb2') {
      const map = device === 'kb1' ? KB1 : KB2;
      const alt = map.alt || {};
      const k = (name) => this.keys.has(map[name]) || (alt[name] && this.keys.has(alt[name]));
      const kp = (name) => this.keysPressed.has(map[name]) || (alt[name] && this.keysPressed.has(alt[name]));
      mx = (k('right') ? 1 : 0) - (k('left') ? 1 : 0);
      mz = (k('up') ? 1 : 0) - (k('down') ? 1 : 0);
      intent.jump = kp('jump');
      intent.light = kp('light');
      intent.heavy = kp('heavy');
      intent.block = k('block');
      intent.ranged = k('ranged');
      intent.special = kp('special');
      intent.ult = kp('ult');
      intent.dash = kp('dash');
      intent.taunt = kp('taunt');
    } else if (device.startsWith('pad')) {
      const i = +device[3];
      mx = this.padsCur[i].lx || 0;
      mz = -(this.padsCur[i].ly || 0);
      // dpad as movement fallback
      if (this.padHeld(i, 'DL')) mx -= 1;
      if (this.padHeld(i, 'DR')) mx += 1;
      if (this.padHeld(i, 'DU')) mz += 1;
      if (this.padHeld(i, 'DD')) mz -= 1;
      intent.jump = this.padPressed(i, 'A');
      intent.light = this.padPressed(i, 'X');
      intent.heavy = this.padPressed(i, 'Y');
      intent.block = this.padHeld(i, 'LT');
      intent.ranged = this.padHeld(i, 'RT');
      intent.special = this.padPressed(i, 'B');
      intent.ult = this.padPressed(i, 'LB');
      intent.dash = this.padPressed(i, 'RB');
      intent.taunt = this.padPressed(i, 'RS');
    }

    // rotate into world space (camera-relative):
    // forward = (sin y, cos y), right = (-cos y, sin y)
    const cos = Math.cos(camYaw), sin = Math.sin(camYaw);
    intent.moveX = -mx * cos + mz * sin;
    intent.moveZ = mx * sin + mz * cos;
  }

  // aggregated menu nav from every device
  menuEvents() {
    const ev = { up: false, down: false, left: false, right: false, confirm: false, back: false, pause: false, any: false };
    const anyKey = this.keysPressed.size > 0;
    const kp = (c) => this.keysPressed.has(c);
    if (kp('ArrowUp') || kp('KeyW')) ev.up = true;
    if (kp('ArrowDown') || kp('KeyS')) ev.down = true;
    if (kp('ArrowLeft') || kp('KeyA')) ev.left = true;
    if (kp('ArrowRight') || kp('KeyD')) ev.right = true;
    if (kp('Enter') || kp('Space') || kp('KeyF') || kp('Numpad1')) ev.confirm = true;
    if (kp('Escape') || kp('Backspace') || kp('KeyG') || kp('Numpad2')) ev.back = true;
    if (kp('Escape') || kp('KeyP')) ev.pause = true;
    let anyPad = false;
    for (let i = 0; i < 4; i++) {
      if (!this.padConnected(i)) continue;
      if (this.padPressed(i, 'DU') || (this.padsCur[i].ly < -0.6 && !(this.padsPrev[i].ly < -0.6))) ev.up = true;
      if (this.padPressed(i, 'DD') || (this.padsCur[i].ly > 0.6 && !(this.padsPrev[i].ly > 0.6))) ev.down = true;
      if (this.padPressed(i, 'DL') || (this.padsCur[i].lx < -0.6 && !(this.padsPrev[i].lx < -0.6))) ev.left = true;
      if (this.padPressed(i, 'DR') || (this.padsCur[i].lx > 0.6 && !(this.padsPrev[i].lx > 0.6))) ev.right = true;
      if (this.padPressed(i, 'A')) ev.confirm = true;
      if (this.padPressed(i, 'B')) ev.back = true;
      if (this.padPressed(i, 'START')) ev.pause = true;
      for (const b of ['A', 'B', 'X', 'Y', 'START']) if (this.padPressed(i, b)) anyPad = true;
    }
    ev.any = anyKey || anyPad;
    return ev;
  }

  // per-player menu navigation (for multi-cursor mech select)
  menuEventsFor(device) {
    const ev = { up: false, down: false, left: false, right: false, confirm: false, back: false };
    if (device === 'kb1') {
      ev.up = this.keysPressed.has('KeyW');
      ev.down = this.keysPressed.has('KeyS');
      ev.left = this.keysPressed.has('KeyA');
      ev.right = this.keysPressed.has('KeyD');
      ev.confirm = this.keysPressed.has('KeyF') || this.keysPressed.has('Space') || this.keysPressed.has('Enter');
      ev.back = this.keysPressed.has('KeyG') || this.keysPressed.has('Escape');
    } else if (device === 'kb2') {
      ev.up = this.keysPressed.has('ArrowUp');
      ev.down = this.keysPressed.has('ArrowDown');
      ev.left = this.keysPressed.has('ArrowLeft');
      ev.right = this.keysPressed.has('ArrowRight');
      ev.confirm = this.keysPressed.has('Numpad1') || this.keysPressed.has('Comma') || this.keysPressed.has('Enter');
      ev.back = this.keysPressed.has('Numpad2') || this.keysPressed.has('Period');
    } else if (device.startsWith('pad')) {
      const i = +device[3];
      ev.up = this.padPressed(i, 'DU') || (this.padsCur[i].ly < -0.6 && !(this.padsPrev[i].ly < -0.6));
      ev.down = this.padPressed(i, 'DD') || (this.padsCur[i].ly > 0.6 && !(this.padsPrev[i].ly > 0.6));
      ev.left = this.padPressed(i, 'DL') || (this.padsCur[i].lx < -0.6 && !(this.padsPrev[i].lx < -0.6));
      ev.right = this.padPressed(i, 'DR') || (this.padsCur[i].lx > 0.6 && !(this.padsPrev[i].lx > 0.6));
      ev.confirm = this.padPressed(i, 'A');
      ev.back = this.padPressed(i, 'B');
    }
    return ev;
  }

  rumble(padIndex, strength = 0.5, ms = 150) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads[padIndex];
    if (gp?.vibrationActuator?.playEffect) {
      gp.vibrationActuator.playEffect('dual-rumble', {
        duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6,
      }).catch(() => {});
    }
  }
}
