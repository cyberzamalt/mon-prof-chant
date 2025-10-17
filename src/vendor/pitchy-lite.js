/**
 * pitchy-lite.js
 * TYPE: Library - Lightweight Pitch Detection
 * 
 * Responsabilités:
 * - Détection pitch temps réel (YIN algorithm)
 * - Conversion fréquence Hz
 * - Fallback robuste
 * 
 * Usage: const detector = new PitchyLite(sampleRate); detector.detect(floatArray)
 * Retour: Hz ou null
 */

class PitchyLite {
  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate;
    this.threshold = 0.1;
    this.minFreq = 50;
    this.maxFreq = 2000;
  }

  /**
   * Détecter la pitch d'un buffer audio
   */
  detect(audioBuffer) {
    try {
      if (!audioBuffer || audioBuffer.length < 512) {
        return null;
      }

      // Normaliser le buffer
      const normalized = this.normalize(audioBuffer);
      
      // Vérifier silence
      if (this.isSilent(normalized)) {
        return null;
      }

      // Algorithme YIN simplifié
      const f0 = this.yinAlgorithm(normalized);
      
      // Vérifier range
      if (f0 && f0 >= this.minFreq && f0 <= this.maxFreq) {
        return f0;
      }

      return null;
    } catch (err) {
      console.error('[PitchyLite] detect failed:', err);
      return null;
    }
  }

  /**
   * Normaliser le buffer
   */
  normalize(buffer) {
    try {
      let max = 0;
      for (let i = 0; i < buffer.length; i++) {
        max = Math.max(max, Math.abs(buffer[i]));
      }
      
      if (max === 0) {
        return buffer;
      }

      const normalized = new Float32Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        normalized[i] = buffer[i] / max;
      }
      return normalized;
    } catch (err) {
      return buffer;
    }
  }

  /**
   * Vérifier si silence (RMS trop bas)
   */
  isSilent(buffer) {
    try {
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length);
      return rms < 0.01;
    } catch (err) {
      return true;
    }
  }

  /**
   * Algorithme YIN simplifié
   */
  yinAlgorithm(buffer) {
    try {
      const windowSize = Math.min(buffer.length, 4096);
      const half = Math.floor(windowSize / 2);
      
      // Calcul autocorrelation
      const autocorr = new Float32Array(half);
      for (let lag = 0; lag < half; lag++) {
        let sum = 0;
        for (let i = 0; i < windowSize - lag; i++) {
          sum += buffer[i] * buffer[i + lag];
        }
        autocorr[lag] = sum;
      }

      // Difference function
      const diff = new Float32Array(half);
      let cumsum = 0;
      diff[0] = 0;
      for (let lag = 1; lag < half; lag++) {
        diff[lag] = autocorr[0] + autocorr[lag] - 2 * autocorr[lag];
        cumsum += diff[lag];
        if (cumsum !== 0) {
          diff[lag] = diff[lag] * lag / cumsum;
        }
      }

      // Trouver le minimum dans la difference function
      let minDiff = Infinity;
      let minLag = 0;
      for (let lag = 2; lag < half; lag++) {
        if (diff[lag] < minDiff) {
          minDiff = diff[lag];
          minLag = lag;
        }
        if (diff[lag] < this.threshold) {
          break;
        }
      }

      if (minDiff > this.threshold || minLag === 0) {
        return null;
      }

      // Convertir lag en fréquence
      const freq = this.sampleRate / minLag;
      return freq;
    } catch (err) {
      console.error('[PitchyLite] YIN failed:', err);
      return null;
    }
  }

  /**
   * Setter seuil de confiance
   */
  setThreshold(value) {
    this.threshold = Math.max(0.01, Math.min(1, value));
  }

  /**
   * Setter range fréquence
   */
  setFrequencyRange(min, max) {
    this.minFreq = Math.max(20, min);
    this.maxFreq = Math.min(20000, max);
  }
}

// Export global
window.PitchyLite = PitchyLite;
