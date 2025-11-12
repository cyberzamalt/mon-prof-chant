// src/audio/dsp/PitchSmoother.js
// Lissage multi-étage des données de pitch
// Médiane → EMA → Validation sauts

import { Logger } from '../../logging/Logger.js';

/**
 * Classe pour lisser les données de pitch détectées
 * Utilise 3 étages :
 * 1. Filtre médian (supprime outliers)
 * 2. EMA - Exponential Moving Average (lissage)
 * 3. Validation des sauts (évite changements brutaux)
 */
export class PitchSmoother {
  #medianWindow = [];
  #medianSize = 5;
  #emaValue = null;
  #emaAlpha = 0.3;
  #maxJumpCents = 100;
  #lastValidFreq = null;
  #consecutiveInvalid = 0;
  #maxConsecutiveInvalid = 3;

  constructor(options = {}) {
    this.#medianSize = options.medianSize || 5;
    this.#emaAlpha = options.emaAlpha || 0.3;
    this.#maxJumpCents = options.maxJumpCents || 100;
    this.#maxConsecutiveInvalid = options.maxConsecutiveInvalid || 3;

    Logger.info('[PitchSmoother] Initialisé', {
      medianSize: this.#medianSize,
      emaAlpha: this.#emaAlpha,
      maxJumpCents: this.#maxJumpCents
    });
  }

  /**
   * Lisser une valeur de fréquence
   * @param {number|null} frequency - Fréquence détectée en Hz (null si pas de détection)
   * @returns {number|null} Fréquence lissée ou null
   */
  smooth(frequency) {
    // Si pas de détection
    if (frequency === null || frequency === undefined || frequency <= 0) {
      this.#consecutiveInvalid++;
      
      // Si trop d'invalides consécutifs, reset
      if (this.#consecutiveInvalid > this.#maxConsecutiveInvalid) {
        this.reset();
        Logger.debug('[PitchSmoother] Reset après trop d\'invalides');
      }
      
      return null;
    }

    this.#consecutiveInvalid = 0;

    // Étape 1 : Filtre médian
    const medianFiltered = this.#applyMedianFilter(frequency);

    // Étape 2 : EMA (Exponential Moving Average)
    const emaFiltered = this.#applyEMA(medianFiltered);

    // Étape 3 : Validation des sauts
    const jumpValidated = this.#validateJump(emaFiltered);

    this.#lastValidFreq = jumpValidated;

    return jumpValidated;
  }

  /**
   * Filtre médian : Garde la valeur médiane d'une fenêtre glissante
   * Supprime les outliers (valeurs aberrantes)
   * @private
   */
  #applyMedianFilter(frequency) {
    // Ajouter à la fenêtre
    this.#medianWindow.push(frequency);

    // Garder seulement les N dernières valeurs
    if (this.#medianWindow.length > this.#medianSize) {
      this.#medianWindow.shift();
    }

    // Si pas assez de valeurs, retourner la fréquence brute
    if (this.#medianWindow.length < 3) {
      return frequency;
    }

    // Calculer la médiane
    const sorted = [...this.#medianWindow].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    return median;
  }

  /**
   * EMA (Exponential Moving Average)
   * Lisse les transitions
   * @private
   */
  #applyEMA(frequency) {
    if (this.#emaValue === null) {
      // Première valeur
      this.#emaValue = frequency;
      return frequency;
    }

    // Formule EMA : new_value = alpha × current + (1-alpha) × previous
    this.#emaValue = this.#emaAlpha * frequency + (1 - this.#emaAlpha) * this.#emaValue;

    return this.#emaValue;
  }

  /**
   * Validation des sauts
   * Rejette les changements trop brutaux (>100 cents)
   * @private
   */
  #validateJump(frequency) {
    if (this.#lastValidFreq === null) {
      // Première valeur valide
      return frequency;
    }

    // Calculer le saut en cents
    const cents = 1200 * Math.log2(frequency / this.#lastValidFreq);
    const absCents = Math.abs(cents);

    // Si saut trop grand, garder l'ancienne valeur
    if (absCents > this.#maxJumpCents) {
      Logger.debug('[PitchSmoother] Saut rejeté', {
        from: Math.round(this.#lastValidFreq),
        to: Math.round(frequency),
        cents: Math.round(cents)
      });
      return this.#lastValidFreq;
    }

    return frequency;
  }

  /**
   * Réinitialiser le smoother (vider tous les buffers)
   */
  reset() {
    this.#medianWindow = [];
    this.#emaValue = null;
    this.#lastValidFreq = null;
    this.#consecutiveInvalid = 0;
    Logger.debug('[PitchSmoother] Reset');
  }

  /**
   * Obtenir l'état actuel du smoother
   * @returns {Object}
   */
  getState() {
    return {
      medianWindowSize: this.#medianWindow.length,
      emaValue: this.#emaValue,
      lastValidFreq: this.#lastValidFreq,
      consecutiveInvalid: this.#consecutiveInvalid
    };
  }

  /**
   * Mettre à jour les paramètres
   * @param {Object} options
   */
  setOptions(options = {}) {
    if (options.medianSize !== undefined) {
      this.#medianSize = options.medianSize;
    }
    if (options.emaAlpha !== undefined) {
      this.#emaAlpha = options.emaAlpha;
    }
    if (options.maxJumpCents !== undefined) {
      this.#maxJumpCents = options.maxJumpCents;
    }
    if (options.maxConsecutiveInvalid !== undefined) {
      this.#maxConsecutiveInvalid = options.maxConsecutiveInvalid;
    }

    Logger.info('[PitchSmoother] Options mises à jour', {
      medianSize: this.#medianSize,
      emaAlpha: this.#emaAlpha,
      maxJumpCents: this.#maxJumpCents
    });
  }
}

/**
 * Factory function avec config par défaut
 * @returns {PitchSmoother}
 */
export function createPitchSmoother() {
  return new PitchSmoother({
    medianSize: 5,           // Fenêtre de 5 valeurs pour médiane
    emaAlpha: 0.3,           // 30% nouvelle valeur, 70% ancienne (lissage modéré)
    maxJumpCents: 100,       // Rejeter sauts >100 cents (>1 demi-ton)
    maxConsecutiveInvalid: 3 // Reset après 3 détections invalides
  });
}

export default PitchSmoother;
