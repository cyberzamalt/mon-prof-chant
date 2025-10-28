// src/utils/pitch-smoothing.js
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PitchSmoother = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class Ring {
    constructor(n) { this.a = new Array(n).fill(0); this.n = n; this.i = 0; this.filled = 0; }
    push(v){ this.a[this.i] = v; this.i = (this.i+1)%this.n; if(this.filled<this.n) this.filled++; }
    values(){ return this.a.slice(0, this.filled); }
    clear(){ this.i=0; this.filled=0; this.a.fill(0); }
  }

  class PitchSmoother {
    constructor({ medianWindowSize=5, smoothingFactor=0.75, maxPitchJump=250, minConfidence=0.2 } = {}) {
      this.win = new Ring(medianWindowSize);
      this.alpha = smoothingFactor;
      this.maxJump = maxPitchJump;
      this.prev = 0;
    }
    reset(){ this.win.clear(); this.prev = 0; }

    smooth(hz) {
      if (!hz || hz <= 0 || !Number.isFinite(hz)) return null;

      // Filtre outliers (sauts délirants)
      if (this.prev && Math.abs(hz - this.prev) > this.maxJump) {
        // ignore ce point mais ne casse pas la courbe
        hz = this.prev;
      }

      this.win.push(hz);
      const vals = this.win.values().slice().sort((a,b)=>a-b);
      const med = vals[Math.floor(vals.length/2)] || hz;

      // Lissage expo
      const sm = this.prev ? this.alpha * med + (1 - this.alpha) * this.prev : med;
      this.prev = sm;
      return sm;
    }
  }

  return PitchSmoother;
});
