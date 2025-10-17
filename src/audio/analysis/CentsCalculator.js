/**
 * CentsCalculator.js
 * TYPE: Utility - Cent Calculations and Note Conversions
 * 
 * Responsabilités:
 * - Conversion fréquence → cents → note
 * - Calcul justesse
 * - Analyse déviation
 * 
 * Dépendances: Logger, AudioMath, NoteFrequencies
 * Utilisé par: PitchDetector, Visualization
 */

import { Logger } from '../logging/Logger.js';
import { AudioMath } from '../utils/AudioMath.js';
import { NoteFrequencies } from '../utils/NoteFrequencies.js';

class CentsCalculator {
  /**
   * Convertir Hz en informations note + cents
   */
  static frequencyToNote(frequencyHz, referenceHz = AudioMath.A4_FREQUENCY) {
    try {
      if (frequencyHz <= 0) {
        return {
          frequency: frequencyHz,
          note: 'Unknown',
          cents: 0,
          deviation: 0,
          clarity: 'very poor',
        };
      }

      const cents = AudioMath.hzToCents(frequencyHz, referenceHz);
      const noteName = AudioMath.hzToNoteName(frequencyHz);
      const nearestNote = AudioMath.getNearestNote(frequencyHz);
      const deviation = nearestNote.cents;

      Logger.debug('CentsCalculator', 'Frequency analyzed', {
        frequency: frequencyHz,
        note: noteName,
        cents: cents,
        deviation: deviation,
      });

      return {
        frequency: frequencyHz,
        note: noteName,
        cents: Math.round(cents * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        nearestNote: nearestNote.note,
        nearestHz: nearestNote.hz,
        clarity: CentsCalculator.#getClarityLevel(Math.abs(deviation)),
      };
    } catch (err) {
      Logger.error('CentsCalculator', 'frequencyToNote failed', err);
      return {
        frequency: frequencyHz,
        note: 'Error',
        cents: 0,
        deviation: 0,
        clarity: 'error',
      };
    }
  }

  /**
   * Obtenir le niveau de clarté basé sur déviation
   */
  static #getClarityLevel(deviationCents) {
    try {
      const absDev = Math.abs(deviationCents);
      if (absDev < 5) return 'excellent';
      if (absDev < 15) return 'good';
      if (absDev < 30) return 'acceptable';
      if (absDev < 50) return 'poor';
      return 'very poor';
    } catch (err) {
      return 'unknown';
    }
  }

  /**
   * Vérifier si note est juste (within tolerance)
   */
  static isInTune(frequencyHz, tolerance = 50) {
    try {
      const noteInfo = CentsCalculator.frequencyToNote(frequencyHz);
      return Math.abs(noteInfo.deviation) <= tolerance;
    } catch (err) {
      Logger.error('CentsCalculator', 'isInTune failed', err);
      return false;
    }
  }

  /**
   * Calculer l'écart moyen d'une série de fréquences
   */
  static averageDeviation(frequencyArray) {
    try {
      if (!Array.isArray(frequencyArray) || frequencyArray.length === 0) {
        return 0;
      }

      const deviations = frequencyArray.map(freq => {
        const info = CentsCalculator.frequencyToNote(freq);
        return Math.abs(info.deviation);
      });

      const average = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
      return Math.round(average * 100) / 100;
    } catch (err) {
      Logger.error('CentsCalculator', 'averageDeviation failed', err);
      return 0;
    }
  }

  /**
   * Calculer le max écart d'une série de fréquences
   */
  static maxDeviation(frequencyArray) {
    try {
      if (!Array.isArray(frequencyArray) || frequencyArray.length === 0) {
        return 0;
      }

      const deviations = frequencyArray.map(freq => {
        const info = CentsCalculator.frequencyToNote(freq);
        return Math.abs(info.deviation);
      });

      return Math.round(Math.max(...deviations) * 100) / 100;
    } catch (err) {
      Logger.error('CentsCalculator', 'maxDeviation failed', err);
      return 0;
    }
  }

  /**
   * Calculer pourcentage de temps juste
   */
  static percentageInTune(frequencyArray, tolerance = 50) {
    try {
      if (!Array.isArray(frequencyArray) || frequencyArray.length === 0) {
        return 0;
      }

      const inTune = frequencyArray.filter(freq => 
        CentsCalculator.isInTune(freq, tolerance)
      ).length;

      const percentage = (inTune / frequencyArray.length) * 100;
      return Math.round(percentage * 100) / 100;
    } catch (err) {
      Logger.error('CentsCalculator', 'percentageInTune failed', err);
      return 0;
    }
  }

  /**
   * Analyser une séquence de fréquences
   */
  static analyzeSequence(frequencyArray, referenceHz = AudioMath.A4_FREQUENCY) {
    try {
      const analysis = frequencyArray.map((freq, index) => {
        const info = CentsCalculator.frequencyToNote(freq, referenceHz);
        return {
          index: index,
          ...info,
        };
      });

      const avgDev = CentsCalculator.averageDeviation(frequencyArray);
      const maxDev = CentsCalculator.maxDeviation(frequencyArray);
      const inTune = CentsCalculator.percentageInTune(frequencyArray);

      Logger.info('CentsCalculator', 'Sequence analyzed', {
        samples: frequencyArray.length,
        avgDeviation: avgDev,
        maxDeviation: maxDev,
        percentageInTune: inTune,
      });

      return {
        analysis: analysis,
        summary: {
          samples: frequencyArray.length,
          avgDeviation: avgDev,
          maxDeviation: maxDev,
          percentageInTune: inTune,
          quality: CentsCalculator.#getQualityRating(avgDev),
        },
      };
    } catch (err) {
      Logger.error('CentsCalculator', 'analyzeSequence failed', err);
      return { analysis: [], summary: {} };
    }
  }

  /**
   * Obtenir rating de qualité global
   */
  static #getQualityRating(avgDeviation) {
    try {
      if (avgDeviation < 10) return 'Excellent';
      if (avgDeviation < 25) return 'Good';
      if (avgDeviation < 50) return 'Fair';
      if (avgDeviation < 75) return 'Poor';
      return 'Very Poor';
    } catch (err) {
      return 'Unknown';
    }
  }
}

export { CentsCalculator };
export default CentsCalculator;
