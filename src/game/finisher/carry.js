// The seize/carry grip shared verbatim by TITANUS and COLOSSUS — the only
// thing that differs between the two is the hold's time span.
import { smooth, _ct } from './shared.js';

// seized at the END of the reach (hands low, body rolled into them),
// then the body rides the liftHold arm-swing itself all the way up —
// constant contact, with the palm press squeezing onto the torso
export function carryGrip(F, t0, t1) {
  const { win, vic } = F;
  let cx, cy2, cz;
  F.hold(t0, t1, (k) => {
    if (cx === undefined) { cx = vic.pos.x; cy2 = vic.pos.y; cz = vic.pos.z; }
    const grip = smooth(Math.min(1, k / 0.16)); // in the hands within ~0.2s
    const tp = win.carryPoint(vic, _ct);
    vic.pos.x = cx + (tp.x - cx) * grip;
    vic.pos.y = cy2 + (tp.y - cy2) * grip;
    vic.pos.z = cz + (tp.z - cz) * grip;
    // Z-roll under the carrier's yaw = laid ACROSS the hands, head off
    // one palm and legs off the other, whichever way the carrier faces
    vic.yaw = vic.targetYaw = win.yaw;
    vic.group.rotation.y = win.yaw;
    vic.group.rotation.x = 0;
    vic.group.rotation.z = 1.45 * grip;
    F._palmVic = vic;
  });
}
