// Helpers shared between the Finisher engine (../finisher.js) and the
// per-mech choreography scripts in this directory.
import * as THREE from 'three';

export const smooth = (k) => k * k * (3 - 2 * k);
export const _ct = new THREE.Vector3(); // shared scratch vector
