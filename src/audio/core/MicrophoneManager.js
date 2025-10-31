// src/audio/core/MicrophoneManager.js
// Utilise le même AudioContext que l’AudioEngine (singleton) et gère tous les cas.

import { Logger } from '../../logging/Logger.js';
import { AudioEngine } from './AudioEngine.js';

class MicrophoneManager {
  constructor(options = {}) {
    this.stream = null;
    this.source = null;
    this.constraints = options.constraints || { audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
  }

  async #ensureContext() {
    const engine = AudioEngine.getInstance();

    // Essaie d’obtenir le contexte via propriété OU getter (selon ton AudioEngine)
    let ctx = engine.context || (typeof engine.getContext === 'function' ? engine.getContext() : null);

    if (!ctx || ctx.state === 'closed') {
      Logger.warn('[MicrophoneManager] AudioContext absent → init()');
      await engine.init(); // peut logguer "Déjà initialisé"
      ctx = engine.context || (typeof engine.getContext === 'function' ? engine.getContext() : null);
    }
    if (!ctx) throw new Error('AudioContext non disponible');
    return ctx;
  }

  async start() {
    try {
      const ctx = await this.#ensureContext();

      // Aligne le sampleRate d’acquisition sur celui du contexte (évite le mismatch FF/Chrome)
      const alignedConstraints = structuredClone(this.constraints);
      alignedConstraints.audio = alignedConstraints.audio || {};
      alignedConstraints.audio.sampleRate = ctx.sampleRate;

      Logger.info('[MicrophoneManager] Demande accès microphone...', alignedConstraints);
      const stream = await navigator.mediaDevices.getUserMedia(alignedConstraints);
      Logger.info('[MicrophoneManager] Accès microphone accordé');

      this.stream = stream;

      // Création de la source dans LE MÊME contexte
      this.source = ctx.createMediaStreamSource(stream);

      Logger.info('[MicrophoneManager] Source créée', {
        contextSampleRate: ctx.sampleRate,
        trackRate: stream.getAudioTracks()?.[0]?.getSettings?.()?.sampleRate || 'n/a'
      });

      return { stream: this.stream, source: this.source };
    } catch (err) {
      Logger.error('[MicrophoneManager] Erreur start', err);
      throw err;
    }
  }

  connect(node) {
    if (this.source && node) {
      this.source.connect(node);
      Logger.info('[MicrophoneManager] Source connectée');
    }
  }

  disconnect() {
    try { if (this.source) this.source.disconnect(); } catch (_) {}
  }

  stop() {
    this.disconnect();
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.source = null;
    Logger.info('[MicrophoneManager] Micro arrêté');
  }
}

export default MicrophoneManager;
export { MicrophoneManager };
