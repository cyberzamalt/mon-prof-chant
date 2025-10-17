/*!
 * PitchyLite — Détection de fréquence (YIN simplifié).
 * Licence MIT – usage pédagogique/test.
 */
(function(global){
  class PitchyLite {
    constructor(sampleRate=44100){
      this.sampleRate = sampleRate;
      this.buf = new Float32Array(2048);
      this.tauMax = 1024;           // borne supérieure période
      this.threshold = 0.1;         // seuil de confiance
      this.minHz = 50;              // filtre grave
      this.maxHz = 1000;            // filtre aigu
    }
    detect(input){
      // Copie & fenêtre légère
      const N = Math.min(input.length, this.buf.length);
      for(let i=0;i<N;i++){ this.buf[i]=input[i]*0.5*(1-Math.cos(2*Math.PI*i/(N-1))); }

      // YIN : différence
      const diff = new Float32Array(this.tauMax);
      for(let tau=1;tau<this.tauMax;tau++){
        let sum = 0;
        for(let i=0;i<this.tauMax;i++){
          const d = this.buf[i]-this.buf[i+tau];
          sum += d*d;
        }
        diff[tau] = sum;
      }
      // Cumulative mean normalized difference
      let cmnd = new Float32Array(this.tauMax);
      cmnd[0]=1; let running=0;
      for(let tau=1;tau<this.tauMax;tau++){
        running += diff[tau];
        cmnd[tau] = diff[tau] * tau / (running || 1);
      }
      // first minimum below threshold
      let tau=2;
      while (tau<this.tauMax && cmnd[tau] > this.threshold) tau++;
      if (tau===this.tauMax) return null;
      // local min
      let min = tau, minVal = cmnd[tau];
      while (tau<this.tauMax){
        if (cmnd[tau] < minVal){ min=tau; minVal=cmnd[tau]; }
        else break;
        tau++;
      }
      // parabolic interpolation
      const x1 = (min>1)?cmnd[min-1]:1, x2=cmnd[min], x3=(min+1<this.tauMax)?cmnd[min+1]:1;
      const better = min + (x3 - x1) / (2*(2*x2 - x1 - x3) || 1);
      const freq = this.sampleRate / better;
      if (freq < this.minHz || freq > this.maxHz) return null;
      return freq;
    }
  }
  global.PitchyLite = PitchyLite;
})(window);
