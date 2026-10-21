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
const store = { preludioRecorderName: 'Test' };
const localStorage = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; },
};

// Minimal stand-ins for the browser APIs the recording path touches, so the
// start/stop/cleanup flow can be driven without a real microphone.
const revoked = [];
const URL = { createObjectURL: () => 'blob:fake', revokeObjectURL: (u) => revoked.push(u) };
const Blob = class { constructor(chunks, opts) { this.chunks = chunks; this.opts = opts; } };
const Audio = class { constructor(src) { this.src = src; Audio.last = this; } play() { return Promise.resolve(); } };
const MediaRecorder = class {
  constructor(stream) { this.stream = stream; this.state = 'inactive'; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; if (this.onstop) this.onstop(); }
};

const sandbox = new Function('document', 'localStorage', 'window', 'navigator', 'MediaRecorder', 'URL', 'Blob', 'Audio', `
${read('curriculum.js')}
${read('graphics.js')}
${read('i18n.js')}
${read('audio.js')}
${read('app.js')}
return { renderSelectScreen, CURRICULUM, APP, INSTRUMENT_ORDER, getLang, setLang, t,
  listenEnabled, listenFeedback, canRecord, startRecording, stopRecording,
  playRecording, cleanupRecording, renderPlayPhase, getLesson,
  clampSpeed, msPerBeatAt, renderSongPresentPhase };
`);
const api = sandbox(document, localStorage, {}, { language: 'en-US' },
  MediaRecorder, URL, Blob, Audio);

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

// ── Listen & match: pitch feedback ─────────────────────────────────────────
// The mic readout reports the nearest note and how far off it is, with a plain
// verdict against the target. All recorder instruments are fipple flutes, so
// every note lesson is eligible.
{
  check(api.listenEnabled('soprano-recorder') === true,
    'soprano recorder has listen & match enabled');
  check(api.listenEnabled('does-not-exist') === false,
    'an unknown instrument has listen & match disabled');

  const target = 523.25; // soprano recorder C5
  const hz = centsOff => target * Math.pow(2, centsOff / 1200);

  check(api.listenFeedback(target, -1).state === 'listening',
    'no signal reads as listening');
  check(api.listenFeedback(target, hz(20)).state === 'match',
    'a near-perfect pitch matches');
  check(api.listenFeedback(target, hz(-20)).state === 'match',
    'a slightly flat pitch still matches');
  check(api.listenFeedback(target, hz(75)).state === 'close',
    'a pitch just outside the match window reads as close');
  check(api.listenFeedback(target, hz(1200)).state === 'octave',
    'the same note an octave up reads as octave, not a match');
  check(api.listenFeedback(target, hz(250)).state === 'off',
    'a different note reads as off');
}

// ── Recording lifecycle ────────────────────────────────────────────────────
// canRecord depends on the injected MediaRecorder/getUserMedia; the playlist
// renders a record panel only when both are present.
{
  check(typeof api.canRecord() === 'boolean', 'canRecord returns a boolean');

  const soprano = api.getLesson('soprano-recorder', 0);
  const inst = api.CURRICULUM['soprano-recorder'];
  api.APP.instrumentId = 'soprano-recorder';
  api.APP.lessonIndex = 0;
  api.APP.phase = 'play';
  const playHtml = api.renderPlayPhase(inst, soprano);
  check(playHtml.includes('listen-panel') || playHtml.includes('listen-card'),
    'a recorder note lesson renders the listen panel');
  check(playHtml.includes('data-action="listen-toggle"'),
    'the play phase offers a listen toggle');
}

// ── Recording lifecycle ────────────────────────────────────────────────────
// With MediaRecorder and getUserMedia present, a take start/stop/cleanup cycle
// leaves no live stream and releases the blob URL.
{
  const fakeStream = { getTracks: () => [{ stop() {} }] };
  const nav = { mediaDevices: { getUserMedia: () => Promise.resolve(fakeStream) } };
  const api2 = sandbox(document, localStorage, {}, nav, MediaRecorder, URL, Blob, Audio);
  api2.APP.instrumentId = 'soprano-recorder';
  api2.APP.lessonIndex = 0;

  check(api2.canRecord() === true,
    'canRecord is true when MediaRecorder and getUserMedia are available');

  api2.startRecording().then(() => {
    check(!!api2.APP.recorder, 'starting a recording tracks the live recorder');
    api2.stopRecording();
    check(!api2.APP.recorder, 'stopping clears the live recorder');
    check(typeof api2.APP.recordingUrl === 'string' && api2.APP.recordingUrl.length > 0,
      'stopping produces a playable recording URL');
    api2.playRecording();
    check(Audio.last && Audio.last.src === api2.APP.recordingUrl,
      'playing the take feeds its URL to the audio element');
    api2.cleanupRecording();
    check(!api2.APP.recordingUrl, 'cleanup releases the recording URL');
    finish();
  });
}

// ── Practice speed ─────────────────────────────────────────────────────────
// One multiplier (50%–150%, 10% steps) drives every count-in and song, so the
// count-in always runs at the tempo the song will play.
{
  check(api.clampSpeed(1) === 1, 'speed 100% is unchanged');
  check(api.clampSpeed(0.1) === 0.5, 'speed is clamped up to the 50% floor');
  check(api.clampSpeed(9) === 1.5, 'speed is clamped down to the 150% ceiling');
  check(api.clampSpeed(0.74) === 0.7, 'speed snaps to the nearest 10% step');
  check(api.clampSpeed('nonsense') === 1, 'an unparseable speed falls back to 100%');

  // ms per beat scales inversely with speed, from the song's own tempo.
  check(Math.round(api.msPerBeatAt(100, 1)) === 600, '100 BPM at 100% is 600 ms/beat');
  check(Math.round(api.msPerBeatAt(100, 0.5)) === 1200, '100 BPM at 50% is 1200 ms/beat');
  check(Math.round(api.msPerBeatAt(80, 1.5)) === 500, '80 BPM at 150% is 500 ms/beat');

  // The song present phase surfaces the speed control.
  const inst = api.CURRICULUM['soprano-recorder'];
  const songLesson = inst.lessons.find(l => l.type === 'song');
  api.APP.instrumentId = 'soprano-recorder';
  api.APP.lessonIndex = inst.lessons.indexOf(songLesson);
  api.APP.songNoteIndex = 0;
  const songHtml = api.renderSongPresentPhase(inst, songLesson);
  check(songHtml.includes('song-speed-control'), 'the song phase renders a speed control');
  check(songHtml.includes('data-action="song-speed-up"'), 'the speed control has a faster button');
  check(songHtml.includes('data-action="song-speed-down"'), 'the speed control has a slower button');
  check(songHtml.includes('100% (100 BPM)'), 'the speed label shows percent and BPM');
}

function finish() {
  console.log(`${pass} passed, ${fail} failed`);
  if (fail) { failures.forEach(f => console.log('  FAIL:', f)); process.exit(1); }
}