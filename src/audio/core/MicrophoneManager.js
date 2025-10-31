// src/audio/core/MicrophoneManager.js
// Partage le même AudioContext (AudioEngine) et s’assure qu’il est prêt avant d’ouvrir le micro.

import { Logger } from '../../logging/Logger.js';
import { AudioEngine } from './AudioEngine.js';

class MicrophoneManager {
  constructor(options = {}) {
    this.constraints = options.constraints || {
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        // sampleRate: 48000, // optionnel (ne pas forcer tant que tout marche)
      }
    };
    this.stream = null;
    this.source = null;
  }

  async start() {
    try {
      const engine = AudioEngine.getInstance();

      // ✅ Assurer que l’AudioContext existe (au cas où)
      if (!engine.context || engine.context.state === 'closed') {
        Logger.warn('[MicrophoneManager] AudioContext manquant → init()');
        await engine.init();
      }
      const ctx = engine.context;
      if (!ctx) throw new Error('AudioContext non disponible');

      Logger.info('[MicrophoneManager] Demande accès microphone...', this.constraints);
      const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      this.stream = stream;
      Logger.info('[MicrophoneManager] Accès microphone accordé');

      // ✅ Chemin robuste Firefox/Chrome
      this.source = ctx.createMediaStreamSource(stream);

      Logger.info('[MicrophoneManager] Source créée', {
        contextSampleRate: ctx.sampleRate,
        trackSampleRateHint:
          stream.getAudioTracks()?.[0]?.getSettings?.()?.sampleRate || 'n/a'
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
