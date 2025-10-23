/**
 * yin-detector.js
 * Détection de pitch par l'algorithme YIN (implémentation robuste + correctifs)
 * Points clés :
 *  - On ne scanne JAMAIS au-delà de maxTau = floor(N/2) (bug classique corrigé)
 *  - Fenêtre Hann pour réduire les artefacts
 *  - CMND (Cumulative Mean Normalized Difference)
 *  - Seuil paramétrable (par défaut 0.06)
 *  - Interpolation parabolique autour du minimum
 */

(function () {
  class YinDetector {
    constructor(sampleRate = 44100, bufferSize = 2048) {
      this.sampleRate = sampleRate;
      this.bufferSize = bufferSize;
      this.threshold = 0.06; // un poil plus sensible (0.05–0.1)
      this.silenceRms = 0.003; // sous ce RMS, on considère silence
      this.minHz = 40;
      this.maxHz = 2000;

      // IMPORTANT: yinBuffer dimensionnée à ~N/2 (+1) et réutilisée
      this.maxTau = Math.floor(this.bufferSize / 2);
      this.yinBuffer = new Float32Array(this.maxTau + 1);

      // Précompute Hann
      this.hann = new Float32Array(this.bufferSize);
      for (let i = 0; i < this.bufferSize; i++) {
        this.hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.bufferSize - 1)));
      }
    }

    setThreshold(v) {
      this.threshold = Math.max(0.01, Math.min(0.99, v));
    }

    detect(input) {
      try {
        // Accepte des tailles variables, mais recalcule maxTau correctement
        const N = input.length | 0;
        if (N < 32) return -1;

        const sampleRate = this.sampleRate;

        // RMS -> silence ?
        let sum2 = 0;
        for (let i = 0; i < N; i++) sum2 += input[i] * input[i];
        const rms = Math.sqrt(sum2 / N);
        if (rms < this.silenceRms) return -1;

        // Assure dimensions internes en fonction de N courant
        const maxTau = Math.floor(N / 2);
        if (maxTau !== this.maxTau) {
          this.maxTau = maxTau;
          if (this.yinBuffer.length !== maxTau + 1) {
            this.yinBuffer = new Float32Array(maxTau + 1);
          }
        }

        // 1) Fenêtrage Hann (copie)
        const buf = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const w = (i < this.hann.length) ? this.hann[i] : 1;
          buf[i] = input[i] * w;
        }

        // 2) Différence d(tau) pour tau ∈ [1 .. maxTau]
        this.yinBuffer[0] = 0;
        for (let tau = 1; tau <= maxTau; tau++) {
          let sum = 0;
          for (let i = 0; i < maxTau; i++) {
            const diff = buf[i] - buf[i + tau];
            sum += diff * diff;
          }
          this.yinBuffer[tau] = sum;
        }

        // 3) CMND d'(tau)
        let runningSum = 0;
        this.yinBuffer[0] = 1;
        for (let tau = 1; tau <= maxTau; tau++) {
          runningSum += this.yinBuffer[tau];
          this.yinBuffer[tau] = (runningSum > 0)
            ? (this.yinBuffer[tau] * tau) / runningSum
            : 1;
        }

        // 4) Seuil absolu : premier minimum local < threshold
        const threshold = this.threshold;
        let tauEstimate = -1;
        for (let tau = 2; tau < maxTau; tau++) {
          if (this.yinBuffer[tau] < threshold) {
            // descendante locale jusqu’au minimum
            while (tau + 1 < maxTau && this.yinBuffer[tau + 1] < this.yinBuffer[tau]) {
              tau++;
            }
            tauEstimate = tau;
            break;
          }
        }

        // Si rien < threshold : prendre le tau du min global (hors 0)
        if (tauEstimate === -1) {
          let minVal = Infinity, minIdx = -1;
          for (let tau = 2; tau < maxTau; tau++) {
            const v = this.yinBuffer[tau];
            if (v < minVal) {
              minVal = v; minIdx = tau;
            }
          }
          tauEstimate = minIdx;
          if (tauEstimate <= 0) return -1;
        }

        // 5) Interpolation parabolique autour de tauEstimate
        const tau = this.#parabolicInterp(tauEstimate, maxTau);

        // 6) Conversion en Hz + bornes
        const freq = sampleRate / tau;
        if (!(freq > 0) || freq < this.minHz || freq > this.maxHz) return -1;

        return freq;
      } catch (err) {
        console.error('[YinDetector] detect error:', err);
        return -1;
      }
    }

    #parabolicInterp(tau, maxTau) {
      // bornes sécurisées
      const x0 = (tau < 1) ? tau : tau - 1;
      const x2 = (tau + 1 < maxTau) ? tau + 1 : tau;

      const s0 = this.yinBuffer[x0];
      const s1 = this.yinBuffer[tau];
      const s2 = this.yinBuffer[x2];

      const a = (s0 + s2 - 2 * s1) / 2;
      const b = (s2 - s0) / 2;

      if (Math.abs(a) < 1e-12) return tau; // quasi plat
      const shift = -b / (2 * a);

      // limite le décalage à [-1, +1]
      const clampedShift = Math.max(-1, Math.min(1, shift));
      return tau + clampedShift;
    }
  }

  // export global
  window.YinDetector = YinDetector;
})();
