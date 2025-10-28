// src/audio/dsp/noise-gate.js
// Noise Gate (envelope follower, attack/release/hold) — UMD (global: NoiseGate)
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NoiseGate = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function dbToLin(db) { return Math.pow(10, db / 20); }
  function linToDb(x)   { return 20 * Math.log10(Math.max(1e-12, x)); }

  class NoiseGate {
    /**
     * @param {number} sampleRate
     * @param {object}  opts
     *  - thresholdDb: ouverture au-dessus de ce niveau (default -50 dBFS)
     *  - reductionDb: atténuation quand fermé (default -80 dB)
     *  - attackMs / releaseMs: lissage de l'enveloppe
     *  - holdMs: durée mini fermée avant réévaluation
     */
    constructor(sampleRate, opts = {}) {
      this.fs = Math.max(1, sampleRate | 0);

      this.thresholdDb = (opts.thresholdDb ?? -50);
      this.reductionDb = (opts.reductionDb ?? -80);
      this.attackMs    = (opts.attackMs ?? 5);
      this.releaseMs   = (opts.releaseMs ?? 50);
      this.holdMs      = (opts.holdMs ?? 30);

      this._env = 0;
      this._gain = 1;
      this._targetGain = 1;
      this._closedUntil = 0; // sample index
      this._sampleIndex = 0;

      this._computeCoeffs();
    }

    _computeCoeffs() {
      const atkT = Math.max(1, this.attackMs) / 1000;
      const relT = Math.max(1, this.releaseMs) / 1000;
      this._atk = Math.exp(-1 / (this.fs * atkT));
      this._rel = Math.exp(-1 / (this.fs * relT));
      this._holdSamples = Math.round((Math.max(0, this.holdMs)) * this.fs / 1000);
      this._thLin = dbToLin(this.thresholdDb);
      this._redLin = dbToLin(this.reductionDb); // ~ 0.0001 for -80dB
    }

    setThresholdDb(db) { this.thresholdDb = db; this._computeCoeffs(); }
    setReductionDb(db) { this.reductionDb = db; this._computeCoeffs(); }
    setAttackMs(ms)    { this.attackMs = ms;    this._computeCoeffs(); }
    setReleaseMs(ms)   { this.releaseMs = ms;   this._computeCoeffs(); }
    setHoldMs(ms)      { this.holdMs = ms;      this._computeCoeffs(); }

    reset() {
      this._env = 0;
      this._gain = 1;
      this._targetGain = 1;
      this._closedUntil = 0;
      this._sampleIndex = 0;
    }

    /**
     * @param {Float32Array} input
     * @param {Float32Array=} out
     * @returns {Float32Array}
     */
    process(input, out) {
      const len = input.length|0;
      const y = out && out.length === len ? out : new Float32Array(len);

      let env = this._env;
      let gain = this._gain;
      let target = this._targetGain;
      let idx = this._sampleIndex;

      const atk = this._atk, rel = this._rel;
      const th  = this._thLin;
      const red = this._redLin;
      let closedUntil = this._closedUntil;

      for (let i = 0; i < len; i++, idx++) {
        const s = input[i] || 0;
        const a = Math.abs(s);

        // Envelope follower (peak w/ attack-release)
        env = a > env ? atk * env + (1 - atk) * a
                      : rel * env + (1 - rel) * a;

        // Gate decision
        const above = env >= th;

        if (above) {
          target = 1.0;
          // reopen immediately
        } else {
          // if under threshold, keep closed at least holdMs
          if (idx >= closedUntil) {
            target = red;
            closedUntil = idx + this._holdSamples;
          }
        }

        // Smooth gain to avoid clicks (short release)
        const gCoef = above ? 0.05 : 0.01; // faster when opening
        gain = gain + (target - gain) * gCoef;

        y[i] = s * gain;
      }

      this._env = env;
      this._gain = gain;
      this._targetGain = target;
      this._closedUntil = closedUntil;
      this._sampleIndex = idx;

      return y;
    }

    /** current envelope in dBFS (for debug UI) */
    getEnvelopeDb() { return linToDb(this._env); }
    /** current gain in dB */
    getGainDb() { return linToDb(this._gain); }
  }

  return NoiseGate;
});
