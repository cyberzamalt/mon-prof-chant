/* AudioEngine — crée AudioContext, getUserMedia et AnalyserNode */
(function () {
  const AudioEngine = {
    ctx: null,
    analyser: null,
    stream: null,

    async ensureContext() {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return this.ctx;
    },

    async activateMic({ fftSize = 2048 } = {}) {
      await this.ensureContext();
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
      }
      if (!this.analyser) {
        const src = this.ctx.createMediaStreamSource(this.stream);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = fftSize;          // 2048 recommandé
        this.analyser.smoothingTimeConstant = 0;  // pas de lissage WebAudio
        src.connect(this.analyser);
      }
      return { ctx: this.ctx, analyser: this.analyser, stream: this.stream };
    }
  };

  window.AudioEngine = AudioEngine;
})();
