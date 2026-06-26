// curriculum.js
// Instrument and lesson data for Prelude for Recorder
//
// staffStep: treble clef position where 0 = E4 (bottom line)
//   Each diatonic step UP = +1. Lines are at steps 0,2,4,6,8.
//   E4=0, F4=1, G4=2, A4=3, B4=4, C5=5, D5=6, E5=7, F5=8
//   G5=9, A5=10(ledger above), B5=11, C6=12(ledger above)
//   Middle C (C4) = -2 (ledger line below)
//
// freq: concert pitch in Hz (what the app synthesises)
//
// fingeringState for recorder: [thumb, h1, h2, h3, h4, h5, h6, h7]
//   true = hole covered, false = open
//
// fingeringState for trumpet/euphonium: [v1, v2, v3]
//   true = valve pressed

const CURRICULUM = {

  // ── SOPRANO RECORDER ────────────────────────────────────────────────────
  'soprano-recorder': {
    id: 'soprano-recorder',
    name: 'Soprano Recorder',
    shortName: 'Soprano',
    clef: 'treble',
    fingeringType: 'recorder',
    isTransposing: false,
    accentColor: '#C4832A',
    available: true,
    lessons: [
      {
        id: 'sr-1',
        noteName: 'B',
        octave: 5,
        staffStep: 4,
        accidental: null,
        freq: 987.77,
        fingeringState: [true, true, false, false, false, false, false, false],
        description: 'Your very first note! Just two fingers.',
        prompt: 'Cover the thumb hole (back) and hole 1. Leave everything else open.'
      },
      {
        id: 'sr-2',
        noteName: 'A',
        octave: 5,
        staffStep: 3,
        accidental: null,
        freq: 880.00,
        fingeringState: [true, true, true, false, false, false, false, false],
        description: 'Add one more finger for A.',
        prompt: 'Cover thumb, hole 1, and hole 2. Right hand stays relaxed and open.'
      },
      {
        id: 'sr-3',
        noteName: 'G',
        octave: 5,
        staffStep: 2,
        accidental: null,
        freq: 784.00,
        fingeringState: [true, true, true, true, false, false, false, false],
        description: 'G adds your ring finger. You now know BAG!',
        prompt: 'Cover thumb + holes 1, 2, 3. Right hand open. Blow gently and evenly.'
      },
      {
        id: 'sr-song-1', type: 'song',
        noteName: 'Hot Cross Buns',
        prerequisiteIds: ['sr-1', 'sr-2', 'sr-3'],
        description: 'A classic English nursery rhyme using B, A, and G.',
        prompt: 'Step through each note of the melody, then play along!',
        keySig: 1, timeSig: { num: 4, den: 4 },
        noteIds: ['sr-1', 'sr-2', 'sr-3', 'sr-1', 'sr-2', 'sr-3', 'sr-3', 'sr-3', 'sr-3', 'sr-3', 'sr-2', 'sr-2', 'sr-2', 'sr-2', 'sr-1', 'sr-2', 'sr-3'],
        durations: ['h', 'h', 'w', 'h', 'h', 'w', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'h', 'h', 'w'],
        pianoChords: ['G','D7','G','G','D7','G','G','G','G/B','G/B','Am','Am','G/B','C','G','D7','G'],
        accompaniment: { url: 'audio/hcb-piano.mp3', bpm: 80 },
      },
      {
        id: 'sr-song-2', type: 'song',
        noteName: 'Merrily We Roll Along',
        prerequisiteIds: ['sr-1', 'sr-2', 'sr-3'],
        description: 'The tune behind "Mary Had a Little Lamb" using B, A, and G.',
        prompt: 'Listen for the repeating three-note pattern!',
        keySig: 1, timeSig: { num: 4, den: 4 },
        noteIds: ['sr-1', 'sr-2', 'sr-3', 'sr-2', 'sr-1', 'sr-1', 'sr-1', 'sr-2', 'sr-2', 'sr-2', 'sr-1', 'sr-1', 'sr-1', 'sr-1', 'sr-2', 'sr-3', 'sr-2', 'sr-1', 'sr-1', 'sr-1', 'sr-1', 'sr-2', 'sr-2', 'sr-1', 'sr-2', 'sr-3'],
        durations: ['q', 'q', 'q', 'q', 'q', 'q', 'h', 'q', 'q', 'h', 'q', 'q', 'h', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'w'],
      },
      {
        id: 'sr-4',
        noteName: 'E',
        octave: 5,
        staffStep: 0,
        accidental: null,
        freq: 659.25,
        fingeringState: [true, true, true, true, true, true, false, false],
        description: 'E uses both hands. Keep a relaxed grip!',
        prompt: 'Cover thumb + holes 1 through 5. Holes 6 and 7 stay open. Left + right hands now working together.'
      },
      {
        id: 'sr-song-3', type: 'song',
        noteName: 'Lightly Row',
        prerequisiteIds: ['sr-1', 'sr-2', 'sr-3', 'sr-4'],
        description: 'A traditional German folk song using B, A, G, and E.',
        prompt: 'This song adds E to your note set. Step through gently!',
        noteIds: ['sr-3', 'sr-3', 'sr-2', 'sr-1', 'sr-2', 'sr-3', 'sr-2', 'sr-1', 'sr-2', 'sr-3', 'sr-4', 'sr-3', 'sr-2', 'sr-1', 'sr-1', 'sr-2', 'sr-3', 'sr-2', 'sr-1', 'sr-2', 'sr-3', 'sr-4'],
      },
      {
        id: 'sr-5',
        noteName: 'D',
        octave: 5,
        staffStep: -1,
        accidental: null,
        freq: 587.33,
        fingeringState: [true, true, true, true, true, true, true, false],
        description: 'D is almost all covered — just leave hole 7 open.',
        prompt: 'Cover thumb + holes 1–6. Only hole 7 (your pinky) stays open. Listen carefully for a warm, clear tone.'
      },
      {
        id: 'sr-song-5', type: 'song',
        noteName: 'Amazing Grace',
        prerequisiteIds: ['sr-1', 'sr-2', 'sr-3', 'sr-4', 'sr-5'],
        description: 'A beloved hymn using B, A, G, E, and D.',
        prompt: 'Your first five-note melody! Take it slowly and feel the phrases.',
        noteIds: ['sr-3', 'sr-3', 'sr-2', 'sr-1', 'sr-2', 'sr-3', 'sr-4', 'sr-3', 'sr-2', 'sr-1', 'sr-5', 'sr-5', 'sr-5', 'sr-5', 'sr-1', 'sr-2', 'sr-3', 'sr-4', 'sr-3', 'sr-2', 'sr-1', 'sr-2', 'sr-3'],
      },
      {
        id: 'sr-review-1',
        type: 'review',
        reviewLessonIds: ['sr-1', 'sr-2', 'sr-3', 'sr-4', 'sr-5'],
        noteName: 'Review 1',
        description: 'Mix up your first five notes — B, A, G, E, and D.',
        prompt: '',
      },
      {
        id: 'sr-6',
        noteName: 'C',
        octave: 5,
        staffStep: -2,
        accidental: null,
        freq: 523.25,
        fingeringState: [true, true, true, true, true, true, true, true],
        description: 'The bottom of the soprano\'s basic range — all holes covered.',
        prompt: 'Cover everything: thumb + holes 1 through 7. Blow gently and evenly. This is your lowest note.'
      },
      {
        id: 'sr-7',
        noteName: 'F',
        octave: 5,
        staffStep: 1,
        accidental: null,
        freq: 698.46,
        fingeringState: [true, true, true, true, true, false, true, false],
        description: 'F uses a special forked fingering — hole 5 stays open.',
        prompt: 'Cover thumb + holes 1, 2, 3, 4, and 6. Leave holes 5 and 7 open. This "fork" takes practice to get clean.'
      },
      {
        id: 'sr-song-6', type: 'song',
        noteName: "Kum Ba Yah",
        prerequisiteIds: ['sr-2', 'sr-3', 'sr-7'],
        description: 'An African-American spiritual using F, G, and A on the soprano.',
        prompt: 'Your first song with the forked F! Listen for the call-and-response shape.',
        noteIds: ['sr-7', 'sr-7', 'sr-2', 'sr-2', 'sr-3', 'sr-3', 'sr-7', 'sr-7', 'sr-7', 'sr-2', 'sr-2', 'sr-3', 'sr-3', 'sr-7', 'sr-2', 'sr-3', 'sr-7', 'sr-2', 'sr-3', 'sr-7'],
      },
      {
        id: 'sr-song-7', type: 'song',
        noteName: "Row, Row, Row Your Boat",
        prerequisiteIds: ['sr-2', 'sr-3', 'sr-4', 'sr-5', 'sr-6', 'sr-7'],
        description: 'A classic round using C, D, E, F, G, and A on the soprano.',
        prompt: 'Sing along in your head as you play each note!',
        noteIds: ['sr-6', 'sr-6', 'sr-6', 'sr-5', 'sr-4', 'sr-4', 'sr-5', 'sr-4', 'sr-7', 'sr-3', 'sr-3', 'sr-2', 'sr-3', 'sr-7', 'sr-4', 'sr-5', 'sr-6'],
      },
      {
        id: 'sr-song-4', type: 'song',
        noteName: "Au Clair de la Lune",
        prerequisiteIds: ['sr-4', 'sr-5', 'sr-6'],
        description: 'A classic French folk melody using C, D, and E.',
        prompt: 'Your first song with low C, D, and E. Take it slowly!',
        noteIds: ['sr-6', 'sr-6', 'sr-6', 'sr-5', 'sr-5', 'sr-5', 'sr-4', 'sr-6', 'sr-5', 'sr-4', 'sr-4', 'sr-5', 'sr-5', 'sr-5', 'sr-6', 'sr-4', 'sr-5', 'sr-6'],
      },
      {
        id: 'sr-8',
        noteName: 'C',
        octave: 6,
        staffStep: 5,
        accidental: null,
        freq: 1046.50,
        fingeringState: [false, false, true, false, false, false, false, false],
        description: 'Your first high note! Half-thumb + hole 2 for C6.',
        prompt: 'Partially open the thumb hole (pinch technique). Cover only hole 2. Fast, focused air.'
      },
      {
        id: 'sr-review-2',
        type: 'review',
        reviewLessonIds: ['sr-5', 'sr-6', 'sr-7', 'sr-8'],
        noteName: 'Review 2',
        description: 'Solidify D, C, F, and high C together.',
        prompt: '',
      },
      {
        id: 'sr-song-8', type: 'song',
        noteName: "C Major Scale Waltz",
        prerequisiteIds: ['sr-1', 'sr-2', 'sr-3', 'sr-4', 'sr-5', 'sr-6', 'sr-7', 'sr-8'],
        description: 'A full octave scale exercise from C5 up to C6 and back down.',
        prompt: 'Your first full octave! Play each step evenly and listen to every pitch.',
        noteIds: ['sr-6', 'sr-5', 'sr-4', 'sr-7', 'sr-3', 'sr-2', 'sr-1', 'sr-8', 'sr-1', 'sr-2', 'sr-3', 'sr-7', 'sr-4', 'sr-5', 'sr-6'],
      },
      {
        id: 'sr-song-9', type: 'song',
        noteName: 'Chord Practice',
        prerequisiteIds: ['sr-1', 'sr-2', 'sr-3', 'sr-4', 'sr-5', 'sr-6', 'sr-7', 'sr-8'],
        description: 'Practice G and D major chords behind a simple melody. The app plays both harmony notes — you only hear them, not see them.',
        prompt: 'Listen for the full chord sound as you play each melody note. Keep your air steady!',
        noteIds: ['sr-3', 'sr-3', 'sr-3', 'sr-3', 'sr-6', 'sr-6', 'sr-6', 'sr-6', 'sr-3', 'sr-3', 'sr-3', 'sr-3', 'sr-6', 'sr-6', 'sr-6', 'sr-3'],
        durations: ['q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q'],
        keySig: 0, timeSig: { num: 4, den: 4 },
        chordIds: [
          ['sr-1', 'sr-6'], ['sr-1', 'sr-6'], ['sr-1', 'sr-6'], ['sr-1', 'sr-6'],
          ['sr-2', 'sr-4'], ['sr-2', 'sr-4'], ['sr-2', 'sr-4'], ['sr-2', 'sr-4'],
          ['sr-1', 'sr-6'], ['sr-1', 'sr-6'], ['sr-1', 'sr-6'], ['sr-1', 'sr-6'],
          ['sr-2', 'sr-4'], ['sr-2', 'sr-4'], ['sr-2', 'sr-4'], ['sr-1', 'sr-6']
        ],
      },
      {
        id: 'sr-9',
        noteName: 'D',
        octave: 6,
        staffStep: 6,
        accidental: null,
        freq: 1174.66,
        fingeringState: [false, true, true, true, true, true, true, false],
        description: 'High D — same finger pattern as D5, but with half-thumb.',
        prompt: 'Half-thumb + holes 1 through 6 covered. Same left-hand pattern as low D but pinch the thumb hole open slightly.'
      },
      {
        id: 'sr-10',
        noteName: 'E',
        octave: 6,
        staffStep: 7,
        accidental: null,
        freq: 1318.51,
        fingeringState: [false, true, true, true, true, true, false, false],
        description: 'High E — keep your air fast and steady.',
        prompt: 'Half-thumb + holes 1 through 5. Same as E5 but with half-thumb. Firm embouchure, fast air stream.'
      },
      {
        id: 'sr-11',
        noteName: 'F',
        octave: 6,
        staffStep: 8,
        accidental: null,
        freq: 1396.91,
        fingeringState: [false, true, true, true, true, false, true, false],
        description: 'High F — the forked fingering again, now in the upper register.',
        prompt: 'Half-thumb + holes 1, 2, 3, 4, and 6. Holes 5 and 7 open. Same forked F pattern as F5, with half-thumb.'
      },
      {
        id: 'sr-12',
        noteName: 'G',
        octave: 6,
        staffStep: 9,
        accidental: null,
        freq: 1567.98,
        fingeringState: [false, true, true, true, false, false, false, false],
        description: 'High G — left hand only, half-thumb.',
        prompt: 'Half-thumb + holes 1, 2, 3. Right hand off completely. Blow with fast, focused air.'
      },
      {
        id: 'sr-review-3',
        type: 'review',
        reviewLessonIds: ['sr-9', 'sr-10', 'sr-11', 'sr-12'],
        noteName: 'Review 3',
        description: 'Lock in your upper register — D6 through G6.',
        prompt: '',
      },
    ]
  },

  // ── ALTO RECORDER (F) ──────────────────────────────────────────────────
  'alto-recorder': {
    id: 'alto-recorder', name: 'Alto Recorder', shortName: 'Alto',
    clef: 'treble', fingeringType: 'recorder', isTransposing: false, available: true, accentColor: '#7BAFC0',
    lessons: [
      {
        id: 'ar-1', noteName: 'E', octave: 4, staffStep: -7, accidental: null, freq: 329.63,
        fingeringState: [true, true, false, false, false, false, false, false],
        description: 'First alto note — just thumb and index. A bright, clear E.',
        prompt: 'Left thumb covers the back hole. Left index finger covers hole 1. Blow gently and evenly.'
      },
      {
        id: 'ar-2', noteName: 'D', octave: 4, staffStep: -8, accidental: null, freq: 293.66,
        fingeringState: [true, true, true, false, false, false, false, false],
        description: 'Add your left middle finger — now playing D.',
        prompt: 'Cover thumb + holes 1 and 2. Keep the air steady and listen for a warm, centered pitch.'
      },
      {
        id: 'ar-3', noteName: 'C', octave: 4, staffStep: -9, accidental: null, freq: 261.63,
        fingeringState: [true, true, true, true, false, false, false, false],
        description: 'C adds your left ring finger. Three fingers down.',
        prompt: 'Cover thumb + holes 1, 2, and 3. Right hand stays relaxed and open. This is middle C on the alto.'
      },
      {
        id: 'ar-song-1', type: 'song',
        noteName: 'Hot Cross Buns',
        prerequisiteIds: ['ar-1', 'ar-2', 'ar-3'],
        description: 'A classic English nursery rhyme using E, D, and C.',
        prompt: 'Step through each note. This melody works on any recorder!',
        keySig: 1, timeSig: { num: 4, den: 4 },
        noteIds: ['ar-1', 'ar-2', 'ar-3', 'ar-1', 'ar-2', 'ar-3', 'ar-3', 'ar-3', 'ar-3', 'ar-3', 'ar-2', 'ar-2', 'ar-2', 'ar-2', 'ar-1', 'ar-2', 'ar-3'],
        durations: ['h', 'h', 'w', 'h', 'h', 'w', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'h', 'h', 'w'],
        pianoChords: ['G','D7','G','G','D7','G','G','G','G/B','G/B','Am','Am','G/B','C','G','D7','G'],
        accompaniment: { url: 'audio/hcb-piano.mp3', bpm: 80 },
      },
      {
        id: 'ar-4', noteName: 'B', octave: 3, staffStep: -10, accidental: null, freq: 246.94,
        fingeringState: [true, true, true, true, true, false, false, false],
        description: 'B adds the fourth finger. A warm, woody tone.',
        prompt: 'Cover thumb + holes 1, 2, 3, and 4. Hole 5 stays open (forked B). Listen for the dark, covered sound.'
      },
      {
        id: 'ar-5', noteName: 'A', octave: 3, staffStep: -11, accidental: null, freq: 220.00,
        fingeringState: [true, true, true, true, true, true, false, false],
        description: 'A uses both hands now — thumb through hole 5.',
        prompt: 'Cover thumb + holes 1 through 5. Holes 6 and 7 stay open. Left and right hands working together for this lower note.'
      },
      {
        id: 'ar-song-2', type: 'song',
        noteName: 'Merrily We Roll Along',
        prerequisiteIds: ['ar-1', 'ar-2', 'ar-3', 'ar-4', 'ar-5'],
        description: 'The tune behind "Mary Had a Little Lamb" using E through A.',
        prompt: 'Your first full phrase on the alto! Listen for the repeating pattern.',
        keySig: 1, timeSig: { num: 4, den: 4 },
        noteIds: ['ar-1', 'ar-2', 'ar-3', 'ar-2', 'ar-1', 'ar-1', 'ar-1', 'ar-2', 'ar-2', 'ar-2', 'ar-1', 'ar-1', 'ar-1', 'ar-1', 'ar-2', 'ar-3', 'ar-2', 'ar-1', 'ar-1', 'ar-1', 'ar-1', 'ar-2', 'ar-2', 'ar-1', 'ar-2', 'ar-3'],
        durations: ['q', 'q', 'q', 'q', 'q', 'q', 'h', 'q', 'q', 'h', 'q', 'q', 'h', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'w'],
      },
      {
        id: 'ar-6', noteName: 'G', octave: 3, staffStep: -12, accidental: null, freq: 196.00,
        fingeringState: [true, true, true, true, true, true, true, false],
        description: 'G adds hole 6 — a rich, resonant note.',
        prompt: 'Cover thumb + holes 1 through 6. Only hole 7 stays open. Blow gently with warm, supported air.'
      },
      {
        id: 'ar-review-1', type: 'review',
        reviewLessonIds: ['ar-1', 'ar-2', 'ar-3', 'ar-4', 'ar-5', 'ar-6'],
        noteName: 'Review 1',
        description: 'Mix up your first six alto notes — E4 down to G3.',
        prompt: '',
      },
      {
        id: 'ar-7', noteName: 'F', octave: 3, staffStep: -13, accidental: null, freq: 174.61,
        fingeringState: [true, true, true, true, true, true, true, true],
        description: 'F — all holes covered. The bottom of the alto\'s range.',
        prompt: 'Cover everything: thumb + holes 1 through 7. Big, warm air for this deep, dark F.'
      },
      {
        id: 'ar-8', noteName: 'F', octave: 4, staffStep: -6, accidental: null, freq: 349.23,
        fingeringState: [false, true, true, true, true, true, true, true],
        description: 'Upper F — your first half-thumb note.',
        prompt: 'Pinch the thumb hole partially open. Keep all other holes covered. Fast, focused air for this upper F.'
      },
      {
        id: 'ar-song-3', type: 'song',
        noteName: "Au Clair de la Lune",
        prerequisiteIds: ['ar-1', 'ar-2', 'ar-3', 'ar-7', 'ar-8'],
        description: 'A classic French folk melody using C, D, and E on the alto.',
        prompt: 'Your first song combining the lower and upper registers!',
        noteIds: ['ar-3', 'ar-3', 'ar-3', 'ar-2', 'ar-2', 'ar-2', 'ar-1', 'ar-3', 'ar-2', 'ar-1', 'ar-1', 'ar-2', 'ar-2', 'ar-2', 'ar-3', 'ar-1', 'ar-2', 'ar-3'],
      },
      {
        id: 'ar-9', noteName: 'G', octave: 4, staffStep: -5, accidental: null, freq: 392.00,
        fingeringState: [false, true, true, true, true, true, true, false],
        description: 'Upper G — half-thumb + holes 1 through 6.',
        prompt: 'Half-thumb + holes 1 through 6. Same fingering as G3 but with the thumb pinched open.'
      },
      {
        id: 'ar-10', noteName: 'A', octave: 4, staffStep: -4, accidental: null, freq: 440.00,
        fingeringState: [false, true, true, true, true, true, false, false],
        description: 'Upper A — half-thumb + holes 1 through 5.',
        prompt: 'Half-thumb + holes 1 through 5. Keep your air fast and steady for this bright upper A.'
      },
      {
        id: 'ar-song-4', type: 'song',
        noteName: "Kum Ba Yah",
        prerequisiteIds: ['ar-8', 'ar-9', 'ar-10'],
        description: 'An African-American spiritual using F, G, and A in the upper register.',
        prompt: 'Your first upper-register melody! Bright, focused air.',
        noteIds: ['ar-8', 'ar-8', 'ar-10', 'ar-10', 'ar-9', 'ar-9', 'ar-8', 'ar-8', 'ar-8', 'ar-10', 'ar-10', 'ar-9', 'ar-9', 'ar-8', 'ar-10', 'ar-9', 'ar-8', 'ar-10', 'ar-9', 'ar-8'],
      },
      {
        id: 'ar-song-5', type: 'song',
        noteName: "Row, Row, Row Your Boat",
        prerequisiteIds: ['ar-1', 'ar-2', 'ar-3', 'ar-8', 'ar-9', 'ar-10'],
        description: 'A classic round spanning both lower and upper registers on the alto.',
        prompt: 'Jump between C4 and the upper register — a great ear-training challenge!',
        noteIds: ['ar-3', 'ar-3', 'ar-3', 'ar-2', 'ar-1', 'ar-1', 'ar-2', 'ar-1', 'ar-8', 'ar-9', 'ar-9', 'ar-10', 'ar-9', 'ar-8', 'ar-1', 'ar-2', 'ar-3'],
      },
      {
        id: 'ar-11', noteName: 'B', octave: 4, staffStep: -3, accidental: null, freq: 493.88,
        fingeringState: [false, true, true, true, true, false, false, false],
        description: 'Upper B — half-thumb + holes 1 through 4.',
        prompt: 'Half-thumb + holes 1, 2, 3, 4. Hole 5 stays open (forked). Bright and focused.'
      },
      {
        id: 'ar-review-2', type: 'review',
        reviewLessonIds: ['ar-7', 'ar-8', 'ar-9', 'ar-10', 'ar-11'],
        noteName: 'Review 2',
        description: 'Bring together your lowest and highest alto notes.',
        prompt: '',
      },
      {
        id: 'ar-12', noteName: 'C', octave: 5, staffStep: -2, accidental: null, freq: 523.25,
        fingeringState: [false, true, true, true, false, false, false, false],
        description: 'Upper C — half-thumb + holes 1, 2, 3.',
        prompt: 'Half-thumb + holes 1, 2, 3. Right hand off completely. Clean, clear air for this high C.'
      },
      {
        id: 'ar-song-6', type: 'song',
        noteName: "C Major Scale Waltz",
        prerequisiteIds: ['ar-1', 'ar-2', 'ar-3', 'ar-8', 'ar-9', 'ar-10', 'ar-11', 'ar-12'],
        description: 'A full octave scale exercise from C4 up to C5 and back down.',
        prompt: 'Your first full octave on alto! Play each step evenly and listen to every pitch.',
        noteIds: ['ar-3', 'ar-2', 'ar-1', 'ar-8', 'ar-9', 'ar-10', 'ar-11', 'ar-12', 'ar-12', 'ar-11', 'ar-10', 'ar-9', 'ar-8', 'ar-1', 'ar-2', 'ar-3'],
      },
      {
        id: 'ar-13', noteName: 'D', octave: 5, staffStep: -1, accidental: null, freq: 587.33,
        fingeringState: [false, true, true, false, false, false, false, false],
        description: 'Upper D — half-thumb + holes 1, 2.',
        prompt: 'Half-thumb + holes 1 and 2. The air needs to be fast and focused for these higher notes.'
      },
      {
        id: 'ar-14', noteName: 'E', octave: 5, staffStep: 0, accidental: null, freq: 659.25,
        fingeringState: [false, true, false, false, false, false, false, false],
        description: 'Upper E — half-thumb + hole 1. Highest note so far.',
        prompt: 'Half-thumb + hole 1 only. Maximum air speed with a relaxed embouchure for this sparkling high E.'
      },
      {
        id: 'ar-review-3', type: 'review',
        reviewLessonIds: ['ar-12', 'ar-13', 'ar-14'],
        noteName: 'Review 3',
        description: 'Lock in your upper register — C5 through E5.',
        prompt: '',
      },
    ]
  },

  // ── TENOR RECORDER (C) ─────────────────────────────────────────────────
  'tenor-recorder': {
    id: 'tenor-recorder', name: 'Tenor Recorder', shortName: 'Tenor',
    clef: 'treble', fingeringType: 'recorder', isTransposing: false, available: true, accentColor: '#C4832A',
    lessons: [
      {
        id: 'tn-1', noteName: 'B', octave: 3, staffStep: -3, accidental: null, freq: 246.94,
        fingeringState: [true, true, false, false, false, false, false, false],
        description: 'Your first tenor note! B3 — thumb and index only.',
        prompt: 'Left thumb covers the back hole. Left index covers hole 1. The larger tenor needs a gentle, warm stream of air.'
      },
      {
        id: 'tn-2', noteName: 'A', octave: 3, staffStep: -4, accidental: null, freq: 220.00,
        fingeringState: [true, true, true, false, false, false, false, false],
        description: 'A adds your left middle finger. Getting warmer.',
        prompt: 'Cover thumb + holes 1 and 2. Relax your embouchure and let the air flow freely.'
      },
      {
        id: 'tn-3', noteName: 'G', octave: 3, staffStep: -5, accidental: null, freq: 196.00,
        fingeringState: [true, true, true, true, false, false, false, false],
        description: 'G uses all three left-hand fingers.',
        prompt: 'Cover thumb + holes 1, 2, 3. Right hand stays open. Support the breath from your diaphragm.'
      },
      {
        id: 'tn-song-1', type: 'song',
        noteName: 'Hot Cross Buns',
        prerequisiteIds: ['tn-1', 'tn-2', 'tn-3'],
        description: 'A classic English nursery rhyme using B, A, and G.',
        prompt: 'The same melody as the soprano, but on the larger tenor! Step through it slowly.',
        keySig: 1, timeSig: { num: 4, den: 4 },
        noteIds: ['tn-1', 'tn-2', 'tn-3', 'tn-1', 'tn-2', 'tn-3', 'tn-3', 'tn-3', 'tn-3', 'tn-3', 'tn-2', 'tn-2', 'tn-2', 'tn-2', 'tn-1', 'tn-2', 'tn-3'],
        durations: ['h', 'h', 'w', 'h', 'h', 'w', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'h', 'h', 'w'],
        pianoChords: ['G','D7','G','G','D7','G','G','G','G/B','G/B','Am','Am','G/B','C','G','D7','G'],
        accompaniment: { url: 'audio/hcb-piano.mp3', bpm: 80 },
      },
      {
        id: 'tn-4', noteName: 'E', octave: 3, staffStep: -7, accidental: null, freq: 164.81,
        fingeringState: [true, true, true, true, true, true, false, false],
        description: 'E uses both hands on this larger instrument.',
        prompt: 'Cover thumb + holes 1 through 5. Holes 6 and 7 stay open. The tenor E has a rich, reedy quality.'
      },
      {
        id: 'tn-5', noteName: 'D', octave: 3, staffStep: -8, accidental: null, freq: 146.83,
        fingeringState: [true, true, true, true, true, true, true, false],
        description: 'D — almost all covered. Your lowest tenor note yet.',
        prompt: 'Cover thumb + holes 1 through 6. Only hole 7 stays open. Use warm, abundant air for this low, resonant D.'
      },
      {
        id: 'tn-song-2', type: 'song',
        noteName: 'Merrily We Roll Along',
        prerequisiteIds: ['tn-1', 'tn-2', 'tn-3', 'tn-4', 'tn-5'],
        description: 'The tune behind "Mary Had a Little Lamb" using B through D.',
        prompt: 'This song uses your tenor\'s lower register. Listen to the warm, full sound!',
        keySig: 1, timeSig: { num: 4, den: 4 },
        noteIds: ['tn-1', 'tn-2', 'tn-3', 'tn-2', 'tn-1', 'tn-1', 'tn-1', 'tn-2', 'tn-2', 'tn-2', 'tn-1', 'tn-1', 'tn-1', 'tn-1', 'tn-2', 'tn-3', 'tn-2', 'tn-1', 'tn-1', 'tn-1', 'tn-1', 'tn-2', 'tn-2', 'tn-1', 'tn-2', 'tn-3'],
        durations: ['q', 'q', 'q', 'q', 'q', 'q', 'h', 'q', 'q', 'h', 'q', 'q', 'h', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'w'],
      },
      {
        id: 'tn-review-1', type: 'review',
        reviewLessonIds: ['tn-1', 'tn-2', 'tn-3', 'tn-4', 'tn-5'],
        noteName: 'Review 1',
        description: 'Mix up your first five tenor notes — B3 down to D3.',
        prompt: '',
      },
      {
        id: 'tn-6', noteName: 'C', octave: 3, staffStep: -9, accidental: null, freq: 130.81,
        fingeringState: [true, true, true, true, true, true, true, true],
        description: 'C — all holes covered. The bottom of the tenor\'s range.',
        prompt: 'Cover everything: thumb + holes 1 through 7. This low C needs maximum air support. Deep breath!'
      },
      {
        id: 'tn-7', noteName: 'F', octave: 3, staffStep: -6, accidental: null, freq: 174.61,
        fingeringState: [true, true, true, true, true, false, true, false],
        description: 'F uses a special forked fingering — hole 5 stays open.',
        prompt: 'Cover thumb + holes 1, 2, 3, 4, and 6. Leave holes 5 and 7 open. This forked F fills the gap in your scale.'
      },
      {
        id: 'tn-song-4', type: 'song',
        noteName: "Kum Ba Yah",
        prerequisiteIds: ['tn-2', 'tn-3', 'tn-7'],
        description: 'An African-American spiritual using forked F, G, and A on the tenor.',
        prompt: 'Your first song with the forked F! Slow, warm air for these lower notes.',
        noteIds: ['tn-7', 'tn-7', 'tn-2', 'tn-2', 'tn-3', 'tn-3', 'tn-7', 'tn-7', 'tn-7', 'tn-2', 'tn-2', 'tn-3', 'tn-3', 'tn-7', 'tn-2', 'tn-3', 'tn-7', 'tn-2', 'tn-3', 'tn-7'],
      },
      {
        id: 'tn-song-5', type: 'song',
        noteName: "Row, Row, Row Your Boat",
        prerequisiteIds: ['tn-2', 'tn-3', 'tn-4', 'tn-5', 'tn-6', 'tn-7'],
        description: 'A classic round using the full lower register of the tenor.',
        prompt: 'This song spans your lowest notes. Support each one with steady air!',
        noteIds: ['tn-6', 'tn-6', 'tn-6', 'tn-5', 'tn-4', 'tn-4', 'tn-5', 'tn-4', 'tn-7', 'tn-3', 'tn-3', 'tn-2', 'tn-3', 'tn-7', 'tn-4', 'tn-5', 'tn-6'],
      },
      {
        id: 'tn-8', noteName: 'C', octave: 4, staffStep: -2, accidental: null, freq: 261.63,
        fingeringState: [false, false, true, false, false, false, false, false],
        description: 'Your first half-thumb note! Middle C on the tenor.',
        prompt: 'Partially open the thumb hole (pinch). Cover only hole 3. Fast, focused air for this clear middle C.'
      },
      {
        id: 'tn-song-6', type: 'song',
        noteName: "C Major Scale Waltz",
        prerequisiteIds: ['tn-1', 'tn-2', 'tn-3', 'tn-4', 'tn-5', 'tn-6', 'tn-7', 'tn-8'],
        description: 'A full octave scale exercise from C3 up to C4 and back down.',
        prompt: 'Your first full octave on tenor! Feel the leap from C3 up to middle C.',
        noteIds: ['tn-6', 'tn-5', 'tn-4', 'tn-7', 'tn-3', 'tn-2', 'tn-1', 'tn-8', 'tn-8', 'tn-1', 'tn-2', 'tn-3', 'tn-7', 'tn-4', 'tn-5', 'tn-6'],
      },
      {
        id: 'tn-song-3', type: 'song',
        noteName: "Au Clair de la Lune",
        prerequisiteIds: ['tn-4', 'tn-5', 'tn-6', 'tn-8'],
        description: 'A classic French folk melody using C, D, and E on the tenor.',
        prompt: 'Your first song crossing into the upper register on tenor!',
        noteIds: ['tn-6', 'tn-6', 'tn-6', 'tn-5', 'tn-5', 'tn-5', 'tn-4', 'tn-6', 'tn-5', 'tn-4', 'tn-4', 'tn-5', 'tn-5', 'tn-5', 'tn-6', 'tn-4', 'tn-5', 'tn-6'],
      },
      {
        id: 'tn-9', noteName: 'D', octave: 4, staffStep: -1, accidental: null, freq: 293.66,
        fingeringState: [false, true, true, true, true, true, true, false],
        description: 'Upper D — half-thumb + holes 1 through 6.',
        prompt: 'Half-thumb + holes 1 through 6. Same fingers as D3 but with the thumb pinched open. Warm, round sound.'
      },
      {
        id: 'tn-10', noteName: 'E', octave: 4, staffStep: 0, accidental: null, freq: 329.63,
        fingeringState: [false, true, true, true, true, true, false, false],
        description: 'Upper E — half-thumb + holes 1 through 5.',
        prompt: 'Half-thumb + holes 1 through 5. Keep your air stream steady and fast for this bright E.'
      },
      {
        id: 'tn-review-2', type: 'review',
        reviewLessonIds: ['tn-6', 'tn-7', 'tn-8', 'tn-9', 'tn-10'],
        noteName: 'Review 2',
        description: 'Solidify low C, forked F, and your first upper register notes.',
        prompt: '',
      },
      {
        id: 'tn-11', noteName: 'F', octave: 4, staffStep: 1, accidental: null, freq: 349.23,
        fingeringState: [false, true, true, true, true, false, true, false],
        description: 'Upper F — forked fingering with half-thumb.',
        prompt: 'Half-thumb + holes 1, 2, 3, 4, and 6. Holes 5 and 7 open. Same forked F pattern, now in the upper register.'
      },
      {
        id: 'tn-12', noteName: 'G', octave: 4, staffStep: 2, accidental: null, freq: 392.00,
        fingeringState: [false, true, true, true, false, false, false, false],
        description: 'Upper G — half-thumb + holes 1, 2, 3. Left hand only.',
        prompt: 'Half-thumb + holes 1, 2, 3. Right hand off completely. Your highest note yet on the tenor!'
      },
      {
        id: 'tn-review-3', type: 'review',
        reviewLessonIds: ['tn-11', 'tn-12'],
        noteName: 'Review 3',
        description: 'Lock in your upper register — F4 and G4.',
        prompt: '',
      },
    ]
  },

  // ── BASS RECORDER (bass clef) ──────────────────────────────────────────
  'bass-recorder': {
    id: 'bass-recorder', name: 'Bass Recorder', shortName: 'Bass',
    clef: 'bass', fingeringType: 'recorder', isTransposing: false, available: true, accentColor: '#7A5C30',
    lessons: [
      {
        id: 'br-1', noteName: 'E', octave: 3, staffStep: 5, accidental: null, freq: 164.81,
        fingeringState: [true, true, false, false, false, false, false, false],
        description: 'First bass note — E3. Big breath, slow air.',
        prompt: 'Left thumb covers the back hole. Left index covers hole 1. Take a deep breath and blow a slow, wide stream of air.'
      },
      {
        id: 'br-2', noteName: 'D', octave: 3, staffStep: 4, accidental: null, freq: 146.83,
        fingeringState: [true, true, true, false, false, false, false, false],
        description: 'D adds your left middle finger.',
        prompt: 'Cover thumb + holes 1 and 2. Relax the embouchure and feel the reed-like vibration of these low notes.'
      },
      {
        id: 'br-3', noteName: 'C', octave: 3, staffStep: 3, accidental: null, freq: 130.81,
        fingeringState: [true, true, true, true, false, false, false, false],
        description: 'C uses all three left-hand fingers.',
        prompt: 'Cover thumb + holes 1, 2, 3. Right hand stays open. Support deeply from the diaphragm for this low, dark note.'
      },
      {
        id: 'br-song-1', type: 'song',
        noteName: 'Hot Cross Buns',
        prerequisiteIds: ['br-1', 'br-2', 'br-3'],
        description: 'A classic English nursery rhyme using E, D, and C on the bass.',
        prompt: 'Step through the melody slowly. The bass needs lots of air!',
        keySig: 1, timeSig: { num: 4, den: 4 },
        noteIds: ['br-1', 'br-2', 'br-3', 'br-1', 'br-2', 'br-3', 'br-3', 'br-3', 'br-3', 'br-3', 'br-2', 'br-2', 'br-2', 'br-2', 'br-1', 'br-2', 'br-3'],
        durations: ['h', 'h', 'w', 'h', 'h', 'w', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'h', 'h', 'w'],
        pianoChords: ['G','D7','G','G','D7','G','G','G','G/B','G/B','Am','Am','G/B','C','G','D7','G'],
        accompaniment: { url: 'audio/hcb-piano.mp3', bpm: 80 },
      },
      {
        id: 'br-4', noteName: 'B', octave: 2, staffStep: 2, accidental: null, freq: 123.47,
        fingeringState: [true, true, true, true, true, false, false, false],
        description: 'B2 — forked fingering. Four fingers down.',
        prompt: 'Cover thumb + holes 1, 2, 3, and 4. Hole 5 stays open. This forked B has a dark, rich colour.'
      },
      {
        id: 'br-5', noteName: 'A', octave: 2, staffStep: 1, accidental: null, freq: 110.00,
        fingeringState: [true, true, true, true, true, true, false, false],
        description: 'A2 — both hands now. Thumb through hole 5.',
        prompt: 'Cover thumb + holes 1 through 5. Holes 6 and 7 open. This low A needs generous, steady air.'
      },
      {
        id: 'br-6', noteName: 'G', octave: 2, staffStep: 0, accidental: null, freq: 98.00,
        fingeringState: [true, true, true, true, true, true, true, false],
        description: 'G2 — almost all covered. Deep and resonant.',
        prompt: 'Cover thumb + holes 1 through 6. Only hole 7 stays open. Max air, relaxed embouchure for this low G.'
      },
      {
        id: 'br-song-2', type: 'song',
        noteName: 'Merrily We Roll Along',
        prerequisiteIds: ['br-1', 'br-2', 'br-3', 'br-4', 'br-5', 'br-6'],
        description: 'The tune behind "Mary Had a Little Lamb" using E through G.',
        prompt: 'Your first full melody on the bass recorder! Big, warm air throughout.',
        keySig: 1, timeSig: { num: 4, den: 4 },
        noteIds: ['br-1', 'br-2', 'br-3', 'br-2', 'br-1', 'br-1', 'br-1', 'br-2', 'br-2', 'br-2', 'br-1', 'br-1', 'br-1', 'br-1', 'br-2', 'br-3', 'br-2', 'br-1', 'br-1', 'br-1', 'br-1', 'br-2', 'br-2', 'br-1', 'br-2', 'br-3'],
        durations: ['q', 'q', 'q', 'q', 'q', 'q', 'h', 'q', 'q', 'h', 'q', 'q', 'h', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'w'],
      },
      {
        id: 'br-review-1', type: 'review',
        reviewLessonIds: ['br-1', 'br-2', 'br-3', 'br-4', 'br-5', 'br-6'],
        noteName: 'Review 1',
        description: 'Mix up your first six bass notes — E3 down to G2.',
        prompt: '',
      },
      {
        id: 'br-7', noteName: 'F', octave: 2, staffStep: -1, accidental: null, freq: 87.31,
        fingeringState: [true, true, true, true, true, true, true, true],
        description: 'F2 — all holes covered. The bottom of the bass recorder.',
        prompt: 'Cover everything: thumb + holes 1 through 7. This is your lowest note. Maximum air, very relaxed embouchure.'
      },
      {
        id: 'br-8', noteName: 'F', octave: 3, staffStep: 6, accidental: null, freq: 174.61,
        fingeringState: [false, true, true, true, true, true, true, true],
        description: 'Upper F — your first half-thumb note on the bass.',
        prompt: 'Pinch the thumb hole partially open. Keep all other holes covered. Fast, focused air for this upper register F.'
      },
      {
        id: 'br-9', noteName: 'G', octave: 3, staffStep: 7, accidental: null, freq: 196.00,
        fingeringState: [false, true, true, true, true, true, true, false],
        description: 'Upper G — half-thumb + holes 1 through 6.',
        prompt: 'Half-thumb + holes 1 through 6. Same fingering as G2 but with the thumb pinched open. A bright, singing sound.'
      },
      {
        id: 'br-song-3', type: 'song',
        noteName: "Au Clair de la Lune",
        prerequisiteIds: ['br-1', 'br-2', 'br-3', 'br-7', 'br-8'],
        description: 'A classic French folk melody using C, D, and E on the bass.',
        prompt: 'Your first song mixing the deep bass register with the upper octave!',
        noteIds: ['br-3', 'br-3', 'br-3', 'br-2', 'br-2', 'br-2', 'br-1', 'br-3', 'br-2', 'br-1', 'br-1', 'br-2', 'br-2', 'br-2', 'br-3', 'br-1', 'br-2', 'br-3'],
      },
      {
        id: 'br-10', noteName: 'A', octave: 3, staffStep: 8, accidental: null, freq: 220.00,
        fingeringState: [false, true, true, true, true, true, false, false],
        description: 'Upper A — half-thumb + holes 1 through 5.',
        prompt: 'Half-thumb + holes 1 through 5. Keep your air fast and steady. This bright A sits above the bass staff.'
      },
      {
        id: 'br-11', noteName: 'B', octave: 3, staffStep: 9, accidental: null, freq: 246.94,
        fingeringState: [false, true, true, true, true, false, false, false],
        description: 'Upper B — half-thumb + holes 1 through 4, forked.',
        prompt: 'Half-thumb + holes 1, 2, 3, 4. Hole 5 stays open (forked). Light, focused air for this high B.'
      },
      {
        id: 'br-review-2', type: 'review',
        reviewLessonIds: ['br-7', 'br-8', 'br-9', 'br-10', 'br-11'],
        noteName: 'Review 2',
        description: 'Bring together your lowest and highest bass notes.',
        prompt: '',
      },
      {
        id: 'br-12', noteName: 'C', octave: 4, staffStep: 10, accidental: null, freq: 261.63,
        fingeringState: [false, true, true, true, false, false, false, false],
        description: 'Upper C — half-thumb + holes 1, 2, 3. Highest note.',
        prompt: 'Half-thumb + holes 1, 2, 3. Right hand off. Maximum air speed for this sparkling high C on the bass!'
      },
      {
        id: 'br-review-3', type: 'review',
        reviewLessonIds: ['br-12'],
        noteName: 'Review 3',
        description: 'Master your highest bass note — C4!',
        prompt: '',
      },
    ]
  },

};

// Ordered list for the home screen
const INSTRUMENT_ORDER = [
  'soprano-recorder', 'alto-recorder', 'tenor-recorder', 'bass-recorder'
];
