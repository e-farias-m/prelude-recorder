// i18n fallbacks for environments that load app.js without i18n.js
if (typeof t !== 'function') { var t = function(s){ return s; }; }
if (typeof initLang !== 'function') { var initLang = function(){}; }
if (typeof getLang !== 'function') { var getLang = function(){ return 'en'; }; }
if (typeof setLang !== 'function') { var setLang = function(){}; }
if (typeof TRANSLATIONS === 'undefined') { var TRANSLATIONS = { en:{}, pt:{} }; }
if (typeof LANG === 'undefined') { var LANG = 'en'; }

// app.js
// Application state machine and rendering for Preludio Recorder.
// Single delegated click listener drives all interaction via data-action.

var CHORD_FREQS = {
  'G':   [98.00, 123.47, 146.83],
  'D7':  [73.42, 92.50, 110.00, 130.81],
  'Am':  [110.00, 130.81, 164.81],
  'C':   [65.41, 82.41, 98.00],
  'G/B': [123.47, 146.83, 196.00]
};

const THEME_KEY = 'preludioRecorderTheme';
function getTheme() { return (typeof localStorage !== 'undefined' && localStorage.getItem(THEME_KEY)) || 'dark'; }
function applyTheme(theme) {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector && document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F5F4FB' : '#0E0D1C');
  }
}
function setTheme(theme) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) {} applyTheme(theme); }
function toggleTheme() { setTheme(getTheme() === 'light' ? 'dark' : 'light'); }

const APP = {
  screen: 'select',
  instrumentId: null,
  lessonIndex: 0,
  phase: 'present',
  quiz: null,
  play: { running: false, hasPlayed: false },
  progress: {},
  toolsOpen: false,
  toolTab: 'metronome',
  pickingInstrument: false,
  // Review session state
  reviewQueue: null,
  reviewIndex: 0,
  reviewCorrect: 0,
  reviewTotal: 0,
  // Song session state
  songNoteIndex: 0,
  songSpeed: getSavedSpeed(),
  quizQueue: [],
  quizIndex: 0,
  lookupId: null,
  lookupReturn: 'map',
  tutorialIndex: 0,
  sprint: null,
  sprintTimer: null,
  // Microphone capture on the play phase. `recorder` holds the live
  // MediaRecorder while a take is in progress; `recordingUrl` holds the blob
  // URL of the finished take so it can be played back and compared.
  recorder: null,
  recordingUrl: null,
};

const VERSION = '1.0.2';
const STORAGE_KEY = 'preludioRecorderProgress';
const NAME_KEY = 'preludioRecorderName';
const INSTRUMENT_KEY = 'preludioRecorderInstrument';

// Practice speed: a single multiplier applied to every count-in and song, so
// the count-in always runs at the same tempo the song will. 100% = the song's
// own written tempo. Range 50%–150%, 10% steps, persisted across sessions.
const SONG_SPEED_KEY = 'preludioRecorderSongSpeed';
const SPEED_MIN = 0.5;
const SPEED_MAX = 1.5;
const SPEED_STEP = 0.1;
function clampSpeed(v) {
  const n = Math.round((Number(v) || 1) / SPEED_STEP) * SPEED_STEP;
  return Math.max(SPEED_MIN, Math.min(SPEED_MAX, Number(n.toFixed(2))));
}
function getSavedSpeed() {
  try { return clampSpeed(localStorage.getItem(SONG_SPEED_KEY)); }
  catch (e) { return 1; }
}
function setSavedSpeed(v) {
  // localStorage may be unavailable (private mode); the in-memory APP value
  // still drives playback, so a failure here is harmless.
  try { localStorage.setItem(SONG_SPEED_KEY, String(v)); } catch (e) {}
}
// Milliseconds per beat at the current practice speed, given the song's own
// written tempo (baseBpm). The single source of truth for count-in and song.
function msPerBeatAt(baseBpm, speed) {
  const bpm = (Number(baseBpm) || 100) * (speed || 1);
  return 60000 / bpm;
}

// Last instrument the student opened — lets the home screen focus on one
// instrument instead of the full set until they ask to switch.
function getSavedInstrument() { return localStorage.getItem(INSTRUMENT_KEY) || ''; }
function setSavedInstrument(id) { localStorage.setItem(INSTRUMENT_KEY, id); }
function clearSavedInstrument() { localStorage.removeItem(INSTRUMENT_KEY); }

// First-sound guide has been seen per instrument (onboarding CTA state).
const FIRST_SOUND_KEY = 'preludioRecorderFirstSound';
function getFirstSoundSeenMap() {
  try { return JSON.parse(localStorage.getItem(FIRST_SOUND_KEY) || '{}') || {}; }
  catch (e) { return {}; }
}
function getFirstSoundSeen(instrumentId) { return !!getFirstSoundSeenMap()[instrumentId]; }
function markFirstSoundSeen(instrumentId) {
  const seen = getFirstSoundSeenMap();
  seen[instrumentId] = true;
  localStorage.setItem(FIRST_SOUND_KEY, JSON.stringify(seen));
}

const TUTORIAL_KEY = 'preludioRecorderTutorials';

function getTutorialSeen(instrumentId) {
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(TUTORIAL_KEY) || '[]'); } catch (e) {}
  return Array.isArray(seen) && seen.indexOf(instrumentId) !== -1;
}
function markTutorialSeen(instrumentId) {
  if (getTutorialSeen(instrumentId)) return;
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(TUTORIAL_KEY) || '[]'); } catch (e) {}
  if (!Array.isArray(seen)) seen = [];
  seen.push(instrumentId);
  localStorage.setItem(TUTORIAL_KEY, JSON.stringify(seen));
}

// Recorders are all fipple flutes — one shared first-sound guide.
const FIRST_SOUND_CONTENT = {
  recorder: {
    emoji: '\u{1F3B5}',
    title: 'Make your first sound',
    intro: 'On a recorder the sound starts with a gentle stream of air across the window — not by blowing hard.',
    steps: [
      'Hold the recorder level, lips soft around the mouthpiece.',
      'Cover every hole fully with the pads of your fingers — no gaps.',
      'Take a small, warm breath — like fogging up a mirror.',
      'Blow a thin, steady stream of air. Not too hard!',
      'Listen for a clear, steady tone — that is your sound.',
    ],
    tip: 'Squeaking? Check for leaking finger holes and ease off the air. No sound? Blow slightly harder and make sure the window is not blocked.',
  },
};

// ── ANALYTICS (local) ─────────────────────────────────────────────────────────
const ANALYTICS_KEY = 'preludioRecorderAnalytics';

function getStudentName() { return localStorage.getItem(NAME_KEY) || ''; }
function setStudentName(name) { localStorage.setItem(NAME_KEY, name); }

function recordLessonComplete(lessonId, type, xpGained, stars) {
  const events = getAnalyticsEvents();
  events.push({
    lessonId, type, xpGained, stars,
    timestamp: Date.now(),
    instrumentId: APP.instrumentId,
    studentName: getStudentName(),
  });
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
}

function getAnalyticsEvents() {
  try { return JSON.parse(localStorage.getItem(ANALYTICS_KEY)) || []; }
  catch { return []; }
}

function showNamePrompt() {
  const overlay = document.createElement('div');
  overlay.className = 'name-overlay';
  overlay.innerHTML = `
    <div class="name-modal">
      <div class="name-modal-icon">🎵</div>
      <div class="name-modal-title">Welcome to Preludio Recorder!</div>
      <div class="name-modal-sub">What's your name?</div>
      <input type="text" class="name-input" placeholder="Your name..." maxlength="50" autocomplete="off" />
      <button class="btn btn-primary btn-wide name-submit">Start practicing</button>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.name-input');
  const submit = overlay.querySelector('.name-submit');
  input.focus();

  function submitName() {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    setStudentName(name);
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 300);
  }

  submit.addEventListener('click', submitName);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });
}

// ── PRACTICE SPRINTS ───────────────────────────────────────────────────────
const SPRINT_SECONDS = 30;
const SPRINT_MODES = {
  SIGHT: 'sight',    // See a note on the staff, name it
  FINGER: 'finger',  // See a note name, pick its fingering
};

// ── MOTIVATION (streak, practice minutes, levels, badges) ──────────────────
const MOTIVATION_KEY = 'preludioRecorderMotivation';
const MAX_SESSION_SECONDS = 30 * 60; // ignore implausible idle stretches

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function todayKey(d = new Date()) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function loadMotivation() {
  try {
    const raw = localStorage.getItem(MOTIVATION_KEY);
    APP.motivation = raw ? JSON.parse(raw) : null;
  } catch (e) { APP.motivation = null; }
  if (!APP.motivation || typeof APP.motivation !== 'object') APP.motivation = {};
  if (!APP.motivation.days) APP.motivation.days = {};
  if (!APP.motivation.badges) APP.motivation.badges = {};
  return APP.motivation;
}

function getMotivation() {
  return APP.motivation || loadMotivation();
}

function saveMotivation() {
  try {
    localStorage.setItem(MOTIVATION_KEY, JSON.stringify(APP.motivation));
  } catch (e) { /* storage unavailable — fail silently */ }
}

// Records `seconds` of practice on today's date.
function addPracticeSeconds(seconds) {
  const m = getMotivation();
  const k = todayKey();
  m.days[k] = (m.days[k] || 0) + seconds;
  saveMotivation();
  return m.days[k];
}

function getTotalPracticeSeconds() {
  const m = getMotivation();
  return Object.values(m.days).reduce((sum, s) => sum + (s || 0), 0);
}

// Number of consecutive days (ending today or yesterday) with any practice.
function getCurrentStreak(now = new Date()) {
  const m = getMotivation();
  const has = d => (m.days[todayKey(d)] || 0) > 0;
  const cursor = new Date(now);
  if (!has(cursor)) cursor.setDate(cursor.getDate() - 1); // streak survives until today ends
  let streak = 0;
  while (has(cursor)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getTotalXp() {
  return Object.values(APP.progress).reduce((sum, p) => sum + (p.xp || 0), 0);
}

function getLevel(xp = getTotalXp()) {
  return Math.floor(xp / 100) + 1;
}

function getAvatar(level = getLevel()) {
  if (level >= 12) return '\u{1F451}'; // crown
  if (level >= 8) return '\u{1F3C5}';  // medal
  if (level >= 5) return '\u{1F3BA}';  // brass
  if (level >= 3) return '\u{1F3B6}';  // notes
  return '\u{1F331}';                  // seedling
}

const BADGES = [
  { id: 'first-steps', icon: '\u{1F331}', name: 'First Steps', desc: 'Complete your first lesson' },
  { id: 'first-song', icon: '\u{1F3B5}', name: 'First Song', desc: 'Complete a song' },
  { id: 'full-scale', icon: '\u{1F3BC}', name: 'Full Scale', desc: 'Learn every note on an instrument' },
  { id: 'streak-3', icon: '\u{1F525}', name: 'On a Roll', desc: 'Practice 3 days in a row' },
  { id: 'streak-7', icon: '\u{1F525}', name: 'Week Strong', desc: 'Practice 7 days in a row' },
  { id: 'marathon', icon: '\u{23F1}', name: 'Marathon', desc: 'Practice for 30 minutes in total' },
  { id: 'xp-500', icon: '\u{2B50}', name: 'Rising Star', desc: 'Earn 500 XP' },
  { id: 'quick-fingers', icon: '\u{26A1}', name: 'Quick Fingers', desc: 'Score 15 in a Finger gym sprint' },
  { id: 'plan-complete', icon: '\u{1F3AF}', name: 'Planner', desc: 'Finish a full practice plan' },
];

// Aggregate cross-instrument stats used for badges.
function getStats() {
  let notesCompleted = 0, songsCompleted = 0, fullScales = 0, bestFinger = 0;
  for (const id of INSTRUMENT_ORDER) {
    const prog = APP.progress[id];
    if (!prog) continue;
    let noteCount = 0, totalNotes = 0;
    (CURRICULUM[id].lessons || []).forEach(l => {
      if (!isSongLesson(l) && !isReviewLesson(l)) totalNotes++;
      if (!prog.completed || !prog.completed[l.id]) return;
      if (isSongLesson(l)) songsCompleted++;
      else if (!isReviewLesson(l)) { notesCompleted++; noteCount++; }
    });
    if (totalNotes > 0 && noteCount >= totalNotes) fullScales++;
    if (prog.sprints && prog.sprints[SPRINT_MODES.FINGER] > bestFinger) {
      bestFinger = prog.sprints[SPRINT_MODES.FINGER];
    }
  }
  return {
    notesCompleted,
    songsCompleted,
    fullScales,
    bestFinger,
    streak: getCurrentStreak(),
    totalSeconds: getTotalPracticeSeconds(),
    xp: getTotalXp(),
    plansCompleted: getMotivation().plansCompleted || 0,
  };
}

function badgeEarned(id, stats) {
  switch (id) {
    case 'first-steps': return stats.notesCompleted >= 1;
    case 'first-song': return stats.songsCompleted >= 1;
    case 'full-scale': return stats.fullScales >= 1;
    case 'streak-3': return stats.streak >= 3;
    case 'streak-7': return stats.streak >= 7;
    case 'marathon': return stats.totalSeconds >= 1800;
    case 'xp-500': return stats.xp >= 500;
    case 'quick-fingers': return stats.bestFinger >= 15;
    case 'plan-complete': return stats.plansCompleted >= 1;
    default: return false;
  }
}

// Awards any newly-earned badges. Returns their definitions (optionally toasts).
function evaluateBadges(opts = {}) {
  const m = getMotivation();
  const stats = getStats();
  const newly = [];
  BADGES.forEach(b => {
    if (!m.badges[b.id] && badgeEarned(b.id, stats)) {
      m.badges[b.id] = new Date().toISOString();
      newly.push(b);
    }
  });
  if (newly.length) {
    saveMotivation();
    if (opts.toast && typeof showToast === 'function') {
      showToast(`${newly[0].icon} Badge unlocked: ${newly[0].name}`);
    }
  }
  return newly;
}

function hasBadge(id) {
  return !!getMotivation().badges[id];
}

// ── SESSION TIMING ─────────────────────────────────────────────────────────
function startSession() {
  if (APP.sessionStart) return;
  APP.sessionStart = Date.now();
}

function endSession() {
  if (!APP.sessionStart) return;
  const seconds = Math.min(Math.round((Date.now() - APP.sessionStart) / 1000), MAX_SESSION_SECONDS);
  APP.sessionStart = null;
  if (seconds >= 5) addPracticeSeconds(seconds);
  evaluateBadges({ toast: true });
}

// ── SKILLS (spaced repetition) ─────────────────────────────────────────────
// Every answered question updates a per-note skill record. The daily plan is
// regenerated from these skills, prioritising notes with low accuracy and
// notes that have not been seen for a while (a light spaced-repetition model).
function getSkill(instrumentId, noteId) {
  const prog = getInstrumentProgress(instrumentId);
  if (!prog.skills) prog.skills = {};
  if (!prog.skills[noteId]) {
    // Existing students predate skills tracking; seed from quiz mastery so
    // their accuracy history isn't lost.
    const mastery = prog.mastery[noteId] || 0;
    prog.skills[noteId] = { correct: mastery, wrong: 0, streak: 0, lastSeen: 0 };
  }
  return prog.skills[noteId];
}

function recordSkill(instrumentId, noteId, correct) {
  const s = getSkill(instrumentId, noteId);
  if (correct) { s.correct++; s.streak = (s.streak || 0) + 1; }
  else { s.wrong++; s.streak = 0; }
  s.lastSeen = Date.now();
  saveProgress();
  return s;
}

function noteWeakness(instrumentId, noteId, now = Date.now()) {
  const s = getSkill(instrumentId, noteId);
  const attempts = s.correct + s.wrong;
  const accuracy = attempts ? s.correct / attempts : 0.5;
  const days = s.lastSeen ? (now - s.lastSeen) / 86400000 : 7;
  const overdue = Math.min(days, 7) / 7;
  return (1 - accuracy) * 0.7 + overdue * 0.3;
}

// Accuracy for display; null until the note has actually been attempted.
function getNoteAccuracy(instrumentId, noteId) {
  const s = getSkill(instrumentId, noteId);
  const attempts = s.correct + s.wrong;
  return { attempts, accuracy: attempts ? s.correct / attempts : null };
}

// The learned notes most in need of work, weakest first.
function getWeakestNotes(instrumentId, count = 3) {
  const now = Date.now();
  return getLearnedNotes(instrumentId)
    .map(l => ({
      lesson: l,
      weakness: noteWeakness(instrumentId, l.id, now),
      ...getNoteAccuracy(instrumentId, l.id),
    }))
    .sort((a, b) => b.weakness - a.weakness)
    .slice(0, count);
}

// Weighted pick that biases drills toward weaker notes without ever ignoring
// the others (every note keeps a small floor weight).
function pickWeightedNote(instrumentId, pool) {
  if (!pool.length) return null;
  const now = Date.now();
  const weights = pool.map(l => 0.2 + noteWeakness(instrumentId, l.id, now));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// ── ADAPTIVE PRACTICE PLAN ─────────────────────────────────────────────────
function generatePlan(instrumentId, now = Date.now()) {
  const learned = getLearnedNotes(instrumentId);
  const items = [];
  if (learned.length === 0) return { date: todayKey(new Date(now)), items };

  const ranked = learned
    .map(l => ({ l, w: noteWeakness(instrumentId, l.id, now) }))
    .sort((a, b) => b.w - a.w);

  ranked.slice(0, learned.length >= 3 ? 2 : 1).forEach(({ l, w }) => {
    items.push({
      id: 'note:' + l.id,
      type: 'note',
      targetId: l.id,
      reason: w >= 0.55 ? 'Shaky — needs review' : 'Keep it fresh',
    });
  });

  if (learned.length >= 2) {
    const sight = getSprintBest(instrumentId, SPRINT_MODES.SIGHT);
    const finger = getSprintBest(instrumentId, SPRINT_MODES.FINGER);
    const mode = finger <= sight ? SPRINT_MODES.FINGER : SPRINT_MODES.SIGHT;
    items.push({ id: 'sprint:' + mode, type: 'sprint', mode, reason: 'Build speed' });
  }

  const inst = getInstrument(instrumentId);
  const prog = getInstrumentProgress(instrumentId);
  const songs = inst.lessons.filter(s =>
    isSongLesson(s) && isLessonUnlocked(instrumentId, CURRICULUM[instrumentId].lessons.indexOf(s)));
  const song = songs.find(s => !prog.completed[s.id]) || songs[0];
  if (song) {
    items.push({ id: 'song:' + song.id, type: 'song', targetId: song.id, reason: 'Apply your notes' });
  }

  return { date: todayKey(new Date(now)), items };
}

// Today's plan is generated once and then persists for the day, so checkboxes
// and ordering stay stable across visits.
function getTodayPlan(instrumentId, now = Date.now()) {
  const prog = getInstrumentProgress(instrumentId);
  const key = todayKey(new Date(now));
  if (!prog.plan || prog.plan.date !== key) {
    prog.plan = generatePlan(instrumentId, now);
    saveProgress();
  }
  return prog.plan;
}

function isPlanComplete(instrumentId) {
  const prog = getInstrumentProgress(instrumentId);
  const items = prog.plan && prog.plan.items;
  return !!items && items.length > 0 && items.every(i => i.done);
}

// Marks matching plan items done; when the whole plan is finished, awards bonus
// XP and records it for the plan badge.
function markPlanItemDone(instrumentId, type, target) {
  const prog = APP.progress[instrumentId];
  if (!prog || !prog.plan || !prog.plan.items) return;
  let changed = false;
  prog.plan.items.forEach(it => {
    if (it.done) return;
    const matches = it.type === type &&
      (it.type === 'sprint' ? it.mode === target : it.targetId === target);
    if (matches) { it.done = true; changed = true; }
  });
  if (!changed) return;
  saveProgress();
  if (prog.plan.items.every(i => i.done) && !prog.plan.completed) {
    completePlan(instrumentId);
  }
}

function completePlan(instrumentId) {
  const prog = getInstrumentProgress(instrumentId);
  if (!prog.plan || prog.plan.completed) return;
  prog.plan.completed = true;
  const bonus = 20;
  prog.xp += bonus;
  const m = getMotivation();
  m.plansCompleted = (m.plansCompleted || 0) + 1;
  saveMotivation();
  saveProgress();
  evaluateBadges({ toast: true });
  showToast('\u{1F389} Plan complete! +' + bonus + ' XP');
}

// ── SPRINT PERSONAL BESTS ──────────────────────────────────────────────────
// Personal best for a sprint mode is stored per instrument.
function getSprintBest(instrumentId, mode) {
  const prog = getInstrumentProgress(instrumentId);
  return (prog.sprints && prog.sprints[mode]) || 0;
}

// Saves a new best if `score` beats it. Returns true when a record was set.
function setSprintBest(instrumentId, mode, score) {
  const prog = getInstrumentProgress(instrumentId);
  if (!prog.sprints) prog.sprints = {};
  if (score > (prog.sprints[mode] || 0)) {
    prog.sprints[mode] = score;
    saveProgress();
    return true;
  }
  return false;
}

// ── QUIZ TYPES ────────────────────────────────────────────────────────────
const QUIZ_TYPES = {
  FINGERING_TO_NOTE: 'fingering-to-note',   // See fingering, pick note name
  NOTE_TO_FINGERING: 'note-to-fingering',   // See note name, pick fingering
  STAFF_TO_NOTE: 'staff-to-note',           // See note on staff, pick note name
  NOTE_TO_STAFF: 'note-to-staff',           // See note name, pick staff position
};

// ── MASTERY LEVELS ────────────────────────────────────────────────────────
function getMasteryLevel(correctCount) {
  if (correctCount >= 6) return 'mastered';
  if (correctCount >= 3) return 'practiced';
  if (correctCount >= 1) return 'learning';
  return 'new';
}

function getMasteryColor(level) {
  return { new: '#524F70', learning: '#FF8C42', practiced: '#8B7BFF', mastered: '#4FD98A' }[level] || '#524F70';
}

function getMasteryLabel(level) {
  return { new: 'New', learning: 'Learning', practiced: 'Practiced', mastered: 'Mastered' }[level] || 'New';
}

// ── PROGRESS PERSISTENCE ───────────────────────────────────────────────────
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    APP.progress = raw ? JSON.parse(raw) : {};
  } catch (e) {
    APP.progress = {};
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(APP.progress));
  } catch (e) { /* storage unavailable — fail silently */ }
}

function getInstrumentProgress(instrumentId) {
  if (!APP.progress[instrumentId]) {
    APP.progress[instrumentId] = { completed: {}, xp: 0, mastery: {} };
  }
  if (!APP.progress[instrumentId].mastery) {
    APP.progress[instrumentId].mastery = {};
  }
  if (!APP.progress[instrumentId].sprints) {
    APP.progress[instrumentId].sprints = {};
  }
  return APP.progress[instrumentId];
}

function getNoteMastery(instrumentId, noteId) {
  const prog = getInstrumentProgress(instrumentId);
  return prog.mastery[noteId] || 0;
}

function addNoteMastery(instrumentId, noteId, amount = 1) {
  const prog = getInstrumentProgress(instrumentId);
  prog.mastery[noteId] = (prog.mastery[noteId] || 0) + amount;
  saveProgress();
}

function getLearnedNotes(instrumentId) {
  const inst = getInstrument(instrumentId);
  const prog = getInstrumentProgress(instrumentId);
  return inst.lessons.filter(l => prog.completed[l.id] && !isReviewLesson(l) && !isSongLesson(l));
}

function getNewestNote(instrumentId) {
  const learned = getLearnedNotes(instrumentId);
  return learned.length > 0 ? learned[learned.length - 1] : null;
}

function isReviewLesson(lesson) {
  return lesson && lesson.type === 'review';
}

function isSongLesson(lesson) {
  return lesson && lesson.type === 'song';
}

function isLessonUnlocked(instrumentId, index) {
  const instrument = CURRICULUM[instrumentId];
  const lesson = instrument.lessons[index];
  if (!lesson) return false;
  if (isReviewLesson(lesson)) {
    const prog = getInstrumentProgress(instrumentId);
    return lesson.reviewLessonIds.every(id => !!prog.completed[id]);
  }
  if (isSongLesson(lesson) && lesson.prerequisiteIds) {
    const prog = getInstrumentProgress(instrumentId);
    return lesson.prerequisiteIds.every(id => !!prog.completed[id]);
  }
  if (index === 0) return true;
  const prevId = instrument.lessons[index - 1].id;
  const prog = getInstrumentProgress(instrumentId);
  return !!prog.completed[prevId];
}

// ── HELPERS ─────────────────────────────────────────────────────────────
function getInstrument(id) { return CURRICULUM[id]; }
function getLesson(instrumentId, index) {
  if (APP.importedSong) return APP.importedSong;
  return CURRICULUM[instrumentId].lessons[index];
}
function findLessonById(instrumentId, id) {
  return CURRICULUM[instrumentId].lessons.find(l => l.id === id);
}

function getResolvedSongNote(instrumentId, lesson) {
  if (!isSongLesson(lesson)) return null;
  const noteId = lesson.noteIds[APP.songNoteIndex];
  return findLessonById(instrumentId, noteId);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── RENDER: SELECT SCREEN ──────────────────────────────────────────────────
function renderTunerPanel() {
  const t = APP.tuner;
  const running = !!(t && t.running);
  const freq = t && t.freq > 0 ? t.freq : 0;
  const detected = freq > 0 ? freqToNoteInfo(freq, getTunerNoteLessons()) : null;
  const noteName = detected ? t_noteName(detected.note) : '—';
  const cents = detected ? (detected.cents > 0 ? '+' + Math.round(detected.cents) : Math.round(detected.cents)) + ' cents' : (running ? 'Listening…' : 'Press Tune');
  return `<div class="tuner-panel" style="margin:12px auto;max-width:320px;padding:12px;border:1px solid var(--border);border-radius:12px;text-align:center;">
    <div style="font-size:28px;font-weight:700" id="tuner-note">${noteName}</div>
    <div style="font-size:13px;color:var(--text-muted)" id="tuner-cents">${cents}</div>
    <button class="btn btn-secondary" data-action="toggle-tuner" style="margin-top:8px">${running ? '⏹ Stop' : '🎵 Tune'}</button>
  </div>`;
}

function getNoteLessons(instrumentId) {
  const inst = getInstrument(instrumentId);
  return (inst.lessons || []).filter(l => !isSongLesson(l) && !isReviewLesson(l));
}

function getInstrumentReport(instrumentId) {
  const inst = getInstrument(instrumentId);
  const prog = getInstrumentProgress(instrumentId);
  const noteLessons = getNoteLessons(instrumentId);
  const songLessons = inst.lessons.filter(isSongLesson);
  const learned = getLearnedNotes(instrumentId);
  const mastery = { new: 0, learning: 0, practiced: 0, mastered: 0 };
  learned.forEach(l => { mastery[getMasteryLevel(getNoteMastery(instrumentId, l.id))]++; });
  const weak = getWeakestNotes(instrumentId, 3)
    .filter(w => w.attempts > 0)
    .map(w => ({ name: t(w.lesson.noteName), accuracy: Math.round((w.accuracy || 0) * 100) }));
  return {
    id: instrumentId,
    name: t(inst.name),
    shortName: inst.shortName,
    xp: prog.xp || 0,
    notesLearned: learned.length,
    notesTotal: noteLessons.length,
    songsCompleted: songLessons.filter(s => prog.completed[s.id]).length,
    songsTotal: songLessons.length,
    mastery,
    weak,
  };
}

function renderStudentCard(name) {
  const xp = getTotalXp();
  const level = getLevel(xp);
  const avatar = getAvatar(level);
  const streak = getCurrentStreak();
  const minutes = Math.floor(getTotalPracticeSeconds() / 60);
  const pct = xp % 100;
  const streakHtml = streak > 0
    ? `<span class="student-stat student-stat-streak">\u{1F525} ${streak}-day streak</span>`
    : `<span class="student-stat">Practice today to start a streak!</span>`;
  return `
    <div class="student-card">
      <div class="student-avatar">${avatar}</div>
      <div class="student-details">
        <div class="student-name-row">
          <span class="student-name">${escapeHtml(name)}</span>
          <span class="student-level">Lv ${level}</span>
        </div>
        <div class="student-stats">
          ${streakHtml}
          <span class="student-stat">\u{23F1} ${minutes} min</span>
          <span class="student-stat">\u{2B50} ${xp} XP</span>
        </div>
        <div class="level-bar-track"><div class="level-bar-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
}

function renderBadgeShelf() {
  const earned = BADGES.filter(b => hasBadge(b.id)).length;
  const items = BADGES.map(b => {
    const got = hasBadge(b.id);
    return `
      <div class="badge ${got ? 'badge-earned' : 'badge-locked'}" title="${b.name}: ${b.desc}">
        <div class="badge-icon">${got ? b.icon : '\u{1F512}'}</div>
        <div class="badge-name">${b.name}</div>
      </div>`;
  }).join('');
  return `
    <div class="badges-shelf">
      <div class="badges-shelf-title">Badges · ${earned}/${BADGES.length}</div>
      <div class="badges-grid">${items}</div>
    </div>`;
}

function renderInstrumentGrid() {
  const cards = INSTRUMENT_ORDER.map(id => {
    const inst = CURRICULUM[id];
    const icon = Graphics.instrumentIconSVG(id, 56);
    const cls = inst.available ? 'instrument-card' : 'instrument-card coming-soon';
    const badge = inst.available ? '' : `<div class="card-badge">Soon</div>`;
    return `
      <div class="${cls}" data-action="select-instrument" data-id="${id}" style="color:${inst.accentColor}">
        ${badge}
        <div class="card-icon">${icon}</div>
        <div class="card-name" style="color: var(--text-primary)">${inst.shortName}</div>
      </div>`;
  }).join('');
  return `<div class="instrument-grid">${cards}</div>`;
}

// A single, prominent card for the instrument the student is working in, so the
// home screen stays focused instead of showing every instrument all the time.
function renderFocusCard(inst) {
  const ir = getInstrumentReport(inst.id);
  const progress = ir.xp > 0
    ? `${ir.notesLearned}/${ir.notesTotal} notes · ${ir.songsCompleted}/${ir.songsTotal} songs`
    : 'Ready for your first lesson';
  return `
    <div class="focus-instrument">
      <div class="focus-card" data-action="select-instrument" data-id="${inst.id}" style="color:${inst.accentColor}">
        <div class="focus-icon">${Graphics.instrumentIconSVG(inst.id, 64)}</div>
        <div class="focus-info">
          <div class="focus-name">${escapeHtml(t(inst.name))}</div>
          <div class="focus-progress">${progress}</div>
        </div>
        <div class="focus-go">Continue \u2192</div>
      </div>
      <button class="switch-instrument" data-action="switch-instrument">Switch instrument</button>
    </div>`;
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve(true);
  } catch (e) {
    return Promise.resolve(false);
  }
}

// ── RENDER: PRACTICE (SPRINTS) ─────────────────────────────────────────────
// A compact read-out of the notes a student gets wrong most often. Drills
// already favour these notes, so the panel explains why the questions repeat.
function renderWeakSpots(instrumentId) {
  const now = Date.now();
  const attempted = getLearnedNotes(instrumentId)
    .map(l => ({ lesson: l, ...getNoteAccuracy(instrumentId, l.id) }))
    .filter(w => w.attempts > 0)
    .map(w => ({ ...w, weakness: noteWeakness(instrumentId, w.lesson.id, now) }))
    .sort((a, b) => b.weakness - a.weakness)
    .slice(0, 3);
  if (!attempted.length) return '';
  const rows = attempted.map(w => {
    const pct = Math.round((w.accuracy || 0) * 100);
    return `
      <div class="weak-row">
        <div class="weak-name">${escapeHtml(t(w.lesson.noteName))}</div>
        <div class="weak-bar"><div class="weak-bar-fill" style="width:${pct}%"></div></div>
        <div class="weak-pct">${pct}%</div>
      </div>`;
  }).join('');
  return `
    <div class="weak-card">
      <div class="weak-title">Focus areas</div>
      <div class="weak-sub">Your drills will favour the notes you miss most.</div>
      ${rows}
    </div>`;
}

function renderPracticeTools() {
  return `
    <div class="tools-grid">
      <button class="tool-card" data-action="tools-tab" data-tab="metronome">
        <div class="tool-icon">\u{1F3B5}</div>
        <div class="tool-name">Metronome / Tuner</div>
        <div class="tool-sub">Open the floating metronome and tuner.</div>
      </button>
      <button class="tool-card" data-action="tools-tab" data-tab="tuner">
        <div class="tool-icon">\u{1F3A4}</div>
        <div class="tool-name">Tuner</div>
        <div class="tool-sub">Check your pitch against the floating tuner.</div>
      </button>
      <button class="tool-card" data-action="open-lookup">
        <div class="tool-icon">\u{1F3BC}</div>
        <div class="tool-name">Fingering chart</div>
        <div class="tool-sub">Look up any note's fingering and sound.</div>
      </button>
    </div>`;
}

function renderPracticeScreen() {
  const inst = getInstrument(APP.instrumentId);
  if (APP.sprint) return renderSprintView(inst);

  const learned = getLearnedNotes(APP.instrumentId);
  const ready = learned.length >= 2;
  const modes = [
    { mode: SPRINT_MODES.SIGHT, title: 'Sight-reading', sub: 'See a note on the staff, name it fast.' },
    { mode: SPRINT_MODES.FINGER, title: 'Finger gym', sub: 'See a note name, match its fingering fast.' },
  ];
  const cards = modes.map(m => {
    const best = getSprintBest(APP.instrumentId, m.mode);
    return `
      <button class="sprint-card" data-action="start-sprint" data-mode="${m.mode}" ${ready ? '' : 'disabled'}>
        <div class="sprint-card-title">${m.title}</div>
        <div class="sprint-card-sub">${m.sub}</div>
        <div class="sprint-card-best">${best ? `Best: ${best}` : 'No score yet'}</div>
      </button>`;
  }).join('');

  return `
    <div class="screen active practice-screen">
      <div class="app-header">
        <button class="header-back" data-action="close-practice">\u2190</button>
        <div class="header-title">Practice \u00b7 ${inst.shortName}</div>
      </div>
      <div class="lesson-body">
        <div class="practice-intro">${ready
          ? `${SPRINT_SECONDS} seconds. How many can you get?`
          : 'Finish a couple of lessons to unlock the timed drills.'}</div>
        <div class="sprint-cards">${cards}</div>
        ${renderWeakSpots(APP.instrumentId)}
        ${renderPracticeTools()}
      </div>
    </div>`;
}

function renderSprintView(inst) {
  const s = APP.sprint;
  if (s.finished) {
    const best = getSprintBest(APP.instrumentId, s.mode);
    const title = s.mode === SPRINT_MODES.SIGHT ? 'Sight-reading' : 'Finger gym';
    return `
      <div class="screen active practice-screen">
        <div class="app-header">
          <button class="header-back" data-action="exit-sprint">\u2715</button>
          <div class="header-title">${title}</div>
        </div>
        <div class="complete-layout">
          <div class="sprint-result-score">${s.score}</div>
          <div class="complete-sub">correct in ${SPRINT_SECONDS} seconds</div>
          ${s.isBest ? `<div class="sprint-best-badge">New best!</div>` : `<div class="sprint-result-best">Best: ${best}</div>`}
          <div class="complete-xp">+${s.xp} XP</div>
          <div class="gap-lg"></div>
          <button class="btn btn-primary btn-wide" data-action="sprint-again">Play again</button>
          <div class="gap-sm"></div>
          <button class="btn btn-secondary btn-wide" data-action="exit-sprint">Done</button>
        </div>
      </div>`;
  }

  const q = s.question;
  const promptHtml = q.mode === SPRINT_MODES.SIGHT
    ? `<div class="quiz-prompt-svg">${Graphics.staffSVG({ pos: q.prompt.staffStep, accidental: q.prompt.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 100 })}</div>`
    : `<div class="quiz-prompt-note">${escapeHtml(t(q.prompt.noteName))}</div>`;

  const optionsHtml = q.options.map(opt => {
    let cls = 'quiz-option';
    if (opt.id === q.wrongId) cls += ' selected-wrong';
    let content;
    if (q.mode === SPRINT_MODES.SIGHT) {
      cls += ' text-only';
      content = `<div class="quiz-option-note">${escapeHtml(t(opt.noteName))}</div>`;
    } else {
      content = `<div class="quiz-option-svg">${Graphics.fingeringSVG(inst.fingeringType, opt.fingeringState, inst.accentColor, 72)}</div>`;
    }
    return `<div class="${cls}" data-action="sprint-answer" data-id="${opt.id}">${content}</div>`;
  }).join('');

  const remain = Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));
  return `
    <div class="screen active practice-screen sprint-screen">
      <div class="app-header">
        <button class="header-back" data-action="exit-sprint">\u2715</button>
        <div class="sprint-hud">
          <div class="sprint-timer" id="sprint-timer">${remain}</div>
          <div class="sprint-score">Score <b id="sprint-score">${s.score}</b></div>
        </div>
      </div>
      <div class="lesson-body">
        <div class="lesson-instruction">${q.mode === SPRINT_MODES.SIGHT ? 'Which note is this?' : 'Which fingering plays this note?'}</div>
        <div class="quiz-prompt">${promptHtml}</div>
        <div class="quiz-options sprint-options">${optionsHtml}</div>
      </div>
    </div>`;
}

function startSprintTimer() {
  clearInterval(APP.sprintTimer);
  APP.sprintTimer = setInterval(() => {
    const s = APP.sprint;
    if (!s || s.finished) { clearInterval(APP.sprintTimer); APP.sprintTimer = null; return; }
    const remain = Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));
    const el = document.getElementById('sprint-timer');
    if (el) el.textContent = remain;
    if (remain <= 0) finishSprint();
  }, 250);
}

function buildSprintQuestion(instrumentId, mode) {
  const learned = getLearnedNotes(instrumentId);
  const prompt = pickWeightedNote(instrumentId, learned) || learned[0];
  const distractors = shuffle(learned.filter(l => l.id !== prompt.id)).slice(0, 3);
  return {
    mode,
    prompt,
    options: shuffle([prompt, ...distractors]),
    correctId: prompt.id,
    wrongId: null,
  };
}

function startSprint(mode) {
  const learned = getLearnedNotes(APP.instrumentId);
  if (learned.length < 2) { showToast('Learn a couple of notes first.'); return; }
  APP.sprint = {
    mode,
    endsAt: Date.now() + SPRINT_SECONDS * 1000,
    score: 0,
    finished: false,
    isBest: false,
    xp: 0,
    question: buildSprintQuestion(APP.instrumentId, mode),
  };
  startSprintTimer();
  render();
}

function finishSprint() {
  clearInterval(APP.sprintTimer);
  APP.sprintTimer = null;
  const s = APP.sprint;
  if (!s || s.finished) return;
  s.finished = true;
  s.isBest = setSprintBest(APP.instrumentId, s.mode, s.score);
  s.xp = s.score * 2;
  if (s.xp > 0) {
    const prog = getInstrumentProgress(APP.instrumentId);
    prog.xp += s.xp;
    saveProgress();
  }
  markPlanItemDone(APP.instrumentId, 'sprint', s.mode);
  evaluateBadges({ toast: true });
  render();
}

// ── RENDER: PRACTICE REPORT ────────────────────────────────────────────────
// A printable, shareable summary of everything the student has done, in the
// style of a music teacher's practice report.
function buildPracticeReport(name, now = new Date()) {
  const instruments = INSTRUMENT_ORDER
    .map(id => getInstrumentReport(id))
    .filter(r => r.notesLearned > 0 || r.songsCompleted > 0 || r.xp > 0);
  const badgeNames = BADGES.filter(b => hasBadge(b.id)).map(b => b.name);
  return {
    student: name || 'Student',
    date: todayKey(now),
    level: getLevel(),
    avatar: getAvatar(),
    xp: getTotalXp(),
    streak: getCurrentStreak(now),
    totalMinutes: Math.round(getTotalPracticeSeconds() / 60),
    notesLearned: instruments.reduce((a, r) => a + r.notesLearned, 0),
    songsCompleted: instruments.reduce((a, r) => a + r.songsCompleted, 0),
    badges: badgeNames,
    badgeTotal: BADGES.length,
    instruments,
  };
}

// Plain-text version for the clipboard / email.
function formatReportText(report) {
  const lines = [];
  lines.push(`Practice report \u2014 ${report.student}`);
  lines.push(report.date);
  lines.push('');
  lines.push(`Level ${report.level} \u00b7 ${report.xp} XP \u00b7 ${report.streak}-day streak \u00b7 ${report.totalMinutes} min practiced`);
  lines.push(`Badges: ${report.badges.length}/${report.badgeTotal}${report.badges.length ? ' \u2014 ' + report.badges.join(', ') : ''}`);
  lines.push('');
  if (!report.instruments.length) {
    lines.push('No practice recorded yet.');
  } else {
    report.instruments.forEach(r => {
      lines.push(`${r.name}: ${r.notesLearned}/${r.notesTotal} notes \u00b7 ${r.songsCompleted}/${r.songsTotal} songs \u00b7 ${r.xp} XP`);
      lines.push(`  Mastery: ${r.mastery.mastered} mastered, ${r.mastery.practiced} practiced, ${r.mastery.learning} learning`);
      if (r.weak.length) {
        lines.push(`  Focus: ${r.weak.map(w => w.name + ' (' + w.accuracy + '%)').join(', ')}`);
      }
    });
  }
  return lines.join('\n');
}

function renderReportScreen() {
  const report = buildPracticeReport(getStudentName());
  const statChips = `
    <div class="report-stats">
      <div class="report-stat"><b>${report.level}</b><span>Level</span></div>
      <div class="report-stat"><b>${report.xp}</b><span>XP</span></div>
      <div class="report-stat"><b>${report.streak}</b><span>Day streak</span></div>
      <div class="report-stat"><b>${report.totalMinutes}</b><span>Minutes</span></div>
    </div>`;

  const cards = report.instruments.map(r => {
    const pct = r.notesTotal ? Math.round((r.notesLearned / r.notesTotal) * 100) : 0;
    const weak = r.weak.length
      ? `<div class="report-focus">Focus: ${r.weak.map(w => `${escapeHtml(w.name)} (${w.accuracy}%)`).join(', ')}</div>`
      : '';
    return `
      <div class="report-card">
        <div class="report-card-head">
          <div class="report-card-name">${escapeHtml(r.name)}</div>
          <div class="report-card-xp">${r.xp} XP</div>
        </div>
        <div class="report-bar-track"><div class="report-bar-fill" style="width:${pct}%"></div></div>
        <div class="report-card-line">${r.notesLearned}/${r.notesTotal} notes \u00b7 ${r.songsCompleted}/${r.songsTotal} songs</div>
        <div class="report-mastery">
          <span class="report-mastered">${r.mastery.mastered} mastered</span>
          <span class="report-practiced">${r.mastery.practiced} practiced</span>
          <span class="report-learning">${r.mastery.learning} learning</span>
        </div>
        ${weak}
      </div>`;
  }).join('') || '<div class="report-empty">No practice recorded yet \u2014 play a lesson to start the report.</div>';

  const badges = report.badges.length
    ? report.badges.map(b => `<span class="report-badge">${escapeHtml(b)}</span>`).join('')
    : '<span class="report-badge-empty">No badges yet</span>';

  return `
    <div class="screen active report-screen">
      <div class="app-header">
        <button class="header-back" data-action="close-report">\u2190</button>
        <div class="header-title">Practice report</div>
      </div>
      <div class="lesson-body">
        <div class="report-hero">
          <div class="report-avatar">${report.avatar}</div>
          <div>
            <div class="report-name">${escapeHtml(report.student)}</div>
            <div class="report-date">${report.date}</div>
          </div>
        </div>
        ${statChips}
        <div class="report-section-label">Instruments</div>
        ${cards}
        <div class="report-section-label">Badges \u00b7 ${report.badges.length}/${report.badgeTotal}</div>
        <div class="report-badges">${badges}</div>
        <div class="report-actions">
          <button class="btn btn-primary" data-action="copy-report">Copy summary</button>
          <button class="btn btn-secondary" data-action="print-report">Print</button>
        </div>
      </div>
    </div>`;
}

function renderSelectScreen() {
  const savedId = getSavedInstrument();
  const savedInst = savedId && CURRICULUM[savedId] && CURRICULUM[savedId].available
    ? CURRICULUM[savedId]
    : null;
  const picking = APP.pickingInstrument || !savedInst;

  const studentName = getStudentName();
  const motivationHtml = studentName ? renderStudentCard(studentName) : '';
  const badgesHtml = studentName ? renderBadgeShelf() : '';
  const reportHtml = studentName
    ? `<button class="btn btn-secondary report-open" data-action="open-report">\u{1F4CB} Progress report</button>`
    : '';

  let headline;
  let sub;
  let instrumentArea;
  if (picking) {
    headline = t('First notes, first wins.');
    sub = t('Pick a recorder to start your very first lessons — fingerings, notes, and your first sounds.');
    instrumentArea = `
      ${savedInst ? `<button class="picker-back" data-action="cancel-instrument-pick">\u2190 Back to ${savedInst.shortName}</button>` : ''}
      ${renderInstrumentGrid()}`;
  } else {
    headline = studentName ? `Ready, ${escapeHtml(studentName)}?` : 'Ready to play?';
    sub = t(`You're set up on ${savedInst.shortName}. Pick up where you left off.`);
    instrumentArea = renderFocusCard(savedInst);
  }

  return `
    <div class="screen active select-screen">
      <div class="select-hero">
        <div class="wordmark">
          <svg class="wordmark-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="10" cy="24" rx="6" ry="4.5" fill="#FF8C42" transform="rotate(-20 10 24)"/>
            <line x1="15" y1="22" x2="15" y2="5" stroke="#FF8C42" stroke-width="2.4"/>
            <path d="M15 5 Q24 6 24 14" stroke="#FF8C42" stroke-width="2.4" fill="none"/>
          </svg>
          <span class="wordmark-text">Preludio <span>Recorder</span></span>
        </div>
        <div class="select-headline">${headline}</div>
        <div class="select-sub">${sub}</div>
      </div>
      <div class="select-hero-settings">
        <button class="theme-toggle" data-action="toggle-language" title="Language">${getLang() === 'pt' ? 'PT' : 'EN'}</button>
        <button class="theme-toggle" data-action="toggle-theme" title="Switch to ${getTheme() === 'light' ? 'dark' : 'light'} theme">${getTheme() === 'light' ? '\u{1F319}' : '\u2600\uFE0F'}</button>
        <button class="theme-toggle settings-gear" data-action="open-settings" title="Settings">\u{2699}\u{FE0F}</button>
      </div>
      ${motivationHtml}
      ${reportHtml}
      ${instrumentArea}
      ${badgesHtml}
      <div class="version-badge" data-action="show-analytics" style="cursor:pointer">v${VERSION}</div>
    </div>`;
}

// ── RENDER: SETTINGS SCREEN ────────────────────────────────────────────────
function renderSettingsScreen() {
  const name = getStudentName();
  return `
    <div class="screen active settings-screen">
      <div class="settings-header">
        <button class="btn-icon" data-action="close-settings" style="background:none;border:none;cursor:pointer;font-size:24px;">←</button>
        <h2>Settings</h2>
      </div>
      <div class="settings-body">
        <div class="settings-section">
          <label class="settings-label">Student name</label>
          <div class="settings-row">
            <input type="text" id="settings-name-input" class="settings-input" value="${escapeHtml(name)}" maxlength="50" autocomplete="off" />
            <button class="btn btn-primary" data-action="save-settings-name">Save</button>
          </div>
        </div>
        <div class="settings-section">
          <label class="settings-label">Reset progress</label>
          <p class="settings-desc">Clear all lesson progress and XP for all instruments. This cannot be undone.</p>
          <button class="btn btn-danger" data-action="reset-progress">Reset all progress</button>
        </div>
      </div>
    </div>`;
}

// ── RENDER: ANALYTICS SCREEN ────────────────────────────────────────────────
function renderAnalyticsScreen() {
  const events = getAnalyticsEvents();
  const totalXp = events.reduce((s, e) => s + (e.xpGained || 0), 0);
  const lessonCount = events.length;
  const streak = { count: getCurrentStreak() };

  const byInstrument = {};
  events.forEach(e => {
    const inst = e.instrumentId || 'unknown';
    if (!byInstrument[inst]) byInstrument[inst] = { lessons: 0, xp: 0 };
    byInstrument[inst].lessons++;
    byInstrument[inst].xp += e.xpGained || 0;
  });

  const instrumentRows = Object.entries(byInstrument).map(([id, data]) => {
    const name = CURRICULUM[id]?.shortName || id;
    return `<div class="stat-row"><span class="stat-label">${escapeHtml(name)}</span><span class="stat-value">${data.lessons} lessons · ${data.xp} XP</span></div>`;
  }).join('');

  const recentEvents = events.slice(-20).reverse().map(e => {
    const date = new Date(e.timestamp);
    const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const typeLabel = { lesson: 'Lesson', review: 'Review', song: 'Song' }[e.type] || e.type;
    const inst = CURRICULUM[e.instrumentId]?.shortName || e.instrumentId || '';
    return `<div class="event-row"><span class="event-type">${typeLabel}</span><span class="event-lesson">${e.lessonId || ''}</span><span class="event-xp">+${e.xpGained || 0} XP</span><span class="event-date">${timeStr}</span></div>`;
  }).join('') || '<div class="stat-row" style="color:var(--text-muted)">No activity yet — complete a lesson!</div>';

  const starCount = events.filter(e => e.stars === 3).length;
  const pct = lessonCount ? Math.round((starCount / lessonCount) * 100) : 0;

  return `
    <div class="screen active analytics-screen">
      <div class="analytics-header">
        <button class="header-back" data-action="close-analytics">←</button>
        <h2>Your Stats</h2>
      </div>
      <div class="analytics-body">
        <div class="analytics-cards">
          <div class="analytics-card"><span class="card-stat">${totalXp}</span><span class="card-label">Total XP</span></div>
          <div class="analytics-card"><span class="card-stat">${lessonCount}</span><span class="card-label">Lessons done</span></div>
          <div class="analytics-card"><span class="card-stat">${streak.count}</span><span class="card-label">Day streak</span></div>
          <div class="analytics-card"><span class="card-stat">${pct}%</span><span class="card-label">3-star rate</span></div>
        </div>
        <div class="analytics-section">
          <div class="analytics-section-title">Per instrument</div>
          <div class="stats-list">${instrumentRows}</div>
        </div>
        <div class="analytics-section">
          <div class="analytics-section-title">Recent activity</div>
          <div class="events-list">${recentEvents}</div>
          <button class="btn btn-danger" data-action="clear-analytics" style="margin-top:16px">Clear analytics data</button>
        </div>
      </div>
    </div>`;
}

// ── RENDER: REFERENCE OVERLAY ──────────────────────────────────────────────
function renderReferenceOverlay() {
  const inst = getInstrument(APP.instrumentId);
  const lesson = getLesson(APP.instrumentId, APP.referenceLessonIndex);
  if (!lesson) return '';
  const fingeringSvg = Graphics.fingeringSVG(inst.fingeringType, lesson.fingeringState, inst.accentColor, 120);
  const staffSvg = Graphics.staffSVG({ pos: lesson.staffStep, accidental: lesson.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 120 });
  return `
    <div class="screen active reference-overlay" id="reference-overlay">
      <div class="reference-content">
        <div class="reference-header">
          <span class="reference-note-name">${escapeHtml(t(lesson.noteName))}</span>
          <button class="btn-icon" data-action="close-reference" style="background:none;border:none;cursor:pointer;font-size:24px;">✕</button>
        </div>
        <div class="reference-diagrams">
          <div class="reference-diagram">
            <div class="reference-diagram-label">Fingering</div>
            <div class="reference-diagram-svg">${fingeringSvg}</div>
          </div>
          <div class="reference-diagram">
            <div class="reference-diagram-label">On the staff</div>
            <div class="reference-diagram-svg">${staffSvg}</div>
          </div>
        </div>
        <div class="reference-description">${escapeHtml(t(lesson.description))}</div>
        <div class="reference-prompt">${escapeHtml(t(lesson.prompt))}</div>
      </div>
    </div>`;
}

// ── RENDER: MAP SCREEN ─────────────────────────────────────────────────────
// ── RENDER: QUICK TOUR ─────────────────────────────────────────────────────
// A short, skippable walkthrough shown the first time a student picks an
// instrument. Slides are instrument-aware (uses the first note's fingering
// art) and can be replayed any time from the lesson map.
function buildTutorialSlides(inst) {
  const firstNote = getNoteLessons(inst.id)[0];
  const noteArt = firstNote
    ? `<div class="tutorial-visual">${Graphics.fingeringSVG(inst.fingeringType, firstNote.fingeringState, inst.accentColor, 92)}${Graphics.staffSVG({ pos: firstNote.staffStep, accidental: firstNote.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 74 })}</div>`
    : '';
  const instrumentArt = `<div class="tutorial-visual tutorial-visual-icon">${Graphics.instrumentIconSVG(inst.id, 96)}</div>`;
  return [
    {
      icon: '\u{1F389}',
      title: `You're set up on ${t(inst.name)}`,
      body: `Welcome! This is a one-minute tour of how the app works. You can skip it and replay it any time from your lesson map.`,
      visual: instrumentArt,
    },
    {
      icon: '\u{1F5FA}\uFE0F',
      title: 'Follow your lesson path',
      body: `Every note and song is a stop on your ${inst.shortName} map. Finish one step to unlock the next \u2014 a \u{1F512} just means the step before it is still waiting.`,
    },
    {
      icon: '\u{1F440}',
      title: 'See it, then check it',
      body: 'Each new note shows its name, sound, and fingering. Tap \u201CHear it,\u201D then answer a quick check to lock the note in.',
      visual: noteArt,
    },
    {
      icon: '\u{1F3B5}',
      title: 'Play it yourself',
      body: 'Then play the note on your instrument. Songs walk you through one note at a time before you take the quiz.',
    },
    {
      icon: '\u{1F94B}',
      title: 'Practice and tools',
      body: 'Finger-gym sprints build speed, and the floating metronome and tuner (bottom right) keep you steady and in tune.',
    },
    {
      icon: '\u2B50',
      title: 'Watch yourself grow',
      body: 'You earn XP, streaks, and badges as you play. Ready? Let\u2019s play!',
    },
  ];
}

function renderTutorialScreen() {
  const inst = getInstrument(APP.instrumentId) || CURRICULUM[INSTRUMENT_ORDER[0]];
  const slides = buildTutorialSlides(inst);
  const i = Math.min(Math.max(APP.tutorialIndex || 0, 0), slides.length - 1);
  const slide = slides[i];
  const last = i === slides.length - 1;
  const art = slide.visual || `<div class="tutorial-emoji">${slide.icon}</div>`;
  const dots = slides.map((_, n) => `<span class="tutorial-dot${n === i ? ' active' : ''}${n < i ? ' done' : ''}"></span>`).join('');
  return `
    <div class="screen active tutorial-screen">
      <div class="app-header">
        <button class="header-back" data-action="tutorial-finish" title="Skip the tour">\u2715</button>
        <div class="header-title">Quick tour</div>
      </div>
      <div class="tutorial-body">
        <div class="tutorial-art">${art}</div>
        <h2 class="tutorial-title">${slide.title}</h2>
        <p class="tutorial-text">${slide.body}</p>
        <div class="tutorial-dots">${dots}</div>
      </div>
      <div class="action-bar">
        <div class="tutorial-actions">
          <button class="btn btn-secondary" data-action="tutorial-back" ${i === 0 ? 'disabled' : ''}>Back</button>
          <button class="btn btn-primary" data-action="tutorial-next">${last ? 'Start playing' : 'Next'}</button>
        </div>
      </div>
    </div>`;
}

// ── RENDER: FINGERING CHART (LOOKUP) ───────────────────────────────────────
// A quick-reference chart of every note an instrument teaches. It is a lookup
// companion — the whole chart is available from the start, with learned notes
// highlighted, so it works alongside a method book.
function renderLookupScreen() {
  const inst = getInstrument(APP.instrumentId);
  const notes = getNoteLessons(APP.instrumentId);
  const learnedIds = new Set(getLearnedNotes(APP.instrumentId).map(l => l.id));

  if (!notes.length) {
    return `
      <div class="screen active lookup-screen">
        <div class="app-header">
          <button class="header-back" data-action="close-lookup">\u2190</button>
          <div class="header-title">Fingering chart \u00b7 ${inst.shortName}</div>
        </div>
        <div class="lesson-body">
          <div class="practice-intro">No notes to show yet.</div>
        </div>
      </div>`;
  }

  let selected = notes.find(l => l.id === APP.lookupId);
  if (!selected) selected = notes[0];
  APP.lookupId = selected.id;

  const bigFingering = Graphics.fingeringSVG(inst.fingeringType, selected.fingeringState, inst.accentColor, 120);
  const staffSvg = Graphics.staffSVG({ pos: selected.staffStep, accidental: selected.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 130 });

  const cards = notes.map(l => {
    const learned = learnedIds.has(l.id);
    const cls = 'lookup-card'
      + (l.id === selected.id ? ' lookup-card-active' : '')
      + (learned ? '' : ' lookup-card-locked');
    const svg = Graphics.fingeringSVG(inst.fingeringType, l.fingeringState, learned ? inst.accentColor : '#6b6b7d', 46);
    return `
      <button class="${cls}" data-action="lookup-select" data-id="${l.id}" aria-label="${escapeHtml(t(l.noteName))}">
        <div class="lookup-card-svg">${svg}</div>
        <div class="lookup-card-name">${escapeHtml(t(l.noteName))}</div>
      </button>`;
  }).join('');

  return `
    <div class="screen active lookup-screen">
      <div class="app-header">
        <button class="header-back" data-action="close-lookup">\u2190</button>
        <div class="header-title">Fingering chart \u00b7 ${inst.shortName}</div>
      </div>
      <div class="lesson-body">
        <div class="lookup-detail">
          <div class="lookup-diagrams">
            <div class="lookup-diagram">
              <div class="lookup-diagram-label">Fingering</div>
              ${bigFingering}
            </div>
            <div class="lookup-diagram">
              <div class="lookup-diagram-label">On the staff</div>
              ${staffSvg}
            </div>
          </div>
          <div class="lookup-name">${escapeHtml(t(selected.noteName))}</div>
          <div class="lookup-desc">${escapeHtml(selected.description || '')}</div>
          <button class="btn btn-secondary btn-wide" data-action="lookup-hear">\u{1F50A} Hear it</button>
        </div>
        <div class="lookup-grid-label">${learnedIds.size} of ${notes.length} notes learned</div>
        <div class="lookup-grid">${cards}</div>
      </div>
    </div>`;
}

function renderPlanCard(instrumentId) {
  const plan = getTodayPlan(instrumentId);
  if (!plan.items.length) return '';
  const done = plan.items.filter(i => i.done).length;
  const total = plan.items.length;
  const rows = plan.items.map(it => {
    let label = 'Practice';
    if (it.type === 'note') {
      const n = findLessonById(instrumentId, it.targetId);
      label = 'Review ' + (n ? t(n.noteName) : 'note');
    } else if (it.type === 'song') {
      const s = findLessonById(instrumentId, it.targetId);
      label = 'Play ' + (s ? t(s.noteName) : 'song');
    } else if (it.type === 'sprint') {
      label = (it.mode === SPRINT_MODES.FINGER ? 'Finger gym' : 'Sight-reading') + ' sprint';
    }
    const icon = it.type === 'sprint' ? '\u{26A1}' : '\u{1F3B5}';
    return `
      <div class="plan-item ${it.done ? 'plan-item-done' : ''}">
        <div class="plan-item-icon">${it.done ? '\u2713' : icon}</div>
        <div class="plan-item-text">
          <div class="plan-item-name">${escapeHtml(label)}</div>
          <div class="plan-item-reason">${escapeHtml(it.reason || '')}</div>
        </div>
        ${it.done
          ? '<div class="plan-item-tag">Done</div>'
          : `<button class="btn btn-secondary plan-item-btn" data-action="plan-start" data-item="${it.id}">Start</button>`}
      </div>`;
  }).join('');
  const allDone = done === total;
  return `
    <div class="plan-card ${allDone ? 'plan-card-done' : ''}">
      <div class="plan-header">
        <div class="plan-title">Today\u2019s Plan</div>
        <div class="plan-count">${done}/${total}</div>
      </div>
      <div class="plan-items">${rows}</div>
      ${allDone ? '<div class="plan-done-note">\u{1F389} All done \u2014 nice work!</div>' : ''}
    </div>`;
}

// ── RENDER: FIRST SOUND ────────────────────────────────────────────────────\u2500\u2500\u2500\u2500
function renderFirstSoundScreen() {
  const inst = getInstrument(APP.instrumentId);
  const content = FIRST_SOUND_CONTENT.recorder;
  const seen = getFirstSoundSeen(APP.instrumentId);
  const firstNote = getNoteLessons(APP.instrumentId)[0];
  const steps = content.steps.map((step, i) => `
    <li class="first-sound-step">
      <span class="first-sound-step-num">${i + 1}</span>
      <span class="first-sound-step-text">${escapeHtml(step)}</span>
    </li>`).join('');
  const hearBtn = firstNote
    ? `<button class="btn btn-secondary btn-wide" data-action="first-sound-hear" style="margin-top:4px">\u{1F50A} Hear a target note</button>`
    : '';

  return `
    <div class="screen active first-sound-screen">
      <div class="app-header">
        <button class="header-back" data-action="close-first-sound">\u2190</button>
        <div class="header-title">First sound \u00b7 ${inst.shortName}</div>
      </div>
      <div class="lesson-body">
        <div class="first-sound-hero">${content.emoji}</div>
        <div class="first-sound-title">${escapeHtml(content.title)}</div>
        <div class="first-sound-intro">${escapeHtml(content.intro)}</div>
        <ol class="first-sound-steps">${steps}</ol>
        <div class="first-sound-tip"><strong>Tip</strong> ${escapeHtml(content.tip)}</div>
        ${hearBtn}
        <div class="action-bar">
          <button class="btn btn-primary btn-wide" data-action="first-sound-done">${seen ? 'Back to my path' : 'Got it \u2014 let\u2019s play!'}</button>
        </div>
      </div>
    </div>`;
}

function renderMapScreen() {
  const inst = getInstrument(APP.instrumentId);
  const prog = getInstrumentProgress(APP.instrumentId);
  const total = inst.lessons.length;
  const doneCount = inst.lessons.filter(l => prog.completed[l.id]).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const learnedCount = getLearnedNotes(APP.instrumentId).length;
  const practiceReady = learnedCount >= 2;
  const bestSight = getSprintBest(APP.instrumentId, SPRINT_MODES.SIGHT);
  const bestFinger = getSprintBest(APP.instrumentId, SPRINT_MODES.FINGER);
  const bestLine = practiceReady && (bestSight || bestFinger)
    ? `<div class="practice-banner-best">Best: ${bestSight} names · ${bestFinger} fingerings</div>`
    : '';

  const nodes = inst.lessons.map((lesson, i) => {
    const unlocked = isLessonUnlocked(APP.instrumentId, i);
    const completed = !!prog.completed[lesson.id];
    const isReview = isReviewLesson(lesson);

    let stateCls = 'locked';
    let inner = `<span class="map-node-lock">\u{1F512}</span>`;
    let masteryHtml = '';
    let label = t(lesson.noteName);

    if (isReview && unlocked && completed) {
      stateCls = 'review-done';
      inner = `<span class="map-node-icon">⟳</span>`;
    } else if (isReview && unlocked && !completed) {
      stateCls = 'review-available';
      inner = `<span class="map-node-icon">⟳</span>`;
    } else if (completed) {
      stateCls = 'done';
      const stars = prog.completed[lesson.id].stars;
      const mastery = getNoteMastery(APP.instrumentId, lesson.id);
      const masteryLevel = getMasteryLevel(mastery);
      inner = `<span class="map-node-note">${escapeHtml(t(lesson.noteName))}</span><span class="map-node-star">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`;
      masteryHtml = `<div class="map-node-mastery mastery-${masteryLevel}">${getMasteryLabel(masteryLevel)}</div>`;
    } else if (unlocked && !completed) {
      stateCls = 'current';
      inner = `<span class="map-node-note">${escapeHtml(t(lesson.noteName))}</span>`;
    } else if (unlocked) {
      stateCls = 'available';
      inner = `<span class="map-node-note">${escapeHtml(t(lesson.noteName))}</span>`;
    }

    const connector = i === 0 ? '' : `<div class="map-connector ${prog.completed[inst.lessons[i-1].id] ? 'done' : ''}"></div>`;
    const action = unlocked ? `data-action="open-lesson" data-index="${i}"` : `data-action="locked-node"`;

    const refIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const refBtn = unlocked && !isReview && !isSongLesson(lesson)
      ? `<button class="map-ref-btn" data-action="open-reference" data-index="${i}" title="View reference">${refIcon}</button>`
      : '';

    return `
      <div class="map-node-wrap">
        ${connector}
        <div class="map-node ${stateCls}" ${action}>${inner}</div>
        <div class="map-node-label">${label}${refBtn}</div>
        ${masteryHtml}
      </div>`;
  }).join('');

  return `
    <div class="screen active">
      <div class="app-header">
        <button class="header-back" data-action="go-select">←</button>
        <div class="header-title">${inst.shortName}</div>
        <div class="header-progress">
          <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
          <div class="progress-label">${doneCount}/${total}</div>
        </div>
      </div>
      <div class="map-body">
        ${renderPlanCard(APP.instrumentId)}
        <div class="first-sound-cta${getFirstSoundSeen(APP.instrumentId) ? ' first-sound-cta-seen' : ''}" data-action="open-first-sound">
          <div class="first-sound-cta-emoji">${FIRST_SOUND_CONTENT.recorder.emoji}</div>
          <div class="first-sound-cta-text">
            <div class="first-sound-cta-title">${getFirstSoundSeen(APP.instrumentId) ? 'Warm up your sound' : 'New here? Make your first sound'}</div>
            <div class="first-sound-cta-sub">${getFirstSoundSeen(APP.instrumentId) ? 'Breathing and tone reminders before you play.' : 'A quick guide to your first sound, before note one.'}</div>
          </div>
          <div class="first-sound-cta-arrow">›</div>
        </div>
        <div class="practice-banner ${practiceReady ? '' : 'practice-banner-locked'}">
          <div class="practice-banner-text">
            <div class="practice-banner-title">Practice drills</div>
            <div class="practice-banner-sub">${practiceReady ? 'Timed games to build speed and confidence.' : 'Learn 2 notes to unlock timed drills.'}</div>
            ${bestLine}
          </div>
          <button class="btn btn-primary" data-action="open-practice" ${practiceReady ? '' : 'disabled'}>Practice</button>
        </div>
        <div class="map-unit-label">Unit 1 · First Notes</div>
        <div class="map-path">${nodes}</div>
        <div class="map-guide">
          <button class="map-guide-link" data-action="open-lookup">🎼 Fingering chart</button>
          <button class="map-guide-link" data-action="open-tutorial">❔ How this app works</button>
        </div>
        ${doneCount > 0 ? `<button class="btn btn-secondary game-launch-btn" data-action="open-game" style="margin-top:20px;width:100%">🎯 Sight Reading Challenge</button>` : ''}
      </div>
    </div>`;
}

// ── RENDER: LESSON SCREEN ───────────────────────────────────────────────────
function phasePercent(phase) {
  return { present: 20, quiz: 50, play: 78, complete: 100 }[phase] || 20;
}

function renderLessonScreen() {
  const inst = getInstrument(APP.instrumentId);
  const lesson = getLesson(APP.instrumentId, APP.lessonIndex);
  const isReview = isReviewLesson(lesson);

  const isSong = isSongLesson(lesson);

  // The mic belongs to the play phase alone. Whenever the lesson moves on, or
  // the screen is drawn for anything but play, the capture is released so the
  // browser's recording indicator never lingers.
  if (APP.phase !== 'play') {
    if (APP.recorder || APP.recordingUrl) cleanupRecording();
  }

  let body = '';
  if (isReview && APP.phase === 'present') {
    APP.phase = 'quiz';
  }
  if (isSong && APP.phase === 'present') {
    body = renderSongPresentPhase(inst, lesson);
  } else if (APP.phase === 'present') body = renderPresentPhase(inst, lesson);
  else if (APP.phase === 'quiz') body = renderQuizPhase(inst, lesson);
  else if (APP.phase === 'play') body = renderPlayPhase(inst, lesson);
  else if (APP.phase === 'complete') body = renderCompletePhase(inst, lesson);

  const showHeader = APP.phase !== 'complete';
  const header = showHeader ? `
      <div class="app-header">
        <button class="header-back" data-action="exit-lesson">✕</button>
        <div class="header-progress" style="margin-left:0; flex:1;">
          <div class="progress-bar-track" style="flex:1; width:auto;"><div class="progress-bar-fill" style="width:${phasePercent(APP.phase)}%"></div></div>
        </div>
      </div>` : '';

  return `<div class="screen active lesson-screen">${header}${body}</div>`;
}

function renderPresentPhase(inst, lesson) {
  const fingeringSvg = Graphics.fingeringSVG(inst.fingeringType, lesson.fingeringState, inst.accentColor, 84);
  const staffSvg = Graphics.staffSVG({ pos: lesson.staffStep, accidental: lesson.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 96 });
  const transposeNote = inst.isTransposing && lesson.concertNote
    ? `<div class="note-description">Sounds as concert ${lesson.concertNote} (${ inst.transposeSemitones === -9 ? 'E\u266d' : inst.transposeSemitones === -7 ? 'F' : 'B\u266d' } instrument).</div>` : '';

  const mastery = getNoteMastery(APP.instrumentId, lesson.id);
  const masteryLevel = getMasteryLevel(mastery);
  const masteryColor = getMasteryColor(masteryLevel);
  const isReview = !!APP.progress[APP.instrumentId]?.completed[lesson.id];
  const reviewLabel = isReview ? `<div style="font-size:12px;font-weight:600;color:${masteryColor};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">${getMasteryLabel(masteryLevel)}</div>` : '';

  return `
    <div class="lesson-body">
      <div class="lesson-instruction">${isReview ? 'Review this note' : 'Meet your next note'}</div>
      ${reviewLabel}
      <div class="present-layout">
        <div class="present-diagram-wrap">
          <div class="present-diagram-label">Fingering</div>
          <div class="present-diagram-svg">${fingeringSvg}</div>
        </div>
        <div class="present-notation-wrap">
          <div class="present-diagram-label">On the staff</div>
          <div class="present-diagram-svg">${staffSvg}</div>
        </div>
      </div>
      <div class="note-name-block">
        <span class="note-name-big">${escapeHtml(t(lesson.noteName))}</span>
      </div>
      <div class="note-description">${escapeHtml(t(lesson.description))}</div>
      ${transposeNote}
      <div class="gap-md"></div>
      <div class="note-prompt">${escapeHtml(t(lesson.prompt))}</div>
      <div class="gap-lg"></div>
      <button class="btn-hear" data-action="hear-note"><span class="hear-icon">🔊</span> Hear it</button>
    </div>
    <div class="action-bar">
      <button class="btn btn-primary btn-wide" data-action="goto-quiz">Continue</button>
    </div>`;
}

// The practice-speed readout shared by the +/- buttons. Shows the percentage
// and the resulting song tempo so the student can see both.
function songSpeedLabelText(speed) {
  return Math.round(speed * 100) + '% (' + Math.round(100 * speed) + ' BPM)';
}
function renderSongSpeedControl(disabled) {
  return `
    <div class="song-speed-control">
      <button class="btn-speed" data-action="song-speed-down" aria-label="Slower" ${disabled || APP.songSpeed <= SPEED_MIN ? 'disabled' : ''}>\u2212</button>
      <span class="song-speed-label">${songSpeedLabelText(APP.songSpeed)}</span>
      <button class="btn-speed" data-action="song-speed-up" aria-label="Faster" ${disabled || APP.songSpeed >= SPEED_MAX ? 'disabled' : ''}>+</button>
    </div>`;
}
// Update only the label text in place (used while accompaniment is playing, so
// we don't tear down the live audio source with a full re-render).
function updateSongSpeedLabels() {
  const text = songSpeedLabelText(APP.songSpeed);
  document.querySelectorAll('.song-speed-label').forEach(lbl => { lbl.textContent = text; });
  document.querySelectorAll('[data-action="song-speed-down"]').forEach(b => { b.disabled = APP.songSpeed <= SPEED_MIN; });
  document.querySelectorAll('[data-action="song-speed-up"]').forEach(b => { b.disabled = APP.songSpeed >= SPEED_MAX; });
}

function renderSongPresentPhase(inst, lesson) {
  const totalNotes = lesson.noteIds.length;
  APP.songNoteIndex = Math.min(Math.max(APP.songNoteIndex, 0), totalNotes - 1);
  const note = getResolvedSongNote(APP.instrumentId, lesson);
  const currentNum = APP.songNoteIndex + 1;
  const isFirst = APP.songNoteIndex === 0;
  const isLast = APP.songNoteIndex >= totalNotes - 1;
  const playback = APP.songPlayback || { active: false, finished: false };

  const fingeringSvg = Graphics.fingeringSVG(inst.fingeringType, note.fingeringState, inst.accentColor, 84);
  const staffSvg = Graphics.staffSVG({ pos: note.staffStep, accidental: note.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 96 });

  const melodyNotes = [];
  let highlightIndex = -1;
  const durMap = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
  const songDurations = Array.isArray(lesson.durations) ? lesson.durations : [];
  lesson.noteIds.forEach((id, i) => {
    const n = findLessonById(APP.instrumentId, id);
    if (!n || typeof n.staffStep !== 'number') return;
    if (i === APP.songNoteIndex) highlightIndex = melodyNotes.length;
    const d = songDurations[i];
    const duration = typeof d === 'number' ? d : (durMap[d] || 1);
    melodyNotes.push({ pos: n.staffStep, accidental: n.accidental, duration });
  });
  const melodySvg = melodyNotes.length
    ? Graphics.melodySVG({ notes: melodyNotes, highlightIndex, clef: inst.clef, accentColor: inst.accentColor, width: 320 })
    : '';

  const playLabel = playback.finished ? '\u21BB Replay' : '\u25B6 Play whole melody';
  const playAction = playback.finished ? 'song-replay' : 'song-play';

  return `
    <div class="lesson-body">
      <div class="lesson-instruction">${escapeHtml(t(lesson.noteName))}</div>
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:16px">Note ${currentNum} of ${totalNotes}</div>
      ${melodySvg ? `<div class="song-melody-wrap">
        <div class="present-diagram-label">Sheet music</div>
        <div class="song-melody-svg">${melodySvg}</div>
      </div>` : ''}
      <div class="present-layout">
        <div class="present-diagram-wrap">
          <div class="present-diagram-label">Fingering</div>
          <div class="present-diagram-svg">${fingeringSvg}</div>
        </div>
        <div class="present-notation-wrap">
          <div class="present-diagram-label">On the staff</div>
          <div class="present-diagram-svg">${staffSvg}</div>
        </div>
      </div>
      <div class="note-name-block">
        <span class="note-name-big">${escapeHtml(t(note.noteName))}</span>
      </div>
      <div class="gap-md"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-secondary" data-action="song-prev" ${isFirst ? 'disabled' : ''}>\u2039 Prev</button>
        <button class="btn-hear" data-action="hear-note"><span class="hear-icon">\u{1F50A}</span> Play note</button>
        <button class="btn btn-secondary" data-action="song-next" ${isLast ? 'disabled' : ''}>Next \u203A</button>
      </div>
      <div class="song-playback-controls">
        <button class="btn btn-secondary" data-action="${playAction}" ${playback.active ? 'disabled' : ''}>${playLabel}</button>
        ${renderSongSpeedControl(playback.active)}
      </div>
    </div>
    <div class="action-bar">
      <button class="btn btn-primary btn-wide" data-action="goto-quiz">Continue to quiz</button>
    </div>`;
}

function buildQuizOptions(inst, lesson, forcedType) {
  const completedCount = getLearnedNotes(APP.instrumentId).length;
  const alreadyCompleted = !!getInstrumentProgress(APP.instrumentId).completed[lesson.id];

  const availableTypes = [QUIZ_TYPES.FINGERING_TO_NOTE];
  if (completedCount >= 1) availableTypes.push(QUIZ_TYPES.NOTE_TO_FINGERING);
  if (completedCount >= 2) availableTypes.push(QUIZ_TYPES.STAFF_TO_NOTE);
  if (completedCount >= 3) availableTypes.push(QUIZ_TYPES.NOTE_TO_STAFF);

  const quizType = forcedType
    ? forcedType
    : alreadyCompleted
      ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
      : QUIZ_TYPES.FINGERING_TO_NOTE;

  // Draw distractors from learned notes for spaced repetition;
  // fall back to all lessons if not enough learned notes exist.
  const learned = getLearnedNotes(APP.instrumentId).filter(l => l.id !== lesson.id);
  const pool = learned.length >= 2
    ? learned
    : inst.lessons.filter(l => l.id !== lesson.id);
  const distractors = shuffle(pool).slice(0, 2);

  return {
    quizType,
    prompt: lesson,
    options: shuffle([lesson, ...distractors]),
    correctId: lesson.id,
    answeredCorrectly: false,
    wrongIds: [],
  };
}

function buildSongQuizOptions(inst, song) {
  const uniqueNoteIds = [...new Set(song.noteIds)];
  const randomId = uniqueNoteIds[Math.floor(Math.random() * uniqueNoteIds.length)];
  const noteLesson = findLessonById(APP.instrumentId, randomId);
  return buildQuizOptions(inst, noteLesson);
}

// A mixed 3-question set per note lesson: the new note plus previously learned
// notes, rotating through question types the student has unlocked.
function buildNoteQuizQueue(inst, lesson) {
  const learned = getLearnedNotes(APP.instrumentId);
  const alreadyCompleted = learned.some(l => l.id === lesson.id);
  // Distinct notes that can be asked without repeating: the prior notes, plus
  // the new note if it has not been completed yet.
  const available = alreadyCompleted ? learned.length : learned.length + 1;
  const count = Math.min(3, available);

  const others = shuffle(learned.filter(l => l.id !== lesson.id)).slice(0, count - 1);
  const prompts = shuffle([lesson, ...others]);

  const completedCount = learned.length;
  const types = [QUIZ_TYPES.FINGERING_TO_NOTE];
  if (completedCount >= 1) types.push(QUIZ_TYPES.NOTE_TO_FINGERING);
  if (completedCount >= 2) types.push(QUIZ_TYPES.STAFF_TO_NOTE);
  if (completedCount >= 3) types.push(QUIZ_TYPES.NOTE_TO_STAFF);

  return prompts.map((note, i) => buildQuizOptions(inst, note, types[i % types.length]));
}

function getQuizQuestionText(quizType) {
  switch (quizType) {
    case QUIZ_TYPES.FINGERING_TO_NOTE:  return 'Which note does this fingering play?';
    case QUIZ_TYPES.NOTE_TO_FINGERING:  return 'Which fingering plays this note?';
    case QUIZ_TYPES.STAFF_TO_NOTE:      return 'What note is on the staff?';
    case QUIZ_TYPES.NOTE_TO_STAFF:      return 'Which staff position matches this note?';
    default:                            return 'Which one is correct?';
  }
}

function renderQuizPhase(inst, lesson) {
  if (!APP.quiz) {
    if (isSongLesson(lesson)) {
      APP.quizQueue = [buildSongQuizOptions(inst, lesson)];
    } else if (!isReviewLesson(lesson)) {
      APP.quizQueue = buildNoteQuizQueue(inst, lesson);
    }
    APP.quizIndex = 0;
    APP.quiz = APP.quizQueue[0] || null;
  }
  const q = APP.quiz;
  const isReview = isReviewLesson(lesson);

  // Review / question-queue progress indicator
  let reviewProgress = '';
  if (isReview) {
    reviewProgress = `<div class="review-progress">Note ${APP.reviewIndex + 1} of ${APP.reviewTotal}</div>`;
  } else if (APP.quizQueue && APP.quizQueue.length > 1) {
    reviewProgress = `<div class="review-progress">Question ${APP.quizIndex + 1} of ${APP.quizQueue.length}</div>`;
  }

  // ── PROMPT ──
  let promptHtml = '';
  if (q.quizType === QUIZ_TYPES.FINGERING_TO_NOTE) {
    promptHtml = `<div class="quiz-prompt-svg">${Graphics.fingeringSVG(inst.fingeringType, q.prompt.fingeringState, inst.accentColor, 100)}</div>`;
  } else if (q.quizType === QUIZ_TYPES.NOTE_TO_FINGERING) {
    promptHtml = `<div class="quiz-prompt-note">${escapeHtml(t(q.prompt.noteName))}</div>`;
  } else if (q.quizType === QUIZ_TYPES.STAFF_TO_NOTE) {
    promptHtml = `<div class="quiz-prompt-svg">${Graphics.staffSVG({ pos: q.prompt.staffStep, accidental: q.prompt.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 100 })}</div>`;
  } else if (q.quizType === QUIZ_TYPES.NOTE_TO_STAFF) {
    promptHtml = `<div class="quiz-prompt-note">${escapeHtml(t(q.prompt.noteName))}</div>`;
  }

  // ── OPTIONS ──
  const optionsHtml = q.options.map(opt => {
    const isWrongTapped = q.wrongIds.includes(opt.id);
    const isCorrectShown = q.answeredCorrectly && opt.id === q.correctId;
    const isDimmed = (q.answeredCorrectly && opt.id !== q.correctId) || (isWrongTapped && !isCorrectShown);
    let cls = 'quiz-option';
    if (isCorrectShown) cls += ' selected-correct';
    if (isWrongTapped) cls += ' selected-wrong';
    if (isDimmed) cls += ' dimmed';

    let content = '';
    if (q.quizType === QUIZ_TYPES.FINGERING_TO_NOTE) {
      cls += ' text-only';
      content = `<div class="quiz-option-note">${escapeHtml(t(opt.noteName))}</div>`;
    } else if (q.quizType === QUIZ_TYPES.NOTE_TO_FINGERING) {
      content = `<div class="quiz-option-svg">${Graphics.fingeringSVG(inst.fingeringType, opt.fingeringState, inst.accentColor, 72)}</div>`;
    } else if (q.quizType === QUIZ_TYPES.STAFF_TO_NOTE) {
      cls += ' text-only';
      content = `<div class="quiz-option-note">${escapeHtml(t(opt.noteName))}</div>`;
    } else if (q.quizType === QUIZ_TYPES.NOTE_TO_STAFF) {
      content = `<div class="quiz-option-svg">${Graphics.staffSVG({ pos: opt.staffStep, accidental: opt.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 72 })}</div>`;
    }

    return `<div class="${cls}" data-action="quiz-answer" data-id="${opt.id}">${content}</div>`;
  }).join('');

  const feedback = q.answeredCorrectly
    ? `<div class="quiz-feedback correct visible">Nice work!</div>`
    : (q.wrongIds.length > 0 ? `<div class="quiz-feedback wrong visible">Not quite — try again.</div>` : `<div class="quiz-feedback"></div>`);

  const btnLabel = isReview
    ? (APP.reviewIndex >= APP.reviewTotal - 1 ? 'See summary' : 'Next note')
    : (APP.quizQueue && APP.quizIndex < APP.quizQueue.length - 1 ? 'Next question' : 'Continue');

  return `
    <div class="lesson-body">
      ${reviewProgress}
      <div class="lesson-instruction">${getQuizQuestionText(q.quizType)}</div>
      <div class="quiz-prompt">${promptHtml}</div>
      <div class="quiz-options">${optionsHtml}</div>
      ${feedback}
    </div>
    <div class="action-bar">
      <button class="btn btn-primary btn-wide" data-action="goto-play" ${q.answeredCorrectly ? '' : 'disabled'}>${btnLabel}</button>
    </div>`;
}

function renderRecordPanel(lesson) {
  if (!canRecord()) return '';
  const recording = !!APP.recorder;
  let controls;
  let status;
  if (recording) {
    controls = `<button class="btn btn-secondary btn-wide" data-action="record-toggle">⏹ Stop recording</button>`;
    status = 'Recording — play now, then tap Stop.';
  } else if (APP.recordingUrl) {
    controls = `
      <div class="record-actions">
        <button class="btn btn-secondary" data-action="play-recording">▶ My take</button>
        <button class="btn-hear" data-action="hear-note"><span class="hear-icon">🔊</span> Model</button>
        <button class="btn btn-ghost" data-action="record-toggle">Re-record</button>
      </div>
      <button class="btn-ghost" data-action="discard-recording">Delete recording</button>`;
    status = 'Listen back, then compare with the model.';
  } else {
    controls = `
      <button class="btn btn-secondary btn-wide" data-action="record-toggle">⏺ Record yourself</button>
      <button class="btn-hear" data-action="hear-note"><span class="hear-icon">🔊</span> Hear the model</button>`;
    status = 'Record yourself and compare with the model.';
  }
  return `
    <div class="record-panel">
      <div class="record-status" id="record-status">${status}</div>
      <div class="record-controls">${controls}</div>
    </div>`;
}

function renderPlayPhase(inst, lesson) {
  const fingeringSvg = Graphics.fingeringSVG(inst.fingeringType, lesson.fingeringState, inst.accentColor, 120);
  const cells = [1, 2, 3, 4].map(n => `<div class="beat-cell count-in" data-beat="${n}"><span class="beat-num">${n}</span></div>`).join('');
  const playCell = `<div class="beat-cell" data-beat="play">♪</div>`;
  const metActive = APP.metronome ? APP.metronome.running : false;
  const metBpm = APP.metronome ? APP.metronome.bpm : 80;
  const metCls = metActive ? 'btn btn-secondary met-active' : 'btn btn-secondary';

  return `
    <div class="lesson-body">
      <div class="lesson-instruction">Play it on your instrument</div>
      <div class="play-layout">
        <div class="play-diagram-large">
          ${fingeringSvg}
          <span class="play-note-label">${escapeHtml(t(lesson.noteName))}</span>
        </div>
        <div class="beat-grid">${cells}${playCell}</div>
        <div class="play-status" id="play-status">Tap Start, then play along on the count.</div>
        <button class="btn btn-secondary" data-action="play-start" id="play-start-btn">▶ Start count-in</button>
        ${renderRecordPanel(lesson)}
      </div>
      <div class="metronome-controls">
        <button class="${metCls}" data-action="toggle-metronome">${metActive ? '⏹' : '🎵'} Metronome</button>
        <div class="bpm-control">
          <label class="bpm-label">${metBpm} BPM</label>
          <input type="range" class="bpm-slider" data-action="set-bpm" min="40" max="200" value="${metBpm}" step="1" />
        </div>
      </div>
    </div>
    <div class="action-bar">
      <button class="btn btn-success btn-wide" data-action="play-confirm" ${APP.play.hasPlayed ? '' : 'disabled'}>I played it!</button>
    </div>`;
}

function renderCompletePhase(inst, lesson) {
  const stars = APP.lastStars || 3;
  const xp = APP.lastXp || 10;
  const starsHtml = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  const isReview = isReviewLesson(lesson);

  if (isReview) {
    // Review summary: show each reviewed note's mastery
    const notesHtml = lesson.reviewLessonIds.map(id => {
      const note = findLessonById(APP.instrumentId, id);
      const count = getNoteMastery(APP.instrumentId, id);
      const level = getMasteryLevel(count);
      const color = getMasteryColor(level);
      return `
        <div class="review-note-row">
          <span class="review-note-name">${escapeHtml(t(note.noteName))}</span>
          <span class="review-note-badge" style="background:${color}22;color:${color}">${getMasteryLabel(level)}</span>
        </div>`;
    }).join('');

    return `
      <div class="complete-layout">
        <div class="complete-stars">${starsHtml}</div>
        <div class="complete-xp">+${xp} XP</div>
        <div class="complete-title">Review complete!</div>
        <div class="complete-sub">${APP.reviewCorrect} of ${APP.reviewTotal} on first try</div>
        <div class="review-notes-list">${notesHtml}</div>
        <div class="gap-lg"></div>
        <button class="btn btn-primary btn-wide" data-action="finish-lesson">Continue</button>
      </div>`;
  }

  const mastery = getNoteMastery(APP.instrumentId, lesson.id);
  const masteryLevel = getMasteryLevel(mastery);
  const masteryColor = getMasteryColor(masteryLevel);
  const alreadyDone = !!APP.completedBefore;

  const messages = {
    new: 'You got the basics down!',
    learning: 'Getting there — keep practicing!',
    practiced: 'Solid understanding of this note.',
    mastered: 'You really know this note well!',
  };

  return `
    <div class="complete-layout">
      <div class="complete-stars">${starsHtml}</div>
      <div class="complete-xp">+${xp} XP</div>
      <div class="complete-title">${alreadyDone ? 'Review complete!' : 'Lesson complete!'}</div>
      <div class="complete-sub">${messages[masteryLevel]}</div>
      <div style="margin-top:8px;padding:6px 14px;border-radius:20px;background:${masteryColor}22;color:${masteryColor};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">${getMasteryLabel(masteryLevel)} — ${mastery} correct</div>
      <div class="gap-lg"></div>
      <button class="btn btn-primary btn-wide" data-action="finish-lesson">Continue</button>
    </div>`;
}

// ── METRONOME ENGINE ────────────────────────────────────────────────────
function createMetronome(bpm = 80, beatsPerBar = 4) {
  return { bpm: Math.max(40, Math.min(240, bpm || 80)), beatsPerBar: beatsPerBar || 4, beat: -1, subTick: 0, subdivision: 1, countIn: false, countInLeft: 0, running: false, timerId: null, taps: [] };
}
function bpmToTickMs(bpm, subdivision = 1) {
  const subs = Math.max(1, subdivision || 1);
  return Math.round(60000 / (Math.max(40, Math.min(240, bpm || 80)) * subs));
}
function bpmToIntervalMs(bpm) { return Math.round(60000 / Math.max(40, Math.min(240, bpm || 80))); }
function advanceMetronome(metro) {
  const bpb = Math.max(1, metro.beatsPerBar || 4);
  metro.beat = (metro.beat + 1) % bpb;
  return { beat: metro.beat, accent: metro.beat === 0 };
}
function metronomeTick(metro) {
  const subs = Math.max(1, metro.subdivision || 1);
  if (metro.beat < 0 || metro.subTick >= subs - 1) {
    const { beat, accent } = advanceMetronome(metro);
    metro.subTick = 0;
    return { beat, sub: 0, isBeat: true, accent };
  }
  metro.subTick += 1;
  return { beat: metro.beat, sub: metro.subTick, isBeat: false, accent: false };
}
function updateMetronomeDots() {
  const m = APP.metronome;
  const wrap = document.getElementById('metronome-dots');
  if (!m || !wrap) return;
  const dots = [];
  for (let i = 0; i < (m.beatsPerBar || 4); i++) {
    dots.push(`<div class="metro-dot ${i === m.beat ? 'metro-dot-active' : ''} ${i === 0 ? 'metro-dot-downbeat' : ''}"></div>`);
  }
  wrap.innerHTML = dots.join('');
}

function startMetronomeTicker() {
  const m = APP.metronome;
  if (!m) return;
  clearTimeout(m.timerId);
  let inCountIn = m.countInLeft > 0;
  const step = () => {
    if (!m.running) return;
    let delay;
    if (inCountIn) {
      const { accent } = advanceMetronome(m);
      AudioEngine.playClick(accent);
      m.countInLeft -= 1;
      if (m.countInLeft <= 0) { inCountIn = false; m.beat = -1; m.subTick = 0; }
      updateMetronomeDots();
      delay = bpmToIntervalMs(m.bpm);
    } else {
      const tick = metronomeTick(m);
      AudioEngine.playClick(tick.accent);
      updateMetronomeDots();
      delay = bpmToTickMs(m.bpm, m.subdivision);
    }
    m.timerId = setTimeout(step, delay);
  };
  step();
}
function startMetronome() {
  if (!APP.metronome) APP.metronome = createMetronome(80, 4);
  AudioEngine.unlock();
  APP.metronome.beat = -1;
  APP.metronome.subTick = 0;
  APP.metronome.countInLeft = APP.metronome.countIn ? APP.metronome.beatsPerBar : 0;
  APP.metronome.running = true;
  APP.metronome.taps = [];
  startMetronomeTicker();
  renderToolWidget();
  updateMetronomeDots();
}
function stopMetronome() {
  const m = APP.metronome;
  if (!m) return;
  clearTimeout(m.timerId);
  m.timerId = null;
  m.running = false;
  m.beat = -1;
  m.subTick = 0;
  m.countInLeft = 0;
}

// ── SIGHT-READING GAME ──────────────────────────────────────────────────
function renderGameScreen() {
  const state = APP.game || {};
  const score = state.score || 0;
  const total = state.total || 0;
  const timeLeft = state.timeLeft ?? 30;
  const current = state.currentNote;

  let noteDisplay = '';
  if (current && state.showingResult === undefined) {
    const inst = getInstrument(APP.instrumentId);
    const staffSvg = Graphics.staffSVG({ pos: current.staffStep, accidental: current.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 100 });
    noteDisplay = `<div class="game-staff">${staffSvg}</div>`;
  } else if (current && state.showingResult !== undefined) {
    noteDisplay = `<div class="game-result">${state.showingResult ? '✓' : '✗'} ${current.noteName}</div>`;
  }

  const options = (state.choices || []).map(c => {
    return `<button class="btn game-option-btn" data-action="game-answer" data-note="${c}">${c}</button>`;
  }).join('');

  const progressHtml = `<div class="game-progress">${score}/${total}</div>`;
  const timerHtml = `<div class="game-timer">${timeLeft}s</div>`;

  return `
    <div class="screen active game-screen">
      <div class="game-header">
        <span class="game-title">Sight Reading</span>
        ${timerHtml}
      </div>
      <div class="game-body">
        <div class="game-score-bar">${progressHtml}</div>
        ${noteDisplay}
        <div class="game-options">${options}</div>
      </div>
      ${timeLeft <= 0 ? `
        <div class="game-over">
          <div class="game-over-score">${score} / ${total}</div>
          <div class="game-over-pct">${total ? Math.round(score/total*100) : 0}%</div>
          <button class="btn btn-primary" data-action="game-replay">Play again</button>
          <button class="btn btn-secondary" data-action="close-game">Back</button>
        </div>
      ` : ''}
    </div>`;
}

function initGame() {
  const inst = getInstrument(APP.instrumentId);
  const learned = getLearnedNotes(APP.instrumentId);
  const pool = learned.length >= 4 ? learned : inst.lessons.filter(l => !isReviewLesson(l) && !isSongLesson(l));
  const GAME_DURATION = 30;
  APP.game = {
    score: 0,
    total: 0,
    timeLeft: GAME_DURATION,
    currentNote: null,
    choices: [],
    showingResult: undefined,
    pool: shuffle(pool),
    poolIndex: 0,
    timer: null,
  };
  nextGameNote();
  startGameTimer();
}

function startGameTimer() {
  if (APP.game.timer) clearInterval(APP.game.timer);
  APP.game.timer = setInterval(() => {
    APP.game.timeLeft--;
    if (APP.game.timeLeft <= 0) {
      clearInterval(APP.game.timer);
      APP.game.timer = null;
      APP.game.timeLeft = 0;
    }
    if (APP.screen === 'game') {
      const app = document.getElementById('app');
      if (app) app.innerHTML = renderGameScreen();
    }
  }, 1000);
}

function nextGameNote() {
  const game = APP.game;
  if (!game || game.timeLeft <= 0) return;
  const note = game.pool[game.poolIndex % game.pool.length];
  game.poolIndex++;

  const allNoteNames = game.pool.map(n => n.noteName);
  const uniqueNames = [...new Set(allNoteNames)];
  const correctName = note.noteName;
  const distractors = shuffle(uniqueNames.filter(n => n !== correctName)).slice(0, 3);
  const choices = shuffle([correctName, ...distractors]);

  game.currentNote = note;
  game.choices = choices;
  game.showingResult = undefined;
}

// ── MASTER RENDER ───────────────────────────────────────────────────────
function renderToolWidget() {
  const host = document.getElementById('tool-widget');
  if (!host) return;
  const open = !!APP.toolsOpen;
  const tab = APP.toolTab === 'tuner' ? 'tuner' : 'metronome';
  const body = tab === 'tuner' ? renderTunerPanel() : renderMetronomePanel();
  host.innerHTML = `
    <div class="tool-panel${open ? ' open' : ''}" role="dialog" aria-label="Metronome and tuner" aria-hidden="${open ? 'false' : 'true'}">
      <div class="tool-panel-head">
        <div class="tool-tabs">
          <button class="tool-tab${tab === 'metronome' ? ' active' : ''}" data-action="tools-tab" data-tab="metronome">Metronome</button>
          <button class="tool-tab${tab === 'tuner' ? ' active' : ''}" data-action="tools-tab" data-tab="tuner">Tuner</button>
        </div>
        <button class="tool-close" data-action="close-tools" aria-label="Close">✕</button>
      </div>
      <div class="tool-panel-body">${body}</div>
    </div>
    <button class="tool-fab${open ? ' active' : ''}" data-action="toggle-tools" aria-label="Metronome / tuner" title="Metronome / Tuner" aria-expanded="${open ? 'true' : 'false'}">
      <span class="tool-fab-icon">🎵</span>
    </button>`;
}

function renderMetronomePanel() {
  if (!APP.metronome) APP.metronome = createMetronome(80, 4);
  const m = APP.metronome;
  const dots = [];
  for (let i = 0; i < (m.beatsPerBar || 4); i++) {
    dots.push(`<div class="metro-dot ${i === m.beat ? 'metro-dot-active' : ''} ${i === 0 ? 'metro-dot-downbeat' : ''}"></div>`);
  }
  return `
    <div class="tool-metro">
      <div class="metro-dots" id="metronome-dots">${dots.join('')}</div>
      <div class="tool-bpm">
        <button class="tool-step" data-action="metronome-bpm" data-delta="-5" aria-label="Slower">−</button>
        <div class="tool-bpm-value"><span id="metronome-bpm">${m.bpm}</span><small>BPM</small></div>
        <button class="tool-step" data-action="metronome-bpm" data-delta="5" aria-label="Faster">+</button>
      </div>
      <div class="tool-row tool-row-between">
        <button class="tool-pill${m.countIn ? ' active' : ''}" data-action="metronome-countin" role="switch" aria-checked="${m.countIn ? 'true' : 'false'}">Count-in</button>
      </div>
      <div class="tool-actions">
        <button class="btn btn-primary tool-play" data-action="metronome-toggle" id="metronome-toggle">${m.running ? '\u25A0 Stop' : '\u25B6 Start'}</button>
      </div>
    </div>`;
}

function render() {
  const app = document.getElementById('app');
  if (APP.screen === 'select') app.innerHTML = renderSelectScreen();
  else if (APP.screen === 'map') app.innerHTML = renderMapScreen();
  else if (APP.screen === 'first-sound') app.innerHTML = renderFirstSoundScreen();
  else if (APP.screen === 'lookup') app.innerHTML = renderLookupScreen();
  else if (APP.screen === 'tutorial') app.innerHTML = renderTutorialScreen();
  else if (APP.screen === 'report') app.innerHTML = renderReportScreen();
  else if (APP.screen === 'practice') app.innerHTML = renderPracticeScreen();
  else if (APP.screen === 'lesson') app.innerHTML = renderLessonScreen();
  else if (APP.screen === 'settings') app.innerHTML = renderSettingsScreen();
  else if (APP.screen === 'analytics') app.innerHTML = renderAnalyticsScreen();
  else if (APP.screen === 'game') app.innerHTML = renderGameScreen();
  renderToolWidget();
  if (APP.showReference) {
    const refHtml = renderReferenceOverlay();
    if (refHtml) app.insertAdjacentHTML('beforeend', refHtml);
    const overlay = document.getElementById('reference-overlay');
    if (overlay) overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        APP.showReference = false;
        render();
      }
    });
  }
}

// ── PLAY PHASE SEQUENCE ─────────────────────────────────────────────────
function runPlaySequence(inst, lesson, listenOnly) {
  const btn = document.getElementById('play-start-btn');
  const status = document.getElementById('play-status');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '...';
  const beatMs = msPerBeatAt(80, APP.songSpeed); // 80 BPM base, scaled by practice speed
  const cells = document.querySelectorAll('.beat-cell');

  function clearActive() { cells.forEach(c => c.classList.remove('active')); }

  if (listenOnly) {
    // ── Listen phase: Preludio demonstrates the note ───────────────────
    status.textContent = 'Listen to how it sounds...';
    [1, 2, 3, 4].forEach((n, i) => {
      setTimeout(() => {
        clearActive();
        const cell = document.querySelector(`.beat-cell[data-beat="${n}"]`);
        if (cell) cell.classList.add('active');
        AudioEngine.playClick(n === 1);
      }, i * beatMs);
    });

    setTimeout(() => {
      clearActive();
      const playCell = document.querySelector('.beat-cell[data-beat="play"]');
      if (playCell) playCell.classList.add('active');
      AudioEngine.playInstrumentNote(lesson.freq, inst.fingeringType, 1.2);
      status.textContent = 'Listen...';
    }, 4 * beatMs);

    setTimeout(() => {
      clearActive();
      status.textContent = 'Now it\'s your turn. Ready?';
      btn.disabled = false;
      btn.textContent = '▶ Yes, let\'s go!';
    }, 4 * beatMs + 1600);
  } else {
    // ── Your turn phase: user plays along ────────────────────────────
    status.textContent = 'Get ready...';
    [1, 2, 3, 4].forEach((n, i) => {
      setTimeout(() => {
        clearActive();
        const cell = document.querySelector(`.beat-cell[data-beat="${n}"]`);
        if (cell) cell.classList.add('active');
        AudioEngine.playClick(n === 1);
        status.textContent = `${n}...`;
      }, i * beatMs);
    });

    setTimeout(() => {
      clearActive();
      const playCell = document.querySelector('.beat-cell[data-beat="play"]');
      if (playCell) playCell.classList.add('active');
      status.textContent = 'Go!';
    }, 4 * beatMs);

    setTimeout(() => {
      clearActive();
      status.textContent = 'Great! Tap Start to try again, or confirm below.';
      btn.disabled = false;
      btn.textContent = '▶ Replay count-in';
      APP.play.hasPlayed = true;
      const confirmBtn = document.querySelector('[data-action="play-confirm"]');
      if (confirmBtn) confirmBtn.disabled = false;
    }, 4 * beatMs + 1500);
  }
}

// ── SONG KARAOKE PLAYBACK ──────────────────────────────────────────────
function runSongPlayback(inst, lesson) {
  if (APP.songPlayback && APP.songPlayback.active) return;
  AudioEngine.unlock();
  const rawNotes = lesson.noteIds.map(id => findLessonById(APP.instrumentId, id));
  const durations = lesson.durations || [];
  const notes = rawNotes.map((n, i) => ({ ...n, dur: durations[i] || 'q' }));
  const filled = notes.map(n => n.dur !== 'h' && n.dur !== 'w');

  var accompData = lesson.accompaniment || null;
  // The song's own written tempo — the base the practice-speed multiplier scales.
  var baseBpm = accompData && accompData.bpm ? accompData.bpm : (lesson.bpm || 100);
  var spbMs = msPerBeatAt(baseBpm, APP.songSpeed); // ms per beat; count-in and notes share it

  APP.songPlayback = { active: true, index: -1, timer: null, finished: false, baseBpm: baseBpm };
  if (APP.songPlayback.timer) clearTimeout(APP.songPlayback.timer);

  const container = document.getElementById('song-score-container');
  const accentColor = inst.accentColor;

  var hasAccomp = !!accompData;

  // Stop any previous accompaniment
  if (APP.accompSource) {
    try { APP.accompSource.stop(); } catch(e) {}
    APP.accompSource = null;
  }

  function kickoff(accompBuffer) {
    var recordedBPM = accompData ? accompData.bpm : 100; // tempo of the audio file
    var currentBPM = baseBpm * APP.songSpeed;            // song tempo at current speed
    var rate = currentBPM / recordedBPM;                 // playbackRate to match both
    APP.songPlayback.recordedBPM = recordedBPM;
    var c = AudioEngine.getContext();

    // Pre-compute cumulative beat offsets so highlighting can use the
    // AudioContext clock directly — avoids setTimeout drift.
    var beatDurs = notes.map(function(n) {
      return n.dur === 'h' ? 2 : n.dur === 'w' ? 4 : n.dur === '8' ? 0.5 : 1;
    });
    var cumBeats = [0];
    for (var ci = 0; ci < notes.length; ci++) {
      cumBeats.push(cumBeats[ci] + beatDurs[ci]);
    }

    function step(i) {
      if (i >= notes.length) {
        APP.songPlayback.active = false;
        APP.songPlayback.finished = true;
        if (APP.accompSource) { try { APP.accompSource.stop(); } catch(e) {} APP.accompSource = null; }
        if (APP._countInOverlay) { APP._countInOverlay.remove(); APP._countInOverlay = null; }
        render();
        return;
      }

      // Clear previous highlight
      if (container) {
        container.querySelectorAll('[data-note-index]').forEach(g => {
          const idx = parseInt(g.getAttribute('data-note-index'));
          const el = g.querySelector('ellipse');
          if (!el) return;
          if (filled[idx]) {
            el.setAttribute('fill', accentColor);
            el.setAttribute('stroke', accentColor);
          } else {
            el.setAttribute('fill', 'none');
            el.setAttribute('stroke', accentColor);
          }
        });
      }

      // Highlight current note
      if (container) {
        const g = container.querySelector(`[data-note-index="${i}"]`);
        if (g) {
          const ellipse = g.querySelector('ellipse');
          if (ellipse) {
            ellipse.setAttribute('fill', '#FFD166');
            ellipse.setAttribute('stroke', '#FFD166');
          }
          // Scroll to keep current note visible (SVG g.offsetLeft is 0, use getBBox)
          const svg = container.querySelector('svg');
          if (svg) {
            const bbox = g.getBBox();
            const scale = svg.getBoundingClientRect().width / svg.viewBox.animVal.width;
            const targetLeft = bbox.x * scale - container.offsetWidth * 0.3;
            container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
          }
        }
      }

      // Don't play any synth sounds — the MP3 has everything
      const note = notes[i];

      // Schedule next note against the count-in's captured tempo, so the
      // highlight grid stays locked to the accompaniment for the whole take.
      if (i + 1 < notes.length) {
        var nextTime = audioStart + cumBeats[i + 1] * spbMs / 1000;
        var delay = (nextTime - c.currentTime) * 1000;
        APP.songPlayback.timer = setTimeout(function() { step(i + 1); }, Math.max(0, delay));
      } else {
        // Last note — let it ring for its full duration before ending
        var lastBeat = beatDurs[notes.length - 1];
        var lastMs = lastBeat * spbMs;
        APP.songPlayback.timer = setTimeout(function() {
          APP.songPlayback.active = false;
          APP.songPlayback.finished = true;
          if (APP.accompSource) { try { APP.accompSource.stop(); } catch(e) {} APP.accompSource = null; }
          if (APP._countInOverlay) { APP._countInOverlay.remove(); APP._countInOverlay = null; }
          render();
        }, lastMs + 200);
      }
    }

    // ── Count-in: 4 beats (visual + click), then accompaniment + step(0) ─
    var countInMs = 4 * spbMs;

    var overlay = null;
    if (container) {
      overlay = document.createElement('div');
      overlay.className = 'count-in-overlay';
      overlay.innerHTML =
        '<div class="count-in-beats">' +
          '<span data-ci="1">1</span>' +
          '<span data-ci="2">2</span>' +
          '<span data-ci="3">3</span>' +
          '<span data-ci="4">4</span>' +
        '</div>';
      container.parentNode.appendChild(overlay);
    }
    APP._countInOverlay = overlay;

    // Schedule accompaniment to start right after count-in
    var audioStart = c.currentTime + countInMs / 1000 + 0.05;
    if (accompBuffer) {
      APP.accompSource = AudioEngine.playBuffer(accompBuffer, rate, audioStart);
    }

    // Count-in: visual beats + metronome clicks (use captured spbMs)
    [1, 2, 3, 4].forEach(function(n, i) {
      setTimeout(function() {
        AudioEngine.playClick(n === 1);
        if (overlay) {
          var el = overlay.querySelector('[data-ci="' + n + '"]');
          if (el) el.classList.add('active');
        }
      }, i * spbMs);
    });

    // Start step + accompaniment after count-in
    APP.songPlayback.timer = setTimeout(function() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      APP._countInOverlay = null;
      step(0);
    }, countInMs + 50);
  }

  if (hasAccomp) {
    AudioEngine.fetchAndDecode(accompData.url, function(buf) {
      kickoff(buf);
    });
  } else {
    kickoff(null);
  }
}

// ── EVENT HANDLING ─────────────────────────────────────────────────────
function handleAction(action, el) {
  switch (action) {

    case 'select-instrument': {
      const id = el.dataset.id;
      const inst = getInstrument(id);
      if (!inst.available) { showToast(`${t(inst.name)} is coming soon!`); return; }
      APP.instrumentId = id;
      setSavedInstrument(id);
      APP.pickingInstrument = false;
      // First time on this instrument? Show the quick app tour before the map.
      if (!getTutorialSeen(id)) {
        APP.tutorialIndex = 0;
        APP.screen = 'tutorial';
      } else {
        APP.screen = 'map';
      }
      render();
      break;
    }

    case 'cancel-instrument-pick':
      APP.pickingInstrument = false;
      render();
      break;

    case 'switch-instrument':
      APP.pickingInstrument = true;
      render();
      break;

    case 'go-select':
      stopMetronome();
      stopTuner();
      endSession();
      APP.screen = 'select';
      render();
      break;

    case 'open-lesson': {
      const idx = parseInt(el.dataset.index, 10);
      APP.lessonIndex = idx;
      const lesson = getLesson(APP.instrumentId, idx);
      APP.play = { running: false, hasPlayed: false, hasListened: false };
      APP.quizQueue = [];
      APP.quizIndex = 0;
      startSession();

      if (isSongLesson(lesson)) {
        APP.phase = 'present';
        APP.quiz = null;
        APP.songPlayback = { active: false, index: -1, timer: null, finished: false };
      } else if (isReviewLesson(lesson)) {
        const inst = getInstrument(APP.instrumentId);
        APP.phase = 'quiz';
        APP.reviewQueue = shuffle(lesson.reviewLessonIds);
        APP.reviewIndex = 0;
        APP.reviewCorrect = 0;
        APP.reviewTotal = lesson.reviewLessonIds.length;
        const firstNote = findLessonById(APP.instrumentId, APP.reviewQueue[0]);
        APP.quiz = buildQuizOptions(inst, firstNote);
      } else {
        APP.phase = 'present';
        APP.quiz = null;
      }

      APP.screen = 'lesson';
      render();
      break;
    }

    case 'open-practice':
      APP.sprint = null;
      startSession();
      APP.screen = 'practice';
      render();
      break;

    case 'close-practice':
      endSession();
      APP.sprint = null;
      APP.screen = 'map';
      render();
      break;

    case 'start-sprint':
      startSprint(el.dataset.mode);
      break;

    case 'sprint-answer': {
      const s = APP.sprint;
      if (!s || s.finished) return;
      const id = el.dataset.id;
      if (id === s.question.correctId) {
        recordSkill(APP.instrumentId, s.question.correctId, true);
        s.score++;
        s.question = buildSprintQuestion(APP.instrumentId, s.mode);
      } else {
        if (!s.question.wrongId) recordSkill(APP.instrumentId, s.question.correctId, false);
        s.question.wrongId = id;
      }
      render();
      break;
    }

    case 'sprint-again':
      startSprint(APP.sprint ? APP.sprint.mode : SPRINT_MODES.SIGHT);
      break;

    case 'exit-sprint':
      clearInterval(APP.sprintTimer);
      APP.sprintTimer = null;
      APP.sprint = null;
      evaluateBadges({ toast: true });
      render();
      break;

    case 'open-report':
      APP.screen = 'report';
      render();
      break;

    case 'close-report':
      APP.screen = 'select';
      render();
      break;

    case 'copy-report': {
      const text = formatReportText(buildPracticeReport(getStudentName()));
      copyText(text).then(ok => showToast(ok ? 'Report copied to clipboard.' : 'Copy failed \u2014 try Print instead.'));
      break;
    }

    case 'print-report':
      window.print();
      break;

    case 'open-tutorial':
      APP.tutorialIndex = 0;
      APP.screen = 'tutorial';
      render();
      break;

    case 'tutorial-next': {
      const slides = buildTutorialSlides(getInstrument(APP.instrumentId));
      if (APP.tutorialIndex >= slides.length - 1) {
        markTutorialSeen(APP.instrumentId);
        APP.screen = 'map';
      } else {
        APP.tutorialIndex += 1;
      }
      render();
      break;
    }

    case 'tutorial-back':
      APP.tutorialIndex = Math.max((APP.tutorialIndex || 0) - 1, 0);
      render();
      break;

    case 'tutorial-finish':
      markTutorialSeen(APP.instrumentId);
      APP.screen = 'map';
      render();
      break;

    case 'open-lookup':
      APP.lookupReturn = APP.screen === 'lesson' ? 'map' : APP.screen;
      APP.screen = 'lookup';
      render();
      break;

    case 'close-lookup':
      APP.screen = APP.lookupReturn === 'practice' ? 'practice' : 'map';
      render();
      break;

    case 'lookup-select':
      APP.lookupId = el.dataset.id;
      render();
      break;

    case 'lookup-hear': {
      const inst = getInstrument(APP.instrumentId);
      const notes = getNoteLessons(APP.instrumentId);
      const note = notes.find(l => l.id === APP.lookupId) || notes[0];
      if (note) AudioEngine.playInstrumentNote(note.freq, inst.fingeringType, 1.1);
      break;
    }

    case 'plan-start': {
      const item = getTodayPlan(APP.instrumentId).items.find(i => i.id === el.dataset.item);
      if (!item) return;
      if (item.type === 'sprint') {
        if (typeof startSprint === 'function') startSprint(item.mode);
        else showToast('Practice drills are coming soon.');
        break;
      }
      const idx = CURRICULUM[APP.instrumentId].lessons
        .indexOf(findLessonById(APP.instrumentId, item.targetId));
      if (idx < 0) return;
      handleAction('open-lesson', { dataset: { index: String(idx) } });
      break;
    }

    case 'open-first-sound':
      APP.screen = 'first-sound';
      render();
      break;

    case 'close-first-sound':
      APP.screen = 'map';
      render();
      break;

    case 'first-sound-done':
      markFirstSoundSeen(APP.instrumentId);
      APP.screen = 'map';
      render();
      break;

    case 'first-sound-hear': {
      const inst = getInstrument(APP.instrumentId);
      const note = getNoteLessons(APP.instrumentId)[0];
      if (note) AudioEngine.playInstrumentNote(note.freq, inst.fingeringType, 1.2);
      break;
    }

    case 'locked-node':
      showToast('Finish the previous note first.');
      break;

    case 'song-next': {
      APP.songNoteIndex = Math.min(APP.songNoteIndex + 1, getLesson(APP.instrumentId, APP.lessonIndex).noteIds.length - 1);
      render();
      break;
    }

    case 'song-prev': {
      APP.songNoteIndex = Math.max(APP.songNoteIndex - 1, 0);
      render();
      break;
    }

    case 'song-play':
    case 'song-replay':
    case 'play-melody': {
      AudioEngine.unlock();
      const inst = getInstrument(APP.instrumentId);
      const lesson = getLesson(APP.instrumentId, APP.lessonIndex);
      if (APP.songPlayback && APP.songPlayback.timer) clearTimeout(APP.songPlayback.timer);
      runSongPlayback(inst, lesson);
      break;
    }

    case 'song-speed-down':
    case 'song-speed-up': {
      const delta = action === 'song-speed-up' ? SPEED_STEP : -SPEED_STEP;
      APP.songSpeed = clampSpeed(APP.songSpeed + delta);
      setSavedSpeed(APP.songSpeed);
      // A live accompaniment retimes in place, keeping its pitch; otherwise the
      // readout is refreshed by a re-render.
      if (APP.accompSource && APP.songPlayback) {
        const ctx = AudioEngine.getContext();
        const recordedBPM = APP.songPlayback.recordedBPM || 100;
        const rate = (APP.songPlayback.baseBpm * APP.songSpeed) / recordedBPM;
        APP.accompSource.playbackRate.setValueAtTime(rate, ctx.currentTime);
        APP.accompSource.detune.setValueAtTime(-1200 * Math.log2(rate), ctx.currentTime);
        updateSongSpeedLabels();
      } else {
        render();
      }
      break;
    }

    case 'exit-lesson':
      APP.reviewQueue = null;
      APP.reviewIndex = 0;
      APP.reviewCorrect = 0;
      APP.reviewTotal = 0;
      if (APP.songPlayback && APP.songPlayback.timer) clearTimeout(APP.songPlayback.timer);
      APP.songPlayback = null;
      if (APP._countInOverlay) { APP._countInOverlay.remove(); APP._countInOverlay = null; }
      if (APP.accompSource) { try { APP.accompSource.stop(); } catch(e) {} APP.accompSource = null; }
      APP.screen = 'map';
      render();
      break;

    case 'hear-note': {
      const inst = getInstrument(APP.instrumentId);
      const lesson = getLesson(APP.instrumentId, APP.lessonIndex);
      if (isSongLesson(lesson)) {
        const note = getResolvedSongNote(APP.instrumentId, lesson);
        AudioEngine.playInstrumentNote(note.freq, inst.fingeringType, 1.1);
      } else {
        AudioEngine.playInstrumentNote(lesson.freq, inst.fingeringType, 1.1);
      }
      break;
    }

    case 'record-toggle':
      if (APP.recorder) stopRecording();
      else startRecording();
      break;

    case 'play-recording':
      playRecording();
      break;

    case 'discard-recording':
      cleanupRecording();
      render();
      break;

    case 'goto-quiz':
      APP.phase = 'quiz';
      APP.quiz = null;
      render();
      break;

    case 'quiz-answer': {
      const tappedId = el.dataset.id;
      const q = APP.quiz;
      if (q.answeredCorrectly || q.wrongIds.includes(tappedId)) return;
      if (tappedId === q.correctId) {
        q.answeredCorrectly = true;
        addNoteMastery(APP.instrumentId, q.correctId);
        recordSkill(APP.instrumentId, q.correctId, true);
      } else {
        q.wrongIds.push(tappedId);
        recordSkill(APP.instrumentId, q.correctId, false);
      }
      render();
      break;
    }

    case 'goto-play': {
      const lesson = getLesson(APP.instrumentId, APP.lessonIndex);
      // ── Song: track mastery and go to complete ────────────────────
      if (isSongLesson(lesson)) {
        const q = APP.quiz;
        const mistakes = q ? q.wrongIds.length : 0;
        const stars = mistakes === 0 ? 3 : (mistakes <= 2 ? 2 : 1);
        const xp = 10 + (stars * 5);
        APP.lastStars = stars;
        APP.lastXp = xp;
        recordLessonComplete(lesson.id, 'song', xp, stars);
        const prog = getInstrumentProgress(APP.instrumentId);
        const prevStars = prog.completed[lesson.id] ? prog.completed[lesson.id].stars : 0;
        APP.completedBefore = !!prog.completed[lesson.id];
        prog.completed[lesson.id] = { stars: Math.max(stars, prevStars) };
        prog.xp += xp;
        saveProgress();
        markPlanItemDone(APP.instrumentId, 'song', lesson.id);
        evaluateBadges({ toast: true });
        APP.phase = 'complete';
        render();
        return;
      }
      // ── Review session: advance to next note or show summary ──────
      if (isReviewLesson(lesson)) {
        const q = APP.quiz;
        if (q && q.wrongIds.length === 0) APP.reviewCorrect++;
        APP.reviewIndex++;
        if (APP.reviewIndex >= APP.reviewTotal) {
          const totalMistakes = APP.reviewTotal - APP.reviewCorrect;
          APP.lastStars = totalMistakes === 0 ? 3 : (totalMistakes <= 1 ? 2 : 1);
          APP.lastXp = 10 + (APP.lastStars * 5);
          recordLessonComplete(lesson.id, 'review', APP.lastXp, APP.lastStars);
          const prog = getInstrumentProgress(APP.instrumentId);
          const prevStars = prog.completed[lesson.id] ? prog.completed[lesson.id].stars : 0;
          prog.completed[lesson.id] = { stars: Math.max(APP.lastStars, prevStars) };
          prog.xp += APP.lastXp;
          saveProgress();
          APP.phase = 'complete';
        } else {
          const inst = getInstrument(APP.instrumentId);
          const nextNote = findLessonById(APP.instrumentId, APP.reviewQueue[APP.reviewIndex]);
          APP.quiz = buildQuizOptions(inst, nextNote);
          APP.phase = 'quiz';
        }
        render();
        return;
      }
      // ── Regular note lesson: step through the mixed quiz set ──────
      if (APP.quizQueue && APP.quizIndex < APP.quizQueue.length - 1) {
        APP.quizIndex++;
        APP.quiz = APP.quizQueue[APP.quizIndex];
        APP.phase = 'quiz';
        render();
        return;
      }
      APP.phase = 'play';
      APP.play = { running: false, hasPlayed: false, hasListened: false };
      render();
      break;
    }

    case 'play-start': {
      AudioEngine.unlock();
      const inst = getInstrument(APP.instrumentId);
      const lesson = getLesson(APP.instrumentId, APP.lessonIndex);
      const isFirstTime = !APP.play.hasListened;
      APP.play.hasListened = true;
      runPlaySequence(inst, lesson, isFirstTime);
      break;
    }

    case 'play-confirm': {
      cleanupRecording();
      const mistakes = (APP.quizQueue || []).reduce((sum, item) => sum + item.wrongIds.length, 0);
      const stars = mistakes === 0 ? 3 : (mistakes <= 2 ? 2 : 1);
      const xp = 10 + (stars * 5);
      APP.lastStars = stars;
      APP.lastXp = xp;

      const prog = getInstrumentProgress(APP.instrumentId);
      const lesson = getLesson(APP.instrumentId, APP.lessonIndex);
      recordLessonComplete(lesson.id, 'lesson', xp, stars);
      const prevStars = prog.completed[lesson.id] ? prog.completed[lesson.id].stars : 0;
      APP.completedBefore = !!prog.completed[lesson.id];
      prog.completed[lesson.id] = { stars: Math.max(stars, prevStars) };
      prog.xp += xp;
      saveProgress();
      markPlanItemDone(APP.instrumentId, 'note', lesson.id);
      evaluateBadges({ toast: true });

      APP.phase = 'complete';
      render();
      break;
    }

    case 'finish-lesson':
      cleanupRecording();
      APP.reviewQueue = null;
      APP.reviewIndex = 0;
      APP.reviewCorrect = 0;
      APP.reviewTotal = 0;
      if (APP.songPlayback && APP.songPlayback.timer) clearTimeout(APP.songPlayback.timer);
      APP.songPlayback = null;
      APP.importedSong = null;
      APP.screen = 'map';
      render();
      break;

    // ── Settings ──────────────────────────────────────────────────────
    case 'toggle-language':
      setLang(getLang() === 'pt' ? 'en' : 'pt');
      break;
    case 'toggle-theme':
      toggleTheme();
      render();
      break;
    case 'toggle-tuner':
      if (APP.tuner && APP.tuner.running) stopTuner(); else startTuner();
      render();
      break;
    case 'open-settings':
      APP.screen = 'settings';
      stopMetronome();
      render();
      break;

    case 'close-settings':
      APP.screen = 'select';
      render();
      break;

    // ── Analytics ──────────────────────────────────────────────────────
    case 'show-analytics':
      APP.screen = 'analytics';
      render();
      break;

    case 'close-analytics':
      APP.screen = 'select';
      render();
      break;

    case 'clear-analytics':
      if (!confirm('Clear all analytics data?')) return;
      localStorage.removeItem(ANALYTICS_KEY);
      showToast('Analytics cleared.');
      APP.screen = 'select';
      render();
      break;

    case 'save-settings-name': {
      const input = document.getElementById('settings-name-input');
      if (input) {
        const newName = input.value.trim();
        if (newName) {
          setStudentName(newName);
          showToast('Name saved!');
        }
      }
      break;
    }

    case 'reset-progress': {
      if (!confirm('Are you sure? This will erase all progress for all instruments.')) return;
      localStorage.removeItem(PROGRESS_KEY);
      APP.progress = {};
      showToast('Progress reset.');
      APP.screen = 'select';
      render();
      break;
    }

    // ── Reference ─────────────────────────────────────────────────────
    case 'open-reference': {
      const idx = parseInt(el.dataset.index, 10);
      APP.referenceLessonIndex = idx;
      APP.showReference = true;
      render();
      break;
    }

    case 'close-reference':
      APP.showReference = false;
      render();
      break;

    // ── Metronome ─────────────────────────────────────────────────────
    case 'toggle-metronome':
    case 'metronome-toggle': {
      if (!APP.metronome) APP.metronome = createMetronome(80, 4);
      if (APP.metronome.running) {
        stopMetronome();
      } else {
        startMetronome();
      }
      render();
      break;
    }

    case 'toggle-tools': {
      APP.toolsOpen = !APP.toolsOpen;
      renderToolWidget();
      break;
    }
    case 'close-tools': {
      APP.toolsOpen = false;
      renderToolWidget();
      break;
    }
    case 'tools-tab': {
      APP.toolTab = el.dataset.tab || 'metronome';
      renderToolWidget();
      break;
    }
    case 'metronome-bpm': {
      if (!APP.metronome) APP.metronome = createMetronome(80, 4);
      const d = parseInt(el.dataset.delta, 10) || 0;
      APP.metronome.bpm = Math.max(40, Math.min(240, (APP.metronome.bpm || 80) + d));
      if (APP.metronome.running) { stopMetronome(); startMetronome(); }
      renderToolWidget();
      break;
    }
    case 'metronome-countin': {
      if (!APP.metronome) APP.metronome = createMetronome(80, 4);
      APP.metronome.countIn = !APP.metronome.countIn;
      renderToolWidget();
      break;
    }

    case 'set-bpm': {
      const bpm = parseInt(el.value, 10);
      if (!APP.metronome) APP.metronome = createMetronome(80, 4);
      const wasOn = APP.metronome.running;
      APP.metronome.bpm = bpm;
      if (wasOn) {
        stopMetronome();
        startMetronome();
      }
      render();
      break;
    }

    // ── Sight-Reading Game ────────────────────────────────────────────
    case 'open-game':
      APP.screen = 'game';
      render();
      initGame();
      break;

    case 'close-game': {
      if (APP.game && APP.game.timer) clearInterval(APP.game.timer);
      APP.game = null;
      APP.screen = 'map';
      render();
      break;
    }

    case 'game-answer': {
      const game = APP.game;
      if (!game || game.showingResult !== undefined || game.timeLeft <= 0) return;
      const guess = el.dataset.note;
      const correct = guess === game.currentNote.noteName;
      game.total++;
      if (correct) game.score++;
      game.showingResult = correct;
      render();
      setTimeout(() => {
        if (APP.screen === 'game' && APP.game && APP.game.timeLeft > 0) {
          nextGameNote();
          render();
        }
      }, 700);
      break;
    }

    case 'game-replay': {
      if (APP.game && APP.game.timer) clearInterval(APP.game.timer);
      initGame();
      render();
      break;
    }
  }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.hasAttribute('disabled')) return;
  handleAction(el.dataset.action, el);
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.hasAttribute('disabled')) return;
  handleAction(el.dataset.action, el);
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-action="set-bpm"]');
  if (!el) return;
  const bpm = parseInt(el.value, 10);
  const label = el.closest('.bpm-control')?.querySelector('.bpm-label');
  if (label) label.textContent = `${bpm} BPM`;
});


// ── TUNER (pitch detection) ─────────────────────────────────────────────
// ── MICROPHONE RECORDING ────────────────────────────────────────────────
// Records the student so they can compare their own sound against the model.
// Degrades gracefully: if the microphone or MediaRecorder API is unavailable,
// the record controls simply never render.
function canRecord() {
  return !!(typeof navigator !== 'undefined' && navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined');
}

function startRecording() {
  if (!canRecord() || APP.recorder) return;
  // One microphone stream at a time: the tuner stops before a take begins.
  stopTuner();
  return navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const chunks = [];
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (APP.recordingUrl) URL.revokeObjectURL(APP.recordingUrl);
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      APP.recordingUrl = URL.createObjectURL(blob);
      APP.recorder = null;
      render();
    };
    mediaRecorder.start();
    APP.recorder = { mediaRecorder, stream };
    render();
  }).catch(() => showToast('Microphone unavailable.'));
}

function stopRecording() {
  const r = APP.recorder;
  if (r && r.mediaRecorder.state !== 'inactive') r.mediaRecorder.stop();
}

function playRecording() {
  if (!APP.recordingUrl) return;
  const audio = new Audio(APP.recordingUrl);
  audio.play().catch(() => showToast('Could not play the recording.'));
}

function cleanupRecording() {
  if (APP.recorder) {
    try { stopRecording(); } catch (e) { /* ignore */ }
    APP.recorder = null;
  }
  if (APP.recordingUrl) {
    URL.revokeObjectURL(APP.recordingUrl);
    APP.recordingUrl = null;
  }
}

function detectPitch(buffer, sampleRate) {
  if (!buffer || buffer.length < 2 || !sampleRate) return -1;
  const size = buffer.length;
  let peak = 0, energy = 0;
  for (let i = 0; i < size; i++) {
    const v = buffer[i];
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
    energy += v * v;
  }
  if (peak < 0.02 || Math.sqrt(energy / size) < 0.01) return -1;
  const minLag = Math.max(2, Math.floor(sampleRate / 2000));
  const maxLag = Math.min(size - 2, Math.ceil(sampleRate / 40));
  if (maxLag <= minLag) return -1;
  const prefix = new Float64Array(size + 1);
  for (let i = 0; i < size; i++) prefix[i + 1] = prefix[i] + buffer[i] * buffer[i];
  const total = prefix[size];
  const nsdf = new Float32Array(maxLag + 1);
  let bestVal = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const denom = prefix[size - lag] + (total - prefix[lag]);
    let sum = 0;
    for (let i = 0; i < size - lag; i++) sum += buffer[i] * buffer[i + lag];
    const value = denom > 0 ? (2 * sum) / denom : 0;
    nsdf[lag] = value;
    if (value > bestVal) bestVal = value;
  }
  if (bestVal < 0.5) return -1;
  const threshold = bestVal * 0.9;
  let chosen = -1;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (nsdf[lag] >= nsdf[lag - 1] && nsdf[lag] > nsdf[lag + 1] && nsdf[lag] >= threshold) { chosen = lag; break; }
  }
  if (chosen < 0) return -1;
  const y0 = nsdf[chosen - 1], y1 = nsdf[chosen], y2 = nsdf[chosen + 1];
  const curve = y0 - 2 * y1 + y2;
  const shift = curve !== 0 ? (y0 - y2) / (2 * curve) : 0;
  const period = chosen + Math.max(-1, Math.min(1, shift));
  if (period <= 0) return -1;
  const freq = sampleRate / period;
  if (freq < 40 || freq > 2000) return -1;
  return freq;
}
function freqToNoteInfo(freq, noteLessons) {
  if (!freq || freq <= 0 || !noteLessons || !noteLessons.length) return null;
  let best = null;
  noteLessons.forEach(n => {
    if (!n.freq) return;
    const cents = 1200 * Math.log2(freq / n.freq);
    if (best === null || Math.abs(cents) < Math.abs(best.cents)) best = { note: n, cents };
  });
  return best;
}
function getTunerNoteLessons() {
  const id = (typeof getSavedInstrument === 'function' && getSavedInstrument()) || (INSTRUMENT_ORDER && INSTRUMENT_ORDER[0]);
  const inst = id ? CURRICULUM[id] : null;
  if (!inst || !inst.lessons) return [];
  return inst.lessons.filter(l => !l.type || (l.type !== 'song' && l.type !== 'review'));
}
function stopTuner() {
  const t = APP.tuner;
  if (!t) return;
  if (t.frame) cancelAnimationFrame(t.frame);
  if (t.stream) t.stream.getTracks().forEach(tr => tr.stop());
  if (t.ctx && t.ctx.close) t.ctx.close().catch(() => {});
  t.running = false; t.frame = null; t.stream = null; t.ctx = null;
}
function startTuner() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showToast('Microphone not available for tuning.'); return; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) { showToast('Audio analysis not supported here.'); return; }
  stopTuner();
  APP.tuner = { running: true, freq: -1, ctx: null, stream: null, frame: null };
  const t = APP.tuner;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    if (!APP.tuner || !APP.tuner.running) { stream.getTracks().forEach(tr => tr.stop()); return; }
    t.stream = stream;
    t.ctx = new Ctx();
    const source = t.ctx.createMediaStreamSource(stream);
    const analyser = t.ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const loop = () => {
      if (!APP.tuner || !APP.tuner.running) return;
      analyser.getFloatTimeDomainData(buf);
      t.freq = detectPitch(buf, t.ctx.sampleRate);
      updateTunerReadout();
      APP.tuner.frame = requestAnimationFrame(loop);
    };
    loop();
  }).catch(() => {
    if (APP.tuner) APP.tuner.running = false;
    showToast('Could not access the microphone.');
    render();
  });
}
function updateTunerReadout() {
  const t = APP.tuner;
  if (!t) return;
  const noteEl = document.getElementById('tuner-note');
  const centsEl = document.getElementById('tuner-cents');
  if (noteEl) {
    const detected = t.freq > 0 ? freqToNoteInfo(t.freq, getTunerNoteLessons()) : null;
    noteEl.textContent = detected ? t_noteName(detected.note) : '—';
  }
  if (centsEl) {
    const detected = t.freq > 0 ? freqToNoteInfo(t.freq, getTunerNoteLessons()) : null;
    centsEl.textContent = detected ? (detected.cents > 0 ? '+' + Math.round(detected.cents) + ' cents' : Math.round(detected.cents) + ' cents') : (t.running ? 'Listening…' : 'Press Tune');
  }
}
function t_noteName(n) { return n.noteName || n.name || '?'; }

// ── INIT ───────────────────────────────────────────────────────────────
initLang();
applyTheme(getTheme());
loadProgress();
loadMotivation();
if (!getStudentName()) showNamePrompt();
render();


