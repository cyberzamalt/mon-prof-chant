// src/vendor/yin-detector.js
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.YinDetector = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class YinDetector {
    constructor(sampleRate, bufferSize = 2048) {
      this.sampleRate = sampleRate;
      this.bufferSize = bufferSize;
      this.threshold = 0.06;      // bon compromis sensibilité/stabilité
      this.probability = 0;
      this.minLag = 2;
      this.maxLag = Math.floor(bufferSize / 2); // ✅ borne correcte
      this._yin = new Float32Array(this.maxLag);
    }

    // Retourne fréquence (Hz) ou null
    detect(buffer) {
      const size = buffer.length | 0;
      if (size < this.bufferSize) return null;

      const yin = this._yin;
      const maxLag = this.maxLag;
      let runningSum = 0;

      yin[0] = 1;

      // 1) Différence cumulée
      for (let tau = 1; tau < maxLag; tau++) {
        let sum = 0;
        for (let i = 0; i < maxLag; i++) {
          const d = buffer[i] - buffer[i + tau];
          sum += d * d;
        }
        yin[tau] = sum;
      }

      // 2) CMND (cumulative mean normalized difference)
      runningSum = 0;
      for (let tau = 1; tau < maxLag; tau++) {
        runningSum += yin[tau];
        yin[tau] = (yin[tau] * tau) / (runningSum || 1e-12);
      }

      // 3) Seuil absolu
      let tau = -1;
      for (let t = this.minLag; t < maxLag; t++) {
        if (yin[t] < this.threshold) {
          while (t + 1 < maxLag && yin[t + 1] < yin[t]) t++;
          tau = t;
          break;
        }
      }
      if (tau === -1) return null;

      // 4) Interpolation parabolique autour de tau
      const x0 = (tau < 1) ? tau : tau - 1;
      const x2 = (tau + 1 < maxLag) ? tau + 1 : tau;
      const s0 = yin[x0], s1 = yin[tau], s2 = yin[x2];

      const denom = (2 * (2 * s1 - s2 - s0)) || 1e-12;
      const betterTau = tau + (s2 - s0) / denom;

      const freq = this.sampleRate / betterTau;
      return (freq > 0 && Number.isFinite(freq)) ? freq : null;
    }
  }

  return YinDetector;
});
