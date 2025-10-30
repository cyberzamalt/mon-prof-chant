/**
 * NoteFrequencies.js - Table des Fréquences des Notes
 * 
 * Table de référence complète des fréquences musicales
 * Notes de C0 à C8 avec leurs fréquences en Hz
 * 
 * Fichier 5/18 - FONDATIONS
 * Dépend de: constants.js
 */

import { MUSIC, PITCH_DETECTION } from '../config/constants.js';

/**
 * Table complète des fréquences (C0 à C8)
 * Basée sur le tempérament égal avec A440 comme référence
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
  
  // Octave 2 (Zone basse pour voix masculine)
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
  
  // Octave 3 (Voix masculine standard)
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
  
  // Octave 4 (Voix féminine standard, contient A440)
  'C4': 261.63,
  'C#4': 277.18,
  'D4': 293.66,
  'D#4': 311.13,
  'E4': 329.63,
  'F4': 349.23,
  'F#4': 369.99,
  'G4': 392.00,
  'G#4': 415.30,
  'A4': 440.00, // ⭐ Référence A440
  'A#4': 466.16,
  'B4': 493.88,
  
  // Octave 5 (Voix aiguë)
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
  
  // Octave 6 (Très aigu)
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
  'C8': 4186.01
};

/**
 * Table inversée: Hz → Note
 * Permet de trouver la note la plus proche d'une fréquence
 */
export const FREQUENCY_TO_NOTE = Object.fromEntries(
  Object.entries(NOTE_FREQUENCIES).map(([note, hz]) => [hz, note])
);

/**
 * Récupère la fréquence d'une note
 * @param {string} noteName - Nom de la note (ex: 'A4', 'C#3')
 * @returns {number} Fréquence en Hz ou 0 si non trouvée
 */
export function getFrequency(noteName) {
  if (!noteName || typeof noteName !== 'string') return 0;
  
  const freq = NOTE_FREQUENCIES[noteName.toUpperCase()];
  return freq || 0;
}

/**
 * Trouve la note la plus proche d'une fréquence donnée
 * @param {number} hz - Fréquence en Hz
 * @returns {object} {note: 'A4', hz: 440.00, cents: 0}
 */
export function findClosestNote(hz) {
  if (!hz || hz <= 0) {
    return { note: null, hz: 0, cents: 0 };
  }
  
  try {
    let closestNote = null;
    let closestHz = 0;
    let minDiff = Infinity;
    
    // Parcourir toutes les notes
    for (const [note, noteHz] of Object.entries(NOTE_FREQUENCIES)) {
      const diff = Math.abs(Math.log2(hz / noteHz));
      
      if (diff < minDiff) {
        minDiff = diff;
        closestNote = note;
        closestHz = noteHz;
      }
    }
    
    // Calculer la déviation en cents
    const cents = closestHz ? Math.round(1200 * Math.log2(hz / closestHz)) : 0;
    
    return {
      note: closestNote,
      hz: closestHz,
      cents
    };
    
  } catch (error) {
    console.error('Erreur findClosestNote:', error);
    return { note: null, hz: 0, cents: 0 };
  }
}

/**
 * Vérifie si une note existe dans la table
 * @param {string} noteName - Nom de la note
 * @returns {boolean} true si existe
 */
export function noteExists(noteName) {
  if (!noteName || typeof noteName !== 'string') return false;
  return NOTE_FREQUENCIES.hasOwnProperty(noteName.toUpperCase());
}

/**
 * Récupère toutes les notes d'une octave
 * @param {number} octave - Numéro d'octave (0-8)
 * @returns {object} Objet avec notes de l'octave
 */
export function getOctaveNotes(octave) {
  if (octave < 0 || octave > 8) return {};
  
  const octaveNotes = {};
  
  for (const [note, hz] of Object.entries(NOTE_FREQUENCIES)) {
    if (note.endsWith(String(octave))) {
      octaveNotes[note] = hz;
    }
  }
  
  return octaveNotes;
}

/**
 * Récupère la plage de fréquences pour une octave
 * @param {number} octave - Numéro d'octave (0-8)
 * @returns {object} {min: Hz, max: Hz}
 */
export function getOctaveRange(octave) {
  const notes = getOctaveNotes(octave);
  const frequencies = Object.values(notes);
  
  if (frequencies.length === 0) {
    return { min: 0, max: 0 };
  }
  
  return {
    min: Math.min(...frequencies),
    max: Math.max(...frequencies)
  };
}

/**
 * Récupère toutes les notes dans une plage de fréquences
 * @param {number} minHz - Fréquence minimale
 * @param {number} maxHz - Fréquence maximale
 * @returns {object} Notes dans la plage
 */
export function getNotesInRange(minHz, maxHz) {
  const notesInRange = {};
  
  for (const [note, hz] of Object.entries(NOTE_FREQUENCIES)) {
    if (hz >= minHz && hz <= maxHz) {
      notesInRange[note] = hz;
    }
  }
  
  return notesInRange;
}

/**
 * Récupère les notes utilisables pour le chant (G2 à E6)
 * Plage vocale typique pour voix humaine
 * @returns {object} Notes chantables
 */
export function getVocalRange() {
  return getNotesInRange(98.00, 1318.51); // G2 à E6
}

/**
 * Détermine le type de voix selon la note
 * @param {string} noteName - Nom de la note
 * @returns {string} Type de voix (Basse, Ténor, Alto, Soprano)
 */
export function getVoiceType(noteName) {
  const hz = getFrequency(noteName);
  
  if (!hz) return 'Inconnu';
  
  if (hz < 130.81) return 'Basse profonde'; // < C3
  if (hz < 196.00) return 'Basse'; // C3 - G3
  if (hz < 261.63) return 'Ténor'; // G3 - C4
  if (hz < 392.00) return 'Alto'; // C4 - G4
  if (hz < 523.25) return 'Mezzo-soprano'; // G4 - C5
  if (hz < 1046.50) return 'Soprano'; // C5 - C6
  return 'Soprano colorature'; // > C6
}

/**
 * Génère une gamme majeure à partir d'une tonique
 * @param {string} tonic - Note tonique (ex: 'C4')
 * @returns {object[]} Tableau des notes de la gamme
 */
export function getMajorScale(tonic) {
  const tonicHz = getFrequency(tonic);
  if (!tonicHz) return [];
  
  // Intervalles de la gamme majeure (en demi-tons)
  const intervals = [0, 2, 4, 5, 7, 9, 11, 12];
  
  const scale = [];
  
  for (const interval of intervals) {
    // Calculer la fréquence
    const hz = tonicHz * Math.pow(2, interval / 12);
    
    // Trouver la note correspondante
    const noteInfo = findClosestNote(hz);
    
    scale.push({
      degree: intervals.indexOf(interval) + 1,
      note: noteInfo.note,
      hz: noteInfo.hz
    });
  }
  
  return scale;
}

/**
 * Génère une gamme mineure naturelle à partir d'une tonique
 * @param {string} tonic - Note tonique (ex: 'A3')
 * @returns {object[]} Tableau des notes de la gamme
 */
export function getMinorScale(tonic) {
  const tonicHz = getFrequency(tonic);
  if (!tonicHz) return [];
  
  // Intervalles de la gamme mineure naturelle (en demi-tons)
  const intervals = [0, 2, 3, 5, 7, 8, 10, 12];
  
  const scale = [];
  
  for (const interval of intervals) {
    const hz = tonicHz * Math.pow(2, interval / 12);
    const noteInfo = findClosestNote(hz);
    
    scale.push({
      degree: intervals.indexOf(interval) + 1,
      note: noteInfo.note,
      hz: noteInfo.hz
    });
  }
  
  return scale;
}

/**
 * Exporte la table au format CSV
 * @returns {string} Table en CSV
 */
export function exportToCSV() {
  let csv = 'Note,Frequency (Hz)\n';
  
  for (const [note, hz] of Object.entries(NOTE_FREQUENCIES)) {
    csv += `${note},${hz}\n`;
  }
  
  return csv;
}

// Export tout
export default {
  NOTE_FREQUENCIES,
  FREQUENCY_TO_NOTE,
  getFrequency,
  findClosestNote,
  noteExists,
  getOctaveNotes,
  getOctaveRange,
  getNotesInRange,
  getVocalRange,
  getVoiceType,
  getMajorScale,
  getMinorScale,
  exportToCSV
};
