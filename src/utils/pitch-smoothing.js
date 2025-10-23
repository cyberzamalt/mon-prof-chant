/**
 * pitch-smoothing.js
 * Lissage multi-étapes : médiane → correction d’octave → EMA
 * Paramètres par défaut adaptés au chant “live”.
 */
(function () {
  class PitchSmoother {
    constructor(options = {}) {
      this.medianWindowSize = options.medianWindowSize || 5; // 5–7 = bon compromis
      this.smoothingFactor  = options.smoothingFactor  || 0.75; // 0.7–0.8
      this.maxPitchJumpHz   = options.maxPitchJump    || 250;   // filtre des sauts improbables (en Hz)
      this.minConfidence    = options.minConfidence   || 0.2;
      this.lastValid = null;
      this.medianBuf = [];
    }

    reset() {
      this.lastValid = null;
      this.medianBuf.length = 0;
    }

    smooth(rawHz, confidence = 1.0) {
      if (!rawHz || rawHz <= 0 || confidence < this.minConfidence) {
        return this.lastValid; // pas de saut brutal vers null
      }

      // 1) Médiane
      const med = this.#medianFilter(rawHz);

      // 2) Correction d’octave simple (si ~x2 ou ~x0.5)
      let hz = med;
      if (this.lastValid) {
        const ratio = hz / this.lastValid;
        if (ratio > 1.9 && ratio < 2.1) hz = hz / 2;
        else if (ratio > 0.49 && ratio < 0.51) hz = hz * 2;

        // 3) Rejet des sauts non musicaux
        if (Math.abs(hz - this.lastValid) > this.maxPitchJumpHz) {
          // garder l’historique récent plutôt que le saut isolé
          hz = this.lastValid;
        }
      }

      // 4) EMA (lissage temporel)
      const out = (this.lastValid == null)
        ? hz
        : (this.smoothingFactor * hz + (1 - this.smoothingFactor) * this.lastValid);

      this.lastValid = out;
      return out;
    }

    #medianFilter(v) {
      this.medianBuf.push(v);
      if (this.medianBuf.length > this.medianWindowSize) this.medianBuf.shift();
      if (this.medianBuf.length < 3) return v;
      const sorted = this.medianBuf.slice().sort((a,b)=>a-b);
      return sorted[(sorted.length / 2) | 0];
    }
  }

  window.PitchSmoother = PitchSmoother;
})();
