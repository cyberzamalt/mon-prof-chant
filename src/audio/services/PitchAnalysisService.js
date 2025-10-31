/**
 * PitchAnalysisService.js
 * Service d'analyse de hauteur tonale
 * 
 * Responsabilités:
 * - Orchestrer détection + lissage + calculs
 * - Fournir API haut niveau pour l'analyse pitch
 * - Gérer les différents modes (Absolu, A440, Auto)
 * - Calculer déviation en cents
 * 
 * Dépendances:
 * - PitchDetector (détection brute)
 * - PitchSmoother (lissage)
 * - CentsCalculator (calculs cents)
 * - Logger
 */

import { Logger } from '../../logging/Logger.js';

export class PitchAnalysisService {
  #detector = null;
  #smoother = null;
  #centsCalculator = null;
  #isRunning = false;
  #currentMode = 'A440'; // 'absolute', 'A440', 'auto'
  #referenceFrequency = 440; // Hz
  #stats = {
    totalDetections: 0,
    smoothedDetections: 0,
    rejectedDetections: 0,
    averageFrequency: 0,
    lastUpdate: null
  };

  /**
   * Constructeur
   * @param {Object} detector - Instance de YinDetector ou PitchDetector
   * @param {Object} smoother - Instance de PitchSmoother
   * @param {Object} centsCalculator - Instance de CentsCalculator (optionnel)
   */
  constructor(detector, smoother, centsCalculator = null) {
    try {
      if (!detector) {
        throw new Error('[PitchAnalysisService] detector requis');
      }
      if (!smoother) {
        throw new Error('[PitchAnalysisService] smoother requis');
      }

      this.#detector = detector;
      this.#smoother = smoother;
      this.#centsCalculator = centsCalculator;

      Logger.info('PitchAnalysisService', 'Service créé', {
        hasDetector: !!detector,
        hasSmoother: !!smoother,
        hasCentsCalc: !!centsCalculator
      });
    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur constructeur', err);
      throw err;
    }
  }

  /**
   * Définir le mode d'analyse
   * @param {string} mode - 'absolute', 'A440', 'auto'
   */
  setMode(mode) {
    try {
      const validModes = ['absolute', 'A440', 'auto'];
      if (!validModes.includes(mode)) {
        throw new Error(`Mode invalide: ${mode}. Modes valides: ${validModes.join(', ')}`);
      }

      this.#currentMode = mode;
      Logger.info('PitchAnalysisService', `Mode changé: ${mode}`);
    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur setMode', err);
    }
  }

  /**
   * Définir fréquence de référence
   * @param {number} freq - Fréquence en Hz
   */
  setReferenceFrequency(freq) {
    try {
      if (typeof freq !== 'number' || freq <= 0) {
        throw new Error('Fréquence invalide');
      }

      this.#referenceFrequency = freq;
      Logger.info('PitchAnalysisService', `Référence: ${freq}Hz`);
    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur setReferenceFrequency', err);
    }
  }

  /**
   * Analyser un buffer audio
   * @param {Float32Array} audioBuffer - Buffer audio à analyser
   * @returns {Object|null} Résultat de l'analyse ou null
   */
  analyze(audioBuffer) {
    try {
      if (!audioBuffer || audioBuffer.length === 0) {
        Logger.warn('PitchAnalysisService', 'Buffer audio vide');
        return null;
      }

      // Étape 1: Détection brute
      const rawResult = this.#detectRaw(audioBuffer);
      if (!rawResult) {
        this.#stats.rejectedDetections++;
        return null;
      }

      this.#stats.totalDetections++;

      // Étape 2: Lissage
      const smoothedResult = this.#smoothResult(rawResult);
      if (!smoothedResult) {
        this.#stats.rejectedDetections++;
        return null;
      }

      this.#stats.smoothedDetections++;

      // Étape 3: Calcul cents (si calculateur disponible)
      const analysisResult = this.#calculateCents(smoothedResult);

      // Étape 4: Appliquer mode
      const finalResult = this.#applyMode(analysisResult);

      // Mise à jour stats
      this.#updateStats(finalResult);

      return finalResult;

    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur analyze', err);
      return null;
    }
  }

  /**
   * Détection brute via détecteur
   * @private
   */
  #detectRaw(audioBuffer) {
    try {
      // Support YinDetector (méthode detect)
      if (this.#detector.detect && typeof this.#detector.detect === 'function') {
        const result = this.#detector.detect(audioBuffer);
        if (!result || result.frequency <= 0) {
          return null;
        }
        return {
          frequency: result.frequency,
          clarity: result.clarity || result.confidence || 0,
          timestamp: Date.now()
        };
      }

      // Support PitchDetector custom
      if (this.#detector.detectPitch && typeof this.#detector.detectPitch === 'function') {
        return this.#detector.detectPitch(audioBuffer);
      }

      Logger.error('PitchAnalysisService', 'Méthode detect/detectPitch introuvable sur detector');
      return null;

    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur détection brute', err);
      return null;
    }
  }

  /**
   * Lissage du résultat
   * @private
   */
  #smoothResult(rawResult) {
    try {
      if (!this.#smoother) {
        return rawResult; // Pas de lissage disponible
      }

      // Support méthode smooth
      if (this.#smoother.smooth && typeof this.#smoother.smooth === 'function') {
        const smoothedFreq = this.#smoother.smooth(rawResult.frequency);
        if (!smoothedFreq || smoothedFreq <= 0) {
          return null;
        }
        return {
          ...rawResult,
          frequency: smoothedFreq,
          isSmoothed: true
        };
      }

      // Support méthode process (alternative)
      if (this.#smoother.process && typeof this.#smoother.process === 'function') {
        const smoothedFreq = this.#smoother.process(rawResult.frequency);
        if (!smoothedFreq || smoothedFreq <= 0) {
          return null;
        }
        return {
          ...rawResult,
          frequency: smoothedFreq,
          isSmoothed: true
        };
      }

      Logger.warn('PitchAnalysisService', 'Méthode smooth/process introuvable sur smoother');
      return rawResult;

    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur lissage', err);
      return rawResult; // Fallback: retourner non lissé
    }
  }

  /**
   * Calcul des cents
   * @private
   */
  #calculateCents(result) {
    try {
      if (!this.#centsCalculator) {
        return {
          ...result,
          cents: 0,
          deviation: 0,
          note: null
        };
      }

      // Utiliser le calculateur de cents
      if (this.#centsCalculator.calculate && typeof this.#centsCalculator.calculate === 'function') {
        const centsData = this.#centsCalculator.calculate(result.frequency);
        return {
          ...result,
          ...centsData
        };
      }

      Logger.warn('PitchAnalysisService', 'Méthode calculate introuvable sur centsCalculator');
      return result;

    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur calcul cents', err);
      return result;
    }
  }

  /**
   * Appliquer le mode actuel
   * @private
   */
  #applyMode(result) {
    try {
      switch (this.#currentMode) {
        case 'absolute':
          // Mode absolu: pas de modification
          return {
            ...result,
            mode: 'absolute',
            displayFrequency: result.frequency
          };

        case 'A440':
          // Mode A440: centrer autour de A440
          return {
            ...result,
            mode: 'A440',
            displayFrequency: result.frequency,
            referenceFreq: this.#referenceFrequency
          };

        case 'auto':
          // Mode auto: ajustement automatique
          // TODO: Implémenter logique auto-tune
          return {
            ...result,
            mode: 'auto',
            displayFrequency: result.frequency
          };

        default:
          return result;
      }
    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur applyMode', err);
      return result;
    }
  }

  /**
   * Mise à jour des statistiques
   * @private
   */
  #updateStats(result) {
    try {
      this.#stats.lastUpdate = Date.now();
      
      // Calcul moyenne glissante
      const alpha = 0.1; // Facteur de lissage
      if (this.#stats.averageFrequency === 0) {
        this.#stats.averageFrequency = result.frequency;
      } else {
        this.#stats.averageFrequency = 
          alpha * result.frequency + (1 - alpha) * this.#stats.averageFrequency;
      }
    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur updateStats', err);
    }
  }

  /**
   * Obtenir les statistiques
   * @returns {Object} Statistiques d'analyse
   */
  getStats() {
    return {
      ...this.#stats,
      successRate: this.#stats.totalDetections > 0
        ? (this.#stats.smoothedDetections / this.#stats.totalDetections * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Réinitialiser les statistiques
   */
  resetStats() {
    this.#stats = {
      totalDetections: 0,
      smoothedDetections: 0,
      rejectedDetections: 0,
      averageFrequency: 0,
      lastUpdate: null
    };
    Logger.info('PitchAnalysisService', 'Stats réinitialisées');
  }

  /**
   * Réinitialiser le smoother
   */
  reset() {
    try {
      if (this.#smoother && this.#smoother.reset) {
        this.#smoother.reset();
      }
      this.resetStats();
      Logger.info('PitchAnalysisService', 'Service réinitialisé');
    } catch (err) {
      Logger.error('PitchAnalysisService', 'Erreur reset', err);
    }
  }

  /**
   * Démarrer l'analyse
   */
  start() {
    this.#isRunning = true;
    Logger.info('PitchAnalysisService', 'Service démarré');
  }

  /**
   * Arrêter l'analyse
   */
  stop() {
    this.#isRunning = false;
    Logger.info('PitchAnalysisService', 'Service arrêté');
  }

  /**
   * Vérifier si le service est en cours
   */
  isRunning() {
    return this.#isRunning;
  }
}
