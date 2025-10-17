/**
 * pitchy-lite.js
 * TYPE: Library - Pitch Detection via Tone.js
 * 
 * Responsabilités:
 * - Wrapper autour de Tone.js Frequency detector
 * - Détection pitch en temps réel
 * - Interface simple
 */

class PitchyLite {
  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate;
    this.threshold = 0.1;
    this.minFreq = 50;
    this.maxFreq = 2000;
    this.detector = null;
    this.initialized = false;
    
    this.init();
  }

  /**
   * Initialiser le detector
   */
  init() {
    try {
      if (typeof Tone === 'undefined') {
        console.warn('[PitchyLite] Tone.js not loaded');
        return;
      }

      // Utiliser Tone.Frequency avec détection autocorr
      this.detector = new Tone.Analyser('waveform');
      this.initialized = true;
      console.log('[PitchyLite] Initialized with Tone.js');
    } catch (err) {
      console.error('[PitchyLite] Init failed:', err);
      this.initialized = false;
    }
  }

  /**
   * Détecter la pitch d'un buffer audio
   * Utilise autocorrelation simplifié
   */
  detect(audioBuffer) {
    try {
      if (!audioBuffer || audioBuffer.length < 512) {
        return null;
      }

      // Vérifier silence
      const rms = this.getRMS(audioBuffer);
      if (rms < 0.01) {
        return null;
      }

      // Autocorrelation pour obtenir la période fondamentale
      const freq = this.autocorrelate(audioBuffer, this.sampleRate);

      if (!freq || freq < this.minFreq || freq > this.maxFreq) {
        return null;
      }

      return freq;
    } catch (err) {
      console.error('[PitchyLite] detect failed:', err);
      return null;
    }
  }

  /**
   * Calculer RMS (root mean square) pour déterminer volume
   */
  getRMS(buffer) {
    try {
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      return Math.sqrt(sum / buffer.length);
    } catch (err) {
      return 0;
    }
  }

  /**
   * Autocorrelation algorithm (simplifié mais robuste)
   */
  autocorrelate(buffer, sampleRate) {
    try {
      const SIZE = Math.min(buffer.length, 4096);
      let maxSamples = Math.floor(SIZE / 2);

      // Normaliser
      let max = 0;
      for (let i = 0; i < SIZE; i++) {
        if (Math.abs(buffer[i]) > max) {
          max = Math.abs(buffer[i]);
        }
      }

      if (max === 0) return null;

      for (let i = 0; i < SIZE; i++) {
        buffer[i] = buffer[i] / max;
      }

      // Calculer autocorrelation
      const result = [];
      for (let lag = 0; lag < maxSamples; lag++) {
        let sum = 0;
        for (let index = 0; index < SIZE - lag; index++) {
          sum += Math.abs(buffer[index] * buffer[index + lag]);
        }
        result[lag] = sum;
      }

      // Trouver le premier minimum après le pic initial
      let d = 0;
      while (d < maxSamples - 1) {
        if (result[d] > result[d + 1]) break;
        d++;
      }

      // Chercher le minima
      let minValue = result[d];
      let minIndex = d;
      for (let i = d + 1; i < Math.min(maxSamples, d + maxSamples / 2); i++) {
        if (result[i] < minValue) {
          minValue = result[i];
          minIndex = i;
        }
      }

      if (minIndex > 0) {
        // Interpolation parabolique
        const shift = (result[minIndex + 1] - result[minIndex - 1]) / (2 * (2 * result[minIndex] - result[minIndex - 1] - result[minIndex + 1]));
        return sampleRate / (minIndex + shift);
      }

      return null;
    } catch (err) {
      console.error('[PitchyLite] autocorrelate failed:', err);
      return null;
    }
  }

  /**
   * Setter seuil
   */
  setThreshold(value) {
    this.threshold = Math.max(0, Math.min(1, value));
  }

  /**
   * Setter range fréquence
   */
  setFrequencyRange(min, max) {
    this.minFreq = Math.max(20, min);
    this.maxFreq = Math.min(20000, max);
  }
}

window.PitchyLite = PitchyLite;
