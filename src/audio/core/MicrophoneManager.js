// src/audio/core/MicrophoneManager.js
import { Logger } from '../../logging/Logger.js';
import { audioEngine } from './AudioEngine.js';

export class MicrophoneManager {
  #constraints;
  #stream = null;
  #source = null;

  constructor(options = {}) {
    this.#constraints = options.constraints || {
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    };
  }

  isActive() { return !!(this.#stream && this.#source); }
  getSource() { return this.#source; }
  getStream() { return this.#stream; }

  async start() {
    const ctx = audioEngine.context || await audioEngine.init();

    Logger.info('[MicrophoneManager] Demande accès microphone...', this.#constraints);
    const stream = await navigator.mediaDevices.getUserMedia(this.#constraints);
    Logger.info('[MicrophoneManager] Accès microphone accordé');

    // Si le micro tourne à un autre sample-rate, on recrée le contexte pour éviter le mismatch.
    const trackRate = stream.getAudioTracks()?.[0]?.getSettings?.()?.sampleRate;
    if (trackRate && ctx.sampleRate !== trackRate) {
      console.warn('La connexion d’AudioNodes à partir d’AudioContexts avec une fréquence d’échantillonnage différente n’est actuellement pas prise en charge.');
      await audioEngine.reinit(trackRate);
    }

    const useCtx = audioEngine.context;
    this.#source = new MediaStreamAudioSourceNode(useCtx, { mediaStream: stream });
    this.#stream = stream;

    Logger.info('[MicrophoneManager] Source créée', {
      contextSampleRate: useCtx.sampleRate,
      micSampleRate: trackRate || 'n/a'
    });

    return { source: this.#source, stream: this.#stream };
  }

  stop() {
    try { this.#source?.disconnect(); } catch (_) {}
    this.#source = null;

    if (this.#stream) {
      for (const t of this.#stream.getTracks()) { try { t.stop(); } catch (_) {} }
    }
    this.#stream = null;
    Logger.info('[MicrophoneManager] Micro arrêté');
  }
}

export default MicrophoneManager;
