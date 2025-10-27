/* YinDetector — Pitch detection (YIN) — production-ready, vanilla JS
   Correctifs inclus :
   - Parcours borné à maxLag = floor(buffer.length / 2) (évite artefacts et “ligne plate”)
   - Export global: window.YinDetector = YinDetector
*/
(function () {
  class YinDetector {
    constructor(sampleRate = 44100, bufferSize = 2048) {
      this.sampleRate = sampleRate;
      this.bufferSize = bufferSize | 0;
      this.threshold = 0.06;              // sensible mais robuste (0.05–0.10)
      this.minRMS = 0.003;                // silence gate
      this._yin = new Float32Array(this.bufferSize);
      this._hann = new Float32Array(this.bufferSize);
      this._prepareHann();
    }

    setThreshold(v) {
      const x = Math.max(0.01, Math.min(0.99, Number(v)));
      this.threshold = x;
    }

    _prepareHann() {
      const N = this.bufferSize;
      for (let i = 0; i < N; i++) {
        this._hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
      }
    }

    _rms(buf) {
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      return Math.sqrt(s / buf.length);
    }

    _applyHann(src, dst) {
      const N = src.length;
      for (let i = 0; i < N; i++) dst[i] = src[i] * this._hann[i];
      return dst;
    }

    // Étape 1/2 — fonction de différence cumulée normalisée (YIN)
    _computeCMND(buffer) {
      const N = buffer.length;
      const maxLag = (this._maxLag = Math.floor(N / 2));  // <— CORRECTIF clé
      const yin = this._yin;
      yin[0] = 1;

      // Différence quadratique
      for (let tau = 1; tau < maxLag; tau++) {
        let sum = 0;
        for (let i = 0; i < maxLag; i++) {
          const d = buffer[i] - buffer[i + tau];
          sum += d * d;
        }
        yin[tau] = sum;
      }

      // Normalisation cumulative
      let running = 0;
      for (let tau = 1; tau < maxLag; tau++) {
        running += yin[tau];
        yin[tau] = running ? (yin[tau] * tau) / running : 1;
      }
    }

    // Étape 3 — seuil absolu + minimum local
    _absoluteThreshold() {
      const yin = this._yin;
      const maxLag = this._maxLag;        // <— bornage correct
      const thr = this.threshold;

      for (let tau = 2; tau < maxLag; tau++) {
        if (yin[tau] < thr) {
          while (tau + 1 < maxLag && yin[tau + 1] < yin[tau]) tau++;
          return tau;
        }
      }
      return -1;
    }

    // Étape 4 — interpolation parabolique autour du minimum
    _parabolic(tau) {
      const yin = this._yin;
      const maxLag = this._maxLag;
      if (tau < 1 || tau + 1 >= maxLag) return tau;
      const s0 = yin[tau - 1], s1 = yin[tau], s2 = yin[tau + 1];
      const a = (s2 - 2 * s1 + s0) / 2;
      const b = (s2 - s0) / 2;
      if (a === 0) return tau;
      const shift = -b / (2 * a);
      return (shift > -1 && shift < 1) ? tau + shift : tau;
    }

    // API principale
    detect(float32) {
      if (!float32 || float32.length < 64) return -1;

      // Copie + fenêtre (évite bords durs)
      const win = new Float32Array(this.bufferSize);
      if (float32.length !== this.bufferSize) {
        // découpe centrée si taille différente
        const N = Math.min(float32.length, this.bufferSize);
        const start = ((float32.length - N) / 2) | 0;
        for (let i = 0; i < N; i++) win[i] = float32[start + i];
        for (let i = N; i < this.bufferSize; i++) win[i] = 0;
      } else {
        win.set(float32);
      }
      if (this._rms(win) < this.minRMS) return -1;

      const windowed = this._applyHann(win, win);
      this._computeCMND(windowed);
      const tau0 = this._absoluteThreshold();
      if (tau0 < 0) return -1;
      const tau = this._parabolic(tau0);
      const freq = this.sampleRate / tau;

      // Garde-fou instrument/voix
      if (freq < 40 || freq > 2000) return -1;
      return freq;
    }
  }

  // Export global (compat <script>)
  window.YinDetector = YinDetector;
})();
