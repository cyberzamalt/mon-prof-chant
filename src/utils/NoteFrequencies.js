// src/utils/NoteFrequencies.js
// Table de référence des fréquences des notes musicales
// A0 (27.5 Hz) à C8 (4186.01 Hz) - 88 notes de piano

import { Logger } from '../logging/Logger.js';

/**
 * Noms des notes dans l'ordre chromatique
 * 12 notes par octave
 */
export const NOTE_NAMES = [
  'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'
];

/**
 * Noms alternatifs (bémols)
 */
export const NOTE_NAMES_FLAT = [
  'A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'
];

/**
 * Générer toutes les fréquences de A0 à C8
 * Formule : f(n) = 440 × 2^((n-49)/12)
 * Où n = numéro de la touche du piano (A0 = 1, A4 = 49)
 * 
 * @returns {Array<number>} 88 fréquences (A0 à C8)
 */
function generateFrequencies() {
  const frequencies = [];
  const A0 = 27.5; // Fréquence de référence A0
  
  for (let i = 0; i < 88; i++) {
    // Formule : A0 × 2^(i/12)
    const freq = A0 * Math.pow(2, i / 12);
    frequencies.push(freq);
  }
  
  return frequencies;
}

/**
 * Table complète des 88 notes de piano
 * Index 0 = A0 (27.5 Hz)
 * Index 48 = A4 (440 Hz) - La de référence
 * Index 87 = C8 (4186.01 Hz)
 */
export const FREQUENCIES = generateFrequencies();

/**
 * Fréquences de référence importantes
 */
export const REFERENCE_FREQUENCIES = {
  A0: 27.5,
  A1: 55.0,
  A2: 110.0,
  A3: 220.0,
  A4: 440.0,  // La de référence international
  A5: 880.0,
  A6: 1760.0,
  A7: 3520.0,
  C4: 261.63, // Do du milieu (Middle C)
  C5: 523.25,
  C6: 1046.50,
  C7: 2093.00,
  C8: 4186.01
};

/**
 * Plages de fréquences par registre vocal
 */
export const VOCAL_RANGES = {
  'Très très grave': { min: 20, max: 80, color: '#1e3a8a' },
  'Très grave': { min: 80, max: 160, color: '#1e40af' },
  'Grave': { min: 160, max: 250, color: '#2563eb' },
  'Moyen-grave': { min: 250, max: 440, color: '#3b82f6' },
  'Moyen-aigu': { min: 440, max: 600, color: '#60a5fa' },
  'Aigu': { min: 600, max: 900, color: '#93c5fd' },
  'Très aigu': { min: 900, max: 1400, color: '#dbeafe' },
  'Très très aigu': { min: 1400, max: 4200, color: '#eff6ff' }
};

/**
 * Obtenir le nom complet d'une note à partir de son index
 * @param {number} index - Index dans la table (0-87)
 * @returns {string} Nom complet (ex: "A4", "C#5")
 */
export function getNoteNameFromIndex(index) {
  if (index < 0 || index >= FREQUENCIES.length) {
    Logger.warn('[NoteFrequencies] Index hors limites', { index });
    return '—';
  }

  const noteIndex = index % 12;
  const octave = Math.floor(index / 12);
  const noteName = NOTE_NAMES[noteIndex];
  
  return `${noteName}${octave}`;
}

/**
 * Obtenir l'index d'une note à partir de son nom
 * @param {string} noteName - Nom de la note (ex: "A4", "C#5")
 * @returns {number} Index dans la table (0-87) ou -1 si invalide
 */
export function getIndexFromNoteName(noteName) {
  if (!noteName || typeof noteName !== 'string') {
    Logger.warn('[NoteFrequencies] Note invalide', { noteName });
    return -1;
  }

  // Parser le nom (ex: "A4", "C#5", "Bb3")
  const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) {
    Logger.warn('[NoteFrequencies] Format invalide', { noteName });
    return -1;
  }

  const note = match[1];
  const octave = parseInt(match[2], 10);

  // Chercher dans NOTE_NAMES ou NOTE_NAMES_FLAT
  let noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) {
    noteIndex = NOTE_NAMES_FLAT.indexOf(note);
  }
  
  if (noteIndex === -1) {
    Logger.warn('[NoteFrequencies] Note non reconnue', { note });
    return -1;
  }

  const index = octave * 12 + noteIndex;
  
  if (index < 0 || index >= FREQUENCIES.length) {
    Logger.warn('[NoteFrequencies] Index calculé hors limites', { noteName, index });
    return -1;
  }

  return index;
}

/**
 * Obtenir la fréquence d'une note
 * @param {string} noteName - Nom de la note (ex: "A4")
 * @returns {number} Fréquence en Hz ou 0 si invalide
 */
export function getFrequency(noteName) {
  const index = getIndexFromNoteName(noteName);
  if (index === -1) return 0;
  return FREQUENCIES[index];
}

/**
 * Trouver la note la plus proche d'une fréquence
 * @param {number} frequency - Fréquence en Hz
 * @returns {Object} { index, noteName, frequency, cents }
 */
export function findClosestNote(frequency) {
  if (!frequency || frequency <= 0) {
    return {
      index: -1,
      noteName: '—',
      frequency: 0,
      cents: 0
    };
  }

  // Trouver l'index de la note la plus proche
  let closestIndex = 0;
  let minDiff = Math.abs(Math.log2(frequency / FREQUENCIES[0]));

  for (let i = 1; i < FREQUENCIES.length; i++) {
    const diff = Math.abs(Math.log2(frequency / FREQUENCIES[i]));
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }

  const closestFreq = FREQUENCIES[closestIndex];
  const noteName = getNoteNameFromIndex(closestIndex);
  
  // Calculer déviation en cents
  const cents = 1200 * Math.log2(frequency / closestFreq);

  return {
    index: closestIndex,
    noteName: noteName,
    frequency: closestFreq,
    cents: Math.round(cents)
  };
}

/**
 * Obtenir le registre vocal pour une fréquence
 * @param {number} frequency - Fréquence en Hz
 * @returns {Object} { name, color, min, max }
 */
export function getVocalRegister(frequency) {
  for (const [name, range] of Object.entries(VOCAL_RANGES)) {
    if (frequency >= range.min && frequency < range.max) {
      return {
        name,
        color: range.color,
        min: range.min,
        max: range.max
      };
    }
  }
  
  // Par défaut, retourner le dernier registre
  return {
    name: 'Très très aigu',
    color: VOCAL_RANGES['Très très aigu'].color,
    min: 1400,
    max: 4200
  };
}

/**
 * Obtenir toutes les notes d'une octave
 * @param {number} octave - Numéro d'octave (0-7)
 * @returns {Array<Object>} Notes de l'octave avec leurs fréquences
 */
export function getOctaveNotes(octave) {
  if (octave < 0 || octave > 7) {
    Logger.warn('[NoteFrequencies] Octave hors limites', { octave });
    return [];
  }

  const notes = [];
  const startIndex = octave * 12;
  const endIndex = Math.min(startIndex + 12, FREQUENCIES.length);

  for (let i = startIndex; i < endIndex; i++) {
    notes.push({
      index: i,
      noteName: getNoteNameFromIndex(i),
      frequency: FREQUENCIES[i],
      midiNote: 21 + i
    });
  }

  return notes;
}

/**
 * Vérifier si une fréquence est dans la plage audible humaine
 * @param {number} frequency - Fréquence en Hz
 * @returns {boolean}
 */
export function isAudible(frequency) {
  return frequency >= 20 && frequency <= 20000;
}

/**
 * Vérifier si une fréquence est dans la plage vocale typique
 * @param {number} frequency - Fréquence en Hz
 * @returns {boolean}
 */
export function isVocalRange(frequency) {
  // Plage vocale typique : 80 Hz (basse) à 1400 Hz (soprano aigu)
  return frequency >= 80 && frequency <= 1400;
}

// Logger l'initialisation
Logger.info('[NoteFrequencies] Table initialisée', {
  totalNotes: FREQUENCIES.length,
  range: `${FREQUENCIES[0].toFixed(2)} Hz - ${FREQUENCIES[FREQUENCIES.length - 1].toFixed(2)} Hz`,
  A4: REFERENCE_FREQUENCIES.A4
});

// Exports par défaut
export default {
  NOTE_NAMES,
  NOTE_NAMES_FLAT,
  FREQUENCIES,
  REFERENCE_FREQUENCIES,
  VOCAL_RANGES,
  getNoteNameFromIndex,
  getIndexFromNoteName,
  getFrequency,
  findClosestNote,
  getVocalRegister,
  getOctaveNotes,
  isAudible,
  isVocalRange
};
