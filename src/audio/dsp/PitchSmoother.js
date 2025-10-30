/**
 * PitchSmoother.js - Lissage Multi-Stage des Pitches
 * 
 * Lissage robuste des fréquences détectées
 * Combine filtre médian + EMA + détection de sauts
 * 
 * Fichier 9/18 - ANALYSE & LISSAGE
 * Dépend de: Logger.js, constants.js, AudioMath.js
 */

import Logger from '../../logging/Logger.js';
import { SMOOTHING, PITCH_DETECTION } from '../../config/constants.js';
import { isValidHz, clampHz, median } from '../../utils/AudioMath.js';

class PitchSmoother {
  constructor() {
    this.smoothingFactor = SMOOTHING.FACTOR;
    this.medianWindowSize = SMOOTHING.MEDIAN_WINDOW_SIZE;
    this.jumpThreshold = SMOOTHING.JUMP_THRESHOLD_CENTS;
    this.stages = SMOOTHING.STAGES;
    
    // État interne
    this.lastSmoothedValue = null;
    this.medianWindow = [];
    this.history = [];
    this.maxHistorySize = 50;
    
    Logger.info('PitchSmoother', 'Smoother initialisé', {
      factor: this.smoothingFactor,
      medianWindow: this.medianWindowSize,
      jumpThreshold: this.jumpThreshold
    });
  }
  
  /**
   * Lisse une valeur de pitch (multi-stage)
   * @param {number} rawPitch - Pitch brut en Hz
   * @returns {number|null} Pitch lissé en Hz
   */
  smooth(rawPitch) {
    // Valider l'entrée
    if (!rawPitch || !isValidHz(rawPitch)) {
      return this.lastSmoothedValue;
    }
    
    try {
      let smoothedValue = rawPitch;
      
      // Stage 1: Filtre médian (supprime les outliers)
      if (SMOOTHING.MULTI_STAGE_ENABLED) {
        smoothedValue = this.medianFilter(smoothedValue);
      }
      
      // Stage 2: Détection et correction de sauts
      if (this.lastSmoothedValue !== null) {
        smoothedValue = this.detectAndCorrectJump(smoothedValue);
      }
      
      // Stage 3: Lissage exponentiel (EMA)
      if (this.lastSmoothedValue !== null) {
        smoothedValue = this.exponentialSmoothing(smoothedValue);
      }
      
      // Valider et clamper
      smoothedValue = clampHz(smoothedValue);
      
      // Sauvegarder dans l'historique
      this.history.push({
        raw: rawPitch,
        smoothed: smoothedValue,
        timestamp: Date.now()
      });
      
      // Limiter la taille de l'historique
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }
      
      // Mettre à jour la dernière valeur lissée
      this.lastSmoothedValue = smoothedValue;
      
      return smoothedValue;
      
    } catch (error) {
      Logger.error('PitchSmoother', 'Erreur lissage', error);
      return rawPitch;
    }
  }
  
  /**
   * Stage 1: Filtre médian
   * @param {number} value - Valeur à filtrer
   * @returns {number} Valeur filtrée
   */
  medianFilter(value) {
    try {
      // Ajouter à la fenêtre médiane
      this.medianWindow.push(value);
      
      // Limiter la taille de la fenêtre
      if (this.medianWindow.length > this.medianWindowSize) {
        this.medianWindow.shift();
      }
      
      // Si la fenêtre n'est pas encore remplie, retourner la valeur brute
      if (this.medianWindow.length < this.medianWindowSize) {
        return value;
      }
      
      // Calculer la médiane
      return median(this.medianWindow);
      
    } catch (error) {
      Logger.warn('PitchSmoother', 'Erreur filtre médian', error);
      return value;
    }
  }
  
  /**
   * Stage 2: Détection et correction de sauts brusques
   * @param {number} value - Valeur à vérifier
   * @returns {number} Valeur corrigée
   */
  detectAndCorrectJump(value) {
    if (this.lastSmoothedValue === null) {
      return value;
    }
    
    try {
      // Calculer la différence en cents
      const cents = 1200 * Math.log2(value / this.lastSmoothedValue);
      const absCents = Math.abs(cents);
      
      // Si le saut dépasse le seuil, limiter la variation
      if (absCents > this.jumpThreshold) {
        Logger.debug('PitchSmoother', 'Saut détecté', {
          from: this.lastSmoothedValue.toFixed(2),
          to: value.toFixed(2),
          cents: cents.toFixed(0)
        });
        
        // Limiter le saut à la moitié du seuil
        const maxCents = this.jumpThreshold / 2;
        const limitedCents = Math.sign(cents) * maxCents;
        
        // Recalculer la valeur limitée
        return this.lastSmoothedValue * Math.pow(2, limitedCents / 1200);
      }
      
      return value;
      
    } catch (error) {
      Logger.warn('PitchSmoother', 'Erreur détection saut', error);
      return value;
    }
  }
  
  /**
   * Stage 3: Lissage exponentiel (EMA)
   * @param {number} value - Valeur actuelle
   * @returns {number} Valeur lissée
   */
  exponentialSmoothing(value) {
    if (this.lastSmoothedValue === null) {
      return value;
    }
    
    try {
      // EMA: smoothed = (1 - α) * lastSmoothed + α * current
      // où α = smoothingFactor
      const alpha = this.smoothingFactor;
      return (1 - alpha) * this.lastSmoothedValue + alpha * value;
      
    } catch (error) {
      Logger.warn('PitchSmoother', 'Erreur EMA', error);
      return value;
    }
  }
  
  /**
   * Lisse un tableau de pitches
   * @param {number[]} pitches - Tableau de pitches bruts
   * @returns {number[]} Tableau de pitches lissés
   */
  smoothArray(pitches) {
    if (!Array.isArray(pitches)) {
      Logger.warn('PitchSmoother', 'Entrée invalide pour smoothArray');
      return [];
    }
    
    try {
      // Réinitialiser l'état
      this.reset();
      
      const smoothed = [];
      
      for (const pitch of pitches) {
        const smoothedPitch = this.smooth(pitch);
        if (smoothedPitch !== null) {
          smoothed.push(smoothedPitch);
        }
      }
      
      return smoothed;
      
    } catch (error) {
      Logger.error('PitchSmoother', 'Erreur smoothArray', error);
      return pitches;
    }
  }
  
  /**
   * Lisse un tableau de pitches sans modifier l'état interne
   * @param {number[]} pitches - Tableau de pitches bruts
   * @returns {number[]} Tableau de pitches lissés
   */
  smoothArrayStateless(pitches) {
    if (!Array.isArray(pitches) || pitches.length === 0) {
      return [];
    }
    
    try {
      // Créer un smoother temporaire
      const tempSmoother = new PitchSmoother();
      tempSmoother.smoothingFactor = this.smoothingFactor;
      tempSmoother.medianWindowSize = this.medianWindowSize;
      tempSmoother.jumpThreshold = this.jumpThreshold;
      
      return tempSmoother.smoothArray(pitches);
      
    } catch (error) {
      Logger.error('PitchSmoother', 'Erreur smoothArrayStateless', error);
      return pitches;
    }
  }
  
  /**
   * Réinitialise l'état du smoother
   */
  reset() {
    this.lastSmoothedValue = null;
    this.medianWindow = [];
    this.history = [];
    
    Logger.info('PitchSmoother', 'État réinitialisé');
  }
  
  /**
   * Définit le facteur de lissage
   * @param {number} factor - Facteur (0-1)
   */
  setSmoothingFactor(factor) {
    if (factor >= 0 && factor <= 1) {
      this.smoothingFactor = factor;
      Logger.info('PitchSmoother', 'Facteur modifié', { factor });
    } else {
      Logger.warn('PitchSmoother', 'Facteur invalide', { factor });
    }
  }
  
  /**
   * Définit la taille de la fenêtre médiane
   * @param {number} size - Taille (impair recommandé)
   */
  setMedianWindowSize(size) {
    if (size > 0 && size <= 21) {
      this.medianWindowSize = size;
      Logger.info('PitchSmoother', 'Fenêtre médiane modifiée', { size });
    } else {
      Logger.warn('PitchSmoother', 'Taille fenêtre invalide', { size });
    }
  }
  
  /**
   * Définit le seuil de saut
   * @param {number} threshold - Seuil en cents
   */
  setJumpThreshold(threshold) {
    if (threshold > 0) {
      this.jumpThreshold = threshold;
      Logger.info('PitchSmoother', 'Seuil saut modifié', { threshold });
    } else {
      Logger.warn('PitchSmoother', 'Seuil invalide', { threshold });
    }
  }
  
  /**
   * Récupère l'historique de lissage
   * @param {number} count - Nombre d'entrées (optionnel)
   * @returns {Array} Historique
   */
  getHistory(count = null) {
    if (count === null) {
      return [...this.history];
    }
    
    const start = Math.max(0, this.history.length - count);
    return this.history.slice(start);
  }
  
  /**
   * Calcule les statistiques de lissage
   * @returns {object} Statistiques
   */
  getStatistics() {
    if (this.history.length === 0) {
      return {
        count: 0,
        avgDifference: 0,
        maxDifference: 0,
        minDifference: 0
      };
    }
    
    try {
      const differences = this.history.map(entry => 
        Math.abs(entry.smoothed - entry.raw)
      );
      
      const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
      const maxDiff = Math.max(...differences);
      const minDiff = Math.min(...differences);
      
      return {
        count: this.history.length,
        avgDifference: avgDiff,
        maxDifference: maxDiff,
        minDifference: minDiff
      };
      
    } catch (error) {
      Logger.error('PitchSmoother', 'Erreur calcul stats', error);
      return {
        count: this.history.length,
        avgDifference: 0,
        maxDifference: 0,
        minDifference: 0
      };
    }
  }
  
  /**
   * Exporte la configuration actuelle
   * @returns {object} Configuration
   */
  getConfig() {
    return {
      smoothingFactor: this.smoothingFactor,
      medianWindowSize: this.medianWindowSize,
      jumpThreshold: this.jumpThreshold,
      stages: this.stages,
      multiStageEnabled: SMOOTHING.MULTI_STAGE_ENABLED
    };
  }
  
  /**
   * Importe une configuration
   * @param {object} config - Configuration à importer
   */
  setConfig(config) {
    try {
      if (config.smoothingFactor !== undefined) {
        this.setSmoothingFactor(config.smoothingFactor);
      }
      
      if (config.medianWindowSize !== undefined) {
        this.setMedianWindowSize(config.medianWindowSize);
      }
      
      if (config.jumpThreshold !== undefined) {
        this.setJumpThreshold(config.jumpThreshold);
      }
      
      Logger.success('PitchSmoother', 'Configuration importée');
      
    } catch (error) {
      Logger.error('PitchSmoother', 'Erreur import config', error);
    }
  }
}

// Exporter la classe
export default PitchSmoother;
