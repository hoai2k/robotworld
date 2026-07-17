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
  // ?debug=ultimates — ultimates fire without a charged meter (testing)
  debugUltimates: params.get('debug') === 'ultimates',
};
