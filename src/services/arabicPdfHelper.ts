/**
 * Arabic Text Reshaper & Bidirectional (Bidi) Helper for jsPDF & HTML5 Canvas.
 * 
 * In standard PDF engines (like jsPDF), Unicode Arabic characters are not joined 
 * automatically and are displayed left-to-right in their isolated forms.
 * This utility handles:
 * 1. Arabic character contextual shaping (Isolated, Initial, Medial, Final).
 * 2. Mandatory Arabic ligatures (Lam-Alef variants: لا, لأ, لإ, لآ).
 * 3. Bidirectional line reordering (RTL reversal with LTR protection for numbers, 
 *    site IDs, coordinates, and English technical terms).
 */

// Arabic Unicode Ranges & Glyphs
const ARABIC_GLYPH_MAP: Record<number, { isolated: number; initial: number; medial: number; final: number }> = {
  0x0621: { isolated: 0xFE80, initial: 0xFE80, medial: 0xFE80, final: 0xFE80 }, // Hamza
  0x0622: { isolated: 0xFE81, initial: 0xFE81, medial: 0xFE82, final: 0xFE82 }, // Alef with Madda
  0x0623: { isolated: 0xFE83, initial: 0xFE83, medial: 0xFE84, final: 0xFE84 }, // Alef with Hamza Above
  0x0624: { isolated: 0xFE85, initial: 0xFE85, medial: 0xFE86, final: 0xFE86 }, // Waw with Hamza
  0x0625: { isolated: 0xFE87, initial: 0xFE87, medial: 0xFE88, final: 0xFE88 }, // Alef with Hamza Below
  0x0626: { isolated: 0xFE89, initial: 0xFE8B, medial: 0xFE8C, final: 0xFE8A }, // Yeh with Hamza
  0x0627: { isolated: 0xFE8D, initial: 0xFE8D, medial: 0xFE8E, final: 0xFE8E }, // Alef
  0x0628: { isolated: 0xFE8F, initial: 0xFE91, medial: 0xFE92, final: 0xFE90 }, // Beh
  0x0629: { isolated: 0xFE93, initial: 0xFE93, medial: 0xFE94, final: 0xFE94 }, // Teh Marbuta
  0x062A: { isolated: 0xFE95, initial: 0xFE97, medial: 0xFE98, final: 0xFE96 }, // Teh
  0x062B: { isolated: 0xFE99, initial: 0xFE9B, medial: 0xFE9C, final: 0xFE9A }, // Theh
  0x062C: { isolated: 0xFE9D, initial: 0xFE9F, medial: 0xFEA0, final: 0xFE9E }, // Jeem
  0x062D: { isolated: 0xFEA1, initial: 0xFEA3, medial: 0xFEA4, final: 0xFEA2 }, // Hah
  0x062E: { isolated: 0xFEA5, initial: 0xFEA7, medial: 0xFEA8, final: 0xFEA6 }, // Khah
  0x062F: { isolated: 0xFEA9, initial: 0xFEA9, medial: 0xFEAA, final: 0xFEAA }, // Dal
  0x0630: { isolated: 0xFEAB, initial: 0xFEAB, medial: 0xFEAC, final: 0xFEAC }, // Thal
  0x0631: { isolated: 0xFEAD, initial: 0xFEAD, medial: 0xFEAE, final: 0xFEAE }, // Reh
  0x0632: { isolated: 0xFEAF, initial: 0xFEAF, medial: 0xFEB0, final: 0xFEB0 }, // Zain
  0x0633: { isolated: 0xFEB1, initial: 0xFEB3, medial: 0xFEB4, final: 0xFEB2 }, // Seen
  0x0634: { isolated: 0xFEB5, initial: 0xFEB7, medial: 0xFEB8, final: 0xFEB6 }, // Sheen
  0x0635: { isolated: 0xFEB9, initial: 0xFEBB, medial: 0xFEBC, final: 0xFEBA }, // Sad
  0x0636: { isolated: 0xFEBD, initial: 0xFEBF, medial: 0xFEC0, final: 0xFEBE }, // Dad
  0x0637: { isolated: 0xFEC1, initial: 0xFEC3, medial: 0xFEC4, final: 0xFEC2 }, // Tah
  0x0638: { isolated: 0xFEC5, initial: 0xFEC7, medial: 0xFEC8, final: 0xFEC6 }, // Zah
  0x0639: { isolated: 0xFEC9, initial: 0xFECB, medial: 0xFECC, final: 0xFECA }, // Ain
  0x063A: { isolated: 0xFECD, initial: 0xFECF, medial: 0xFED0, final: 0xFECE }, // Ghain
  0x0641: { isolated: 0xFED1, initial: 0xFED3, medial: 0xFED4, final: 0xFED2 }, // Feh
  0x0642: { isolated: 0xFED5, initial: 0xFED7, medial: 0xFED8, final: 0xFED6 }, // Qaf
  0x0643: { isolated: 0xFED9, initial: 0xFEDB, medial: 0xFEDC, final: 0xFEDA }, // Kaf
  0x0644: { isolated: 0xFEDD, initial: 0xFEDF, medial: 0xFEE0, final: 0xFEDE }, // Lam
  0x0645: { isolated: 0xFEE1, initial: 0xFEE3, medial: 0xFEE4, final: 0xFEE2 }, // Meem
  0x0646: { isolated: 0xFEE5, initial: 0xFEE7, medial: 0xFEE8, final: 0xFEE6 }, // Noon
  0x0647: { isolated: 0xFEE9, initial: 0xFEEB, medial: 0xFEEC, final: 0xFEEA }, // Heh
  0x0648: { isolated: 0xFEED, initial: 0xFEED, medial: 0xFEEE, final: 0xFEEE }, // Waw
  0x0649: { isolated: 0xFEEF, initial: 0xFBE8, medial: 0xFBE9, final: 0xFEF0 }, // Alef Maksura
  0x064A: { isolated: 0xFEF1, initial: 0xFEF3, medial: 0xFEF4, final: 0xFEF2 }, // Yeh
};

// Characters that do not connect to the following letter (non-joining on left)
const NON_CONNECTING_TO_LEFT = new Set([
  0x0621, 0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x062f, 0x0630, 0x0631, 0x0632, 0x0629, 0x0648, 0x0649
]);

/** Checks if a character code is within the standard Arabic unicode range */
export function isArabicChar(code: number): boolean {
  return (code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f) || (code >= 0xfb50 && code <= 0xfdff) || (code >= 0xfe70 && code <= 0xfeff);
}

/** Checks if a string contains any Arabic characters */
export function hasArabicText(text: string): boolean {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    if (isArabicChar(text.charCodeAt(i))) return true;
  }
  return false;
}

/** Reshapes Arabic cursive letters from generic unicode to presentation forms (B/A) */
export function reshapeArabic(text: string): string {
  if (!text) return '';
  
  // First pass: replace Lam-Alef ligatures
  let str = text
    .replace(/\u0644\u0622/g, '\uFEF5') // Lam + Alef with Madda
    .replace(/\u0644\u0623/g, '\uFEF7') // Lam + Alef with Hamza Above
    .replace(/\u0644\u0625/g, '\uFEF9') // Lam + Alef with Hamza Below
    .replace(/\u0644\u0627/g, '\uFEFB'); // Lam + Alef

  const chars = Array.from(str);
  const len = chars.length;
  const shapedChars: string[] = [];

  for (let i = 0; i < len; i++) {
    const char = chars[i];
    const code = char.charCodeAt(0);
    const glyphInfo = ARABIC_GLYPH_MAP[code];

    if (!glyphInfo) {
      shapedChars.push(char);
      continue;
    }

    const prevCode = i > 0 ? chars[i - 1].charCodeAt(0) : 0;
    const nextCode = i < len - 1 ? chars[i + 1].charCodeAt(0) : 0;

    const connectsToPrev = prevCode && ARABIC_GLYPH_MAP[prevCode] && !NON_CONNECTING_TO_LEFT.has(prevCode);
    const connectsToNext = nextCode && ARABIC_GLYPH_MAP[nextCode] && !NON_CONNECTING_TO_LEFT.has(code);

    let shapedCode: number;
    if (connectsToPrev && connectsToNext) {
      shapedCode = glyphInfo.medial;
    } else if (connectsToPrev) {
      shapedCode = glyphInfo.final;
    } else if (connectsToNext) {
      shapedCode = glyphInfo.initial;
    } else {
      shapedCode = glyphInfo.isolated;
    }

    shapedChars.push(String.fromCharCode(shapedCode));
  }

  return shapedChars.join('');
}

/**
 * Reorders a reshaped Arabic string for PDF display (RTL progression)
 * while preserving numbers, tech codes (e.g., "CASE-2026-0001", "2G/3G/4G/5G", "12.34%"), 
 * and LTR English words intact.
 */
export function reorderArabicForPdf(text: string): string {
  if (!text || !hasArabicText(text)) return text;

  const reshaped = reshapeArabic(text);

  // Tokenize into Arabic segments and LTR segments (words, numbers, symbols)
  const tokens: { isArabic: boolean; text: string }[] = [];
  let currentToken = '';
  let currentIsArabic = false;

  for (const char of Array.from(reshaped)) {
    const code = char.charCodeAt(0);
    const isAr = isArabicChar(code) || (code >= 0xfe70 && code <= 0xfeff);

    if (tokens.length === 0 && currentToken === '') {
      currentIsArabic = isAr;
      currentToken = char;
    } else if (isAr === currentIsArabic) {
      currentToken += char;
    } else {
      tokens.push({ isArabic: currentIsArabic, text: currentToken });
      currentIsArabic = isAr;
      currentToken = char;
    }
  }

  if (currentToken) {
    tokens.push({ isArabic: currentIsArabic, text: currentToken });
  }

  // Reverse Arabic tokens character-by-character, and reverse order of main tokens for overall RTL
  const reversedTokens = tokens.reverse().map((tok) => {
    if (tok.isArabic) {
      return Array.from(tok.text).reverse().join('');
    }
    // LTR segments (numbers, English terms, codes) remain forward-facing
    return tok.text;
  });

  return reversedTokens.join('');
}
