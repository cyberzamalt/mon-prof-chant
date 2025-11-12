// src/audio/analysis/PitchDetector.js
// Wrapper pour YIN pitch detector
// Détection temps réel avec clarté et filtrage

import { Logger } from '../../logging/Logger.js';
import { CentsCalculator } from './CentsCalculator.js';
import { findClosestNote } from '../../utils/NoteFrequencies.js';

/**
 * Wrapper pour l'algorithme YIN de détection de pitch
 * Utilise src/vendor/yin-detector.js
 */
export class PitchDetector {
  #yinDetector = null;
  #sampleRate = 48000;
  #threshold = 0.1;
  #minFreq = 80;
  #maxFreq = 1400;
  #clarityThreshold = 0.85;

  constructor(options = {}) {
    this.#sampleRate = options.sampleRate || 48000;
    this.#threshold = options.threshold || 0.1;
    this.#minFreq = options.minFreq || 80;
    this.#maxFreq = options.maxFreq || 1400;
    this.#clarityThreshold = options.clarityThreshold || 0.85;

    // Vérifier que YinDetector est disponible (chargé via <script> dans HTML)
    if (typeof window.YinDetector === 'undefined') {
      const err = new Error('YinDetector non disponible - vérifier que src/vendor/yin-detector.js est chargé');
      Logger.error('[PitchDetector]', err);
      throw err;
    }

    // Créer instance YIN
    try {
      this.#yinDetector = new window.YinDetector(this.#sampleRate);
      Logger.info('[PitchDetector] Initialisé', {
        sampleRate: this.#sampleRate,
        threshold: this.#threshold,
        range: `${this.#minFreq}-${this.#maxFreq} Hz`,
        clarityThreshold: this.#clarityThreshold
      });
    } catch (e) {
      Logger.error('[PitchDetector] Erreur initialisation YIN', e);
      throw e;
    }
  }

  /**
   * Détecter le pitch dans un buffer audio
   * @param {Float32Array} buffer - Buffer audio (mono)
   * @returns {Object|null} { frequency, clarity, note, cents, confidence } ou null si pas de pitch
   */
  detect(buffer) {
    if (!buffer || buffer.length === 0) {
      Logger.warn('[PitchDetector] Buffer vide');
      return null;
    }

    if (!this.#yinDetector) {
      Logger.error('[PitchDetector] YIN non initialisé');
      return null;
    }

    try {
      // Appeler YIN detector
      const result = this.#yinDetector.detect(buffer, this.#threshold);

      // YIN retourne { frequency, clarity }
      if (!result || !result.frequency || result.frequency <= 0) {
        return null;
      }

      const frequency = result.frequency;
      const clarity = result.clarity || 0;

      // Filtrer les fréquences hors plage
      if (frequency < this.#minFreq || frequency > this.#maxFreq) {
        Logger.debug('[PitchDetector] Fréquence hors plage', { frequency });
        return null;
      }

      // Filtrer les détections peu claires
      if (clarity < this.#clarityThreshold) {
        Logger.debug('[PitchDetector] Clarté insuffisante', { frequency, clarity });
        return null;
      }

      // Enrichir avec note et cents
      const noteData = CentsCalculator.frequencyToNote(frequency);
      
      // Calculer confiance (0-1)
      const confidence = Math.min(clarity, 1.0);

      const enrichedResult = {
        frequency: Math.round(frequency * 10) / 10,
        clarity: Math.round(clarity * 100) / 100,
        note: noteData.fullName,
        noteName: noteData.noteName,
        octave: noteData.octave,
        cents: noteData.cents,
        targetFrequency: noteData.frequency,
        midiNote: noteData.midiNote,
        confidence: Math.round(confidence * 100) / 100,
        timestamp: performance.now()
      };

      Logger.debug('[PitchDetector] Détection', enrichedResult);

      return enrichedResult;

    } catch (e) {
      Logger.error('[PitchDetector] Erreur détection', e);
      return null;
    }
  }

  /**
   * Détecter pitch avec filtre de bruit
   * Ignore les détections trop courtes (< 100ms)
   * @param {Float32Array} buffer - Buffer audio
   * @returns {Object|null}
   */
  detectFiltered(buffer) {
    const result = this.detect(buffer);
    
    if (!result) {
      return null;
    }

    // TODO: Ajouter logique de filtrage temporel si besoin
    // Pour l'instant, on retourne directement
    return result;
  }

  /**
   * Mettre à jour la plage de fréquences
   * @param {number} minFreq - Fréquence minimale en Hz
   * @param {number} maxFreq - Fréquence maximale en Hz
   */
  setFrequencyRange(minFreq, maxFreq) {
    this.#minFreq = minFreq;
    this.#maxFreq = maxFreq;
    Logger.info('[PitchDetector] Plage fréquences mise à jour', { minFreq, maxFreq });
  }

  /**
   * Mettre à jour le seuil de clarté
   * @param {number} threshold - Seuil (0.0 à 1.0)
   */
  setClarityThreshold(threshold) {
    if (threshold < 0 || threshold > 1) {
      Logger.warn('[PitchDetector] Seuil clarté invalide', { threshold });
      return;
    }
    this.#clarityThreshold = threshold;
    Logger.info('[PitchDetector] Seuil clarté mis à jour', { threshold });
  }

  /**
   * Mettre à jour le threshold YIN
   * @param {number} threshold - Threshold YIN (0.0 à 1.0)
   */
  setYinThreshold(threshold) {
    if (threshold < 0 || threshold > 1) {
      Logger.warn('[PitchDetector] Threshold YIN invalide', { threshold });
      return;
    }
    this.#threshold = threshold;
    Logger.info('[PitchDetector] Threshold YIN mis à jour', { threshold });
  }

  /**
   * Obtenir les paramètres actuels
   * @returns {Object}
   */
  getSettings() {
    return {
      sampleRate: this.#sampleRate,
      threshold: this.#threshold,
      minFreq: this.#minFreq,
      maxFreq: this.#maxFreq,
      clarityThreshold: this.#clarityThreshold
    };
  }

  /**
   * Réinitialiser le détecteur
   */
  reset() {
    try {
      this.#yinDetector = new window.YinDetector(this.#sampleRate);
      Logger.info('[PitchDetector] Réinitialisé');
    } catch (e) {
      Logger.error('[PitchDetector] Erreur réinitialisation', e);
    }
  }
}

/**
 * Factory function pour créer un PitchDetector avec config par défaut
 * @param {number} sampleRate - Sample rate du contexte audio
 * @returns {PitchDetector}
 */
export function createPitchDetector(sampleRate) {
  return new PitchDetector({
    sampleRate,
    threshold: 0.1,        // Threshold YIN (0.05-0.2 = bon compromis)
    minFreq: 80,           // Basse vocale (E2)
    maxFreq: 1400,         // Soprano aigu (F6)
    clarityThreshold: 0.85 // Filtrer détections peu claires
  });
}

export default PitchDetector;
