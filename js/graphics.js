// graphics.js
// Generates all visual elements as inline SVG strings — no image assets.
// Three families: staff notation, fingering diagrams, and the home-screen
// instrument icon set (a small custom line-icon system).

const Graphics = (() => {

  const HALF = 8;           // px per diatonic staff step
  const STAFF_BOTTOM_Y = 140; // y of pos0 (E4, bottom line)
  const STAFF_LEFT_X = 30;
  const STAFF_RIGHT_X = 105;

  function yForPos(pos) { return STAFF_BOTTOM_Y - pos * HALF; }

  function ledgerPositions(pos) {
    const out = [];
    if (pos > 8) {
      const maxL = (pos % 2 === 0) ? pos : pos - 1;
      for (let p = 10; p <= maxL; p += 2) out.push(p);
    } else if (pos < 0) {
      const minL = (pos % 2 === 0) ? pos : pos + 1;
      for (let p = -2; p >= minL; p -= 2) out.push(p);
    }
    return out;
  }

  // ── STAFF NOTATION ──────────────────────────────────────────────────────
  function staffSVG({ pos, accidental = null, clef = 'treble', accentColor = '#FF8C42', width = 130 }) {
    const noteX = (STAFF_LEFT_X + STAFF_RIGHT_X) / 2 + 8;
    const noteY = yForPos(pos);
    const stemUp = pos <= 4;
    const lineColor = '#524F70';
    const renderH = width * (220 / 130);

    let svg = `<svg viewBox="0 0 130 220" width="${width}" height="${renderH}" xmlns="http://www.w3.org/2000/svg">`;

    // Staff lines
    for (let i = 0; i <= 8; i += 2) {
      const y = yForPos(i);
      svg += `<line x1="${STAFF_LEFT_X}" y1="${y}" x2="${STAFF_RIGHT_X}" y2="${y}" stroke="${lineColor}" stroke-width="1.5"/>`;
    }

    // Clef glyph (G clef for treble; simplified bass clef dots+curve otherwise)
    if (clef === 'treble') {
      svg += `<text x="${STAFF_LEFT_X - 14}" y="${STAFF_BOTTOM_Y + 8}" font-size="130" font-family="Georgia, 'Apple Symbols', serif" fill="${lineColor}">&#119070;</text>`;
    } else {
      svg += `<text x="${STAFF_LEFT_X - 10}" y="${yForPos(3) + 10}" font-size="80" font-family="Georgia, 'Apple Symbols', serif" fill="${lineColor}">&#119074;</text>`;
    }

    // Ledger lines
    ledgerPositions(pos).forEach(p => {
      const y = yForPos(p);
      svg += `<line x1="${noteX - 12}" y1="${y}" x2="${noteX + 12}" y2="${y}" stroke="${lineColor}" stroke-width="1.5"/>`;
    });

    // Accidental
    if (accidental) {
      svg += `<text x="${noteX - 24}" y="${noteY + 6}" font-size="22" fill="${accentColor}" font-family="Georgia, serif">${accidental}</text>`;
    }

    // Notehead (filled ellipse, slightly tilted)
    svg += `<ellipse cx="${noteX}" cy="${noteY}" rx="7.5" ry="5.5" fill="${accentColor}" transform="rotate(-18 ${noteX} ${noteY})"/>`;

    // Stem
    if (stemUp) {
      svg += `<line x1="${noteX + 7}" y1="${noteY}" x2="${noteX + 7}" y2="${noteY - 46}" stroke="${accentColor}" stroke-width="2"/>`;
    } else {
      svg += `<line x1="${noteX - 7}" y1="${noteY}" x2="${noteX - 7}" y2="${noteY + 46}" stroke="${accentColor}" stroke-width="2"/>`;
    }

    svg += `</svg>`;
    return svg;
  }

  // ── RECORDER FINGERING DIAGRAM ──────────────────────────────────────────
  function recorderFingeringSVG(fingeringState, accentColor = '#FF8C42', size = 130) {
    const [thumb, h1, h2, h3, h4, h5, h6, h7] = fingeringState;
    const cx = 65;
    const tubeTop = 18, tubeBottom = 215, tubeW = 30;
    const holeYs = [62, 84, 106, 132, 154, 176, 198]; // h1..h7
    const holes = [h1, h2, h3, h4, h5, h6, h7];

    let svg = `<svg viewBox="0 0 130 230" width="${size}" height="${size * 230 / 130}" xmlns="http://www.w3.org/2000/svg">`;

    // Mouthpiece notch
    svg += `<path d="M ${cx - 14} ${tubeTop} Q ${cx} ${tubeTop - 10} ${cx + 14} ${tubeTop} L ${cx + 15} ${tubeTop + 14} L ${cx - 15} ${tubeTop + 14} Z" fill="#3A3868" stroke="#524F70" stroke-width="1.5"/>`;

    // Tube body
    svg += `<rect x="${cx - tubeW/2}" y="${tubeTop + 12}" width="${tubeW}" height="${tubeBottom - tubeTop - 12}" rx="10" fill="#21204A" stroke="#3A3868" stroke-width="1.5"/>`;

    // Joint lines (decorative, suggests head/body/foot joints)
    svg += `<line x1="${cx - tubeW/2}" y1="70" x2="${cx + tubeW/2}" y2="70" stroke="#3A3868" stroke-width="1.5"/>`;
    svg += `<line x1="${cx - tubeW/2}" y1="188" x2="${cx + tubeW/2}" y2="188" stroke="#3A3868" stroke-width="1.5"/>`;

    // Thumb hole (back) — offset left with dashed connector + label
    const thumbY = 46;
    svg += `<line x1="${cx - tubeW/2 - 2}" y1="${thumbY}" x2="${cx - tubeW/2 - 22}" y2="${thumbY}" stroke="#524F70" stroke-width="1" stroke-dasharray="2,2"/>`;
    svg += `<circle cx="${cx - tubeW/2 - 28}" cy="${thumbY}" r="9" fill="${thumb ? accentColor : '#161530'}" stroke="${accentColor}" stroke-width="2"/>`;
    svg += `<text x="${cx - tubeW/2 - 28}" y="${thumbY + 24}" font-size="9" fill="#8986A8" text-anchor="middle" font-weight="600">TH</text>`;

    // Finger holes 1-7 down the front
    holes.forEach((covered, i) => {
      const y = holeYs[i];
      const r = i < 3 ? 9 : 7.5;
      svg += `<circle cx="${cx}" cy="${y}" r="${r}" fill="${covered ? accentColor : '#161530'}" stroke="${accentColor}" stroke-width="2"/>`;
    });

    svg += `</svg>`;
    return svg;
  }

  // ── BRASS VALVE FINGERING DIAGRAM (trumpet, euphonium, tuba style) ──────
  function valveFingeringSVG(fingeringState, accentColor = '#D4A017', size = 130) {
    const [v1, v2, v3] = fingeringState;
    const positions = [v1, v2, v3];
    const casingX = [34, 65, 96];
    const casingTop = 50, casingH = 110, casingW = 26;

    let svg = `<svg viewBox="0 0 130 200" width="${size}" height="${size * 200 / 130}" xmlns="http://www.w3.org/2000/svg">`;

    // Connecting leadpipe hint
    svg += `<line x1="10" y1="${casingTop + 14}" x2="120" y2="${casingTop + 14}" stroke="#3A3868" stroke-width="6" stroke-linecap="round"/>`;

    positions.forEach((pressed, i) => {
      const x = casingX[i];
      // Casing
      svg += `<rect x="${x - casingW/2}" y="${casingTop}" width="${casingW}" height="${casingH}" rx="13" fill="#21204A" stroke="#3A3868" stroke-width="1.5"/>`;
      // Button (moves down + fills when pressed)
      const buttonY = pressed ? casingTop + 30 : casingTop + 8;
      svg += `<circle cx="${x}" cy="${buttonY}" r="13" fill="${pressed ? accentColor : '#161530'}" stroke="${accentColor}" stroke-width="2.5"/>`;
      // Valve number label
      svg += `<text x="${x}" y="${casingTop + casingH + 22}" font-size="13" font-weight="700" fill="#8986A8" text-anchor="middle">${i + 1}</text>`;
    });

    svg += `</svg>`;
    return svg;
  }

  // ── WOODWIND KEY DIAGRAM (flute, clarinet, sax, oboe, bassoon) ──────────
  // Simplified key pads on a tube — same visual language as recorder but with
  // a distinct label and smaller "key" circles to suggest pads not holes.
  function woodwindFingeringSVG(fingeringState, accentColor = '#7BAFC0', size = 130) {
    const [thumb, h1, h2, h3, h4, h5, h6, h7, extra] = fingeringState;
    const cx = 65;
    const tubeTop = 18, tubeBottom = 215, tubeW = 30;
    const allKeys = [h1, h2, h3, h4, h5, h6, h7];
    const keyYs = [62, 84, 106, 132, 154, 176, 198]; // h1..h7

    let svg = `<svg viewBox="0 0 130 230" width="${size}" height="${size * 230 / 130}" xmlns="http://www.w3.org/2000/svg">`;

    // Mouthpiece notch
    svg += `<path d="M ${cx - 14} ${tubeTop} Q ${cx} ${tubeTop - 10} ${cx + 14} ${tubeTop} L ${cx + 15} ${tubeTop + 14} L ${cx - 15} ${tubeTop + 14} Z" fill="#3A3868" stroke="#524F70" stroke-width="1.5"/>`;

    // Tube body
    svg += `<rect x="${cx - tubeW/2}" y="${tubeTop + 12}" width="${tubeW}" height="${tubeBottom - tubeTop - 12}" rx="10" fill="#21204A" stroke="#3A3868" stroke-width="1.5"/>`;

    // Joint lines (decorative, suggests upper/middle/lower joint)
    svg += `<line x1="${cx - tubeW/2}" y1="70" x2="${cx + tubeW/2}" y2="70" stroke="#3A3868" stroke-width="1.5"/>`;
    svg += `<line x1="${cx - tubeW/2}" y1="188" x2="${cx + tubeW/2}" y2="188" stroke="#3A3868" stroke-width="1.5"/>`;

    // Extra key (register / octave) — small filled circle above LH1
    if (extra !== undefined) {
      const exY = keyYs[0] - 30;
      svg += `<circle cx="${cx}" cy="${exY}" r="6" fill="${extra ? accentColor : '#161530'}" stroke="${accentColor}" stroke-width="2"/>`;
      svg += `<text x="${cx}" y="${exY + 20}" font-size="8" fill="#8986A8" text-anchor="middle" font-weight="600">R</text>`;
    }

    // Thumb key (offset left of tube — same layout as recorder)
    const thumbY = 46;
    svg += `<line x1="${cx - tubeW/2 - 2}" y1="${thumbY}" x2="${cx - tubeW/2 - 22}" y2="${thumbY}" stroke="#524F70" stroke-width="1" stroke-dasharray="2,2"/>`;
    svg += `<circle cx="${cx - tubeW/2 - 28}" cy="${thumbY}" r="9" fill="${thumb ? accentColor : '#161530'}" stroke="${accentColor}" stroke-width="2"/>`;
    svg += `<text x="${cx - tubeW/2 - 28}" y="${thumbY + 24}" font-size="9" fill="#8986A8" text-anchor="middle" font-weight="600">TH</text>`;

    // Finger keys 1-7 down the tube — circles for key pads
    allKeys.forEach((pressed, i) => {
      const y = keyYs[i];
      const r = i < 3 ? 9 : 7.5;
      svg += `<circle cx="${cx}" cy="${y}" r="${r}" fill="${pressed ? accentColor : '#161530'}" stroke="${accentColor}" stroke-width="2.5"/>`;
    });

    svg += `</svg>`;
    return svg;
  }

  // ── TROMBONE SLIDE POSITION DIAGRAM ──────────────────────────────────────
  // Shows a tube with 7 position markers. The current position is highlighted.
  function tromboneFingeringSVG(position, accentColor = '#C0A020', size = 130) {
    const tubeY = 50;
    const tubeLeft = 20, tubeRight = 110;
    const tubeLen = tubeRight - tubeLeft;
    const posCount = 7;
    const posSpacing = (tubeLen - 20) / (posCount - 1);
    const posStart = tubeLeft + 10;

    let svg = `<svg viewBox="0 0 130 100" width="${size}" height="${size * 100 / 130}" xmlns="http://www.w3.org/2000/svg">`;

    // Slide tube
    svg += `<line x1="${tubeLeft}" y1="${tubeY}" x2="${tubeRight}" y2="${tubeY}" stroke="#524F70" stroke-width="4" stroke-linecap="round"/>`;
    // Inner slide (extends out to current position)
    const slideEnd = posStart + (position - 1) * posSpacing;
    svg += `<line x1="${tubeLeft}" y1="${tubeY}" x2="${slideEnd}" y2="${tubeY}" stroke="${accentColor}" stroke-width="6" stroke-linecap="round"/>`;

    // Position markers and labels
    for (let i = 1; i <= posCount; i++) {
      const x = posStart + (i - 1) * posSpacing;
      const isActive = i === position;
      const dotColor = isActive ? accentColor : '#3A3868';
      svg += `<circle cx="${x}" cy="${tubeY}" r="${isActive ? 5 : 3.5}" fill="${dotColor}" stroke="${isActive ? accentColor : 'none'}" stroke-width="2"/>`;
      svg += `<text x="${x}" y="${tubeY + 20}" font-size="10" font-weight="${isActive ? '800' : '500'}" fill="${isActive ? accentColor : '#524F70'}" text-anchor="middle">${i}</text>`;
    }

    // Mouthpiece hint
    svg += `<rect x="${tubeLeft - 8}" y="${tubeY - 3}" width="8" height="6" rx="3" fill="#3A3868"/>`;

    // Bell hint
    svg += `<path d="M${tubeRight} ${tubeY - 8} Q${tubeRight + 12} ${tubeY} ${tubeRight} ${tubeY + 8}" stroke="#524F70" stroke-width="3" fill="none" stroke-linecap="round"/>`;

    // Label
    svg += `<text x="65" y="${tubeY + 42}" font-size="9" font-weight="600" fill="#8986A8" text-anchor="middle" letter-spacing="0.15em">POSITION</text>`;

    svg += `</svg>`;
    return svg;
  }

  function fingeringSVG(fingeringType, fingeringState, accentColor, size = 130) {
    if (fingeringType === 'recorder') return recorderFingeringSVG(fingeringState, accentColor, size);
    if (fingeringType === 'trombone') return tromboneFingeringSVG(fingeringState, accentColor, size);
    if (['flute', 'clarinet', 'saxophone', 'oboe', 'bassoon'].includes(fingeringType)) {
      return woodwindFingeringSVG(fingeringState, accentColor, size);
    }
    return valveFingeringSVG(fingeringState, accentColor, size);
  }

  // ── INSTRUMENT ICON SET (home screen) ───────────────────────────────────
  // Consistent line-icon language: currentColor stroke, 64x64 viewBox.
  function instrumentIconSVG(id, size = 56) {
    const s = (inner) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

    switch (id) {
      case 'soprano-recorder':
        return s(`
          <path d="M26 8 Q32 4 38 8 L40 18 L24 18 Z"/>
          <rect x="25" y="18" width="14" height="38" rx="5"/>
          <line x1="25" y1="28" x2="39" y2="28"/>
          <line x1="25" y1="46" x2="39" y2="46"/>
          <circle cx="32" cy="34" r="1.8" fill="currentColor"/>
          <circle cx="32" cy="40" r="1.8" fill="currentColor"/>
          <path d="M27 56 L30 60 M37 56 L34 60" />
        `);
      case 'alto-recorder':
        return s(`
          <path d="M24 8 Q32 4 40 8 L42 20 L22 20 Z"/>
          <rect x="21" y="20" width="22" height="40" rx="6"/>
          <line x1="21" y1="32" x2="43" y2="32"/>
          <line x1="21" y1="52" x2="43" y2="52"/>
          <circle cx="32" cy="40" r="2" fill="currentColor"/>
          <circle cx="32" cy="46" r="2" fill="currentColor"/>
          <path d="M26 60 L30 64 M38 60 L34 64" />
        `);
      case 'tenor-recorder':
        return s(`
          <path d="M26 6 Q32 2 38 6 L40 16 L24 16 Z"/>
          <rect x="25" y="16" width="14" height="44" rx="5"/>
          <line x1="25" y1="26" x2="39" y2="26"/>
          <line x1="25" y1="52" x2="39" y2="52"/>
          <circle cx="32" cy="36" r="1.8" fill="currentColor"/>
          <circle cx="32" cy="44" r="1.8" fill="currentColor"/>
          <path d="M27 60 L30 64 M37 60 L34 64" />
        `);
      case 'bass-recorder':
        return s(`
          <path d="M18 4 Q24 0 30 4 L34 8 Q36 12 34 16 L22 16 Q20 12 22 8 Z"/>
          <rect x="22" y="16" width="18" height="44" rx="7"/>
          <line x1="22" y1="28" x2="40" y2="28"/>
          <line x1="22" y1="52" x2="40" y2="52"/>
          <circle cx="31" cy="38" r="2.5" fill="currentColor"/>
          <circle cx="31" cy="46" r="2.5" fill="currentColor"/>
          <path d="M24 60 L28 64 M36 60 L32 64" />
          <path d="M28 4 L28 2 L34 2 L34 4" />
        `);
      case 'flute':
        return s(`
          <rect x="6" y="27" width="46" height="9" rx="4.5"/>
          <circle cx="16" cy="31.5" r="1.6" fill="currentColor"/>
          <circle cx="26" cy="31.5" r="1.6" fill="currentColor"/>
          <circle cx="36" cy="31.5" r="1.6" fill="currentColor"/>
          <path d="M52 27 L58 31.5 L52 36 Z"/>
          <line x1="10" y1="22" x2="10" y2="41" stroke-width="1.6"/>
        `);
      case 'clarinet':
        return s(`
          <path d="M27 6 L34 10 L31 16 L26 14 Z"/>
          <rect x="25" y="16" width="13" height="40" rx="3"/>
          <line x1="25" y1="26" x2="38" y2="26"/>
          <line x1="25" y1="36" x2="38" y2="36"/>
          <line x1="25" y1="46" x2="38" y2="46"/>
          <path d="M25 56 L22 60 L41 60 L38 56 Z"/>
        `);
      case 'alto-saxophone':
        return s(`
          <path d="M22 8 Q30 6 32 14 L34 38 Q34 50 24 50 Q16 50 17 42 Q18 36 26 38"/>
          <circle cx="22" cy="44" r="6.5"/>
          <circle cx="29" cy="20" r="1.6" fill="currentColor"/>
          <circle cx="31" cy="27" r="1.6" fill="currentColor"/>
          <circle cx="32" cy="33" r="1.6" fill="currentColor"/>
        `);
      case 'oboe':
        return s(`
          <path d="M29 6 L33 9 L31 13 L28 12 Z"/>
          <rect x="27" y="13" width="9" height="42" rx="2.5"/>
          <line x1="27" y1="24" x2="36" y2="24"/>
          <line x1="27" y1="35" x2="36" y2="35"/>
          <line x1="27" y1="46" x2="36" y2="46"/>
          <path d="M27 55 L25 60 L38 60 L36 55 Z"/>
        `);
      case 'bassoon':
        return s(`
          <rect x="20" y="20" width="9" height="38" rx="2.5"/>
          <rect x="33" y="20" width="9" height="38" rx="2.5"/>
          <path d="M20 58 Q20 62 24.5 62 Q29 62 29 58"/>
          <path d="M33 58 Q33 62 37.5 62 Q42 62 42 58"/>
          <path d="M20 20 Q20 12 26 12"/>
          <path d="M38 20 L44 14 L48 8" stroke-width="2"/>
          <line x1="20" y1="32" x2="29" y2="32"/>
          <line x1="33" y1="44" x2="42" y2="44"/>
        `);
      case 'trumpet':
        return s(`
          <line x1="6" y1="32" x2="26" y2="32" stroke-width="4"/>
          <rect x="24" y="22" width="6" height="20" rx="2"/>
          <rect x="32" y="22" width="6" height="20" rx="2"/>
          <rect x="40" y="22" width="6" height="20" rx="2"/>
          <circle cx="27" cy="20" r="3" fill="currentColor"/>
          <circle cx="35" cy="20" r="3" fill="currentColor"/>
          <circle cx="43" cy="20" r="3" fill="currentColor"/>
          <path d="M46 28 L58 24 Q60 32 58 40 L46 36 Z"/>
          <path d="M14 32 Q14 24 20 24 Q26 24 26 32" stroke-width="3"/>
        `);
      case 'trombone':
        return s(`
          <line x1="6" y1="28" x2="34" y2="28" stroke-width="4"/>
          <line x1="10" y1="38" x2="34" y2="38" stroke-width="4"/>
          <line x1="10" y1="28" x2="10" y2="38"/>
          <path d="M34 24 Q44 24 44 33 Q44 42 34 42"/>
          <path d="M44 26 L57 22 Q59 33 57 44 L44 40 Z"/>
        `);
      case 'french-horn':
        return s(`
          <path d="M18 40 Q8 32 14 18 Q20 8 34 12 Q46 16 44 30 Q42 40 34 38" stroke-width="3" fill="none"/>
          <path d="M34 38 Q46 42 46 28 Q44 16 34 12" stroke-width="3" fill="none"/>
          <path d="M18 40 L10 46 L6 42" stroke-width="2.5" fill="none"/>
          <circle cx="22" cy="20" r="2.2" fill="currentColor"/>
          <circle cx="29" cy="16" r="2.2" fill="currentColor"/>
          <circle cx="36" cy="18" r="2.2" fill="currentColor"/>
        `);
      case 'euphonium':
        return s(`
          <path d="M14 44 Q14 26 30 26 Q44 26 44 40" stroke-width="3"/>
          <rect x="24" y="20" width="7" height="22" rx="2.5"/>
          <rect x="33" y="20" width="7" height="22" rx="2.5"/>
          <circle cx="27.5" cy="17" r="3" fill="currentColor"/>
          <circle cx="36.5" cy="17" r="3" fill="currentColor"/>
          <path d="M44 32 Q56 30 58 20 Q59 12 51 10" stroke-width="3"/>
        `);
      case 'tuba':
        return s(`
          <path d="M14 46 Q10 36 18 26 Q26 18 38 22 Q46 24 46 36" stroke-width="3.5" fill="none"/>
          <path d="M46 36 Q58 38 56 24 Q54 12 44 8" stroke-width="3.5" fill="none"/>
          <ellipse cx="14" cy="48" rx="7" ry="5" stroke-width="2.5" fill="none"/>
          <rect x="24" y="18" width="8" height="22" rx="3"/>
          <rect x="34" y="18" width="8" height="22" rx="3"/>
          <circle cx="28" cy="15" r="2.5" fill="currentColor"/>
          <circle cx="38" cy="15" r="2.5" fill="currentColor"/>
        `);
      default:
        return s(`<circle cx="32" cy="32" r="20"/>`);
    }
  }

  // ── SONG SCORE (multi-note staff for full songs) ───────────────────────────
  function songStaffSVG({ notes, clef = 'treble', accentColor = '#FF8C42', keySig = 0, timeSig = null }) {
    const SPACING = 48;
    const MARGIN_L = 52;
    const MARGIN_R = 20;
    const totalW = Math.ceil(MARGIN_L + notes.length * SPACING + MARGIN_R);
    const H = 220;
    const lineColor = '#524F70';
    const noteColor = accentColor;

    let s = `<svg viewBox="0 0 ${totalW} ${H}" xmlns="http://www.w3.org/2000/svg">`;

    // Staff lines
    for (let i = 0; i <= 8; i += 2) {
      const y = yForPos(i);
      s += `<line x1="0" y1="${y}" x2="${totalW}" y2="${y}" stroke="${lineColor}" stroke-width="1.5"/>`;
    }

    // Clef
    if (clef === 'treble') {
      s += `<text x="10" y="${STAFF_BOTTOM_Y + 8}" font-size="110" font-family="Georgia, 'Apple Symbols', serif" fill="${lineColor}">&#119070;</text>`;
    } else {
      s += `<text x="12" y="${yForPos(3) + 10}" font-size="70" font-family="Georgia, 'Apple Symbols', serif" fill="${lineColor}">&#119074;</text>`;
    }

    // ── Key signature ────────────────────────────────────────────────────
    const SHARP_STEPS = [8, 5, 2, 6, 3, 7, 4]; // F5, C5, G4, D5, A4, E5, B4
    const FLAT_STEPS  = [4, 7, 3, 6, 2, 5, 8]; // B4, E5, A4, D5, G4, C5, F5
    let accX = 72;
    if (keySig > 0) {
      for (let i = 0; i < keySig && i < SHARP_STEPS.length; i++) {
        const y = yForPos(SHARP_STEPS[i]);
        s += `<text x="${accX + i * 12}" y="${y + 6}" font-size="18" fill="${lineColor}" font-family="Georgia, serif">♯</text>`;
      }
      accX += keySig * 12 + 8;
    } else if (keySig < 0) {
      const nFlat = Math.abs(keySig);
      for (let i = 0; i < nFlat && i < FLAT_STEPS.length; i++) {
        const y = yForPos(FLAT_STEPS[i]);
        s += `<text x="${accX + i * 12}" y="${y + 16}" font-size="18" fill="${lineColor}" font-family="Georgia, serif">♭</text>`;
      }
      accX += nFlat * 12 + 8;
    }

    // ── Time signature ──────────────────────────────────────────────────
    if (timeSig) {
      const tsX = accX + 4;
      s += `<text x="${tsX}" y="${yForPos(4) + 4}" font-size="22" fill="${lineColor}" font-family="Georgia, serif" text-anchor="middle">${timeSig.num}</text>`;
      s += `<text x="${tsX}" y="${yForPos(2) + 4}" font-size="22" fill="${lineColor}" font-family="Georgia, serif" text-anchor="middle">${timeSig.den}</text>`;
    }

    // ── Bar lines (every 4 beats, respecting note durations) ────────────
    // Simple approach: treat each note as 1 beat, half notes as 2 beats
    let beatAccum = 0;
    let barStartX = MARGIN_L;
    for (let i = 0; i < notes.length; i++) {
      const dur = notes[i].dur || 'q';
      const beats = dur === 'h' ? 2 : dur === 'w' ? 4 : 1;
      beatAccum += beats;
      if (beatAccum >= 4 || i === notes.length - 1) {
        if (i < notes.length - 1) {
          const x = MARGIN_L + (i + 1) * SPACING - SPACING / 2;
          s += `<line x1="${x}" y1="${yForPos(8) + 14}" x2="${x}" y2="${yForPos(0) - 14}" stroke="${lineColor}" stroke-width="1" stroke-dasharray="4,3"/>`;
        }
        beatAccum = 0;
      }
    }

    // End bar line
    const endX = MARGIN_L + notes.length * SPACING - SPACING / 2;
    s += `<line x1="${endX}" y1="${yForPos(8) + 14}" x2="${endX}" y2="${yForPos(0) - 14}" stroke="${lineColor}" stroke-width="1.5"/>`;
    s += `<line x1="${endX + 4}" y1="${yForPos(8) + 14}" x2="${endX + 4}" y2="${yForPos(0) - 14}" stroke="${lineColor}" stroke-width="3"/>`;

    // ── Notes ───────────────────────────────────────────────────────────
    notes.forEach((note, i) => {
      const x = MARGIN_L + i * SPACING;
      const y = yForPos(note.staffStep);
      const stemUp = note.staffStep <= 4;
      const dur = note.dur || 'q';
      const isHalf = dur === 'h';
      const isWhole = dur === 'w';
      const isEighth = dur === '8';
      const filled = !isHalf && !isWhole;

      // Ledger lines
      ledgerPositions(note.staffStep).forEach(p => {
        const ly = yForPos(p);
        s += `<line x1="${x - 12}" y1="${ly}" x2="${x + 12}" y2="${ly}" stroke="${lineColor}" stroke-width="1.5"/>`;
      });

      // Accidental
      if (note.accidental) {
        s += `<text x="${x - 22}" y="${y + 6}" font-size="20" fill="${accentColor}" font-family="Georgia, serif">${note.accidental}</text>`;
      }

      s += `<g data-note-index="${i}">`;

      // Notehead
      if (filled) {
        s += `<ellipse cx="${x}" cy="${y}" rx="7" ry="5" fill="${noteColor}" transform="rotate(-18 ${x} ${y})"/>`;
      } else {
        s += `<ellipse cx="${x}" cy="${y}" rx="7" ry="5" fill="none" stroke="${noteColor}" stroke-width="2.5" transform="rotate(-18 ${x} ${y})"/>`;
      }

      // Stem (no stem for whole notes)
      if (!isWhole) {
        if (stemUp) {
          s += `<line x1="${x + 6.5}" y1="${y}" x2="${x + 6.5}" y2="${y - 42}" stroke="${noteColor}" stroke-width="2"/>`;
        } else {
          s += `<line x1="${x - 6.5}" y1="${y}" x2="${x - 6.5}" y2="${y + 42}" stroke="${noteColor}" stroke-width="2"/>`;
        }
        // Flag for eighth notes
        if (isEighth) {
          const flagX = stemUp ? x + 6.5 : x - 6.5;
          const flagY = stemUp ? y - 42 : y + 42;
          s += `<path d="M${flagX} ${flagY} Q${flagX + 12} ${flagY + 6} ${flagX + 6} ${flagY + 16}" stroke="${noteColor}" stroke-width="2" fill="none"/>`;
        }
      }

      s += `</g>`;
    });

    s += `</svg>`;
    return s;
  }

  return { staffSVG, songStaffSVG, fingeringSVG, recorderFingeringSVG, valveFingeringSVG, tromboneFingeringSVG, woodwindFingeringSVG, instrumentIconSVG, yForPos, ledgerPositions };
})();
