import './style.css';

const params = new URLSearchParams(location.search);

if (params.has('showcase')) {
  import('./dev/showcase.js').then(({ runShowcase }) => {
    runShowcase(params.get('showcase'));
  });
} else if (params.get('debug') === 'actions') {
  // must beat the ?battle branch — the sandbox reuses &battle= for its map
  import('./dev/actiontest.js').then(({ runActionTest }) => runActionTest());
} else if (params.has('battle') || params.get('debug') === 'finisher' || params.get('finisherdemo') === '1') {
  import('./dev/battletest.js').then(({ runBattleTest }) => runBattleTest());
} else if (params.has('ultfx')) {
  import('./dev/ultfxtest.js').then(({ runUltFxTest }) => runUltFxTest(params.get('ultfx')));
} else if (params.has('fire')) {
  import('./dev/firetest.js').then(({ runFireTest }) => runFireTest());
} else if (params.has('geyser')) {
  import('./dev/geysertest.js').then(({ runGeyserTest }) => runGeyserTest());
} else if (params.get('debug') === 'models') {
  import('./dev/posetool.js').then(({ runPoseTool }) => runPoseTool(params.get('id')));
} else if (params.has('glbview')) {
  import('./dev/glbview.js').then(({ runGlbView }) => runGlbView(params.get('glbview')));
} else if (params.has('rigtest')) {
  import('./dev/rigtest.js').then(({ runRigTest }) => runRigTest());
} else {
  import('./game/boot.js').then(({ bootGame }) => bootGame());
}
