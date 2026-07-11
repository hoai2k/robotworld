// SAURION — placeholder frame; being sculpted to docs/canonical/mech_saurion.png.
import { baseFrame, standardArm, standardLeg, addAnchor } from '../factory.js';

export function saurion(A, D, J, anchors, def) {
  baseFrame(A, D);
  standardArm(A, D, -1);
  standardArm(A, D, 1);
  standardLeg(A, D, -1);
  standardLeg(A, D, 1);
  anchors.muzzleR = addAnchor(J.shoulderR, 0.2, 0.4, 0.6);
  anchors.muzzleL = addAnchor(J.shoulderL, -0.2, 0.4, 0.6);
  anchors.core = addAnchor(J.torso, 0, 0.5, 0.5);
}
