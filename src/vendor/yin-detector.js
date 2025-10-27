/* assets/vendor/yin-detector.js
 * YIN pitch detection (production ready) – corrigé (bornes maxLag + export)
 */
(function () {
  class YinDetector {
    constructor(sampleRate = 44100, bufferSize = 2048) {
      this.sampleRate = sampleRate;
      this.bufferSize = bufferSize;
      this.threshold = 0.06; // sensible mais pas trop
      this.yinBuffer = new Float32Array(bufferSize);
      this._rmsBuf = null;
      this.maxLag = Math.floor(this.bufferSize / 2); // ← mémorisé pour éviter tout dépassement
    }

    setThreshold(value) {
      this.threshold = Math.max(0.01, Math.min(0.99, value));
    }

    detect(float32array) {
      try {
        if (!float32array || float32array.length === 0) return -1;

        // Silence rapide (RMS)
        const rms = this._rms(float32array);
        if (rms < 0.003) return -1;

        // Fenêtre Hann
        const buf = this._hann(float32array);

        // Différence YIN
        this._difference(buf);

        // Cumulative mean normalized difference
        this._cumulative();

        // Seuil absolu
        const tauEst = this._absoluteThreshold();
        if (tauEst === -1) return -1;

        // Affinage parabolique
        const tau = this._parabolic(tauEst);

        const freq = this.sampleRate / tau;
        if (freq < 40 || freq > 2000) return -1;
        return freq;
      } catch (e) {
        console.error('[YinDetector] detect error:', e);
        return -1;
      }
    }

    _rms(buffer) {
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
      return Math.sqrt(sum / buffer.length);
    }

    _hann(buffer) {
      const out = new Float32Array(buffer.length);
      const N = buffer.length - 1;
      for (let i = 0; i < buffer.length; i++) {
        const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / N));
        out[i] = buffer[i] * w;
      }
      return out;
    }

    _difference(buf) {
      const N = buf.length;
      const maxLag = Math.floor(N / 2);
      this.maxLag = maxLag; // ← stocké pour les étapes suivantes

      // Remise à zéro
      for (let i = 0; i < this.yinBuffer.length; i++) this.yinBuffer[i] = 0;

      // Différence
      for (let tau = 1; tau < maxLag; tau++) {
        let sum = 0;
        for (let i = 0; i < maxLag; i++) {
          const d = buf[i] - buf[i + tau];
          sum += d * d;
        }
        this.yinBuffer[tau] = sum;
      }
    }

    _cumulative() {
      // IMPORTANT : on utilise this.maxLag (pas yinBuffer.length) pour rester borné
      this.yinBuffer[0] = 1;
      let runningSum = 0;
      for (let tau = 1; tau < this.maxLag; tau++) {
        runningSum += this.yinBuffer[tau];
        this.yinBuffer[tau] =
          runningSum === 0 ? 1 : (this.yinBuffer[tau] * tau) / runningSum;
      }
    }

    _absoluteThreshold() {
      for (let tau = 1; tau < this.maxLag; tau++) {
        if (this.yinBuffer[tau] < this.threshold) {
          while (
            tau + 1 < this.maxLag &&
            this.yinBuffer[tau + 1] < this.yinBuffer[tau]
          ) {
            tau++;
          }
          return tau;
        }
      }
      return -1;
    }

    _parabolic(tau) {
      if (tau < 1 || tau + 1 >= this.maxLag) return tau;
      const s0 = this.yinBuffer[tau - 1];
      const s1 = this.yinBuffer[tau];
      const s2 = this.yinBuffer[tau + 1];
      const a = (s2 - 2 * s1 + s0) / 2;
      const b = (s2 - s0) / 2;
      if (a === 0) return tau;
      const shift = -b / (2 * a);
      return (shift > -1 && shift < 1) ? tau + shift : tau;
    }
  }

  // Export global
  window.YinDetector = YinDetector;
})();
