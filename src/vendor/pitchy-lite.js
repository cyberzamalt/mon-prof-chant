/**
 * pitchy-lite.js
 * TYPE: Library - Pitch Detection Wrapper (uses real Pitchy 4.1.0)
 * 
 * Responsabilités:
 * - Wrapper autour de Pitchy.js du CDN
 * - Détection pitch en temps réel
 * - Interface simple avec fallback
 */

class PitchyLite {
  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate;
    this.threshold = 0.15;
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
      // Vérifier si Pitchy est disponible globalement
      if (typeof Pitchy === 'undefined') {
        console.warn('[PitchyLite] Pitchy not loaded from CDN yet');
        return;
      }

      this.detector = Pitchy.PitchDetector.forFloat32Array(2048);
      this.initialized = true;
      console.log('[PitchyLite] Initialized with Pitchy 4.1.0');
    } catch (err) {
      console.error('[PitchyLite] Init failed:', err);
      this.initialized = false;
    }
  }

  /**
   * Détecter la pitch d'un buffer audio
   */
  detect(audioBuffer) {
    try {
      if (!this.initialized) {
        this.init();
      }

      if (!audioBuffer || audioBuffer.length < 512 || !this.detector) {
        return null;
      }

      // Utiliser Pitchy réel
      const [frequency, clarity] = this.detector.findPitch(audioBuffer);

      // Filtrer par clarity (confiance)
      if (clarity < this.threshold) {
        return null;
      }

      // Filtrer par range
      if (frequency < this.minFreq || frequency > this.maxFreq) {
        return null;
      }

      return frequency;
    } catch (err) {
      console.error('[PitchyLite] detect failed:', err);
      return null;
    }
  }

  /**
   * Setter seuil de confiance
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

// Export global
window.PitchyLite = PitchyLite;
