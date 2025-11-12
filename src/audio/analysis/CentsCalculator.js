// src/audio/analysis/CentsCalculator.js
// Calculs de conversion fréquence → cents → notes
// Formule : 1200 × log₂(freq / freq_ref)

import { Logger } from '../../logging/Logger.js';

/**
 * Table des fréquences des notes (A0 = 27.5 Hz à C8 = 4186 Hz)
 * Index 0 = A0, Index 48 = A4 (440 Hz), Index 87 = C8
 */
const NOTE_FREQUENCIES = [];
const NOTE_NAMES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

// Générer table de fréquences (A0 à C8, 88 notes)
for (let i = 0; i < 88; i++) {
  const freq = 27.5 * Math.pow(2, i / 12); // A0 = 27.5 Hz
  NOTE_FREQUENCIES.push(freq);
}

export class CentsCalculator {
  /**
   * Convertir Hz en cents par rapport à une fréquence de référence
   * @param {number} frequency - Fréquence mesurée en Hz
   * @param {number} referenceFreq - Fréquence de référence en Hz (défaut 440 Hz = A4)
   * @returns {number} Déviation en cents (-∞ à +∞)
   */
  static frequencyToCents(frequency, referenceFreq = 440) {
    if (!frequency || frequency <= 0) {
      Logger.warn('[CentsCalculator] Fréquence invalide', { frequency });
      return 0;
    }
    
    if (!referenceFreq || referenceFreq <= 0) {
      Logger.warn('[CentsCalculator] Fréquence référence invalide', { referenceFreq });
      return 0;
    }

    // Formule : 1200 × log₂(f / f_ref)
    const cents = 1200 * Math.log2(frequency / referenceFreq);
    
    return cents;
  }

  /**
   * Trouver la note la plus proche d'une fréquence
   * @param {number} frequency - Fréquence en Hz
   * @returns {Object} { note: 'A4', octave: 4, cents: -8, frequency: 440, midiNote: 69 }
   */
  static frequencyToNote(frequency) {
    if (!frequency || frequency <= 0) {
      return {
        note: '—',
        octave: 0,
        cents: 0,
        frequency: 0,
        midiNote: 0,
        noteName: '—',
        fullName: '—'
      };
    }

    // Trouver l'index de la note la plus proche
    let closestIndex = 0;
    let minDiff = Math.abs(Math.log2(frequency / NOTE_FREQUENCIES[0]));

    for (let i = 1; i < NOTE_FREQUENCIES.length; i++) {
      const diff = Math.abs(Math.log2(frequency / NOTE_FREQUENCIES[i]));
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    const closestFreq = NOTE_FREQUENCIES[closestIndex];
    
    // Calculer la déviation en cents
    const cents = this.frequencyToCents(frequency, closestFreq);

    // Calculer nom de la note (A, A#, B, C, etc.)
    const noteIndex = closestIndex % 12;
    const noteName = NOTE_NAMES[noteIndex];
    
    // Calculer l'octave (A0 = octave 0, A4 = octave 4)
    const octave = Math.floor(closestIndex / 12);
    
    // Calculer le numéro MIDI (A0 = 21, A4 = 69, C8 = 108)
    const midiNote = 21 + closestIndex;

    const result = {
      note: noteName,
      octave: octave,
      cents: Math.round(cents),
      frequency: Math.round(closestFreq * 10) / 10,
      midiNote: midiNote,
      noteName: noteName,
      fullName: `${noteName}${octave}`
    };

    Logger.debug('[CentsCalculator] Conversion Hz → Note', {
      inputFreq: Math.round(frequency * 10) / 10,
      result
    });

    return result;
  }

  /**
   * Obtenir la fréquence d'une note donnée
   * @param {string} noteName - Nom de la note (ex: 'A4', 'C#5', 'B3')
   * @returns {number} Fréquence en Hz
   */
  static noteToFrequency(noteName) {
    if (!noteName || typeof noteName !== 'string') {
      Logger.warn('[CentsCalculator] Note invalide', { noteName });
      return 0;
    }

    // Parser le nom de note (ex: "A4", "C#5")
    const match = noteName.match(/^([A-G]#?)(\d+)$/);
    if (!match) {
      Logger.warn('[CentsCalculator] Format note invalide', { noteName });
      return 0;
    }

    const note = match[1]; // "A", "C#", etc.
    const octave = parseInt(match[2], 10);

    // Trouver l'index dans NOTE_NAMES
    const noteIndex = NOTE_NAMES.indexOf(note);
    if (noteIndex === -1) {
      Logger.warn('[CentsCalculator] Note non reconnue', { note });
      return 0;
    }

    // Calculer l'index dans NOTE_FREQUENCIES
    const freqIndex = octave * 12 + noteIndex;
    
    if (freqIndex < 0 || freqIndex >= NOTE_FREQUENCIES.length) {
      Logger.warn('[CentsCalculator] Octave hors limites', { noteName, freqIndex });
      return 0;
    }

    return NOTE_FREQUENCIES[freqIndex];
  }

  /**
   * Obtenir le numéro MIDI d'une note
   * @param {string} noteName - Nom de la note (ex: 'A4')
   * @returns {number} Numéro MIDI (A0 = 21, A4 = 69, C8 = 108)
   */
  static noteToMidi(noteName) {
    const freq = this.noteToFrequency(noteName);
    if (!freq) return 0;

    const noteData = this.frequencyToNote(freq);
    return noteData.midiNote;
  }

  /**
   * Convertir numéro MIDI en fréquence
   * @param {number} midiNote - Numéro MIDI (21-108)
   * @returns {number} Fréquence en Hz
   */
  static midiToFrequency(midiNote) {
    if (!midiNote || midiNote < 21 || midiNote > 108) {
      Logger.warn('[CentsCalculator] MIDI note hors limites', { midiNote });
      return 0;
    }

    const index = midiNote - 21;
    return NOTE_FREQUENCIES[index];
  }

  /**
   * Vérifier si une fréquence est dans une plage de cents acceptable
   * @param {number} frequency - Fréquence mesurée
   * @param {number} targetFrequency - Fréquence cible
   * @param {number} tolerance - Tolérance en cents (défaut ±25)
   * @returns {boolean} true si dans la tolérance
   */
  static isInTune(frequency, targetFrequency, tolerance = 25) {
    const cents = Math.abs(this.frequencyToCents(frequency, targetFrequency));
    return cents <= tolerance;
  }

  /**
   * Obtenir un code couleur selon la déviation en cents
   * @param {number} cents - Déviation en cents
   * @returns {string} Code couleur hex
   */
  static getCentsColor(cents) {
    const absCents = Math.abs(cents);
    
    if (absCents <= 10) {
      return '#10b981'; // Vert (excellent)
    } else if (absCents <= 25) {
      return '#f59e0b'; // Jaune (proche)
    } else {
      return '#ef4444'; // Rouge (décalé)
    }
  }

  /**
   * Obtenir un label de qualité selon la déviation
   * @param {number} cents - Déviation en cents
   * @returns {string} Label ('Excellent', 'Bien', 'À travailler')
   */
  static getCentsLabel(cents) {
    const absCents = Math.abs(cents);
    
    if (absCents <= 10) {
      return 'Excellent';
    } else if (absCents <= 25) {
      return 'Bien';
    } else if (absCents <= 50) {
      return 'À travailler';
    } else {
      return 'Faux';
    }
  }

  /**
   * Obtenir la plage de registre vocal pour une fréquence
   * @param {number} frequency - Fréquence en Hz
   * @returns {string} Registre ('Très très grave', 'Grave', 'Moyen', 'Aigu', etc.)
   */
  static getVocalRegister(frequency) {
    if (frequency < 80) return 'Très très grave';
    if (frequency < 160) return 'Très grave';
    if (frequency < 250) return 'Grave';
    if (frequency < 440) return 'Moyen-grave';
    if (frequency < 600) return 'Moyen-aigu';
    if (frequency < 900) return 'Aigu';
    if (frequency < 1400) return 'Très aigu';
    return 'Très très aigu';
  }
}

export default CentsCalculator;
