/**
 * pitch-smoothing.js
 * TYPE: Signal Processing - Multi-Stage Pitch Smoothing
 * 
 * Applique 3 étapes de lissage :
 * 1. Filtrage median (enlève les erreurs d'octave)
 * 2. Moyenne mobile exponentielle (lisse temporellement)
 * 3. Validation des sauts impossibles
 */

class PitchSmoother {
  constructor(options = {}) {
    // Configuration
    this.medianWindowSize = options.medianWindowSize || 5;
    this.smoothingFactor = options.smoothingFactor || 0.75; // 0.5-0.9
    this.maxPitchJump = options.maxPitchJump || 80; // Hz max par frame
    this.minConfidence = options.minConfidence || 0.3; // 0.0-1.0
    this.silenceThreshold = options.silenceThreshold || 0.005; // RMS

    // Buffers circulaires
    this.medianBuffer = [];
    this.lastValidPitch = null;
    this.pitchHistory = [];
    this.maxHistory = 50;
  }

  /**
   * Lisse une détection de pitch brute
   * @param {number} rawPitch - Pitch brute en Hz (-1 si pas détecté)
   * @param {number} confidence - Confiance 0.0-1.0 (optionnel)
   * @returns {number} Pitch lissé, ou null si pas fiable
   */
  smooth(rawPitch, confidence = 1.0) {
    try {
      // ÉTAPE 0 : Vérification basique
      if (rawPitch < 0 || confidence < this.minConfidence) {
        return null; // Pas de détection fiable
      }

      // ÉTAPE 1 : Filtrage median pour enlever erreurs d'octave
      const medianFiltered = this.medianFilter(rawPitch);
      if (medianFiltered === null) {
        return null;
      }

      // ÉTAPE 2 : Détection et correction des erreurs d'octave
      const octaveAdjusted = this.correctOctaveErrors(medianFiltered);

      // ÉTAPE 3 : Validation des sauts impossibles
      if (this.lastValidPitch !== null) {
        const jump = Math.abs(octaveAdjusted - this.lastValidPitch);
        if (jump > this.maxPitchJump) {
          // Vérifier si c'est un vrai saut musical ou une erreur
          if (!this.isMusicalJump(octaveAdjusted)) {
            return this.lastValidPitch; // Rejeter le saut
          }
        }
      }

      // ÉTAPE 4 : Moyenne mobile exponentielle (lissage temporal)
      const smoothed = this.exponentialMovingAverage(octaveAdjusted);

      // ÉTAPE 5 : Stocker l'historique
      this.pitchHistory.push({
        timestamp: Date.now(),
        raw: rawPitch,
        median: medianFiltered,
        smoothed: smoothed,
        confidence: confidence
      });

      if (this.pitchHistory.length > this.maxHistory) {
        this.pitchHistory.shift();
      }

      this.lastValidPitch = smoothed;
      return smoothed;
    } catch (err) {
      console.error('[PitchSmoother] Smooth error:', err);
      return this.lastValidPitch;
    }
  }

  /**
   * ÉTAPE 1 : Filtrage median
   * Supprime les valeurs aberrantes (erreurs d'octave)
   */
  medianFilter(value) {
    this.medianBuffer.push(value);

    if (this.medianBuffer.length > this.medianWindowSize) {
      this.medianBuffer.shift();
    }

    if (this.medianBuffer.length < 3) {
      return value; // Pas assez de données
    }

    // Trier et prendre la médiane
    const sorted = [...this.medianBuffer].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return median;
  }

  /**
   * ÉTAPE 2 : Correction des erreurs d'octave
   * Si pitch détecté = 2x ou 0.5x du dernier valide, c'est probablement une erreur
   */
  correctOctaveErrors(pitch) {
    if (this.lastValidPitch === null) {
      return pitch;
    }

    const ratio = pitch / this.lastValidPitch;

    // Vérifier octaves
    if (ratio > 1.8 && ratio < 2.2) {
      // Probablement doublé
      const corrected = pitch / 2;
      if (Math.abs(corrected - this.lastValidPitch) < 50) {
        console.warn(`[PitchSmoother] Octave doubling detected: ${pitch}Hz → ${corrected}Hz`);
        return corrected;
      }
    }

    if (ratio > 0.45 && ratio < 0.55) {
      // Probablement halved
      const corrected = pitch * 2;
      if (Math.abs(corrected - this.lastValidPitch) < 50) {
        console.warn(`[PitchSmoother] Octave halving detected: ${pitch}Hz → ${corrected}Hz`);
        return corrected;
      }
    }

    return pitch;
  }

  /**
   * ÉTAPE 3 : Validation des sauts
   * Certains sauts sont musicaux (vibrato, passées rapides)
   * D'autres sont des erreurs de détection
   */
  isMusicalJump(newPitch) {
    // Un saut musical a typiquement une stabilité après
    // On l'accepte si c'est vers un multiple d'intervalle musical
    const semitones = Math.abs(12 * Math.log2(newPitch / this.lastValidPitch));
    
    // Intervalle reconnaissable (semitone, tierce, quinte, octave...)
    const musicalIntervals = [1, 2, 3, 4, 5, 7, 12, 24]; // en semitones
    
    for (const interval of musicalIntervals) {
      if (Math.abs(semitones - interval) < 1.5) {
        return true; // C'est un intervalle reconnaissable
      }
    }

    return false; // Saut suspect
  }

  /**
   * ÉTAPE 4 : Moyenne mobile exponentielle (EMA)
   * Lisse le signal sans introduire trop de latence
   */
  exponentialMovingAverage(newValue) {
    if (this.lastValidPitch === null) {
      return newValue;
    }

    // EMA = (factor * new) + (1 - factor) * last
    // Factor haut = plus de poids au nouveau (réactif)
    // Factor bas = plus de poids à l'ancien (lisse)
    const ema = this.smoothingFactor * newValue + 
                (1 - this.smoothingFactor) * this.lastValidPitch;

    return ema;
  }

  /**
   * Obtenir les stats de détection (pour debug/UI)
   */
  getStats() {
    if (this.pitchHistory.length === 0) {
      return null;
    }

    const pitches = this.pitchHistory.map(p => p.smoothed).filter(p => p !== null);

    if (pitches.length === 0) {
      return null;
    }

    const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const min = Math.min(...pitches);
    const max = Math.max(...pitches);
    const range = max - min;

    // Mesurer la stabilité (variance)
    const variance = pitches.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / pitches.length;
    const stability = 1 / (1 + Math.sqrt(variance)); // 0-1 : plus proche de 1 = plus stable

    return {
      average: avg,
      min: min,
      max: max,
      range: range,
      stability: stability,
      sampleCount: pitches.length
    };
  }

  /**
   * Réinitialiser le smoother
   */
  reset() {
    this.medianBuffer = [];
    this.lastValidPitch = null;
    this.pitchHistory = [];
  }
}

// Export global
window.PitchSmoother = PitchSmoother;
