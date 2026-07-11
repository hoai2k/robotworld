// Central feature flags. URL params override at load time:
//   ?textures=0  — disable the image texture pack (procedural skins only)
const params = typeof location !== 'undefined'
  ? new URLSearchParams(location.search)
  : { get: () => null };

export const CONFIG = {
  // use the generated PBR texture pack (src/textures/) for robots, grounds
  // and buildings; anything missing falls back to procedural automatically
  useTextures: params.get('textures') !== '0',
};
