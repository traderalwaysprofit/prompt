import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const index = read('index.html');
const theme = read('src/pixel-theme.css');
const motion = read('src/pixel-motion.css');
const engine = read('src/theme-engine.js');

assert.match(index, /pixel-motion\.css\?v=2/, 'Pixel motion stylesheet must be loaded');
assert.match(index, /family=Press\+Start\+2P&family=Space\+Mono/, 'Pixel Adventure fonts must be loaded');
assert.ok(
  index.indexOf('pixel-motion.css') > index.indexOf('pixel-desktop.css'),
  'Pixel motion overrides must load after responsive and desktop theme rules'
);

for (const [token, value] of [
  ['--pixel-motion-instant', '80ms'],
  ['--pixel-motion-fast', '120ms'],
  ['--pixel-motion-base', '180ms'],
  ['--pixel-motion-slow', '240ms']
]) {
  assert.match(motion, new RegExp(`${token}:${value}`), `${token} must stay within the approved contract`);
}

assert.match(motion, /steps\(2,end\)/, 'Pixel interactions must retain stepped timing');
assert.match(motion, /@media\(prefers-reduced-motion:reduce\)/, 'Reduced motion override is required');
assert.match(motion, /--pixel-motion-fast:\.001ms/, 'Reduced motion must collapse token duration');
assert.match(motion, /animation:none!important/, 'Reduced motion must disable non-essential animation');
assert.match(motion, /transition:none!important/, 'Reduced motion must disable transitions');
assert.match(theme, /--pixel-primary:#68c5ff/, 'Pixel Adventure must define an original primary color role');
assert.match(theme, /box-shadow:6px 6px 0 var\(--pixel-line\)/, 'Primary Pixel panels must use hard shadow depth');
assert.doesNotMatch(theme, /pixel-wire-slide/, 'The static HUD must not loop continuously');
assert.doesNotMatch(motion, /infinite/, 'Pixel Motion V2 must not add decorative infinite loops');
assert.match(engine, /Pixel adventure, playful, high-contrast/, 'Pixel theme description must match its visual direction');

console.log('PIXEL MOTION CONTRACT: PASS');
