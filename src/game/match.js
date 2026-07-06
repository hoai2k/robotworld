// Match orchestration: best-of-3 rounds, intros, KO slow-mo, timeouts.
import { clamp01 } from '../core/utils.js';

const ROUND_TIME = 99;
const WINS_NEEDED = 2;

export class Match {
  constructor({ engine, world, fighters, hud, onEnd }) {
    this.engine = engine;
    this.world = world;
    this.fighters = fighters;
    this.hud = hud;
    this.onEnd = onEnd;
    this.round = 0;
    this.state = 'idle';
    this.stateT = 0;
    this.timeLeft = ROUND_TIME;
    this.unsub = world.events.on('ko', () => this.checkRoundEnd());
    this.pendingWinner = null;
  }

  begin() {
    for (const f of this.fighters) f.wins = 0;
    this.startRound();
  }

  startRound() {
    this.round++;
    const w = this.world;
    w.clearTransient();
    this.engine.timeScale = 1;
    const spawns = w.arena.spawnPoints(this.fighters.length);
    this.fighters.forEach((f, i) => {
      f.resetForRound(spawns[i].pos, spawns[i].yaw);
      f.controlsLocked = true;
      f.animator.play('intro');
    });
    this.state = 'intro';
    this.stateT = 2.5;
    this.timeLeft = ROUND_TIME;
    this.hud.announce(`ROUND ${this.round}`, true);
    this.world.audio?.play('stingRound');
    // a bit of personality: someone talks trash at the start of each round
    const talker = this.fighters[(this.round - 1) % this.fighters.length];
    this.hud.callout(`${talker.def.name}: ${talker.def.quotes.intro}`);
  }

  checkRoundEnd() {
    if (this.state !== 'fight') return;
    const alive = this.fighters.filter((f) => f.alive);
    if (alive.length <= 1) {
      this.endRound(alive[0] || null, 'K.O.!');
    }
  }

  endRound(winner, banner) {
    this.state = 'roundEnd';
    this.stateT = 3.2;
    this.pendingWinner = winner;
    this.engine.timeScale = 0.25;          // dramatic slow-mo
    this.hud.announce(banner, false, banner === 'K.O.!' ? '#ff4d5e' : null);
    this.world.audio?.play('stingKO');
    if (winner) winner.wins++;
  }

  update(dt) {
    const dtReal = this.engine.timeScale > 0 ? dt / this.engine.timeScale : dt;
    switch (this.state) {
      case 'intro':
        this.stateT -= dtReal;
        if (this.stateT <= 0.9 && this.stateT + dtReal > 0.9) {
          this.hud.announce('FIGHT!', false, '#ffb43c');
          this.world.audio?.play('fightBell');
        }
        if (this.stateT <= 0.9) {
          for (const f of this.fighters) f.controlsLocked = false;
          if (this.stateT <= 0) this.state = 'fight';
        }
        break;

      case 'fight': {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          // timeout: highest hp% takes the round
          let best = null, bestFrac = -1, tie = false;
          for (const f of this.fighters) {
            if (!f.alive) continue;
            const frac = clamp01(f.hp / f.maxHp);
            if (Math.abs(frac - bestFrac) < 0.001) tie = true;
            else if (frac > bestFrac) { bestFrac = frac; best = f; tie = false; }
          }
          this.endRound(tie ? null : best, 'TIME UP');
        }
        break;
      }

      case 'roundEnd':
        this.stateT -= dtReal;
        this.engine.timeScale = Math.min(1, this.engine.timeScale + dtReal * 0.55);
        if (this.stateT <= 1.9 && !this.victoryPlayed) {
          this.victoryPlayed = true;
          if (this.pendingWinner?.alive) {
            this.pendingWinner.controlsLocked = true;
            this.pendingWinner.intent.moveX = this.pendingWinner.intent.moveZ = 0;
            this.pendingWinner.animator.play('victory');
          }
          if (this.pendingWinner) {
            this.hud.announce(`${this.pendingWinner.def.name} WINS THE ROUND`, true);
          } else {
            this.hud.announce('DRAW', true);
          }
        }
        if (this.stateT <= 0) {
          this.victoryPlayed = false;
          this.engine.timeScale = 1;
          const champ = this.fighters.find((f) => f.wins >= WINS_NEEDED);
          if (champ) {
            this.state = 'done';
            this.world.audio?.play('stingWin');
            this.onEnd?.(champ);
          } else {
            this.startRound();
          }
        }
        break;
    }
  }

  destroy() {
    this.unsub();
    this.engine.timeScale = 1;
  }
}
