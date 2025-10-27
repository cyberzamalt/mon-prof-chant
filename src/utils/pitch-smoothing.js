/* assets/utils/pitch-smoothing.js */
(function () {
  class PitchSmoother {
    constructor(opt = {}) {
      this.medianWindowSize = opt.medianWindowSize || 5;
      this.smoothingFactor = opt.smoothingFactor || 0.75;
      this.maxPitchJump = opt.maxPitchJump || 250; // Hz max/frame
      this.minConfidence = opt.minConfidence || 0.2;

      this._median = [];
      this._last = null;
    }

    reset() {
      this._median = [];
      this._last = null;
    }

    smooth(hz, confidence = 1.0) {
      if (!hz || hz <= 0 || confidence < this.minConfidence) return null;

      // median
      this._median.push(hz);
      if (this._median.length > this.medianWindowSize) this._median.shift();
      const med = this._median
        .slice()
        .sort((a, b) => a - b)[Math.floor(this._median.length / 2)];

      // anti-saut simple
      if (this._last !== null) {
        const jump = Math.abs(med - this._last);
        if (jump > this.maxPitchJump) {
          // rejette le saut anormal, garde last
          return this._last;
        }
      }

      // EMA
      if (this._last === null) {
        this._last = med;
      } else {
        const a = this.smoothingFactor;
        this._last = a * med + (1 - a) * this._last;
      }
      return this._last;
    }
  }

  window.PitchSmoother = PitchSmoother;
})();
