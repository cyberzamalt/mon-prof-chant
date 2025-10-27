<script>
// Minimal YIN detector (CMND) – API: new YinDetector(sampleRate, bufferSize).detect(float32Array)
// Corrige le bug classique: parcours borné à maxLag = floor(N/2) (sinon ligne plate).
(function (global) {
  'use strict';

  function YinDetector(sampleRate, bufferSize) {
    if (!sampleRate || !bufferSize) {
      throw new Error('YinDetector: sampleRate and bufferSize are required');
    }
    this.sampleRate = sampleRate|0;
    this.bufferSize = bufferSize|0;
    this.threshold = 0.06;     // recommandé pour la voix
    this.probability = 0.0;
    this.maxLag = Math.floor(this.bufferSize / 2);
    this._yin = new Float32Array(this.maxLag);
  }

  YinDetector.prototype.detect = function (buffer) {
    // Sécurité: on borne à la taille attendue et on recalcule maxLag
    const N = Math.min(buffer.length, this.bufferSize);
    if (N < 4) return null;
    const maxLag = Math.floor(N / 2);
    if (this._yin.length !== maxLag) this._yin = new Float32Array(maxLag);

    // --- 1) Difference function d(tau)
    for (let tau = 0; tau < maxLag; tau++) {
      let sum = 0;
      for (let i = 0; i < maxLag; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      this._yin[tau] = sum;
    }

    // --- 2) Cumulative Mean Normalized Difference (CMND)
    this._yin[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < maxLag; tau++) {
      runningSum += this._yin[tau];
      this._yin[tau] = (this._yin[tau] * tau) / (runningSum || 1);
    }

    // --- 3) Chercher premier minimum < threshold
    let tauEstimate = -1;
    for (let tau = 2; tau < maxLag; tau++) {
      if (this._yin[tau] < this.threshold) {
        // raffiner: aller jusqu'au vrai minimum local
        while (tau + 1 < maxLag && this._yin[tau + 1] < this._yin[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }
    if (tauEstimate === -1) {
      // Pas de minimum sous le seuil → prendre minimum global (robuste)
      let minVal = 1, minPos = -1;
      for (let tau = 2; tau < maxLag; tau++) {
        if (this._yin[tau] < minVal) { minVal = this._yin[tau]; minPos = tau; }
      }
      tauEstimate = minPos;
      if (tauEstimate < 0) { this.probability = 0; return null; }
    }

    // --- 4) Interpolation parabolique autour de tauEstimate
    const s0Idx = (tauEstimate <= 1) ? tauEstimate : tauEstimate - 1;
    const s2Idx = (tauEstimate + 1 < maxLag) ? tauEstimate + 1 : tauEstimate;
    const s0 = this._yin[s0Idx];
    const s1 = this._yin[tauEstimate];
    const s2 = this._yin[s2Idx];
    const denom = (2 * s1 - s2 - s0);
    const delta = denom !== 0 ? (s2 - s0) / (2 * denom) : 0;
    const tauInterp = tauEstimate + delta;

    const freq = this.sampleRate / (tauInterp || tauEstimate || 1);
    this.probability = 1 - s1;

    if (!isFinite(freq) || freq <= 0) return null;
    return freq;
  };

  global.YinDetector = YinDetector;
})(typeof window !== 'undefined' ? window : globalThis);
</script>
