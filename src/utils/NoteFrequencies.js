/**
 * NoteFrequencies.js
 * Table de référence des fréquences des notes
 * 
 * Responsabilités:
 * - Fournir les fréquences standard des notes (A4=440Hz)
 * - Mapping nom de note → fréquence
 * - Plages de fréquences par octave
 * 
 * Standard: A4 = 440Hz (La 440)
 * Formule: f(n) = 440 × 2^((n-69)/12)
 * où n = numéro MIDI (A4 = 69, C4 = 60)
 */

/**
 * Table complète des fréquences (C0 à B8)
 * Format: 'NOTE_NAME_OCTAVE': frequency_in_Hz
 */
export const NOTE_FREQUENCIES = {
  // Octave 0
  'C0': 16.35,
  'C#0': 17.32,
  'D0': 18.35,
  'D#0': 19.45,
  'E0': 20.60,
  'F0': 21.83,
  'F#0': 23.12,
  'G0': 24.50,
  'G#0': 25.96,
  'A0': 27.50,
  'A#0': 29.14,
  'B0': 30.87,

  // Octave 1
  'C1': 32.70,
  'C#1': 34.65,
  'D1': 36.71,
  'D#1': 38.89,
  'E1': 41.20,
  'F1': 43.65,
  'F#1': 46.25,
  'G1': 49.00,
  'G#1': 51.91,
  'A1': 55.00,
  'A#1': 58.27,
  'B1': 61.74,

  // Octave 2
  'C2': 65.41,
  'C#2': 69.30,
  'D2': 73.42,
  'D#2': 77.78,
  'E2': 82.41,
  'F2': 87.31,
  'F#2': 92.50,
  'G2': 98.00,
  'G#2': 103.83,
  'A2': 110.00,
  'A#2': 116.54,
  'B2': 123.47,

  // Octave 3
  'C3': 130.81,
  'C#3': 138.59,
  'D3': 146.83,
  'D#3': 155.56,
  'E3': 164.81,
  'F3': 174.61,
  'F#3': 185.00,
  'G3': 196.00,
  'G#3': 207.65,
  'A3': 220.00,
  'A#3': 233.08,
  'B3': 246.94,

  // Octave 4 (Octave centrale du piano)
  'C4': 261.63,  // Do central
  'C#4': 277.18,
  'D4': 293.66,
  'D#4': 311.13,
  'E4': 329.63,
  'F4': 349.23,
  'F#4': 369.99,
  'G4': 392.00,
  'G#4': 415.30,
  'A4': 440.00,  // La 440 (référence standard)
  'A#4': 466.16,
  'B4': 493.88,

  // Octave 5
  'C5': 523.25,
  'C#5': 554.37,
  'D5': 587.33,
  'D#5': 622.25,
  'E5': 659.25,
  'F5': 698.46,
  'F#5': 739.99,
  'G5': 783.99,
  'G#5': 830.61,
  'A5': 880.00,
  'A#5': 932.33,
  'B5': 987.77,

  // Octave 6
  'C6': 1046.50,
  'C#6': 1108.73,
  'D6': 1174.66,
  'D#6': 1244.51,
  'E6': 1318.51,
  'F6': 1396.91,
  'F#6': 1479.98,
  'G6': 1567.98,
  'G#6': 1661.22,
  'A6': 1760.00,
  'A#6': 1864.66,
  'B6': 1975.53,

  // Octave 7
  'C7': 2093.00,
  'C#7': 2217.46,
  'D7': 2349.32,
  'D#7': 2489.02,
  'E7': 2637.02,
  'F7': 2793.83,
  'F#7': 2959.96,
  'G7': 3135.96,
  'G#7': 3322.44,
  'A7': 3520.00,
  'A#7': 3729.31,
  'B7': 3951.07,

  // Octave 8
  'C8': 4186.01,
  'C#8': 4434.92,
  'D8': 4698.63,
  'D#8': 4978.03,
  'E8': 5274.04,
  'F8': 5587.65,
  'F#8': 5919.91,
  'G8': 6271.93,
  'G#8': 6644.88,
  'A8': 7040.00,
  'A#8': 7458.62,
  'B8': 7902.13
};

/**
 * Plages de fréquences utiles pour le chant
 */
export const VOCAL_RANGES = {
  // Voix féminines
  SOPRANO: { min: 261.63, max: 1046.50, notes: 'C4-C6' },
  MEZZO_SOPRANO: { min: 220.00, max: 880.00, notes: 'A3-A5' },
  ALTO: { min: 174.61, max: 698.46, notes: 'F3-F5' },

  // Voix masculines
  TENOR: { min: 130.81, max: 523.25, notes: 'C3-C5' },
  BARITONE: { min: 110.00, max: 440.00, notes: 'A2-A4' },
  BASS: { min: 82.41, max: 349.23, notes: 'E2-F4' },

  // Plage complète
  FULL_VOCAL: { min: 82.41, max: 1046.50, notes: 'E2-C6' }
};

/**
 * Noms des notes (sans octave)
 */
export const NOTE_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 
  'F#', 'G', 'G#', 'A', 'A#', 'B'
];

/**
 * Noms alternatifs (bémols)
 */
export const NOTE_NAMES_FLATS = [
  'C', 'Db', 'D', 'Eb', 'E', 'F',
  'Gb', 'G', 'Ab', 'A', 'Bb', 'B'
];

/**
 * Configuration par défaut pour l'analyse
 */
export const ANALYSIS_CONFIG = {
  // Plage de détection recommandée
  MIN_FREQUENCY: 60,    // ~B1
  MAX_FREQUENCY: 1200,  // ~D#6
  
  // Seuils de qualité
  MIN_CLARITY: 0.85,    // Clarté minimale pour valider une détection
  
  // Référence standard
  A4_REFERENCE: 440,    // Hz
  
  // Tolérance
  CENTS_TOLERANCE: 10   // ±10 cents = "juste"
};

/**
 * Obtenir la fréquence d'une note par son nom
 * @param {string} noteName - Nom de la note (ex: 'A4', 'C#5')
 * @returns {number|null} Fréquence en Hz ou null si introuvable
 */
export function getFrequency(noteName) {
  try {
    if (!noteName || typeof noteName !== 'string') {
      console.warn('[NoteFrequencies] Nom de note invalide:', noteName);
      return null;
    }

    const freq = NOTE_FREQUENCIES[noteName];
    if (freq === undefined) {
      console.warn('[NoteFrequencies] Note introuvable:', noteName);
      return null;
    }

    return freq;

  } catch (err) {
    console.error('[NoteFrequencies] Erreur getFrequency:', err);
    return null;
  }
}

/**
 * Trouver la note la plus proche d'une fréquence
 * @param {number} frequency - Fréquence en Hz
 * @returns {Object|null} { note, octave, frequency, diff }
 */
export function findClosestNote(frequency) {
  try {
    if (typeof frequency !== 'number' || frequency <= 0) {
      console.warn('[NoteFrequencies] Fréquence invalide:', frequency);
      return null;
    }

    let closestNote = null;
    let minDiff = Infinity;

    for (const [noteName, noteFreq] of Object.entries(NOTE_FREQUENCIES)) {
      const diff = Math.abs(frequency - noteFreq);
      if (diff < minDiff) {
        minDiff = diff;
        
        // Parser le nom (ex: "C#4" -> note="C#", octave=4)
        const match = noteName.match(/^([A-G]#?)(\d+)$/);
        if (match) {
          closestNote = {
            note: match[1],
            octave: parseInt(match[2]),
            frequency: noteFreq,
            diff: diff,
            name: noteName
          };
        }
      }
    }

    return closestNote;

  } catch (err) {
    console.error('[NoteFrequencies] Erreur findClosestNote:', err);
    return null;
  }
}

/**
 * Vérifier si une fréquence est dans une plage vocale
 * @param {number} frequency - Fréquence en Hz
 * @param {string} range - Nom de la plage (ex: 'SOPRANO', 'TENOR')
 * @returns {boolean} true si dans la plage
 */
export function isInVocalRange(frequency, range = 'FULL_VOCAL') {
  try {
    const vocalRange = VOCAL_RANGES[range];
    if (!vocalRange) {
      console.warn('[NoteFrequencies] Plage vocale inconnue:', range);
      return false;
    }

    return frequency >= vocalRange.min && frequency <= vocalRange.max;

  } catch (err) {
    console.error('[NoteFrequencies] Erreur isInVocalRange:', err);
    return false;
  }
}

/**
 * Obtenir toutes les notes d'une octave
 * @param {number} octave - Numéro d'octave (0-8)
 * @returns {Array} Liste des notes avec leurs fréquences
 */
export function getOctaveNotes(octave) {
  try {
    if (typeof octave !== 'number' || octave < 0 || octave > 8) {
      console.warn('[NoteFrequencies] Octave invalide:', octave);
      return [];
    }

    const notes = [];
    for (const noteName of NOTE_NAMES) {
      const fullName = `${noteName}${octave}`;
      const freq = NOTE_FREQUENCIES[fullName];
      if (freq !== undefined) {
        notes.push({
          name: fullName,
          note: noteName,
          octave: octave,
          frequency: freq
        });
      }
    }

    return notes;

  } catch (err) {
    console.error('[NoteFrequencies] Erreur getOctaveNotes:', err);
    return [];
  }
}
