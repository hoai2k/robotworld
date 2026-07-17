// Central feature flags. URL params override at load time:
//   ?textures=0  — disable the image texture pack (procedural skins only)
const params = typeof location !== 'undefined'
  ? new URLSearchParams(location.search)
  : { get: () => null };

export const CONFIG = {
  // use the generated PBR texture pack (src/textures/) for robots, grounds
  // and buildings; anything missing falls back to procedural automatically
  useTextures: params.get('textures') !== '0',
  // ~7s cinematic KO finisher when a round is won by a kill (never on a
  // timeout). ?finishers=0 disables at load time.
  enable_finishers: params.get('finishers') !== '0',
  // Infinite Ultimates: fire ults without a charged meter. Persisted from
  // the settings menu; ?debug=ultimates still forces it on for a session.
  debugUltimates: params.get('debug') === 'ultimates' || readPref('rw.infiniteUlts'),
};

function readPref(key) {
  try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
}

export function setInfiniteUltimates(on) {
  CONFIG.debugUltimates = on;
  try { localStorage.setItem('rw.infiniteUlts', on ? '1' : '0'); } catch (e) { /* ok */ }
}
