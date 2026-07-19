import './style.css';
import { runDevMode } from './dev/index.js';

// Debug-only modes live in src/dev/*; the router handles their dispatch so this
// entry stays minimal. Anything that isn't a dev mode boots the real game.
const params = new URLSearchParams(location.search);
if (!runDevMode(params)) {
  import('./game/boot.js').then(({ bootGame }) => bootGame());
}
