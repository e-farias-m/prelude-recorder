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

// ── Melody staff draws every note, wraps, and highlights one ───────────────
{
  const notes = [
    { pos: -2, accidental: null }, { pos: -1, accidental: null },
    { pos: 0, accidental: null }, { pos: 1, accidental: '♭' },
    { pos: 2, accidental: null }, { pos: 3, accidental: null },
    { pos: 4, accidental: null }, { pos: 5, accidental: null },
  ];
  const svg = Graphics.melodySVG({ notes, highlightIndex: 3, clef: 'treble', accentColor: '#e0a020', width: 320 });
  check(isSvg(svg), 'melody staff is valid SVG');
  const heads = (svg.match(/<ellipse/g) || []).length;
  check(heads === notes.length, `melody staff should draw one notehead per note (got ${heads})`);
  const systems = (svg.match(/<text[^>]*>&#11907[04];<\/text>/g) || []).length;
  check(systems >= 2, 'a melody longer than one system wraps onto more staves');
  check(svg.includes('#e0a020'), 'the highlighted note uses the accent colour');
  check(svg.includes('♭'), 'an accidental note prints its accidental');
  check(!svg.includes('undefined') && !svg.includes('NaN'), 'melody staff contains no undefined/NaN');
  check(Graphics.melodySVG({ notes: [], highlightIndex: 0 }) === '', 'an empty melody renders nothing');
}

// ── Melody staff engraves note values (quarter / half / whole) ─────────────
{
  const heads = svg => (svg.match(/<ellipse/g) || []).length;
  const headAt = (svg, i) => (svg.match(/<ellipse[^>]*>/g) || [])[i];
  const stems = svg => (svg.match(/<line x1="[^"]*" y1="[^"]*" x2="[^"]*" y2="[^"]*" stroke="var\(--dg-ink\)" stroke-width="1.6"\/>/g) || []).length;
  const notes = [
    { pos: 0, accidental: null, duration: 1 },
    { pos: 2, accidental: null, duration: 2 },
    { pos: 4, accidental: null, duration: 4 },
  ];
  const svg = Graphics.melodySVG({ notes, accentColor: '#e0a020' });
  check(heads(svg) === 3, 'three-notes of mixed values draw three heads');
  check((headAt(svg, 0) || '').includes('fill="var(--dg-ink)"'), 'a quarter note is a filled notehead');
  check(!(headAt(svg, 1) || '').includes('fill="var(--dg-ink)"') && (headAt(svg, 1) || '').includes('fill="none"'), 'a half note is a hollow notehead');
  check(!(headAt(svg, 2) || '').includes('fill="var(--dg-ink)"') && (headAt(svg, 2) || '').includes('fill="none"'), 'a whole note is a hollow notehead');
  check(stems(svg) === 2, `quarter and half notes carry stems, whole does not (got ${stems(svg)})`);
  check(Graphics.melodySVG({ notes: [{ pos: 0 }] }).includes('fill="var(--dg-ink)"'), 'a note without a duration defaults to a filled quarter note');
}

// ── Melody staff shows 4/4 and places bar lines on the beats ───────────────
{
  const barLines = svg => {
    const lines = svg.match(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="var\(--dg-ink\)" stroke-width="1.3"\/>/g) || [];
    return lines.filter(l => {
      const m = l.match(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/);
      return m[1] === m[3] && m[2] !== m[4];
    }).length;
  };
  const q = n => Array.from({ length: n }, () => ({ pos: 2, accidental: null, duration: 1 }));
  const sig = Graphics.melodySVG({ notes: q(8), accentColor: '#e0a020' });
  check(sig.includes('>4</text>'), 'the 4/4 time signature is drawn');
  const sigTexts = (sig.match(/>4<\/text>/g) || []).length;
  check(sigTexts === 2, `the time signature shows two 4s (got ${sigTexts})`);
  check(barLines(sig) === 2, `8 quarter notes in 4/4 draw 2 bar lines (got ${barLines(sig)})`);
  check(barLines(Graphics.melodySVG({ notes: q(4), accentColor: '#e0a020' })) === 1,
    'a one-bar tune draws only the closing bar line');
  check(barLines(Graphics.melodySVG({ notes: q(3), accentColor: '#e0a020' })) === 1,
    'an incomplete pickup bar draws only the closing bar line');
  check(barLines(Graphics.melodySVG({ notes: q(5), accentColor: '#e0a020' })) === 2,
    'a 1-beat pickup plus a full bar draws one interior bar line');
  const half = [{ pos: 2, duration: 1 }, { pos: 2, duration: 1 }, { pos: 2, duration: 1 }, { pos: 2, duration: 2 }];
  check(barLines(Graphics.melodySVG({ notes: half, accentColor: '#e0a020' })) === 2,
    'a half note is never split by a bar line');
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) { failures.slice(0,30).forEach(f => console.log('  FAIL:', f)); process.exit(1); }
