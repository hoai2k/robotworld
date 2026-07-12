import './style.css';

const params = new URLSearchParams(location.search);

if (params.has('showcase')) {
  import('./dev/showcase.js').then(({ runShowcase }) => {
    runShowcase(params.get('showcase'));
  });
} else if (params.has('battle') || params.get('debug') === 'finisher' || params.get('finisherdemo') === '1') {
  import('./dev/battletest.js').then(({ runBattleTest }) => runBattleTest());
} else if (params.has('rigtest')) {
  import('./dev/rigtest.js').then(({ runRigTest }) => runRigTest());
} else {
  import('./game/boot.js').then(({ bootGame }) => bootGame());
}
