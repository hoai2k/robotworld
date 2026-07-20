// generic beatdown for anything without a bespoke scene
export function defaultFinisher(F) {
  F.approach(0.25, 1.15, 3.4);
  F.camShot(0, 2.1, { dist: 12, h: 4.2, az0: 2.1, az1: 2.6 });
  F.at(1.25, () => F.win.animator.play('heavy'));
  F.at(1.7, () => { F.beat(); F.sparks(); F.vicFlinch(); });
  F.vicBash(1.72, F.axis, 1.3, 0.7, 0.4);
  F.camAction(2.1, 4.7, { dist: 12, h: 3.6, lookH: 2.2 });
  F.at(2.25, () => F.win.animator.play('light1'));
  F.at(2.55, () => { F.beat('hit', 0.35, 0.04); F.sparks(10, 8); F.vicFlinch(); });
  F.at(2.9, () => F.win.animator.play('light2'));
  F.at(3.2, () => { F.beat('hit', 0.35, 0.04); F.sparks(10, 8); F.vicFlinch(); });
  F.at(3.6, () => F.win.animator.play('heavy'));
  F.at(4.1, () => { F.beat('hitHeavy', 0.85, 0.1); F.sparks(24, 14); F.vicDown(); F.finaleBurst(); });
  F.vicBash(4.12, F.axis, 2.8, 1.5, 1.1);
  F.trackCenter(4.1, 5.2, 5);
  F.triumph(4.9);
}
