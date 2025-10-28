// src/vendor/yin-detector.js
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.YinDetector = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Implémentation YIN compacte, sûre sur les bornes.
   * - Recalcule maxLag à chaque appel (lié à la taille réelle du buffer)
   * - CMND correcte
   * - Interpolation parabolique
   */
  class YinDetector {
    constructor(sampleRate, bufferSize = 2048) {
      this.sampleRate = sampleRate;
      this.bufferSize = bufferSize;        // taille cible, mais on respecte la taille reçue
      this.threshold = 0.06;               // compromis stabilité/sensibilité
      this.minLag = 2;
      this._yin = new Float32Array(Math.floor(bufferSize / 2));
      this._cachedSize = Math.floor(bufferSize / 2);
    }

    _ensureCapacity(maxLag) {
      if (maxLag !== this._cachedSize) {
        this._yin = new Float32Array(maxLag);
        this._cachedSize = maxLag;
      }
    }

    // Retourne fréquence (Hz) ou null
    detect(buffer) {
      const size = buffer.length | 0;
      if (size < 4) return null;

      // borne correcte: la moitié du tampon dispo
      const maxLag = Math.floor(size / 2);
      if (maxLag < 3) return null;

      this._ensureCapacity(maxLag);
      const yin = this._yin;

      // 1) Différence cumulée
      yin[0] = 1;
      for (let tau = 1; tau < maxLag; tau++) {
        let sum = 0;
        // on borne i + tau < size
        for (let i = 0; i + tau < size; i++) {
          const d = buffer[i] - buffer[i + tau];
          sum += d * d;
        }
        yin[tau] = sum;
      }

      // 2) CMND (Cumulative Mean Normalized Difference)
      let runningSum = 0;
      for (let tau = 1; tau < maxLag; tau++) {
        runningSum += yin[tau];
        yin[tau] = (yin[tau] * tau) / (runningSum || 1e-12);
      }

      // 3) Seuil & sélection du meilleur tau
      let tau = -1;
      for (let t = this.minLag; t < maxLag; t++) {
        if (yin[t] < this.threshold) {
          // descente locale
          while (t + 1 < maxLag && yin[t + 1] < yin[t]) t++;
          tau = t;
          break;
        }
      }
      if (tau === -1) return null;

      // 4) Interpolation parabolique
      const x0 = tau > 0 ? tau - 1 : tau;
      const x2 = tau + 1 < maxLag ? tau + 1 : tau;
      const s0 = yin[x0], s1 = yin[tau], s2 = yin[x2];

      const denom = (2 * (2 * s1 - s2 - s0)) || 1e-12;
      const betterTau = tau + (s2 - s0) / denom;

      const freq = this.sampleRate / betterTau;
      return (freq > 0 && Number.isFinite(freq)) ? freq : null;
    }
  }

  return YinDetector;
});
