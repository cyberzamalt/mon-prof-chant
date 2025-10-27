<script>
// Smoother réactif: médiane (anti-outliers) + filtre IIR simple.
// API: new PitchSmoother(opts).smooth(hz, clarity?) → hz lissé | null ; .reset()
(function (global) {
  'use strict';

  function median(arr) {
    const a = arr.slice().sort((x, y) => x - y);
    const m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function PitchSmoother(opts) {
    const o = opts || {};
    this.medianWindowSize = o.medianWindowSize ?? 5;
    this.smoothingFactor  = o.smoothingFactor  ?? 0.75; // 0.7-0.8 = réactif
    this.maxPitchJump     = o.maxPitchJump     ?? 250;  // Hz/frame max
    this.minConfidence    = o.minConfidence    ?? 0.0;  // si clarity fourni
    this._win = [];
    this._last = null;
  }

  PitchSmoother.prototype.reset = function () {
    this._win.length = 0;
    this._last = null;
  };

  PitchSmoother.prototype.smooth = function (hz, clarity) {
    if (!hz || hz <= 0) return null;
    if (typeof clarity === 'number' && clarity < this.minConfidence) return null;

    // médiane anti-outliers
    this._win.push(hz);
    if (this._win.length > this.medianWindowSize) this._win.shift();
    const med = median(this._win);

    // Rejeter sauts aberrants (octave-jumps)
    if (this._last && Math.abs(med - this._last) > this.maxPitchJump) {
      // garder l'ancien si blow-up transitoire
      return this._last;
    }

    // IIR: out = a*med + (1-a)*last
    const a = this.smoothingFactor;
    const out = (this._last == null) ? med : (a * med + (1 - a) * this._last);
    this._last = out;
    return out;
  };

  global.PitchSmoother = PitchSmoother;
})(typeof window !== 'undefined' ? window : globalThis);
</script>
