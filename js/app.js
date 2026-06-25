// app.js
// Application state machine and rendering for Prelude for Recorder.
// Single delegated click listener drives all interaction via data-action.

const APP = {
  screen: 'select',
  instrumentId: null,
  lessonIndex: 0,
  phase: 'present',
  quiz: null,
  play: { running: false, hasPlayed: false },
  progress: {},
  // Review session state
  reviewQueue: null,
  reviewIndex: 0,
  reviewCorrect: 0,
  reviewTotal: 0,
  // Song session state
  songNoteIndex: 0,
};

const VERSION = '1.0.1';
const STORAGE_KEY = 'preludeRecorderProgress';
const NAME_KEY = 'preludeRecorderName';

// ── ANALYTICS (local) ─────────────────────────────────────────────────────────
const ANALYTICS_KEY = 'preludeRecorderAnalytics';

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
      <div class="name-modal-title">Welcome to Prelude for Recorder!</div>
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

// ── STREAK TRACKING ───────────────────────────────────────────────────────
const STREAK_KEY = 'preludeRecorderStreak';

function getStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || { count: 0, lastDate: null }; }
  catch { return { count: 0, lastDate: null }; }
}

function saveStreak(s) { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); }

function updateStreak() {
  const s = getStreak();
  const today = new Date().toISOString().slice(0, 10);
  if (s.lastDate === today) return s.count;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  s.count = s.lastDate === yesterday ? s.count + 1 : 1;
  s.lastDate = today;
  saveStreak(s);
  return s.count;
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
function getLesson(instrumentId, index) { return CURRICULUM[instrumentId].lessons[index]; }
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
function renderSelectScreen() {
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

  const streak = updateStreak();
  const streakText = streak > 1 ? `${streak} day streak! 🔥` : 'Start your streak today!';
  const settingsIcon = `<button class="btn-icon settings-gear" data-action="open-settings" title="Settings" style="background:none;border:none;cursor:pointer;font-size:18px;vertical-align:middle;margin-left:6px;">⚙️</button>`;
  const studentName = getStudentName();

  return `
    <div class="screen active select-screen">
      <div class="select-hero">
        <div class="wordmark">
          <svg class="wordmark-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="10" cy="24" rx="6" ry="4.5" fill="#FF8C42" transform="rotate(-20 10 24)"/>
            <line x1="15" y1="22" x2="15" y2="5" stroke="#FF8C42" stroke-width="2.4"/>
            <path d="M15 5 Q24 6 24 14" stroke="#FF8C42" stroke-width="2.4" fill="none"/>
          </svg>
          <span class="wordmark-text">Prelude <span>for Recorder</span></span>
        </div>
        <div class="select-headline">First notes, first wins.</div>
        <div class="select-sub">Pick a recorder to start your very first lessons — fingerings, notes, and your first sounds.</div>
      </div>
      <div class="streak-bar">${streakText} ${settingsIcon}</div>
      <div class="select-student-name">${escapeHtml(studentName)}</div>
      <div class="instrument-grid">${cards}</div>
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
  const streak = getStreak();

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
          <span class="reference-note-name">${lesson.noteName}<span class="note-octave-sup">${lesson.octave}</span></span>
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
        <div class="reference-description">${lesson.description}</div>
        <div class="reference-prompt">${lesson.prompt}</div>
      </div>
    </div>`;
}

// ── RENDER: MAP SCREEN ─────────────────────────────────────────────────────
function renderMapScreen() {
  const inst = getInstrument(APP.instrumentId);
  const prog = getInstrumentProgress(APP.instrumentId);
  const total = inst.lessons.length;
  const doneCount = inst.lessons.filter(l => prog.completed[l.id]).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const nodes = inst.lessons.map((lesson, i) => {
    const unlocked = isLessonUnlocked(APP.instrumentId, i);
    const completed = !!prog.completed[lesson.id];
    const isReview = isReviewLesson(lesson);

    let stateCls = 'locked';
    let inner = `<span class="map-node-lock">🔒</span>`;
    let masteryHtml = '';
    let label = isReview ? lesson.noteName : isSongLesson(lesson) ? lesson.noteName : `${lesson.noteName}${lesson.octave}`;

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
      inner = `<span class="map-node-note">${lesson.noteName}</span><span class="map-node-star">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`;
      masteryHtml = `<div class="map-node-mastery mastery-${masteryLevel}">${getMasteryLabel(masteryLevel)}</div>`;
    } else if (unlocked && !completed) {
      stateCls = 'current';
      inner = `<span class="map-node-note">${lesson.noteName}</span>`;
    } else if (unlocked) {
      stateCls = 'available';
      inner = `<span class="map-node-note">${lesson.noteName}</span>`;
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
        <div class="map-unit-label">Unit 1 · First Notes</div>
        <div class="map-path">${nodes}</div>
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

  let body = '';
  if (isReview && APP.phase === 'present') {
    APP.phase = 'quiz';
  }
  if (isSong && APP.phase === 'present') {
    body = renderSongPlayPhase(inst, lesson);
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
        <span class="note-name-big">${lesson.noteName}<span class="note-octave-sup">${lesson.octave}</span></span>
      </div>
      <div class="note-description">${lesson.description}</div>
      ${transposeNote}
      <div class="gap-md"></div>
      <div class="note-prompt">${lesson.prompt}</div>
      <div class="gap-lg"></div>
      <button class="btn-hear" data-action="hear-note"><span class="hear-icon">🔊</span> Hear it</button>
    </div>
    <div class="action-bar">
      <button class="btn btn-primary btn-wide" data-action="goto-quiz">Continue</button>
    </div>`;
}

function renderSongPlayPhase(inst, lesson) {
  const notes = lesson.noteIds.map(id => findLessonById(APP.instrumentId, id));
  const totalNotes = notes.length;
  const playback = APP.songPlayback || { active: false, index: -1 };
  const hasFinished = playback.finished;

  const staffSvg = Graphics.songStaffSVG({ notes, clef: inst.clef, accentColor: inst.accentColor });

  const playBtn = hasFinished
    ? `<button class="btn btn-secondary" data-action="song-replay">↻ Replay</button>`
    : `<button class="btn btn-primary" data-action="song-play" ${playback.active ? 'disabled' : ''}>▶ Play song</button>`;

  const continueBtn = hasFinished
    ? `<button class="btn btn-success btn-wide" data-action="goto-quiz">Continue to quiz</button>`
    : `<button class="btn btn-secondary btn-wide" disabled>Play through first</button>`;

  return `
    <div class="lesson-body">
      <div class="song-title">${lesson.noteName}</div>
      <div class="song-note-count">${totalNotes} notes</div>
      <div class="song-score-card">
        <div class="song-score-wrap" id="song-score-container">
          ${staffSvg}
        </div>
      </div>
      <div class="song-playback-controls">
        ${playBtn}
      </div>
    </div>
    <div class="action-bar">
      ${continueBtn}
    </div>`;
}

function buildQuizOptions(inst, lesson) {
  const completedCount = getLearnedNotes(APP.instrumentId).length;
  const alreadyCompleted = !!getInstrumentProgress(APP.instrumentId).completed[lesson.id];

  const availableTypes = [QUIZ_TYPES.FINGERING_TO_NOTE];
  if (completedCount >= 1) availableTypes.push(QUIZ_TYPES.NOTE_TO_FINGERING);
  if (completedCount >= 2) availableTypes.push(QUIZ_TYPES.STAFF_TO_NOTE);
  if (completedCount >= 3) availableTypes.push(QUIZ_TYPES.NOTE_TO_STAFF);

  const quizType = alreadyCompleted
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
    APP.quiz = isSongLesson(lesson) ? buildSongQuizOptions(inst, lesson) : buildQuizOptions(inst, lesson);
  }
  const q = APP.quiz;
  const isReview = isReviewLesson(lesson);

  // Review progress indicator
  let reviewProgress = '';
  if (isReview) {
    reviewProgress = `<div class="review-progress">Note ${APP.reviewIndex + 1} of ${APP.reviewTotal}</div>`;
  }

  // ── PROMPT ──
  let promptHtml = '';
  if (q.quizType === QUIZ_TYPES.FINGERING_TO_NOTE) {
    promptHtml = `<div class="quiz-prompt-svg">${Graphics.fingeringSVG(inst.fingeringType, q.prompt.fingeringState, inst.accentColor, 100)}</div>`;
  } else if (q.quizType === QUIZ_TYPES.NOTE_TO_FINGERING) {
    promptHtml = `<div class="quiz-prompt-note">${q.prompt.noteName}<span style="font-size:24px;color:var(--text-muted);vertical-align:super">${q.prompt.octave}</span></div>`;
  } else if (q.quizType === QUIZ_TYPES.STAFF_TO_NOTE) {
    promptHtml = `<div class="quiz-prompt-svg">${Graphics.staffSVG({ pos: q.prompt.staffStep, accidental: q.prompt.accidental, clef: inst.clef, accentColor: inst.accentColor, width: 100 })}</div>`;
  } else if (q.quizType === QUIZ_TYPES.NOTE_TO_STAFF) {
    promptHtml = `<div class="quiz-prompt-note">${q.prompt.noteName}<span style="font-size:24px;color:var(--text-muted);vertical-align:super">${q.prompt.octave}</span></div>`;
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
      content = `<div class="quiz-option-note">${opt.noteName}<span style="font-size:18px;color:var(--text-muted);vertical-align:super">${opt.octave}</span></div>`;
    } else if (q.quizType === QUIZ_TYPES.NOTE_TO_FINGERING) {
      content = `<div class="quiz-option-svg">${Graphics.fingeringSVG(inst.fingeringType, opt.fingeringState, inst.accentColor, 72)}</div>`;
    } else if (q.quizType === QUIZ_TYPES.STAFF_TO_NOTE) {
      cls += ' text-only';
      content = `<div class="quiz-option-note">${opt.noteName}<span style="font-size:18px;color:var(--text-muted);vertical-align:super">${opt.octave}</span></div>`;
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
    : 'Continue';

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

function renderPlayPhase(inst, lesson) {
  const fingeringSvg = Graphics.fingeringSVG(inst.fingeringType, lesson.fingeringState, inst.accentColor, 120);
  const cells = [1, 2, 3, 4].map(n => `<div class="beat-cell count-in" data-beat="${n}"><span class="beat-num">${n}</span></div>`).join('');
  const playCell = `<div class="beat-cell" data-beat="play">♪</div>`;
  const metActive = APP.metronome ? APP.metronome.on : false;
  const metBpm = APP.metronome ? APP.metronome.bpm : 80;
  const metCls = metActive ? 'btn btn-secondary met-active' : 'btn btn-secondary';

  return `
    <div class="lesson-body">
      <div class="lesson-instruction">Play it on your instrument</div>
      <div class="play-layout">
        <div class="play-diagram-large">
          ${fingeringSvg}
          <span class="play-note-label">${lesson.noteName}${lesson.octave}</span>
        </div>
        <div class="beat-grid">${cells}${playCell}</div>
        <div class="play-status" id="play-status">Tap Start, then play along on the count.</div>
        <button class="btn btn-secondary" data-action="play-start" id="play-start-btn">▶ Start count-in</button>
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
          <span class="review-note-name">${note.noteName}${note.octave}</span>
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
  const alreadyDone = !!APP.progress[APP.instrumentId]?.completed[lesson.id];

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
let metIntervalId = null;

function startMetronome() {
  if (!APP.metronome) APP.metronome = { on: false, bpm: 80 };
  if (metIntervalId) { clearInterval(metIntervalId); metIntervalId = null; }
  AudioEngine.unlock();
  APP.metronome.on = true;
  const ms = 60000 / APP.metronome.bpm;
  let beat = 0;
  metIntervalId = setInterval(() => {
    AudioEngine.playClick(beat === 0);
    beat = (beat + 1) % 4;
  }, ms);
}

function stopMetronome() {
  if (metIntervalId) { clearInterval(metIntervalId); metIntervalId = null; }
  if (APP.metronome) APP.metronome.on = false;
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
    noteDisplay = `<div class="game-result">${state.showingResult ? '✓' : '✗'} ${current.noteName}${current.octave}</div>`;
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
function render() {
  const app = document.getElementById('app');
  if (APP.screen === 'select') app.innerHTML = renderSelectScreen();
  else if (APP.screen === 'map') app.innerHTML = renderMapScreen();
  else if (APP.screen === 'lesson') app.innerHTML = renderLessonScreen();
  else if (APP.screen === 'settings') app.innerHTML = renderSettingsScreen();
  else if (APP.screen === 'analytics') app.innerHTML = renderAnalyticsScreen();
  else if (APP.screen === 'game') app.innerHTML = renderGameScreen();
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
  const beatMs = 280;
  const cells = document.querySelectorAll('.beat-cell');

  function clearActive() { cells.forEach(c => c.classList.remove('active')); }

  if (listenOnly) {
    // ── Listen phase: Prelude demonstrates the note ───────────────────
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

// ── SONG SEQUENCE ──────────────────────────────────────────────────────
function runSongSequence(inst, lesson) {
  const noteIds = lesson.noteIds;
  const msPerBeat = 480;
  noteIds.forEach((id, i) => {
    const note = findLessonById(APP.instrumentId, id);
    setTimeout(() => {
      AudioEngine.playInstrumentNote(note.freq, inst.fingeringType, 0.45);
    }, i * msPerBeat);
  });
}

// ── SONG KARAOKE PLAYBACK ──────────────────────────────────────────────
function runSongPlayback(inst, lesson) {
  if (APP.songPlayback && APP.songPlayback.active) return;
  AudioEngine.unlock();
  const notes = lesson.noteIds.map(id => findLessonById(APP.instrumentId, id));
  const msPerBeat = 480;

  APP.songPlayback = { active: true, index: -1, timer: null, finished: false };
  if (APP.songPlayback.timer) clearTimeout(APP.songPlayback.timer);

  const container = document.getElementById('song-score-container');
  const accentColor = inst.accentColor;

  function step(i) {
    if (i >= notes.length) {
      APP.songPlayback.active = false;
      APP.songPlayback.finished = true;
      render();
      return;
    }

    // Clear previous highlight
    if (container) {
      container.querySelectorAll('[data-note-index] ellipse').forEach(el => {
        el.setAttribute('fill', accentColor);
      });
    }

    // Highlight current note
    if (container) {
      const g = container.querySelector(`[data-note-index="${i}"]`);
      if (g) {
        const ellipse = g.querySelector('ellipse');
        if (ellipse) ellipse.setAttribute('fill', '#FFD166');
        g.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    // Play note
    const note = notes[i];
    AudioEngine.playInstrumentNote(note.freq, inst.fingeringType, 0.45);

    APP.songPlayback.timer = setTimeout(() => step(i + 1), msPerBeat);
  }

  // Start after a short pre-count
  APP.songPlayback.timer = setTimeout(() => step(0), 300);
}

// ── EVENT HANDLING ─────────────────────────────────────────────────────
function handleAction(action, el) {
  switch (action) {

    case 'select-instrument': {
      const id = el.dataset.id;
      const inst = getInstrument(id);
      if (!inst.available) { showToast(`${inst.name} is coming soon!`); return; }
      APP.instrumentId = id;
      APP.screen = 'map';
      render();
      break;
    }

    case 'go-select':
      APP.screen = 'select';
      render();
      break;

    case 'open-lesson': {
      const idx = parseInt(el.dataset.index, 10);
      APP.lessonIndex = idx;
      const lesson = getLesson(APP.instrumentId, idx);
      APP.play = { running: false, hasPlayed: false, hasListened: false };

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

    case 'exit-lesson':
      APP.reviewQueue = null;
      APP.reviewIndex = 0;
      APP.reviewCorrect = 0;
      APP.reviewTotal = 0;
      if (APP.songPlayback && APP.songPlayback.timer) clearTimeout(APP.songPlayback.timer);
      APP.songPlayback = null;
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
      } else {
        q.wrongIds.push(tappedId);
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
        prog.completed[lesson.id] = { stars: Math.max(stars, prevStars) };
        prog.xp += xp;
        saveProgress();
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
      // ── Regular lesson ───────────────────────────────────────────
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
      const q = APP.quiz;
      const mistakes = q ? q.wrongIds.length : 0;
      const stars = mistakes === 0 ? 3 : (mistakes <= 2 ? 2 : 1);
      const xp = 10 + (stars * 5);
      APP.lastStars = stars;
      APP.lastXp = xp;

      const prog = getInstrumentProgress(APP.instrumentId);
      const lesson = getLesson(APP.instrumentId, APP.lessonIndex);
      recordLessonComplete(lesson.id, 'lesson', xp, stars);
      const prevStars = prog.completed[lesson.id] ? prog.completed[lesson.id].stars : 0;
      prog.completed[lesson.id] = { stars: Math.max(stars, prevStars) };
      prog.xp += xp;
      saveProgress();

      APP.phase = 'complete';
      render();
      break;
    }

    case 'finish-lesson':
      APP.reviewQueue = null;
      APP.reviewIndex = 0;
      APP.reviewCorrect = 0;
      APP.reviewTotal = 0;
      if (APP.songPlayback && APP.songPlayback.timer) clearTimeout(APP.songPlayback.timer);
      APP.songPlayback = null;
      APP.screen = 'map';
      render();
      break;

    // ── Settings ──────────────────────────────────────────────────────
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
    case 'toggle-metronome': {
      if (!APP.metronome) APP.metronome = { on: false, bpm: 80 };
      if (APP.metronome.on) {
        stopMetronome();
      } else {
        startMetronome();
      }
      render();
      break;
    }

    case 'set-bpm': {
      const bpm = parseInt(el.value, 10);
      if (!APP.metronome) APP.metronome = { on: false, bpm: 80 };
      const wasOn = APP.metronome.on;
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

// ── INIT ───────────────────────────────────────────────────────────────
loadProgress();
if (!getStudentName()) showNamePrompt();
render();
