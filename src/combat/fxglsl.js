// Shared GLSL chunks for the hero-effect shaders (geyser / tornado / wave).
// Interpolate into a shader template literal after the uniform/varying
// declarations: `${GLSL_VNOISE}`.

// cheap 2D value noise. Callers that wrap a shell sample the unit-circle
// position (not the seamed uv.x) so the noise is continuous around it.
export const GLSL_VNOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
`;
