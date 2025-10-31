/**
 * CentsCalculator.js
 * Calculateur de déviations en cents
 * 
 * Responsabilités:
 * - Calculer la déviation en cents par rapport à une note
 * - Identifier la note la plus proche
 * - Convertir fréquences en notes musicales
 * 
 * 1 cent = 1/100 de demi-ton
 * Formule: cents = 1200 × log2(f1/f2)
 */

import { Logger } from '../../logging/Logger.js';
import { NOTE_FREQUENCIES } from '../../utils/NoteFrequencies.js';

export class CentsCalculator {
  #referenceA4 = 440; // Hz
  #noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /**
   * Constructeur
   * @param {number} referenceA4 - Fréquence de référence pour A4 (défaut 440Hz)
   */
  constructor(referenceA4 = 440) {
    try {
      if (typeof referenceA4 !== 'number' || referenceA4 <= 0) {
        throw new Error('Fréquence A4 invalide');
      }

      this.#referenceA4 = referenceA4;
      Logger.info('CentsCalculator', `Initialisé avec A4=${referenceA4}Hz`);
    } catch (err) {
      Logger.error('CentsCalculator', 'Erreur constructeur', err);
      throw err;
    }
  }

  /**
   * Calculer la déviation en cents et identifier la note
   * @param {number} frequency - Fréquence à analyser (Hz)
   * @returns {Object} { note, octave, cents, deviation, targetFrequency }
   */
  calculate(frequency) {
    try {
      if (typeof frequency !== 'number' || frequency <= 0) {
        Logger.warn('CentsCalculator', 'Fréquence invalide', frequency);
        return {
          note: null,
          octave: null,
          cents: 0,
          deviation: 0,
          targetFrequency: 0,
          error: 'Fréquence invalide'
        };
      }

      // Étape 1: Trouver la note la plus proche
      const closestNote = this.#findClosestNote(frequency);

      // Étape 2: Calculer déviation en cents
      const cents = this.#calculateCents(frequency, closestNote.frequency);

      // Étape 3: Construire le résultat
      return {
        note: closestNote.name,
        octave: closestNote.octave,
        cents: Math.round(cents),
        deviation: cents, // Valeur exacte (non arrondie)
        targetFrequency: closestNote.frequency,
        frequency: frequency,
        isFlat: cents < 0,
        isSharp: cents > 0,
        isInTune: Math.abs(cents) < 10 // Tolérance ±10 cents
      };

    } catch (err) {
      Logger.error('CentsCalculator', 'Erreur calculate', err);
      return {
        note: null,
        octave: null,
        cents: 0,
        deviation: 0,
        targetFrequency: 0,
        error: err.message
      };
    }
  }

  /**
   * Trouver la note la plus proche d'une fréquence
   * @private
   * @param {number} frequency - Fréquence en Hz
   * @returns {Object} { name, octave, frequency }
   */
  #findClosestNote(frequency) {
    try {
      // Calcul du numéro de demi-ton par rapport à A4
      const semitonesFromA4 = 12 * Math.log2(frequency / this.#referenceA4);
      const closestSemitone = Math.round(semitonesFromA4);

      // Calcul de la fréquence de la note la plus proche
      const closestFrequency = this.#referenceA4 * Math.pow(2, closestSemitone / 12);

      // Calcul de la note et de l'octave
      // A4 = 69 en notation MIDI (C4 = 60)
      const midiNote = 69 + closestSemitone;
      const octave = Math.floor(midiNote / 12) - 1;
      const noteIndex = midiNote % 12;
      const noteName = this.#noteNames[noteIndex];

      return {
        name: noteName,
        octave: octave,
        frequency: closestFrequency,
        midiNote: midiNote
      };

    } catch (err) {
      Logger.error('CentsCalculator', 'Erreur findClosestNote', err);
      throw err;
    }
  }

  /**
   * Calculer déviation en cents entre deux fréquences
   * @private
   * @param {number} f1 - Fréquence mesurée
   * @param {number} f2 - Fréquence cible
   * @returns {number} Déviation en cents
   */
  #calculateCents(f1, f2) {
    try {
      if (f1 <= 0 || f2 <= 0) {
        throw new Error('Fréquences doivent être > 0');
      }

      // Formule: cents = 1200 × log2(f1/f2)
      const cents = 1200 * Math.log2(f1 / f2);

      return cents;

    } catch (err) {
      Logger.error('CentsCalculator', 'Erreur calculateCents', err);
      return 0;
    }
  }

  /**
   * Obtenir la fréquence d'une note spécifique
   * @param {string} noteName - Nom de la note (ex: 'A4', 'C#5')
   * @returns {number|null} Fréquence en Hz ou null si invalide
   */
  getNoteFrequency(noteName) {
    try {
      if (!noteName || typeof noteName !== 'string') {
        Logger.warn('CentsCalculator', 'Nom de note invalide', noteName);
        return null;
      }

      // Parser le nom de la note (ex: "C#4" -> note="C#", octave=4)
      const match = noteName.match(/^([A-G]#?)(\d+)$/);
      if (!match) {
        Logger.warn('CentsCalculator', 'Format de note invalide', noteName);
        return null;
      }

      const note = match[1];
      const octave = parseInt(match[2]);

      // Trouver l'index de la note
      const noteIndex = this.#noteNames.indexOf(note);
      if (noteIndex === -1) {
        Logger.warn('CentsCalculator', 'Note inconnue', note);
        return null;
      }

      // Calculer le numéro MIDI
      // C4 = 60, donc C0 = 12
      const midiNote = (octave + 1) * 12 + noteIndex;

      // Calculer la fréquence
      // A4 (MIDI 69) = référence
      const semitonesFromA4 = midiNote - 69;
      const frequency = this.#referenceA4 * Math.pow(2, semitonesFromA4 / 12);

      return frequency;

    } catch (err) {
      Logger.error('CentsCalculator', 'Erreur getNoteFrequency', err);
      return null;
    }
  }

  /**
   * Définir la fréquence de référence A4
   * @param {number} frequency - Nouvelle fréquence A4 en Hz
   */
  setReferenceA4(frequency) {
    try {
      if (typeof frequency !== 'number' || frequency <= 0) {
        throw new Error('Fréquence A4 invalide');
      }

      this.#referenceA4 = frequency;
      Logger.info('CentsCalculator', `Nouvelle référence A4=${frequency}Hz`);
    } catch (err) {
      Logger.error('CentsCalculator', 'Erreur setReferenceA4', err);
    }
  }

  /**
   * Obtenir la fréquence de référence actuelle
   * @returns {number} Fréquence A4 en Hz
   */
  getReferenceA4() {
    return this.#referenceA4;
  }

  /**
   * Convertir cents en ratio de fréquence
   * @param {number} cents - Déviation en cents
   * @returns {number} Ratio (ex: 100 cents = 1.0595, soit un demi-ton)
   */
  centsToRatio(cents) {
    try {
      // Formule inverse: ratio = 2^(cents/1200)
      return Math.pow(2, cents / 1200);
    } catch (err) {
      Logger.error('CentsCalculator', 'Erreur centsToRatio', err);
      return 1;
    }
  }

  /**
   * Vérifier si une fréquence est "juste" (dans la tolérance)
   * @param {number} frequency - Fréquence à vérifier
   * @param {number} tolerance - Tolérance en cents (défaut ±10)
   * @returns {boolean} true si juste
   */
  isInTune(frequency, tolerance = 10) {
    try {
      const result = this.calculate(frequency);
      return Math.abs(result.cents) <= tolerance;
    } catch (err) {
      Logger.error('CentsCalculator', 'Erreur isInTune', err);
      return false;
    }
  }
}
