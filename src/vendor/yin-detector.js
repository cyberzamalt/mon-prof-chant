<script>
// UMD: exporte YinDetector sur window et comme module ES si dispo
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    const Y = factory();
    root.YinDetector = Y;
    try { root.exportYin = Y; } catch(_) {}
  }
}(typeof self !== "undefined" ? self : this, function () {

  class YinDetector {
    constructor(sampleRate, bufferSize = 2048) {
      this.sampleRate = sampleRate|0;
      this.bufferSize = bufferSize|0;
      this.threshold = 0.06;            // réglage conseillé
      this._prepareBuffers(bufferSize);
    }

    _prepareBuffers(n) {
      // IMPORTANT: YIN ne scanne que jusqu'à buffer.length/2 (maxLag)
      this.maxLag = Math.floor(n / 2);
      this._yin = new Float32Array(this.maxLag);
      this._lastBufferSize = n;
    }

    /**
     * @param {Float32Array} buf  - fenêtre temporelle (mono)
     * @returns {number|null}     - fréquence en Hz ou null si rien de fiable
     */
    detect(buf) {
      const N = buf.length|0;
      if (N !== this._lastBufferSize) this._prepareBuffers(N);
      const maxLag = Math.min(this.maxLag, Math.floor(N/2));
      if (maxLag < 3) return null;

      const yin = this._yin;
      // 1) Différence d(tau)
      yin[0] = 0;
      for (let tau = 1; tau < maxLag; tau++) {
        let sum = 0;
        for (let i = 0; i < maxLag; i++) {
          const diff = buf[i] - buf[i + tau];
          sum += diff * diff;
        }
        yin[tau] = sum;
      }

      // 2) Cumulative Mean Normalized Difference (CMND)
      let running = 0;
      yin[0] = 1; // convention
      for (let tau = 1; tau < maxLag; tau++) {
        running += yin[tau];
        yin[tau] = yin[tau] * tau / (running || 1e-12);
      }

      // 3) Chercher premier minimum < threshold
      let tau = 2;
      for (; tau < maxLag; tau++) {
        if (yin[tau] < this.threshold) {
          while (tau + 1 < maxLag && yin[tau + 1] < yin[tau]) tau++;
          break;
        }
      }
      if (tau === maxLag || yin[tau] >= this.threshold) return null;

      // 4) Interpolation parabolique autour de tau pour précision
      const x0 = (tau > 1) ? tau - 1 : tau;
      const x2 = (tau + 1 < maxLag) ? tau + 1 : tau;
      const s0 = yin[x0], s1 = yin[tau], s2 = yin[x2];
      const denom = (s0 + s2 - 2 * s1);
      let betterTau = tau;
      if (denom !== 0) betterTau = tau + 0.5 * (s0 - s2) / denom;

      const hz = this.sampleRate / betterTau;
      return (isFinite(hz) && hz > 0) ? hz : null;
    }
  }

  return YinDetector;
}));
</script>
