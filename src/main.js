import './style.css';

const params = new URLSearchParams(location.search);

if (params.has('showcase')) {
  import('./dev/showcase.js').then(({ runShowcase }) => {
    runShowcase(params.get('showcase'));
  });
} else {
  import('./game/boot.js').then(({ bootGame }) => bootGame());
}
