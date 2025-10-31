// src/audio/core/AudioEngine.js
import { Logger } from '../../logging/Logger.js';

class AudioEngine {
  static #instance;
  #ctx = null;

  static getInstance() {
    if (!this.#instance) this.#instance = new AudioEngine();
    return this.#instance;
  }

  get context() { return this.#ctx; }

  async init(sampleRateHint) {
    if (this.#ctx) { Logger.warn('[AudioEngine] Déjà initialisé'); return this.#ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    try {
      this.#ctx = sampleRateHint ? new AC({ sampleRate: sampleRateHint }) : new AC();
    } catch (e) {
      this.#ctx = new AC(); // fallback
    }
    try { await this.#ctx.resume(); } catch (_) {}
    Logger.info('[AudioEngine] Contexte prêt', this.#ctx);
    return this.#ctx;
  }

  async reinit(targetRate) {
    if (this.#ctx?.sampleRate === targetRate) return this.#ctx;
    try { await this.#ctx?.close(); } catch (_) {}
    this.#ctx = null;
    Logger.warn('[AudioEngine] Recréation du contexte @', targetRate);
    return this.init(targetRate);
  }

  createAnalyser(opts = {}) {
    if (!this.#ctx) throw new Error('AudioEngine non initialisé');
    return new AnalyserNode(this.#ctx, {
      fftSize: 2048,
      smoothingTimeConstant: 0.85,
      ...opts
    });
  }
}

export { AudioEngine };
export const audioEngine = AudioEngine.getInstance();
