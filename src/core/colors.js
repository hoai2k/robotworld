// Shared player identity colors (P1..P4). Single source of truth for the
// tints used by combat VFX (dash trails, rings), HUD plates, menu player
// cards, pad pointers and the menu-stage preview rings.
export const PLAYER_COLORS = [0x38e8ff, 0xff4d5e, 0x62ff9a, 0xffb43c];

// 0xRRGGBB → '#rrggbb' (the one CSS-hex derivation — use this instead of
// hand-rolling '#' + x.toString(16).padStart(6, '0') at call sites)
export function hexCss(x) {
  return '#' + x.toString(16).padStart(6, '0');
}

// CSS forms of PLAYER_COLORS, for DOM styling
export const PLAYER_COLORS_CSS = PLAYER_COLORS.map(hexCss);
