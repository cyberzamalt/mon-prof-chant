/**
 * AudioMath.js - Fonctions Mathématiques Audio
 * 
 * Conversions entre Hz, MIDI, Notes, Cents
 * Calculs musicaux et mathématiques pour l'audio
 * 
 * Fichier 4/18 - FONDATIONS
 * Dépend de: constants.js
 */

import { MUSIC, PITCH_DETECTION } from '../config/constants.js';

/**
 * Convertit une fréquence Hz en numéro MIDI
 * @param {number} hz - Fréquence en Hz
 * @returns {number} Numéro MIDI (0-127)
 */
export function hzToMidi(hz) {
  if (!hz || hz <= 0) return 0;
  
  try {
    // Formule: MIDI = 69 + 12 * log2(hz / 440)
    const midi = MUSIC.A440_MIDI + 12 * Math.log2(hz / PITCH_DETECTION.A440_HZ);
    return Math.max(0, Math.min(127, midi));
  } catch (error) {
    console.error('Erreur hzToMidi:', error);
    return 0;
  }
}

/**
 * Convertit un numéro MIDI en fréquence Hz
 * @param {number} midi - Numéro MIDI (0-127)
 * @returns {number} Fréquence en Hz
 */
export function midiToHz(midi) {
  if (midi < 0 || midi > 127) return 0;
  
  try {
    // Formule: Hz = 440 * 2^((MIDI - 69) / 12)
    return PITCH_DETECTION.A440_HZ * Math.pow(2, (midi - MUSIC.A440_MIDI) / 12);
  } catch (error) {
    console.error('Erreur midiToHz:', error);
    return 0;
  }
}

/**
 * Convertit une fréquence Hz en nom de note + octave
 * @param {number} hz - Fréquence en Hz
 * @param {boolean} french - true pour notation française
 * @returns {object} {note: 'A', octave: 4, fullName: 'A4', cents: 0}
 */
export function hzToNote(hz, french = false) {
  if (!hz || hz <= 0) {
    return { note: '?', octave: 0, fullName: '?', cents: 0 };
  }
  
  try {
    const midi = hzToMidi(hz);
    const noteIndex = Math.round(midi) % MUSIC.NOTES_PER_OCTAVE;
    const octave = Math.floor(Math.round(midi) / MUSIC.NOTES_PER_OCTAVE) - 1;
    
    const noteNames = french ? MUSIC.NOTE_NAMES_FR : MUSIC.NOTE_NAMES;
    const note = noteNames[noteIndex];
    
    // Calculer la déviation en cents
    const exactMidi = midi;
    const roundedMidi = Math.round(midi);
    const cents = Math.round((exactMidi - roundedMidi) * 100);
    
    return {
      note,
      octave,
      fullName: `${note}${octave}`,
      cents,
      midi: roundedMidi
    };
  } catch (error) {
    console.error('Erreur hzToNote:', error);
    return { note: '?', octave: 0, fullName: '?', cents: 0 };
  }
}

/**
 * Calcule la différence en cents entre deux fréquences
 * @param {number} hz1 - Première fréquence
 * @param {number} hz2 - Deuxième fréquence (référence)
 * @returns {number} Différence en cents
 */
export function centsFromHz(hz1, hz2) {
  if (!hz1 || !hz2 || hz1 <= 0 || hz2 <= 0) return 0;
  
  try {
    // Formule: Cents = 1200 * log2(hz1 / hz2)
    return Math.round(1200 * Math.log2(hz1 / hz2));
  } catch (error) {
    console.error('Erreur centsFromHz:', error);
    return 0;
  }
}

/**
 * Calcule les cents par rapport à A440 ou à la note la plus proche
 * @param {number} hz - Fréquence en Hz
 * @param {string} mode - 'a440' ou 'auto'
 * @returns {number} Cents de déviation
 */
export function centsFrom(hz, mode = 'a440') {
  if (!hz || hz <= 0) return 0;
  
  try {
    if (mode === 'a440') {
      // Déviation par rapport à A440
      return centsFromHz(hz, PITCH_DETECTION.A440_HZ);
    } else {
      // Déviation par rapport à la note la plus proche
      const midi = hzToMidi(hz);
      const nearestMidi = Math.round(midi);
      const nearestHz = midiToHz(nearestMidi);
      return centsFromHz(hz, nearestHz);
    }
  } catch (error) {
    console.error('Erreur centsFrom:', error);
    return 0;
  }
}

/**
 * Vérifie si une fréquence est dans la plage valide
 * @param {number} hz - Fréquence à vérifier
 * @returns {boolean} true si valide
 */
export function isValidHz(hz) {
  return (
    typeof hz === 'number' &&
    !isNaN(hz) &&
    hz >= PITCH_DETECTION.MIN_HZ &&
    hz <= PITCH_DETECTION.MAX_HZ
  );
}

/**
 * Limite une fréquence à la plage valide
 * @param {number} hz - Fréquence à limiter
 * @returns {number} Fréquence limitée
 */
export function clampHz(hz) {
  if (!hz || isNaN(hz)) return PITCH_DETECTION.A440_HZ;
  return Math.max(
    PITCH_DETECTION.MIN_HZ,
    Math.min(PITCH_DETECTION.MAX_HZ, hz)
  );
}

/**
 * Interpole linéairement entre deux valeurs
 * @param {number} a - Valeur de départ
 * @param {number} b - Valeur d'arrivée
 * @param {number} t - Facteur d'interpolation (0-1)
 * @returns {number} Valeur interpolée
 */
export function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Interpolation Catmull-Rom pour courbes lisses
 * @param {number} p0 - Point avant
 * @param {number} p1 - Point début
 * @param {number} p2 - Point fin
 * @param {number} p3 - Point après
 * @param {number} t - Facteur (0-1)
 * @returns {number} Valeur interpolée
 */
export function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

/**
 * Calcule la moyenne d'un tableau de nombres
 * @param {number[]} values - Tableau de valeurs
 * @returns {number} Moyenne
 */
export function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calcule la médiane d'un tableau de nombres
 * @param {number[]} values - Tableau de valeurs
 * @returns {number} Médiane
 */
export function median(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Calcule l'écart-type d'un tableau de nombres
 * @param {number[]} values - Tableau de valeurs
 * @returns {number} Écart-type
 */
export function standardDeviation(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  
  const avg = average(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = average(squareDiffs);
  
  return Math.sqrt(avgSquareDiff);
}

/**
 * Convertit des cents en ratio de fréquence
 * @param {number} cents - Cents
 * @returns {number} Ratio
 */
export function centsToRatio(cents) {
  return Math.pow(2, cents / 1200);
}

/**
 * Convertit un ratio de fréquence en cents
 * @param {number} ratio - Ratio
 * @returns {number} Cents
 */
export function ratioToCents(ratio) {
  if (ratio <= 0) return 0;
  return 1200 * Math.log2(ratio);
}

/**
 * Calcule la fréquence à partir d'une note et d'une déviation en cents
 * @param {string} noteName - Nom de la note (ex: 'A4')
 * @param {number} cents - Déviation en cents
 * @returns {number} Fréquence en Hz
 */
export function noteToHz(noteName, cents = 0) {
  try {
    // Parser le nom de la note (ex: "A4" -> note="A", octave=4)
    const match = noteName.match(/^([A-G]#?)(\d+)$/);
    if (!match) return 0;
    
    const [, note, octaveStr] = match;
    const octave = parseInt(octaveStr, 10);
    
    // Trouver l'index de la note
    const noteIndex = MUSIC.NOTE_NAMES.indexOf(note);
    if (noteIndex === -1) return 0;
    
    // Calculer le MIDI
    const midi = (octave + 1) * MUSIC.NOTES_PER_OCTAVE + noteIndex;
    
    // Convertir en Hz
    let hz = midiToHz(midi);
    
    // Appliquer la déviation en cents
    if (cents !== 0) {
      hz *= centsToRatio(cents);
    }
    
    return hz;
  } catch (error) {
    console.error('Erreur noteToHz:', error);
    return 0;
  }
}

/**
 * Formate une fréquence pour l'affichage
 * @param {number} hz - Fréquence en Hz
 * @param {number} decimals - Nombre de décimales
 * @returns {string} Fréquence formatée
 */
export function formatHz(hz, decimals = 1) {
  if (!hz || isNaN(hz)) return '0 Hz';
  return `${hz.toFixed(decimals)} Hz`;
}

/**
 * Formate des cents pour l'affichage
 * @param {number} cents - Cents
 * @returns {string} Cents formatés
 */
export function formatCents(cents) {
  if (!cents || isNaN(cents)) return '0¢';
  const sign = cents >= 0 ? '+' : '';
  return `${sign}${Math.round(cents)}¢`;
}

/**
 * Détermine la couleur selon la justesse en cents
 * @param {number} cents - Cents de déviation
 * @returns {string} Couleur hex
 */
export function getCentsColor(cents) {
  const absCents = Math.abs(cents);
  
  if (absCents <= 10) {
    return '#00ff00'; // Vert - Excellent
  } else if (absCents <= 25) {
    return '#ffff00'; // Jaune - Proche
  } else {
    return '#ff0000'; // Rouge - Décalé
  }
}

// Export toutes les fonctions
export default {
  hzToMidi,
  midiToHz,
  hzToNote,
  centsFromHz,
  centsFrom,
  isValidHz,
  clampHz,
  lerp,
  catmullRom,
  average,
  median,
  standardDeviation,
  centsToRatio,
  ratioToCents,
  noteToHz,
  formatHz,
  formatCents,
  getCentsColor
};
