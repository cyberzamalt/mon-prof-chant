/**
 * PitchDetector.js - Détecteur de Hauteur (Pitch)
 * 
 * Implémentation de l'algorithme YIN pour détection de pitch
 * Analyse robuste des fréquences vocales et instrumentales
 * 
 * Fichier 8/18 - ANALYSE PITCH
 * Dépend de: Logger.js, constants.js, AudioMath.js
 */

import Logger from '../../logging/Logger.js';
import { PITCH_DETECTION } from '../../config/constants.js';
import { isValidHz, clampHz } from '../../utils/AudioMath.js';

class PitchDetector {
  constructor(sampleRate = PITCH_DETECTION.SAMPLE_RATE) {
    this.sampleRate = sampleRate;
    this.threshold = PITCH_DETECTION.YIN_THRESHOLD;
    this.minHz = PITCH_DETECTION.MIN_HZ;
    this.maxHz = PITCH_DETECTION.MAX_HZ;
    
    // Calculer les limites de lag pour YIN
    this.minPeriod = Math.floor(this.sampleRate / this.maxHz);
    this.maxPeriod = Math.floor(this.sampleRate / this.minHz);
    
    Logger.info('PitchDetector', 'Détecteur initialisé', {
      sampleRate: this.sampleRate,
      minHz: this.minHz,
      maxHz: this.maxHz,
      threshold: this.threshold
    });
  }
  
  /**
   * Détecte le pitch dans un buffer audio (Algorithme YIN)
   * @param {Float32Array} buffer - Buffer audio
   * @returns {number|null} Fréquence en Hz ou null si non détectée
   */
  detect(buffer) {
    if (!buffer || buffer.length === 0) {
      return null;
    }
    
    try {
      // Vérifier l'énergie du signal
      const energy = this.calculateEnergy(buffer);
      
      if (energy < 0.001) {
        // Signal trop faible (silence)
        return null;
      }
      
      // Calculer la fonction de différence (étape 1 de YIN)
      const difference = this.calculateDifference(buffer);
      
      // Calculer la normalisation cumulative (étape 2 de YIN)
      const cmndf = this.cumulativeMeanNormalizedDifference(difference);
      
      // Trouver le minimum absolu (étape 3 de YIN)
      const tau = this.absoluteThreshold(cmndf);
      
      if (tau === -1) {
        // Aucun minimum trouvé
        return null;
      }
      
      // Interpolation parabolique pour affiner (étape 4 de YIN)
      const betterTau = this.parabolicInterpolation(cmndf, tau);
      
      // Convertir tau en fréquence
      const hz = this.sampleRate / betterTau;
      
      // Valider la fréquence
      if (!isValidHz(hz)) {
        return null;
      }
      
      return clampHz(hz);
      
    } catch (error) {
      Logger.error('PitchDetector', 'Erreur détection pitch', error);
      return null;
    }
  }
  
  /**
   * Calcule l'énergie du signal (RMS)
   * @param {Float32Array} buffer - Buffer audio
   * @returns {number} Énergie RMS
   */
  calculateEnergy(buffer) {
    let sum = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    
    return Math.sqrt(sum / buffer.length);
  }
  
  /**
   * Calcule la fonction de différence (Étape 1 YIN)
   * @param {Float32Array} buffer - Buffer audio
   * @returns {Float32Array} Fonction de différence
   */
  calculateDifference(buffer) {
    const bufferSize = buffer.length;
    const maxLag = Math.min(this.maxPeriod, Math.floor(bufferSize / 2));
    const difference = new Float32Array(maxLag);
    
    for (let tau = 0; tau < maxLag; tau++) {
      let sum = 0;
      
      for (let i = 0; i < bufferSize - tau; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      
      difference[tau] = sum;
    }
    
    return difference;
  }
  
  /**
   * Calcule la normalisation cumulative (Étape 2 YIN)
   * @param {Float32Array} difference - Fonction de différence
   * @returns {Float32Array} CMNDF
   */
  cumulativeMeanNormalizedDifference(difference) {
    const cmndf = new Float32Array(difference.length);
    cmndf[0] = 1;
    
    let runningSum = 0;
    
    for (let tau = 1; tau < difference.length; tau++) {
      runningSum += difference[tau];
      
      if (runningSum === 0) {
        cmndf[tau] = 1;
      } else {
        cmndf[tau] = difference[tau] / (runningSum / tau);
      }
    }
    
    return cmndf;
  }
  
  /**
   * Trouve le premier minimum sous le seuil (Étape 3 YIN)
   * @param {Float32Array} cmndf - CMNDF
   * @returns {number} Index tau du minimum ou -1
   */
  absoluteThreshold(cmndf) {
    // Commencer à partir du minPeriod
    const start = Math.max(this.minPeriod, 2);
    
    for (let tau = start; tau < cmndf.length; tau++) {
      if (cmndf[tau] < this.threshold) {
        // Trouver le minimum local
        while (tau + 1 < cmndf.length && cmndf[tau + 1] < cmndf[tau]) {
          tau++;
        }
        return tau;
      }
    }
    
    // Si aucun minimum sous le seuil, prendre le minimum absolu
    let minTau = start;
    let minValue = cmndf[start];
    
    for (let tau = start + 1; tau < cmndf.length; tau++) {
      if (cmndf[tau] < minValue) {
        minValue = cmndf[tau];
        minTau = tau;
      }
    }
    
    // Vérifier que le minimum est significatif
    if (minValue < 1.0) {
      return minTau;
    }
    
    return -1;
  }
  
  /**
   * Interpolation parabolique pour affiner tau (Étape 4 YIN)
   * @param {Float32Array} cmndf - CMNDF
   * @param {number} tau - Index approximatif
   * @returns {number} Tau affiné
   */
  parabolicInterpolation(cmndf, tau) {
    if (tau === 0 || tau >= cmndf.length - 1) {
      return tau;
    }
    
    try {
      const x0 = tau - 1;
      const x2 = tau + 1;
      
      const y0 = cmndf[x0];
      const y1 = cmndf[tau];
      const y2 = cmndf[x2];
      
      // Calcul de l'interpolation parabolique
      const a = (y0 + y2 - 2 * y1) / 2;
      const b = (y2 - y0) / 2;
      
      if (a === 0) {
        return tau;
      }
      
      const betterTau = tau - b / (2 * a);
      
      // Vérifier que betterTau est dans une plage raisonnable
      if (betterTau >= x0 && betterTau <= x2) {
        return betterTau;
      }
      
      return tau;
      
    } catch (error) {
      Logger.warn('PitchDetector', 'Erreur interpolation', error);
      return tau;
    }
  }
  
  /**
   * Détecte plusieurs pitch dans un buffer (polyphonie)
   * @param {Float32Array} buffer - Buffer audio
   * @param {number} maxPitches - Nombre max de pitches à détecter
   * @returns {number[]} Tableau de fréquences
   */
  detectMultiple(buffer, maxPitches = 3) {
    const pitches = [];
    const workBuffer = new Float32Array(buffer);
    
    try {
      for (let i = 0; i < maxPitches; i++) {
        const pitch = this.detect(workBuffer);
        
        if (!pitch) {
          break;
        }
        
        pitches.push(pitch);
        
        // Supprimer cette fréquence du buffer pour détecter les suivantes
        this.removePitch(workBuffer, pitch);
      }
      
    } catch (error) {
      Logger.error('PitchDetector', 'Erreur détection multiple', error);
    }
    
    return pitches;
  }
  
  /**
   * Supprime une fréquence du buffer (pour détection polyphonique)
   * @param {Float32Array} buffer - Buffer audio
   * @param {number} hz - Fréquence à supprimer
   */
  removePitch(buffer, hz) {
    try {
      const period = Math.round(this.sampleRate / hz);
      
      for (let i = 0; i < buffer.length - period; i++) {
        buffer[i] = buffer[i] - buffer[i + period];
      }
      
    } catch (error) {
      Logger.warn('PitchDetector', 'Erreur suppression pitch', error);
    }
  }
  
  /**
   * Définit le seuil YIN
   * @param {number} threshold - Nouveau seuil (0-1)
   */
  setThreshold(threshold) {
    if (threshold >= 0 && threshold <= 1) {
      this.threshold = threshold;
      Logger.info('PitchDetector', 'Seuil modifié', { threshold });
    } else {
      Logger.warn('PitchDetector', 'Seuil invalide', { threshold });
    }
  }
  
  /**
   * Définit la plage de fréquences détectables
   * @param {number} minHz - Fréquence minimale
   * @param {number} maxHz - Fréquence maximale
   */
  setRange(minHz, maxHz) {
    if (minHz > 0 && maxHz > minHz) {
      this.minHz = minHz;
      this.maxHz = maxHz;
      
      this.minPeriod = Math.floor(this.sampleRate / this.maxHz);
      this.maxPeriod = Math.floor(this.sampleRate / this.minHz);
      
      Logger.info('PitchDetector', 'Plage modifiée', { minHz, maxHz });
    } else {
      Logger.warn('PitchDetector', 'Plage invalide', { minHz, maxHz });
    }
  }
  
  /**
   * Récupère les paramètres actuels
   * @returns {object} Paramètres
   */
  getConfig() {
    return {
      sampleRate: this.sampleRate,
      threshold: this.threshold,
      minHz: this.minHz,
      maxHz: this.maxHz,
      minPeriod: this.minPeriod,
      maxPeriod: this.maxPeriod
    };
  }
}

// Exporter la classe
export default PitchDetector;
