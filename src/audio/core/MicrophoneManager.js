// src/audio/core/MicrophoneManager.js
// Version unifiée : utilise TOUJOURS le même AudioContext que l’app (AudioEngine)

import { Logger } from '../../logging/Logger.js';
import { audioEngine } from './AudioEngine.js';

class MicrophoneManager {
  constructor(options = {}) {
    this.constraints = options.constraints || {
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        // sampleRate: 48000, // ← décommente si tu veux tenter de forcer 48 kHz
      }
    };
    this.stream = null;
    this.source = null;
  }

  async start() {
    try {
      Logger.info('[MicrophoneManager] Demande accès microphone...', this.constraints);

      // 🔒 Un seul AudioContext partagé dans toute l’app
      const ctx = audioEngine.context;

      // getUserMedia selon les contraintes
      const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      this.stream = stream;

      Logger.info('[MicrophoneManager] Accès microphone accordé (contraintes complètes)');

      // IMPORTANT : créer la source DANS LE MÊME CONTEXTE que le reste
      this.source = new MediaStreamAudioSourceNode(ctx, { mediaStream: stream });

      Logger.info('[MicrophoneManager] Source créée', {
        contextSampleRate: ctx.sampleRate,
        trackSampleRateHint:
          stream.getAudioTracks()?.[0]?.getSettings?.()?.sampleRate || 'n/a'
      });

      return { stream: this.stream, source: this.source };
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.includes('different sample-rate')) {
        Logger.error(
          '[MicrophoneManager] Incompatibilité de fréquence entre AudioContexts. ' +
          'Assure-toi qu’un SEUL AudioContext est utilisé et évite de connecter des nœuds de contextes différents.'
        );
      } else {
        Logger.error('[MicrophoneManager] Erreur start', err);
      }
      throw err;
    }
  }

  connect(node) {
    if (this.source && node) {
      this.source.connect(node);
      Logger.info('[MicrophoneManager] Source connectée au graphe audio');
    }
  }

  disconnect() {
    try {
      if (this.source) this.source.disconnect();
    } catch (_) { /* noop */ }
  }

  stop() {
    this.disconnect();
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
    }
    this.stream = null;
    this.source = null;
    Logger.info('[MicrophoneManager] Micro arrêté et flux libéré');
  }
}

// ✅ Compatibilité : export par défaut ET export nommé
export default MicrophoneManager;
export { MicrophoneManager };
