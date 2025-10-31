// src/audio/services/RecordingService.js
import { Logger } from '../../logging/Logger.js';

export class RecordingService {
  #audioEngine;
  #eventBus;
  #microphoneManager;

  #recorder = null;
  #chunks = [];
  #startedAt = 0;

  #last = {
    blob: null,
    url: null,
    duration: 0,
    mime: ''
  };

  constructor(audioEngine, eventBus, microphoneManager) {
    this.#audioEngine = audioEngine;
    this.#eventBus = eventBus;
    this.#microphoneManager = microphoneManager;
    Logger.info('RecordingService', 'Service créé');
  }

  isRecording() {
    return this.#recorder && this.#recorder.state === 'recording';
  }

  getLastRecording() {
    return this.#last;
  }

  getLastUrl() {
    return this.#last.url;
  }

  #pickMime() {
    if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus';
      if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
    }
    return ''; // laisser choisir le navigateur
  }

  async start() {
    Logger.info('RecordingService', 'Démarrage enregistrement...');
    if (!this.#microphoneManager || !this.#microphoneManager.isActive()) {
      const err = new Error('Micro non actif');
      Logger.error('RecordingService', 'Erreur start', err);
      this.#eventBus?.emit('recording:error', { error: err });
      throw err;
    }
    if (this.isRecording()) {
      Logger.warn('RecordingService', 'Déjà en cours');
      return;
    }

    const stream = this.#microphoneManager.getStream();
    const mime = this.#pickMime();

    try {
      this.#chunks = [];
      this.#recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      this.#last.mime = mime;

      this.#recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.#chunks.push(e.data);
      };

      this.#recorder.onstart = () => {
        this.#startedAt = performance.now();
        this.#eventBus?.emit('recording:started', {});
        Logger.info('RecordingService', 'Enregistrement démarré');
      };

      this.#recorder.onstop = () => {
        const durationMs = Math.max(0, performance.now() - this.#startedAt);
        const blob = new Blob(this.#chunks, { type: this.#last.mime || 'audio/webm' });
        const url = URL.createObjectURL(blob);

        this.#last = {
          blob,
          url,
          duration: durationMs,
          mime: blob.type || this.#last.mime || 'audio/webm'
        };

        const sizeKb = (blob.size / 1024).toFixed(2);
        this.#eventBus?.emit('recording:stopped', {
          blob,
          url,
          duration: durationMs,
          size: `${sizeKb} KB`
        });
        Logger.info('RecordingService', 'Enregistrement arrêté ', {
          duration: `${(durationMs / 1000).toFixed(2)}s`,
          size: `${sizeKb} KB`
        });
      };

      this.#recorder.start(); // par défaut, bufferise et pousse des chunks
    } catch (err) {
      Logger.error('RecordingService', 'Erreur start', err);
      this.#eventBus?.emit('recording:error', { error: err });
      throw err;
    }
  }

  async stop() {
    Logger.info('RecordingService', 'Arrêt enregistrement...');
    if (!this.#recorder) return { data: null, duration: 0 };

    if (this.#recorder.state !== 'inactive') this.#recorder.stop();

    // attendre la fin du onstop
    await new Promise((resolve) => setTimeout(resolve, 0));

    return { data: this.#last, duration: this.#last.duration };
  }
}

export default RecordingService;
