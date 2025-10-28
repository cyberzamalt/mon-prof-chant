// src/audio/dsp/hpf-biquad.js
// High-Pass Biquad (RBJ cookbook) — UMD (global: BiquadHPF)
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BiquadHPF = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class BiquadHPF {
    constructor(sampleRate, cutoffHz = 80, Q = Math.SQRT1_2) {
      this.fs = Math.max(1, sampleRate | 0);
      this.cut = cutoffHz;
      this.Q = Q;
      // state
      this.x1 = 0; this.x2 = 0;
      this.y1 = 0; this.y2 = 0;
      // coeffs
      this.b0 = 0; this.b1 = 0; this.b2 = 0;
      this.a1 = 0; this.a2 = 0;
      this._recalc();
    }

    setCutoff(hz) {
      this.cut = Math.max(1, +hz || 1);
      this._recalc();
    }

    setQ(q) {
      this.Q = Math.max(0.1, +q || 0.1);
      this._recalc();
    }

    reset() {
      this.x1 = this.x2 = this.y1 = this.y2 = 0;
    }

    _recalc() {
      const w0 = 2 * Math.PI * this.cut / this.fs;
      const cw = Math.cos(w0);
      const sw = Math.sin(w0);
      const alpha = sw / (2 * this.Q);

      // RBJ High-Pass
      let b0 =  (1 + cw) / 2;
      let b1 = -(1 + cw);
      let b2 =  (1 + cw) / 2;
      let a0 =  1 + alpha;
      let a1 = -2 * cw;
      let a2 =  1 - alpha;

      // normalize
      this.b0 = b0 / a0;
      this.b1 = b1 / a0;
      this.b2 = b2 / a0;
      this.a1 = a1 / a0;
      this.a2 = a2 / a0;
    }

    /**
     * Process a block.
     * @param {Float32Array} input
     * @param {Float32Array=} out  (optional; if omitted, a new array is returned)
     * @returns {Float32Array}
     */
    process(input, out) {
      const len = input.length|0;
      const y = out && out.length === len ? out : new Float32Array(len);

      let x1 = this.x1, x2 = this.x2, y1 = this.y1, y2 = this.y2;
      const b0 = this.b0, b1 = this.b1, b2 = this.b2, a1 = this.a1, a2 = this.a2;

      for (let i = 0; i < len; i++) {
        const x0 = input[i] || 0;
        const z = b0*x0 + b1*x1 + b2*x2 - a1*y1 - a2*y2;
        y[i] = z;

        x2 = x1; x1 = x0;
        y2 = y1; y1 = z;
      }

      this.x1 = x1; this.x2 = x2; this.y1 = y1; this.y2 = y2;
      return y;
    }
  }

  return BiquadHPF;
});
