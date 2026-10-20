// i18n.js — Brazilian Portuguese translation layer for Preludio Recorder.
var LANG_STORAGE_KEY = 'preludioRecorderLang';

function detectDefaultLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'pt' || saved === 'en') return saved;
  } catch (e) {}
  try {
    const nav = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) || 'en';
    if (/^pt/i.test(nav)) return 'pt';
  } catch (e) {}
  return 'en';
}

var LANG = detectDefaultLang();

var TRANSLATIONS = { en: {}, pt: {} };

function t(str) {
  if (typeof str !== 'string') return str;
  if (LANG === 'pt' && TRANSLATIONS.pt && Object.prototype.hasOwnProperty.call(TRANSLATIONS.pt, str)) {
    return TRANSLATIONS.pt[str];
  }
  return str;
}

function getLang() { return LANG; }
function setLang(lang) {
  if (lang !== 'pt' && lang !== 'en') return;
  LANG = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (e) {}
  if (typeof render === 'function') render();
  applyI18nToDOM();
}
function initLang() {
  LANG = detectDefaultLang();
}

function applyI18nToDOM() {
  try {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const val = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.getAttribute('data-i18n-attr') === 'placeholder') el.placeholder = val;
        } else {
          el.textContent = val;
        }
      }
    });
  } catch (e) {}
}

TRANSLATIONS.pt = {
  "A adds your left middle finger. Getting warmer.": "Lá acrescenta o médio esquerdo. Esquentando.",
  "A beloved hymn using B, A, G, E, and D.": "Um hino querido usando Si, Lá, Sol, Mi e Ré.",
  "A classic English nursery rhyme using B, A, and G.": "Uma cantiga de roda inglesa usando Si, Lá e Sol.",
  "A classic English nursery rhyme using E, D, and C on the bass.": "Uma cantiga de roda inglesa usando Mi, Ré e Dó no baixo.",
  "A classic English nursery rhyme using E, D, and C.": "Uma cantiga de roda inglesa usando Mi, Ré e Dó.",
  "A classic French folk melody using C, D, and E on the alto.": "Uma melodia folclórica francesa usando Dó, Ré e Mi no alto.",
  "A classic French folk melody using C, D, and E on the bass.": "Uma melodia folclórica francesa usando Dó, Ré e Mi no baixo.",
  "A classic French folk melody using C, D, and E on the tenor.": "Uma melodia folclórica francesa usando Dó, Ré e Mi no tenor.",
  "A classic French folk melody using C, D, and E.": "Uma melodia folclórica francesa usando Dó, Ré e Mi.",
  "A classic round spanning both lower and upper registers on the alto.": "Uma roda clássica abrangendo os registros grave e agudo no alto.",
  "A classic round using C, D, E, F, G, and A on the soprano.": "Uma roda clássica usando Dó, Ré, Mi, Fá, Sol e Lá no soprano.",
  "A classic round using the full lower register of the tenor.": "Uma roda clássica usando todo o registro grave do tenor.",
  "A full octave scale exercise from C3 up to C4 and back down.": "Um exercício de escala de oitava completa de Dó3 até Dó4 e de volta.",
  "A full octave scale exercise from C4 up to C5 and back down.": "Um exercício de escala de oitava completa de Dó4 até Dó5 e de volta.",
  "A full octave scale exercise from C5 up to C6 and back down.": "Um exercício de escala de oitava completa de Dó5 até Dó6 e de volta.",
  "A traditional German folk song using B, A, G, and E.": "Uma canção folclórica alemã tradicional usando Si, Lá, Sol e Mi.",
  "A uses both hands now — thumb through hole 5.": "Lá usa as duas mãos agora — polegar pelo buraco 5.",
  "A2 — both hands now. Thumb through hole 5.": "Lá2 — as duas mãos agora. Polegar pelo buraco 5.",
  "Add one more finger for A.": "Acrescente mais um dedo para Lá.",
  "Add your left middle finger — now playing D.": "Acrescente o médio esquerdo — agora tocando Ré.",
  "An African-American spiritual using F, G, and A in the upper register.": "Um spiritual afro-americano usando Fá, Sol e Lá no registro agudo.",
  "An African-American spiritual using F, G, and A on the soprano.": "Um spiritual afro-americano usando Fá, Sol e Lá no soprano.",
  "An African-American spiritual using forked F, G, and A on the tenor.": "Um spiritual afro-americano usando Fá forquilha, Sol e Lá no tenor.",
  "B adds the fourth finger. A warm, woody tone.": "Si acrescenta o quarto dedo. Um som quente e amadeirado.",
  "B2 — forked fingering. Four fingers down.": "Si2 — digitação forquilha. Quatro dedos abaixados.",
  "Bring together your lowest and highest alto notes.": "Reúna suas notas mais graves e mais agudas do alto.",
  "Bring together your lowest and highest bass notes.": "Reúna suas notas mais graves e mais agudas do baixo.",
  "C adds your left ring finger. Three fingers down.": "Dó acrescenta o anelar esquerdo. Três dedos abaixados.",
  "C uses all three left-hand fingers.": "Dó usa os três dedos da mão esquerda.",
  "C — all holes covered. The bottom of the tenor's range.": "Dó — todos os buracos cobertos. O fundo do registro do tenor.",
  "Cover everything: thumb + holes 1 through 7. Big, warm air for this deep, dark F.": "Cubra tudo: polegar + buracos 1 a 7. Ar grande e quente para este Fá profundo e escuro.",
  "Cover everything: thumb + holes 1 through 7. Blow gently and evenly. This is your lowest note.": "Cubra tudo: polegar + buracos 1 a 7. Sopre suavemente e de forma uniforme. Esta é a sua nota mais grave.",
  "Cover everything: thumb + holes 1 through 7. This is your lowest note. Maximum air, very relaxed embouchure.": "Cubra tudo: polegar + buracos 1 a 7. Esta é a sua nota mais grave. Máximo de ar, embocadura muito relaxada.",
  "Cover everything: thumb + holes 1 through 7. This low C needs maximum air support. Deep breath!": "Cubra tudo: polegar + buracos 1 a 7. Este Dó grave precisa de máximo apoio de ar. Respiração profunda!",
  "Cover the thumb hole (back) and hole 1. Leave everything else open.": "Cubra o buraco do polegar (atrás) e o buraco 1. Deixe todo o resto aberto.",
  "Cover thumb + holes 1 and 2. Keep the air steady and listen for a warm, centered pitch.": "Cubra polegar + buracos 1 e 2. Mantenha o ar estável e ouça um som quente e centrado.",
  "Cover thumb + holes 1 and 2. Relax the embouchure and feel the reed-like vibration of these low notes.": "Cubra polegar + buracos 1 e 2. Relax a embocadura e sinta a vibração de palheto dessas notas graves.",
  "Cover thumb + holes 1 and 2. Relax your embouchure and let the air flow freely.": "Cubra polegar + buracos 1 e 2. Relax a embocadura e deixe o ar fluir livremente.",
  "Cover thumb + holes 1 through 5. Holes 6 and 7 open. This low A needs generous, steady air.": "Cubra polegar + buracos 1 a 5. Buracos 6 e 7 abertos. Este Lá grave precisa de ar generoso e estável.",
  "Cover thumb + holes 1 through 5. Holes 6 and 7 stay open. Left + right hands now working together.": "Cubra polegar + buracos 1 a 5. Buracos 6 e 7 ficam abertos. Mão esquerda + direita agora trabalhando juntas.",
  "Cover thumb + holes 1 through 5. Holes 6 and 7 stay open. Left and right hands working together for this lower note.": "Cubra polegar + buracos 1 a 5. Buracos 6 e 7 ficam abertos. Mãos esquerda e direita trabalhando juntas para esta nota mais grave.",
  "Cover thumb + holes 1 through 5. Holes 6 and 7 stay open. The tenor E has a rich, reedy quality.": "Cubra polegar + buracos 1 a 5. Buracos 6 e 7 ficam abertos. O Mi do tenor tem qualidade rica e de palheto.",
  "Cover thumb + holes 1 through 6. Only hole 7 stays open. Blow gently with warm, supported air.": "Cubra polegar + buracos 1 a 6. Apenas o buraco 7 fica aberto. Sopre suavemente com ar quente e apoiado.",
  "Cover thumb + holes 1 through 6. Only hole 7 stays open. Max air, relaxed embouchure for this low G.": "Cubra polegar + buracos 1 a 6. Apenas o buraco 7 fica aberto. Máximo de ar, embocadura relaxada para este Sol grave.",
  "Cover thumb + holes 1 through 6. Only hole 7 stays open. Use warm, abundant air for this low, resonant D.": "Cubra polegar + buracos 1 a 6. Apenas o buraco 7 fica aberto. Use ar quente e abundante para este Ré grave e ressonante.",
  "Cover thumb + holes 1, 2, 3, 4, and 6. Leave holes 5 and 7 open. This \"fork\" takes practice to get clean.": "Cubra polegar + buracos 1, 2, 3, 4 e 6. Deixe os buracos 5 e 7 abertos. Esta \"forquilha\" exige prática para ficar limpa.",
  "Cover thumb + holes 1, 2, 3, 4, and 6. Leave holes 5 and 7 open. This forked F fills the gap in your scale.": "Cubra polegar + buracos 1, 2, 3, 4 e 6. Deixe os buracos 5 e 7 abertos. Este Fá forquilha preenche a lacuna da sua escala.",
  "Cover thumb + holes 1, 2, 3, and 4. Hole 5 stays open (forked B). Listen for the dark, covered sound.": "Cubra polegar + buracos 1, 2, 3 e 4. O buraco 5 fica aberto (Si forquilha). Ouça o som escuro e coberto.",
  "Cover thumb + holes 1, 2, 3, and 4. Hole 5 stays open. This forked B has a dark, rich colour.": "Cubra polegar + buracos 1, 2, 3 e 4. O buraco 5 fica aberto. Este Si forquilha tem cor escura e rica.",
  "Cover thumb + holes 1, 2, 3. Right hand open. Blow gently and evenly.": "Cubra polegar + buracos 1, 2, 3. Mão direita aberta. Sopre suavemente e de forma uniforme.",
  "Cover thumb + holes 1, 2, 3. Right hand stays open. Support deeply from the diaphragm for this low, dark note.": "Cubra polegar + buracos 1, 2, 3. Mão direita fica aberta. Apoie profundamente do diafragma para esta nota grave e escura.",
  "Cover thumb + holes 1, 2, 3. Right hand stays open. Support the breath from your diaphragm.": "Cubra polegar + buracos 1, 2, 3. Mão direita fica aberta. Apoie a respiração do diafragma.",
  "Cover thumb + holes 1, 2, and 3. Right hand stays relaxed and open. This is middle C on the alto.": "Cubra polegar + buracos 1, 2 e 3. Mão direita fica relaxada e aberta. Este é o Dó central no alto.",
  "Cover thumb + holes 1–6. Only hole 7 (your pinky) stays open. Listen carefully for a warm, clear tone.": "Cubra polegar + buracos 1–6. Apenas o buraco 7 (mindinho) fica aberto. Ouça atentamente um som quente e claro.",
  "Cover thumb, hole 1, and hole 2. Right hand stays relaxed and open.": "Cubra polegar, buraco 1 e buraco 2. Mão direita fica relaxada e aberta.",
  "D adds your left middle finger.": "Ré acrescenta o médio esquerdo.",
  "D is almost all covered — just leave hole 7 open.": "Ré está quase tudo coberto — apenas deixe o buraco 7 aberto.",
  "D — almost all covered. Your lowest tenor note yet.": "Ré — quase tudo coberto. Sua nota de tenor mais grave até agora.",
  "E uses both hands on this larger instrument.": "Mi usa as duas mãos neste instrumento maior.",
  "E uses both hands. Keep a relaxed grip!": "Mi usa as duas mãos. Mantenha a pegada relaxada!",
  "F uses a special forked fingering — hole 5 stays open.": "Fá usa uma digitação forquilha especial — o buraco 5 fica aberto.",
  "F — all holes covered. The bottom of the alto's range.": "Fá — todos os buracos cobertos. O fundo do registro do alto.",
  "F2 — all holes covered. The bottom of the bass recorder.": "Fá2 — todos os buracos cobertos. O fundo da flauta doce baixo.",
  "First alto note — just thumb and index. A bright, clear E.": "Primeira nota do alto — apenas polegar e indicador. Um Mi brilhante e claro.",
  "First bass note — E3. Big breath, slow air.": "Primeira nota do baixo — Mi3. Respiração grande, ar lento.",
  "G adds hole 6 — a rich, resonant note.": "Sol acrescenta o buraco 6 — uma nota rica e ressonante.",
  "G adds your ring finger. You now know BAG!": "Sol acrescenta o anelar. Agora você sabe Si-Lá-Sol!",
  "G uses all three left-hand fingers.": "Sol usa os três dedos da mão esquerda.",
  "G2 — almost all covered. Deep and resonant.": "Sol2 — quase tudo coberto. Profundo e ressonante.",
  "Half-thumb + hole 1 only. Maximum air speed with a relaxed embouchure for this sparkling high E.": "Meio-polegar + apenas buraco 1. Máxima velocidade de ar com embocadura relaxada para este Mi agudo brilhante.",
  "Half-thumb + holes 1 and 2. The air needs to be fast and focused for these higher notes.": "Meio-polegar + buracos 1 e 2. O ar precisa ser rápido e focado para essas notas mais agudas.",
  "Half-thumb + holes 1 through 5. Keep your air fast and steady for this bright upper A.": "Meio-polegar + buracos 1 a 5. Mantenha o ar rápido e estável para este Lá agudo brilhante.",
  "Half-thumb + holes 1 through 5. Keep your air fast and steady. This bright A sits above the bass staff.": "Meio-polegar + buracos 1 a 5. Mantenha o ar rápido e estável. Este Lá brilhante fica acima da pauta de baixo.",
  "Half-thumb + holes 1 through 5. Keep your air stream steady and fast for this bright E.": "Meio-polegar + buracos 1 a 5. Mantenha o fluxo de ar estável e rápido para este Mi brilhante.",
  "Half-thumb + holes 1 through 5. Same as E5 but with half-thumb. Firm embouchure, fast air stream.": "Meio-polegar + buracos 1 a 5. Igual a Mi5, mas com meio-polegar. Embocadura firme, fluxo de ar rápido.",
  "Half-thumb + holes 1 through 6 covered. Same left-hand pattern as low D but pinch the thumb hole open slightly.": "Meio-polegar + buracos 1 a 6 cobertos. Mesmo padrão da mão esquerda do Ré grave, mas pinça o buraco do polegar levemente aberto.",
  "Half-thumb + holes 1 through 6. Same fingering as G2 but with the thumb pinched open. A bright, singing sound.": "Meio-polegar + buracos 1 a 6. mesma digitação de Sol2, mas com o polegar pinçado aberto. Um som brilhante e cantante.",
  "Half-thumb + holes 1 through 6. Same fingering as G3 but with the thumb pinched open.": "Meio-polegar + buracos 1 a 6. Mesma digitação de Sol3, mas com o polegar pinçado aberto.",
  "Half-thumb + holes 1 through 6. Same fingers as D3 but with the thumb pinched open. Warm, round sound.": "Meio-polegar + buracos 1 a 6. Mesmos dedos de Ré3, mas com o polegar pinçado aberto. Som quente e redondo.",
  "Half-thumb + holes 1, 2, 3, 4, and 6. Holes 5 and 7 open. Same forked F pattern as F5, with half-thumb.": "Meio-polegar + buracos 1, 2, 3, 4 e 6. Buracos 5 e 7 abertos. Mesmo padrão de Fá forquilha de Fá5, com meio-polegar.",
  "Half-thumb + holes 1, 2, 3, 4, and 6. Holes 5 and 7 open. Same forked F pattern, now in the upper register.": "Meio-polegar + buracos 1, 2, 3, 4 e 6. Buracos 5 e 7 abertos. Mesmo padrão de Fá forquilha, agora no registro agudo.",
  "Half-thumb + holes 1, 2, 3, 4. Hole 5 stays open (forked). Bright and focused.": "Meio-polegar + buracos 1, 2, 3, 4. Buraco 5 fica aberto (forquilha). Brilhante e focado.",
  "Half-thumb + holes 1, 2, 3, 4. Hole 5 stays open (forked). Light, focused air for this high B.": "Meio-polegar + buracos 1, 2, 3, 4. Buraco 5 fica aberto (forquilha). Ar leve e focado para este Si agudo.",
  "Half-thumb + holes 1, 2, 3. Right hand off completely. Blow with fast, focused air.": "Meio-polegar + buracos 1, 2, 3. Mão direita totalmente solta. Sopre com ar rápido e focado.",
  "Half-thumb + holes 1, 2, 3. Right hand off completely. Clean, clear air for this high C.": "Meio-polegar + buracos 1, 2, 3. Mão direita totalmente solta. Ar limpo e claro para este Dó agudo.",
  "Half-thumb + holes 1, 2, 3. Right hand off completely. Your highest note yet on the tenor!": "Meio-polegar + buracos 1, 2, 3. Mão direita totalmente solta. Sua nota mais aguda até agora no tenor!",
  "Half-thumb + holes 1, 2, 3. Right hand off. Maximum air speed for this sparkling high C on the bass!": "Meio-polegar + buracos 1, 2, 3. Mão direita solta. Máxima velocidade de ar para este Dó agudo brilhante no baixo!",
  "High D — same finger pattern as D5, but with half-thumb.": "Ré agudo — mesmo padrão de digitação de Ré5, mas com meio-polegar.",
  "High E — keep your air fast and steady.": "Mi agudo — mantenha o ar rápido e estável.",
  "High F — the forked fingering again, now in the upper register.": "Fá agudo — a digitação forquilha de novo, agora no registro agudo.",
  "High G — left hand only, half-thumb.": "Sol agudo — apenas mão esquerda, meio-polegar.",
  "Jump between C4 and the upper register — a great ear-training challenge!": "Salte entre Dó4 e o registro agudo — um ótimo desafio de treino auditivo!",
  "Left thumb covers the back hole. Left index covers hole 1. Take a deep breath and blow a slow, wide stream of air.": "Polegar esquerdo cobre o buraco de trás. Indicador esquerdo cobre o buraco 1. Respire fundo e sopre um fluxo de ar lento e amplo.",
  "Left thumb covers the back hole. Left index covers hole 1. The larger tenor needs a gentle, warm stream of air.": "Polegar esquerdo cobre o buraco de trás. Indicador esquerdo cobre o buraco 1. O tenor maior precisa de um fluxo de ar suave e quente.",
  "Left thumb covers the back hole. Left index finger covers hole 1. Blow gently and evenly.": "Polegar esquerdo cobre o buraco de trás. Indicador esquerdo cobre o buraco 1. Sopre suavemente e de forma uniforme.",
  "Listen for the full chord sound as you play each melody note. Keep your air steady!": "Ouça o som do acorde completo ao tocar cada nota da melodia. Mantenha o ar estável!",
  "Listen for the repeating three-note pattern!": "Ouça o padrão de três notas que se repete!",
  "Lock in your upper register — C5 through E5.": "Fixe seu registro agudo — de Dó5 a Mi5.",
  "Lock in your upper register — D6 through G6.": "Fixe seu registro agudo — de Ré6 a Sol6.",
  "Lock in your upper register — F4 and G4.": "Fixe seu registro agudo — Fá4 e Sol4.",
  "Master your highest bass note — C4!": "Domine sua nota de baixo mais aguda — Dó4!",
  "Mix up your first five notes — B, A, G, E, and D.": "Misture suas cinco primeiras notas — Si, Lá, Sol, Mi e Ré.",
  "Mix up your first five tenor notes — B3 down to D3.": "Misture suas cinco primeiras notas de tenor — de Si3 até Ré3.",
  "Mix up your first six alto notes — E4 down to G3.": "Misture suas seis primeiras notas do alto — de Mi4 até Sol3.",
  "Mix up your first six bass notes — E3 down to G2.": "Misture suas seis primeiras notas do baixo — de Mi3 até Sol2.",
  "Partially open the thumb hole (pinch technique). Cover only hole 2. Fast, focused air.": "Abra parcialmente o buraco do polegar (técnica de pinça). Cubra apenas o buraco 2. Ar rápido e focado.",
  "Partially open the thumb hole (pinch). Cover only hole 3. Fast, focused air for this clear middle C.": "Abra parcialmente o buraco do polegar (pinça). Cubra apenas o buraco 3. Ar rápido e focado para este Dó central claro.",
  "Pinch the thumb hole partially open. Keep all other holes covered. Fast, focused air for this upper F.": "Pinça o buraco do polegar parcialmente aberto. Mantenha todos os outros buracos cobertos. Ar rápido e focado para este Fá agudo.",
  "Pinch the thumb hole partially open. Keep all other holes covered. Fast, focused air for this upper register F.": "Pinça o buraco do polegar parcialmente aberto. Mantenha todos os outros buracos cobertos. Ar rápido e focado para este Fá do registro agudo.",
  "Practice G and D major chords behind a simple melody. The app plays both harmony notes — you only hear them, not see them.": "Pratique acordes de Sol e Ré maior por trás de uma melodia simples. O app toca as duas notas de harmonia — você só as ouve, não as vê.",
  "Sing along in your head as you play each note!": "Cante mentalmente enquanto toca cada nota!",
  "Solidify D, C, F, and high C together.": "Consolide Ré, Dó, Fá e Dó agudo juntos.",
  "Solidify low C, forked F, and your first upper register notes.": "Consolide Dó grave, Fá forquilha e suas primeiras notas do registro agudo.",
  "Step through each note of the melody, then play along!": "Percorra cada nota da melodia, depois toque junto!",
  "Step through each note. This melody works on any recorder!": "Percorra cada nota. Esta melodia funciona em qualquer flauta doce!",
  "Step through the melody slowly. The bass needs lots of air!": "Percorra a melodia devagar. O baixo precisa de muito ar!",
  "The bottom of the soprano's basic range — all holes covered.": "O fundo do registro básico do soprano — todos os buracos cobertos.",
  "The same melody as the soprano, but on the larger tenor! Step through it slowly.": "A mesma melodia do soprano, mas no tenor maior! Percorra-a devagar.",
  "The tune behind \"Mary Had a Little Lamb\" using B through D.": "A melodia por trás de \"Mary Had a Little Lamb\" usando Si até Ré.",
  "The tune behind \"Mary Had a Little Lamb\" using B, A, and G.": "A melodia por trás de \"Mary Had a Little Lamb\" usando Si, Lá e Sol.",
  "The tune behind \"Mary Had a Little Lamb\" using E through A.": "A melodia por trás de \"Mary Had a Little Lamb\" usando Mi até Lá.",
  "The tune behind \"Mary Had a Little Lamb\" using E through G.": "A melodia por trás de \"Mary Had a Little Lamb\" usando Mi até Sol.",
  "This song adds E to your note set. Step through gently!": "Esta canção acrescenta Mi ao seu conjunto de notas. Percorra suavemente!",
  "This song spans your lowest notes. Support each one with steady air!": "Esta canção abrange suas notas mais graves. Apoie cada uma com ar estável!",
  "This song uses your tenor's lower register. Listen to the warm, full sound!": "Esta canção usa o registro grave do seu tenor. Ouça o som quente e cheio!",
  "Upper A — half-thumb + holes 1 through 5.": "Lá agudo — meio-polegar + buracos 1 a 5.",
  "Upper B — half-thumb + holes 1 through 4, forked.": "Si agudo — meio-polegar + buracos 1 a 4, forquilha.",
  "Upper B — half-thumb + holes 1 through 4.": "Si agudo — meio-polegar + buracos 1 a 4.",
  "Upper C — half-thumb + holes 1, 2, 3.": "Dó agudo — meio-polegar + buracos 1, 2, 3.",
  "Upper C — half-thumb + holes 1, 2, 3. Highest note.": "Dó agudo — meio-polegar + buracos 1, 2, 3. Nota mais aguda.",
  "Upper D — half-thumb + holes 1 through 6.": "Ré agudo — meio-polegar + buracos 1 a 6.",
  "Upper D — half-thumb + holes 1, 2.": "Ré agudo — meio-polegar + buracos 1, 2.",
  "Upper E — half-thumb + hole 1. Highest note so far.": "Mi agudo — meio-polegar + buraco 1. Nota mais aguda até agora.",
  "Upper E — half-thumb + holes 1 through 5.": "Mi agudo — meio-polegar + buracos 1 a 5.",
  "Upper F — forked fingering with half-thumb.": "Fá agudo — digitação forquilha com meio-polegar.",
  "Upper F — your first half-thumb note on the bass.": "Fá agudo — sua primeira nota de meio-polegar no baixo.",
  "Upper F — your first half-thumb note.": "Fá agudo — sua primeira nota de meio-polegar.",
  "Upper G — half-thumb + holes 1 through 6.": "Sol agudo — meio-polegar + buracos 1 a 6.",
  "Upper G — half-thumb + holes 1, 2, 3. Left hand only.": "Sol agudo — meio-polegar + buracos 1, 2, 3. Apenas mão esquerda.",
  "Your first five-note melody! Take it slowly and feel the phrases.": "Sua primeira melodia de cinco notas! Vá devagar e sinta as frases.",
  "Your first full melody on the bass recorder! Big, warm air throughout.": "Sua primeira melodia completa na flauta doce baixo! Ar grande e quente do início ao fim.",
  "Your first full octave on alto! Play each step evenly and listen to every pitch.": "Sua primeira oitava completa no alto! Toque cada passo de forma uniforme e ouça cada som.",
  "Your first full octave on tenor! Feel the leap from C3 up to middle C.": "Sua primeira oitava completa no tenor! Sinta o salto de Dó3 até o Dó central.",
  "Your first full octave! Play each step evenly and listen to every pitch.": "Sua primeira oitava completa! Toque cada passo de forma uniforme e ouça cada som.",
  "Your first full phrase on the alto! Listen for the repeating pattern.": "Sua primeira frase completa no alto! Ouça o padrão que se repete.",
  "Your first half-thumb note! Middle C on the tenor.": "Sua primeira nota de meio-polegar! Dó central no tenor.",
  "Your first high note! Half-thumb + hole 2 for C6.": "Sua primeira nota aguda! Meio-polegar + buraco 2 para Dó6.",
  "Your first song combining the lower and upper registers!": "Sua primeira canção combinando os registros grave e agudo!",
  "Your first song crossing into the upper register on tenor!": "Sua primeira canção entrando no registro agudo no tenor!",
  "Your first song mixing the deep bass register with the upper octave!": "Sua primeira canção misturando o registro grave profundo com a oitava aguda!",
  "Your first song with low C, D, and E. Take it slowly!": "Sua primeira canção com Dó, Ré e Mi graves. Vá devagar!",
  "Your first song with the forked F! Listen for the call-and-response shape.": "Sua primeira canção com o Fá forquilha! Ouça a forma de chamada e resposta.",
  "Your first song with the forked F! Slow, warm air for these lower notes.": "Sua primeira canção com o Fá forquilha! Ar lento e quente para essas notas mais graves.",
  "Your first tenor note! B3 — thumb and index only.": "Sua primeira nota de tenor! Si3 — apenas polegar e indicador.",
  "Your first upper-register melody! Bright, focused air.": "Sua primeira melodia no registro agudo! Ar brilhante e focado.",
  "Your very first note! Just two fingers.": "Sua primeira nota! Apenas dois dedos.",
  "Alto Recorder": "Flauta Doce Alto",
  "Bass Recorder": "Flauta Doce Baixo",
  "Soprano Recorder": "Flauta Doce Soprano",
  "Tenor Recorder": "Flauta Doce Tenor",

  "First notes, first wins.": "Primeiras notas, primeiras vitórias.",
  "Pick a recorder to start your very first lessons — fingerings, notes, and your first sounds.": "Escolha uma flauta doce para começar suas primeiras aulas — digitações, notas e seus primeiros sons.",
  "Language": "Idioma",
};
