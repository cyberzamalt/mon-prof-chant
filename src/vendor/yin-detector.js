<script>
/*!
 * YinDetector — YIN pitch detection (JS)
 * Correctifs: arrêt à maxLag=floor(N/2), export global window.YinDetector
 */
(function(){
  class YinDetector {
    constructor(sampleRate = 44100, bufferSize = 2048) {
      this.sampleRate = sampleRate;
      this.bufferSize = bufferSize;
      this.threshold = 0.06; // sensibilité par défaut (0.01-0.2)
      this.maxLag = Math.floor(bufferSize / 2);
      this.yinBuffer = new Float32Array(this.maxLag + 1);
      this._hann = new Float32Array(bufferSize);
      for (let i = 0; i < bufferSize; i++) {
        this._hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (bufferSize - 1)));
      }
    }
    setThreshold(v){ this.threshold = Math.max(0.01, Math.min(0.3, v)); }

    detect(input) {
      if (!input || input.length < this.bufferSize) return -1;

      // RMS: si trop faible → silence
      let sum = 0;
      for (let i = 0; i < this.bufferSize; i++) { const v = input[i]; sum += v*v; }
      const rms = Math.sqrt(sum / this.bufferSize);
      if (rms < 0.003) return -1;

      // Fenêtrage Hann
      const buf = new Float32Array(this.bufferSize);
      for (let i = 0; i < this.bufferSize; i++) buf[i] = input[i] * this._hann[i];

      // 1) Fonction de différence (inverse autocorr)
      const maxLag = this.maxLag;
      this.yinBuffer[0] = 1;
      for (let tau = 1; tau <= maxLag; tau++) {
        let diff = 0;
        for (let i = 0; i < maxLag; i++) {
          const d = buf[i] - buf[i + tau];
          diff += d * d;
        }
        this.yinBuffer[tau] = diff;
      }

      // 2) Moyenne cumulative normalisée
      let runningSum = 0;
      for (let tau = 1; tau <= maxLag; tau++) {
        runningSum += this.yinBuffer[tau];
        this.yinBuffer[tau] = (runningSum === 0) ? 1 : (this.yinBuffer[tau] * tau) / runningSum;
      }

      // 3) Seuil absolu
      let tauEst = -1;
      for (let tau = 2; tau < maxLag; tau++) {
        if (this.yinBuffer[tau] < this.threshold) {
          // minimum local
          while (tau + 1 < maxLag && this.yinBuffer[tau + 1] < this.yinBuffer[tau]) tau++;
          tauEst = tau; break;
        }
      }
      if (tauEst < 0) return -1;

      // 4) Interpolation parabolique autour de tauEst
      const s0 = this.yinBuffer[tauEst - 1] ?? 1;
      const s1 = this.yinBuffer[tauEst] ?? 1;
      const s2 = this.yinBuffer[tauEst + 1] ?? 1;
      const a = (s2 - 2 * s1 + s0) / 2;
      const b = (s2 - s0) / 2;
      const shift = (a === 0) ? 0 : (-b / (2 * a));
      const tau = Math.max(1, Math.min(maxLag, tauEst + (shift > -1 && shift < 1 ? shift : 0)));

      const freq = this.sampleRate / tau;
      return (freq >= 40 && freq <= 2000) ? freq : -1;
    }
  }
  window.YinDetector = YinDetector;
})();
</script>
