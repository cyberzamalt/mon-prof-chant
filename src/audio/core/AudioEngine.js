// src/audio/core/AudioEngine.js
import { Logger } from '../../logging/Logger.js';

export class AudioEngine {
  static #instance = null;
  context = null;

  static getInstance() {
    if (!AudioEngine.#instance) AudioEngine.#instance = new AudioEngine();
    return AudioEngine.#instance;
  }

  /**
   * (Re)crée le contexte si absent/fermé ou si le sampleRate désiré diffère.
   * @param {number|undefined} preferredSampleRate
   */
  async init(preferredSampleRate) {
    const AC = window.AudioContext || window.webkitAudioContext;

    // Contexte déjà OK avec le bon sampleRate
    if (this.context && this.context.state !== 'closed') {
      if (!preferredSampleRate || this.context.sampleRate === preferredSampleRate) {
        Logger.warn('[AudioEngine] Déjà initialisé');
        return this.context;
      }
      // SampleRate différent → on recrée
      try { await this.context.close(); } catch (_) {}
      this.context = null;
    }

    const options = preferredSampleRate ? { sampleRate: preferredSampleRate } : undefined;
    this.context = new AC(options);
    try { await this.context.resume(); } catch (_) {}

    Logger.info('[AudioEngine] Contexte prêt', { sampleRate: this.context.sampleRate });
    return this.context;
  }

  getContext() { return this.context; }
}

export const audioEngine = AudioEngine.getInstance();
