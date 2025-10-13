/**
 * AudioMath.js
 * TYPE: Utility - Mathematical Functions
 * 
 * Responsabilités:
 * - Conversions Hz ↔ Notes ↔ Cents
 * - Calculs musicaux (intervalles, transpositions)
 * - Formules audio standard
 * - Utilitaires mathématiques pour analyse
 * 
 * Dépendances: Logger, config.js
 */

import { Logger } from '../logging/Logger.js';
import { CONFIG } from '../config.js';

export class AudioMath {
  
  // Constantes musicales
  static A4_FREQUENCY = 440.0; // Hz - La de référence
  static SEMITONES_IN_OCTAVE = 12;
  static CENTS_PER_SEMITONE = 100;
  static CENTS_PER_OCTAVE = 1200;

  // ========================================
  // CONVERSIONS FRÉQUENCE ↔ NOTE
  // ========================================

  /**
   * Convertit une fréquence en numéro MIDI
   * @param {number} frequency - Fréquence en Hz
   * @returns {number} Numéro MIDI (0-127), ou null si hors plage
   */
  static frequencyToMidi(frequency) {
    try {
      if (!frequency || frequency <= 0) {
        Logger.warn('AudioMath', 'Invalid frequency for MIDI conversion', { frequency });
        return null;
      }

      // Formule : midi = 69 + 12 × log₂(f / 440)
      const midi = 69 + 12 * Math.log2(frequency / AudioMath.A4_FREQUENCY);
      
      // Arrondir et limiter à la plage MIDI (0-127)
      const midiRounded = Math.round(midi);
      
      if (midiRounded < 0 || midiRounded > 127) {
        Logger.debug('AudioMath', 'MIDI number out of range', { frequency, midi: midiRounded });
        return null;
      }

      return midiRounded;
      
    } catch (error) {
      Logger.error('AudioMath', 'frequencyToMidi failed', error);
      return null;
    }
  }

  /**
   * Convertit un numéro MIDI en fréquence
   * @param {number} midi - Numéro MIDI (0-127)
   * @returns {number} Fréquence en Hz, ou null si invalide
   */
  static midiToFrequency(midi) {
    try {
      if (typeof midi !== 'number' || midi < 0 || midi > 127) {
        Logger.warn('AudioMath', 'Invalid MIDI number', { midi });
        return null;
      }

      // Formule : f = 440 × 2^((midi - 69) / 12)
      const frequency = AudioMath.A4_FREQUENCY * Math.pow(2, (midi - 69) / 12);
      
      return frequency;
      
    } catch (error) {
      Logger.error('AudioMath', 'midiToFrequency failed', error);
      return null;
    }
  }

  /**
   * Convertit une fréquence en nom de note (ex: "A4", "C#5")
   * @param {number} frequency - Fréquence en Hz
   * @returns {string|null} Nom de la note, ou null si invalide
   */
  static frequencyToNoteName(frequency) {
    try {
      const midi = AudioMath.frequencyToMidi(frequency);
      if (midi === null) return null;

      return AudioMath.midiToNoteName(midi);
      
    } catch (error) {
      Logger.error('AudioMath', 'frequencyToNoteName failed', error);
      return null;
    }
  }

  /**
   * Convertit un numéro MIDI en nom de note
   * @param {number} midi - Numéro MIDI (0-127)
   * @returns {string|null} Nom de la note (ex: "C4", "A#5")
   */
  static midiToNoteName(midi) {
    try {
      if (typeof midi !== 'number' || midi < 0 || midi > 127) {
        return null;
      }

      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor(midi / 12) - 1;
      const noteIndex = midi % 12;
      
      return `${noteNames[noteIndex]}${octave}`;
      
    } catch (error) {
      Logger.error('AudioMath', 'midiToNoteName failed', error);
      return null;
    }
  }

  // ========================================
  // CALCULS EN CENTS
  // ========================================

  /**
   * Calcule la déviation en cents entre deux fréquences
   * @param {number} measuredFreq - Fréquence mesurée (Hz)
   * @param {number} targetFreq - Fréquence cible (Hz)
   * @returns {number} Déviation en cents (positif = trop aigu, négatif = trop grave)
   */
  static calculateCents(measuredFreq, targetFreq) {
    try {
      if (!measuredFreq || !targetFreq || measuredFreq <= 0 || targetFreq <= 0) {
        Logger.warn('AudioMath', 'Invalid frequencies for cents calculation', { measuredFreq, targetFreq });
        return 0;
      }

      // Formule : cents = 1200 × log₂(f_measured / f_target)
      const cents = 1200 * Math.log2(measuredFreq / targetFreq);
      
      return cents;
      
    } catch (error) {
      Logger.error('AudioMath', 'calculateCents failed', error);
      return 0;
    }
  }

  /**
   * Applique une déviation en cents à une fréquence
   * @param {number} frequency - Fréquence de base (Hz)
   * @param {number} cents - Déviation en cents
   * @returns {number} Nouvelle fréquence (Hz)
   */
  static applyCents(frequency, cents) {
    try {
      if (!frequency || frequency <= 0) {
        Logger.warn('AudioMath', 'Invalid frequency for cents application', { frequency, cents });
        return frequency;
      }

      // Formule : f_new = f × 2^(cents / 1200)
      const newFrequency = frequency * Math.pow(2, cents / 1200);
      
      return newFrequency;
      
    } catch (error) {
      Logger.error('AudioMath', 'applyCents failed', error);
      return frequency;
    }
  }

  /**
   * Catégorise la précision selon les cents
   * @param {number} cents - Déviation en cents
   * @returns {string} 'excellent' | 'good' | 'fair' | 'poor'
   */
  static categorizeAccuracy(cents) {
    try {
      const absCents = Math.abs(cents);
      const thresholds = CONFIG.metrics.cents;

      if (absCents <= thresholds.excellent) return 'excellent';
      if (absCents <= thresholds.good) return 'good';
      if (absCents <= thresholds.fair) return 'fair';
      return 'poor';
      
    } catch (error) {
      Logger.error('AudioMath', 'categorizeAccuracy failed', error);
      return 'poor';
    }
  }

  /**
   * Vérifie si une note est juste (dans la tolérance)
   * @param {number} cents - Déviation en cents
   * @param {number} tolerance - Tolérance en cents (défaut: 20)
   * @returns {boolean}
   */
  static isInTune(cents, tolerance = 20) {
    try {
      return Math.abs(cents) <= tolerance;
    } catch (error) {
      Logger.error('AudioMath', 'isInTune failed', error);
      return false;
    }
  }

  // ========================================
  // INTERVALLES MUSICAUX
  // ========================================

  /**
   * Calcule l'intervalle en demi-tons entre deux fréquences
   * @param {number} freq1 - Première fréquence (Hz)
   * @param {number} freq2 - Deuxième fréquence (Hz)
   * @returns {number} Intervalle en demi-tons
   */
  static calculateInterval(freq1, freq2) {
    try {
      if (!freq1 || !freq2 || freq1 <= 0 || freq2 <= 0) {
        Logger.warn('AudioMath', 'Invalid frequencies for interval', { freq1, freq2 });
        return 0;
      }

      // Intervalle = 12 × log₂(f2 / f1)
      const interval = 12 * Math.log2(freq2 / freq1);
      
      return interval;
      
    } catch (error) {
      Logger.error('AudioMath', 'calculateInterval failed', error);
      return 0;
    }
  }

  /**
   * Transpose une fréquence d'un certain nombre de demi-tons
   * @param {number} frequency - Fréquence originale (Hz)
   * @param {number} semitones - Nombre de demi-tons (positif = monte, négatif = descend)
   * @returns {number} Fréquence transposée (Hz)
   */
  static transpose(frequency, semitones) {
    try {
      if (!frequency || frequency <= 0) {
        Logger.warn('AudioMath', 'Invalid frequency for transposition', { frequency, semitones });
        return frequency;
      }

      // f_new = f × 2^(semitones / 12)
      const transposed = frequency * Math.pow(2, semitones / 12);
      
      return transposed;
      
    } catch (error) {
      Logger.error('AudioMath', 'transpose failed', error);
      return frequency;
    }
  }

  // ========================================
  // CALCULS AUDIO (dB, RMS, etc.)
  // ========================================

  /**
   * Convertit une valeur linéaire en décibels
   * @param {number} linear - Valeur linéaire (0-1)
   * @returns {number} Valeur en dB
   */
  static linearToDb(linear) {
    try {
      if (linear <= 0) return -Infinity;
      
      // dB = 20 × log₁₀(linear)
      return 20 * Math.log10(linear);
      
    } catch (error) {
      Logger.error('AudioMath', 'linearToDb failed', error);
      return -Infinity;
    }
  }

  /**
   * Convertit des décibels en valeur linéaire
   * @param {number} db - Valeur en dB
   * @returns {number} Valeur linéaire (0-1)
   */
  static dbToLinear(db) {
    try {
      if (!isFinite(db)) return 0;
      
      // linear = 10^(dB / 20)
      return Math.pow(10, db / 20);
      
    } catch (error) {
      Logger.error('AudioMath', 'dbToLinear failed', error);
      return 0;
    }
  }

  /**
   * Calcule le RMS (Root Mean Square) d'un buffer audio
   * @param {Float32Array} buffer - Buffer audio
   * @returns {number} Valeur RMS
   */
  static calculateRMS(buffer) {
    try {
      if (!buffer || buffer.length === 0) {
        Logger.warn('AudioMath', 'Empty buffer for RMS calculation');
        return 0;
      }

      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      
      return Math.sqrt(sum / buffer.length);
      
    } catch (error) {
      Logger.error('AudioMath', 'calculateRMS failed', error);
      return 0;
    }
  }

  /**
   * Calcule le niveau en dB d'un buffer
   * @param {Float32Array} buffer - Buffer audio
   * @returns {number} Niveau en dB
   */
  static calculateLevel(buffer) {
    try {
      const rms = AudioMath.calculateRMS(buffer);
      return AudioMath.linearToDb(rms);
      
    } catch (error) {
      Logger.error('AudioMath', 'calculateLevel failed', error);
      return -Infinity;
    }
  }

  // ========================================
  // UTILITAIRES MATHÉMATIQUES
  // ========================================

  /**
   * Normalise un buffer audio (peak normalization)
   * @param {Float32Array} buffer - Buffer à normaliser
   * @param {number} targetPeak - Pic cible (0-1, défaut: 0.95)
   * @returns {Float32Array} Buffer normalisé
   */
  static normalizeBuffer(buffer, targetPeak = 0.95) {
    try {
      if (!buffer || buffer.length === 0) {
        Logger.warn('AudioMath', 'Empty buffer for normalization');
        return buffer;
      }

      // Trouver le pic
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const absSample = Math.abs(buffer[i]);
        if (absSample > peak) {
          peak = absSample;
        }
      }

      // Si déjà silencieux, ne rien faire
      if (peak === 0) return buffer;

      // Calculer le gain
      const gain = targetPeak / peak;

      // Appliquer le gain
      const normalized = new Float32Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        normalized[i] = buffer[i] * gain;
      }

      Logger.debug('AudioMath', 'Buffer normalized', { peak, gain });
      return normalized;
      
    } catch (error) {
      Logger.error('AudioMath', 'normalizeBuffer failed', error);
      return buffer;
    }
  }

  /**
   * Clamp une valeur entre min et max
   * @param {number} value - Valeur à clamper
   * @param {number} min - Minimum
   * @param {number} max - Maximum
   * @returns {number} Valeur clampée
   */
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Interpolation linéaire
   * @param {number} a - Valeur de départ
   * @param {number} b - Valeur d'arrivée
   * @param {number} t - Facteur d'interpolation (0-1)
   * @returns {number} Valeur interpolée
   */
  static lerp(a, b, t) {
    return a + (b - a) * AudioMath.clamp(t, 0, 1);
  }

  /**
   * Calcule la moyenne d'un tableau
   * @param {Array<number>} values - Valeurs
   * @returns {number} Moyenne
   */
  static average(values) {
    try {
      if (!values || values.length === 0) return 0;
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      return sum / values.length;
      
    } catch (error) {
      Logger.error('AudioMath', 'average failed', error);
      return 0;
    }
  }

  /**
   * Calcule l'écart-type d'un tableau
   * @param {Array<number>} values - Valeurs
   * @returns {number} Écart-type
   */
  static standardDeviation(values) {
    try {
      if (!values || values.length === 0) return 0;
      
      const avg = AudioMath.average(values);
      const squareDiffs = values.map(value => Math.pow(value - avg, 2));
      const avgSquareDiff = AudioMath.average(squareDiffs);
      
      return Math.sqrt(avgSquareDiff);
      
    } catch (error) {
      Logger.error('AudioMath', 'standardDeviation failed', error);
      return 0;
    }
  }

  /**
   * Trouve le min et max d'un tableau
   * @param {Array<number>} values - Valeurs
   * @returns {object} { min, max }
   */
  static minMax(values) {
    try {
      if (!values || values.length === 0) {
        return { min: 0, max: 0 };
      }

      let min = values[0];
      let max = values[0];

      for (let i = 1; i < values.length; i++) {
        if (values[i] < min) min = values[i];
        if (values[i] > max) max = values[i];
      }

      return { min, max };
      
    } catch (error) {
      Logger.error('AudioMath', 'minMax failed', error);
      return { min: 0, max: 0 };
    }
  }

  // ========================================
  // VALIDATIONS
  // ========================================

  /**
   * Vérifie si une fréquence est dans la plage audible
   * @param {number} frequency - Fréquence (Hz)
   * @returns {boolean}
   */
  static isAudibleFrequency(frequency) {
    return frequency >= 20 && frequency <= 20000;
  }

  /**
   * Vérifie si une fréquence est dans la plage vocale humaine
   * @param {number} frequency - Fréquence (Hz)
   * @returns {boolean}
   */
  static isVocalFrequency(frequency) {
    // Plage vocale typique : 80 Hz (basse) à 1200 Hz (soprano aigu)
    return frequency >= 80 && frequency <= 1200;
  }
}

// Export par défaut
export default AudioMath;