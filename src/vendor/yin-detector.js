/**
 * yin-detector.js
 * TYPE: Algorithm - YIN Pitch Detection (Production-Ready)
 * 
 * Implémentation complète de l'algorithme YIN
 * Basé sur la recherche académique et les implémentations de production
 * 
 * ✅ CORRIGÉ : Bug de bornes maxLag fixé (ChatGPT fix appliqué)
 * 
 * Usage: const detector = new YinDetector(sampleRate);
 *        const pitch = detector.detect(float32array);
 */

class YinDetector {
  constructor(sampleRate = 44100, bufferSize = 2048) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.threshold = 0.1; // Sensibilité (0.0-1.0)
    
    // Préallouer les buffers pour éviter allocations à chaque detection
    this.yinBuffer = new Float32Array(bufferSize);
    this.maxLag = Math.floor(bufferSize / 2); // ✅ MÉMORISER MAXLAG
  }

  /**
   * Détecter la pitch d'un buffer audio
   * @param {Float32Array} float32array - Buffer audio (typiquement 2048 samples)
   * @returns {number} Fréquence en Hz, ou -1 si pas de pitch détectée
   */
  detect(float32array) {
    try {
      if (!float32array || float32array.length === 0) {
        return -1;
      }

      // 1. Vérifier que ce n'est pas du silence
      const rms = this.getRMS(float32array);
      if (rms < 0.003) {
        return -1; // Trop faible
      }

      // 2. Appliquer la fenêtre Hann pour meilleure résolution spectrale
      const windowed = this.applyHannWindow(float32array);

      // 3. Calculer la fonction de différence YIN
      this.computeDifferenceFunction(windowed);

      // 4. Calculer la fonction cumulative normalisée
      this.computeCumulativeMeanNormalizedDifference();

      // 5. Trouver le minimum avec seuil
      const tauEstimate = this.absoluteThreshold();

      if (tauEstimate === -1) {
        return -1; // Aucun pitch détecté
      }

      // 6. Affiner avec interpolation parabolique
      const tau = this.parabolicInterpolation(tauEstimate);

      // 7. Convertir lag (tau) en fréquence
      const frequency = this.sampleRate / tau;

      // 8. Vérifier que la fréquence est dans la plage réaliste
      if (frequency < 40 || frequency > 2000) {
        return -1; // En dehors des limites instrumentales/vocales
      }

      return frequency;
    } catch (err) {
      console.error('[YinDetector] Detection error:', err);
      return -1;
    }
  }

  /**
   * Calculer l'énergie RMS (Root Mean Square)
   * Utilisé pour détecter le silence
   */
  getRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * Appliquer la fenêtre de Hann
   * Réduit les artefacts aux bords du buffer
   */
  applyHannWindow(buffer) {
    const windowed = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (buffer.length - 1)));
      windowed[i] = buffer[i] * window;
    }
    return windowed;
  }

  /**
   * Fonction de différence YIN
   * Mesure la différence entre le signal et sa version décalée
   * 
   * ✅ CORRIGÉ : Mémoriser maxLag pour les étapes suivantes
   */
  computeDifferenceFunction(buffer) {
    const maxLag = Math.floor(buffer.length / 2);
    
    // ✅ MÉMORISER pour les autres fonctions
    this.maxLag = maxLag;

    // Initialiser UNIQUEMENT sur la zone utile
    for (let i = 0; i <= maxLag; i++) {
      this.yinBuffer[i] = 0;
    }

    // Calculer l'autocorrélation inverse (différence)
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < maxLag; i++) {
        const diff = buffer[i] - buffer[i + lag];
        sum += diff * diff;
      }
      this.yinBuffer[lag] = sum;
    }
  }

  /**
   * Normalisation cumulative de la fonction de différence
   * Etape cruciale de l'algorithme YIN
   * 
   * ✅ CORRIGÉ : Utiliser maxLag au lieu de yinBuffer.length
   */
  computeCumulativeMeanNormalizedDifference() {
    const maxLag = this.maxLag;  // ✅ AU LIEU DE: this.yinBuffer.length
    this.yinBuffer[0] = 1;
    let cumulativeSum = 0;

    for (let lag = 1; lag <= maxLag; lag++) {
      cumulativeSum += this.yinBuffer[lag];

      if (cumulativeSum === 0) {
        this.yinBuffer[lag] = 1;
      } else {
        this.yinBuffer[lag] = (this.yinBuffer[lag] * lag) / cumulativeSum;
      }
    }
  }

  /**
   * Trouver le minimum qui dépasse le seuil
   * Cela donne la première estimation de la période (tau)
   * 
   * ✅ CORRIGÉ : Utiliser maxLag au lieu de yinBuffer.length
   */
  absoluteThreshold() {
    const maxLag = this.maxLag;  // ✅ AU LIEU DE: this.yinBuffer.length

    for (let lag = 2; lag < maxLag; lag++) {
      if (this.yinBuffer[lag] < this.threshold) {
        // Chercher le minimum local avant ce point
        while (lag + 1 < maxLag && this.yinBuffer[lag + 1] < this.yinBuffer[lag]) {
          lag++;
        }
        return lag;
      }
    }

    return -1; // Aucun lag ne franchit le seuil
  }

  /**
   * Affiner l'estimation avec interpolation parabolique
   * Améliore la précision de +/- 0.5 sample
   * 
   * ✅ CORRIGÉ : Ajouter garde pour les bornes (éviter accès hors limites)
   */
  parabolicInterpolation(tau) {
    const maxLag = this.maxLag;

    // ✅ GARDE IMPORTANTE : Vérifier que tau±1 sont dans les limites
    if (tau < 1 || tau + 1 >= maxLag) {
      return tau;
    }

    const s0 = this.yinBuffer[tau - 1];
    const s1 = this.yinBuffer[tau];
    const s2 = this.yinBuffer[tau + 1];

    // Formule parabolique
    const a = (s2 - 2 * s1 + s0) / 2;
    const b = (s2 - s0) / 2;

    if (a === 0) {
      return tau;
    }

    const shift = -b / (2 * a);

    // Borner le shift pour éviter les valeurs aberrantes
    if (shift > -1 && shift < 1) {
      return tau + shift;
    }

    return tau;
  }

  /**
   * Ajuster le seuil de sensibilité (0.05 = très sensible, 0.2 = moins sensible)
   */
  setThreshold(value) {
    this.threshold = Math.max(0.01, Math.min(0.99, value));
  }
}

// Export global
window.YinDetector = YinDetector;
