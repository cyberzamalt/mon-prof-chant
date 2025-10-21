/**
 * pitchy-lite.js
 * TYPE: Library - Pitch Detection via Autocorrelation
 * 
 * Responsabilités:
 * - Détection pitch en temps réel via autocorrélation
 * - Interface simple
 * 
 * CORRECTIONS APPLIQUÉES:
 * - Copie du buffer avant normalisation (évite mutation)
 * - Autocorrélation correcte (sans Math.abs)
 * - Recherche du premier pic maximum (au lieu de minimum)
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
   * Utilise autocorrelation corrigé
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
   * Autocorrelation algorithm (CORRIGÉ)
   */
  autocorrelate(buffer, sampleRate) {
    try {
      const SIZE = Math.min(buffer.length, 4096);
      let maxSamples = Math.floor(SIZE / 2);

      // FIX #1: COPIER le buffer avant normalisation (évite mutation)
      const bufferCopy = new Float32Array(SIZE);
      for (let i = 0; i < SIZE; i++) {
        bufferCopy[i] = buffer[i];
      }

      // Normaliser LA COPIE (pas l'original)
      let max = 0;
      for (let i = 0; i < SIZE; i++) {
        if (Math.abs(bufferCopy[i]) > max) {
          max = Math.abs(bufferCopy[i]);
        }
      }

      if (max === 0) return null;

      for (let i = 0; i < SIZE; i++) {
        bufferCopy[i] = bufferCopy[i] / max;
      }

      // Calculer autocorrelation
      const result = [];
      for (let lag = 0; lag < maxSamples; lag++) {
        let sum = 0;
        for (let index = 0; index < SIZE - lag; index++) {
          // FIX #2: ENLEVER Math.abs() pour autocorrélation correcte
          sum += bufferCopy[index] * bufferCopy[index + lag];
        }
        result[lag] = sum;
      }

      // Trouver le premier minimum après le pic initial
      let d = 0;
      while (d < maxSamples - 1) {
        if (result[d] > result[d + 1]) break;
        d++;
      }

      // FIX #3: Chercher le MAXIMUM (pic) au lieu du minimum
      let maxValue = result[d];
      let maxIndex = d;
      for (let i = d + 1; i < Math.min(maxSamples, d + maxSamples / 2); i++) {
        if (result[i] > maxValue) {
          maxValue = result[i];
          maxIndex = i;
        }
      }

      if (maxIndex > 0 && maxIndex < result.length - 1) {
        // Interpolation parabolique
        const shift = (result[maxIndex + 1] - result[maxIndex - 1]) / 
                      (2 * (2 * result[maxIndex] - result[maxIndex - 1] - result[maxIndex + 1]));
        return sampleRate / (maxIndex + shift);
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
