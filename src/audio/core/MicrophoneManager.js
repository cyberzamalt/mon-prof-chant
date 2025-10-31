// src/audio/core/MicrophoneManager.js
// Utilise TOUJOURS le même AudioContext partagé (AudioEngine) et chemin compatible Firefox.

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
        // sampleRate: 48000, // optionnel si tu veux forcer 48 kHz
      }
    };
    this.stream = null;
    this.source = null;
  }

  async start() {
    const engine = AudioEngine.getInstance();
    const ctx = engine?.context;
    if (!ctx) throw new Error('AudioContext non initialisé');

    try {
      Logger.info('[MicrophoneManager] Demande accès microphone...', this.constraints);
      const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      this.stream = stream;
      Logger.info('[MicrophoneManager] Accès microphone accordé');

      // ✅ Chemin le plus robuste (Firefox/Chrome/Safari)
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
