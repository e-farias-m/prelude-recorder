// test-graphics.js — render every diagram in js/graphics.js, check no crashes + SVG well-formed.

const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, 'js', f), 'utf8');

const sandbox = new Function(`
${read('curriculum.js')}
${read('graphics.js')}
return { Graphics, CURRICULUM, INSTRUMENT_ORDER };
`);
const { Graphics, CURRICULUM, INSTRUMENT_ORDER } = sandbox();

let pass = 0, fail = 0;
const failures = [];
function check(cond, msg) { if (cond) pass++; else { fail++; failures.push(msg); } }
function isSvg(s) { return typeof s === 'string' && s.startsWith('<svg') && s.endsWith('</svg>'); }

// staffSVG for a range of positions
for (let pos = -4; pos <= 12; pos++) {
  try {
    const svg = Graphics.staffSVG({ pos, accidental: null, clef: 'treble', accentColor: '#C4832A', width: 130 });
    check(isSvg(svg), `staffSVG pos=${pos} not svg`);
  } catch (e) { fail++; failures.push(`staffSVG pos=${pos} threw: ${e.message}`); }
}

// recorderFingeringSVG for every note lesson
for (const id of INSTRUMENT_ORDER) {
  const inst = CURRICULUM[id];
  if (!inst || !inst.lessons) continue;
  for (const l of inst.lessons) {
    if (l.type === 'song' || l.type === 'review') continue;
    if (!l.fingeringState) continue;
    try {
      const svg = Graphics.recorderFingeringSVG(l.fingeringState, inst.accentColor || '#C4832A', 130);
      check(isSvg(svg), `${id}/${l.id} recorderFingeringSVG not svg`);
    } catch (e) { fail++; failures.push(`${id}/${l.id} threw: ${e.message}`); }
  }
}

// instrumentIconSVG
for (const id of INSTRUMENT_ORDER) {
  try {
    const svg = Graphics.instrumentIconSVG(id, 56);
    check(isSvg(svg), `instrumentIconSVG ${id} not svg`);
  } catch (e) { fail++; failures.push(`icon ${id} threw: ${e.message}`); }
}

// fingeringSVG dispatcher
for (const id of INSTRUMENT_ORDER) {
  const inst = CURRICULUM[id];
  if (!inst || !inst.lessons) continue;
  for (const l of inst.lessons) {
    if (l.type === 'song' || l.type === 'review') continue;
    if (!l.fingeringState) continue;
    try {
      const svg = Graphics.fingeringSVG(l.fingeringState, inst.fingeringType, inst.accentColor || '#C4832A', 84);
      check(isSvg(svg), `${id}/${l.id} fingeringSVG not svg`);
    } catch (e) { fail++; failures.push(`${id}/${l.id} fingeringSVG threw: ${e.message}`); }
  }
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) { failures.slice(0,20).forEach(f => console.log('  FAIL:', f)); process.exit(1); }
