// src/audio/core/MicrophoneManager.js
// Partage le même AudioContext (AudioEngine), gère le micro et expose isActive()/getStream().

import { Logger } from '../../logging/Logger.js';
import { AudioEngine } from './AudioEngine.js';

class MicrophoneManager {
  constructor(options = {}) {
    this.stream = null;
    this.source = null;
    this.constraints = options.constraints || {
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
        // Ne PAS forcer sampleRate ici (on aligne côté AudioEngine si besoin)
      }
    };
  }

  async #ensureContext() {
    const engine = AudioEngine.getInstance();
    let ctx = engine.context || (typeof engine.getContext === 'function' ? engine.getContext() : null);
    if (!ctx || ctx.state === 'closed') {
      Logger.warn('[MicrophoneManager] AudioContext manquant → init()');
      await engine.init(); // peut logguer "Déjà initialisé"
      ctx = engine.context || (typeof engine.getContext === 'function' ? engine.getContext() : null);
    }
    return ctx;
  }

  async start() {
    try {
      const ctx = await this.#ensureContext();

      Logger.info('[MicrophoneManager] Demande accès microphone...', this.constraints);
      const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      Logger.info('[MicrophoneManager] Accès microphone accordé');

      this.stream = stream;

      // Créer la source dans le même AudioContext
      this.source = ctx.createMediaStreamSource(stream);

      const trackRate = stream.getAudioTracks()?.[0]?.getSettings?.()?.sampleRate || 'n/a';
      Logger.info('[MicrophoneManager] Source créée', {
        contextSampleRate: ctx.sampleRate,
        trackSampleRateHint: trackRate
      });

      return { stream: this.stream, source: this.source };
    } catch (err) {
      Logger.error('[MicrophoneManager] Erreur start', err);
      throw err;
    }
  }

  isActive() {
    return !!this.stream && this.stream.getAudioTracks().some(t => t.readyState === 'live');
  }

  getStream() {
    return this.stream || null;
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
