// test-app.js — smoke tests for js/app.js (Preludio Recorder)

const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, 'js', f), 'utf8');

global.confirm = () => true;

function makeEl() {
  const el = {
    value: '', style: {}, dataset: {}, _text: '', _html: '',
    classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild() {}, addEventListener() {}, focus() {}, remove() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    setAttribute() {}, hasAttribute() { return false; },
  };
  Object.defineProperty(el, 'textContent', { get() { return el._text; }, set(v) { el._text = String(v); el._html = String(v); } });
  Object.defineProperty(el, 'innerHTML', { get() { return el._html; }, set(v) { el._html = String(v); } });
  return el;
}
const document = {
  addEventListener() {},
  getElementById() { return makeEl(); },
  createElement() { return makeEl(); },
  body: makeEl(),
  documentElement: { setAttribute() {} },
};
const store = { preludeRecorderName: 'Test' };
const localStorage = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; },
};

const sandbox = new Function('document', 'localStorage', 'window', 'navigator', `
${read('curriculum.js')}
${read('graphics.js')}
${read('i18n.js')}
${read('audio.js')}
${read('app.js')}
return { renderSelectScreen, CURRICULUM, APP, INSTRUMENT_ORDER, getLang, setLang, t };
`);
const api = sandbox(document, localStorage, {}, { language: 'en-US' });

let pass = 0, fail = 0;
const failures = [];
function check(cond, msg) { if (cond) pass++; else { fail++; failures.push(msg); } }

check(typeof api.renderSelectScreen === 'function', 'renderSelectScreen exists');
const html = api.renderSelectScreen();
check(typeof html === 'string' && html.length > 0, 'select screen renders');
check(html.includes('Preludio'), 'select screen has title');

check(typeof api.getLang === 'function', 'getLang exists');
check(api.getLang() === 'en' || api.getLang() === 'pt', 'getLang returns valid lang');

check(Array.isArray(api.INSTRUMENT_ORDER) && api.INSTRUMENT_ORDER.length > 0, 'INSTRUMENT_ORDER populated');

console.log(`${pass} passed, ${fail} failed`);
if (fail) { failures.forEach(f => console.log('  FAIL:', f)); process.exit(1); }
