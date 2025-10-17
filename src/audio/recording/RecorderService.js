/**
 * RecorderService.js
 * TYPE: Service - Audio Recording Management
 * 
 * Responsabilités:
 * - Gestion MediaRecorder
 * - Enregistrement WebM/Opus
 * - Gestion chunks et blob
 * - Événements enregistrement
 * 
 * Dépendances: Logger, AudioEngine, MicrophoneManager, AudioBus
 * Utilisé par: app.js
 */

import { Logger } from '../logging/Logger.js';
import { AudioEngine } from '../audio/core/AudioEngine.js';
import { MicrophoneManager } from '../audio/core/MicrophoneManager.js';

class RecorderService {
  #recorder = null;
  #chunks = [];
  #listeners = new Map();
  #tickInterval = null;
  #startTime = 0;
  #state = 'idle';
  #mimeType = 'audio/webm;codecs=opus';
  #audioBits = 128000;

  constructor() {
    try {
      Logger.info('RecorderService', 'Initialized');
    } catch (err) {
      Logger.error('RecorderService', 'Constructor failed', err);
    }
  }

  /**
   * Démarrer l'enregistrement
   */
  async start(stream = null) {
    try {
      Logger.info('RecorderService', 'Start requested');

      if (this.#state === 'recording') {
        Logger.warn('RecorderService', 'Already recording');
        return false;
      }

      if (!stream) {
        throw new Error('Stream required');
      }

      // Déterminer le mime type supporté
      const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      this.#mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || supportedTypes[0];

      this.#chunks = [];
      this.#recorder = new MediaRecorder(stream, {
        mimeType: this.#mimeType,
        audioBitsPerSecond: this.#audioBits,
      });

      this.#recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.#chunks.push(e.data);
        }
      };

      this.#recorder.onstop = () => {
        this.#onRecorderStop();
      };

      this.#recorder.onerror = (e) => {
        Logger.error('RecorderService', 'Recorder error', e.error);
        this.#emit('error', { error: e.error });
      };

      this.#recorder.start(250); // timeslice
      this.#startTime = performance.now();
      this.#state = 'recording';

      Logger.info('RecorderService', 'Recording started', { mimeType: this.#mimeType });
      this.#emit('started', {});
      this.#startTimer();

      return true;
    } catch (err) {
      Logger.error('RecorderService', 'start failed', err);
      this.#state = 'error';
      this.#emit('error', { error: err.message });
      return false;
    }
  }

  /**
   * Arrêter l'enregistrement
   */
  async stop() {
    try {
      Logger.info('RecorderService', 'Stop requested');

      if (this.#state !== 'recording') {
        Logger.warn('RecorderService', 'Not recording');
        return null;
      }

      if (this.#recorder && this.#recorder.state === 'recording') {
        this.#recorder.stop();
      }

      clearInterval(this.#tickInterval);
      this.#state = 'idle';

      return this.#createBlob();
    } catch (err) {
      Logger.error('RecorderService', 'stop failed', err);
      this.#state = 'error';
      return null;
    }
  }

  /**
   * Gérer l'arrêt du recorder
   */
  #onRecorderStop() {
    try {
      const blob = this.#createBlob();
      Logger.info('RecorderService', 'Recording stopped', {
        size: blob.size,
        type: blob.type,
        chunks: this.#chunks.length,
      });
      this.#emit('stopped', { blob });
    } catch (err) {
      Logger.error('RecorderService', 'onRecorderStop failed', err);
    }
  }

  /**
   * Créer un blob depuis les chunks
   */
  #createBlob() {
    try {
      const blob = new Blob(this.#chunks, { type: this.#mimeType });
      return blob;
    } catch (err) {
      Logger.error('RecorderService', 'createBlob failed', err);
      return new Blob([], { type: this.#mimeType });
    }
  }

  /**
   * Timer pour les ticks
   */
  #startTimer() {
    try {
      this.#tickInterval = setInterval(() => {
        if (this.#state === 'recording') {
          const elapsed = Math.floor((performance.now() - this.#startTime) / 1000);
          this.#emit('tick', { seconds: elapsed });
        }
      }, 250);
    } catch (err) {
      Logger.error('RecorderService', 'startTimer failed', err);
    }
  }

  /**
   * Vérifier si enregistrement actif
   */
  isRecording() {
    return this.#state === 'recording';
  }

  /**
   * Obtenir le blob actuel
   */
  getBlob() {
    try {
      return this.#createBlob();
    } catch (err) {
      Logger.error('RecorderService', 'getBlob failed', err);
      return null;
    }
  }

  /**
   * Obtenir l'état
   */
  getState() {
    return {
      state: this.#state,
      isRecording: this.isRecording(),
      chunksCount: this.#chunks.length,
      mimeType: this.#mimeType,
    };
  }

  /**
   * Écouter les événements
   */
  on(event, callback) {
    try {
      if (!this.#listeners.has(event)) {
        this.#listeners.set(event, new Set());
      }
      this.#listeners.get(event).add(callback);
      return () => this.#listeners.get(event).delete(callback);
    } catch (err) {
      Logger.error('RecorderService', 'on failed', err);
      return () => {};
    }
  }

  /**
   * Émettre un événement
   */
  #emit(event, data) {
    try {
      const listeners = this.#listeners.get(event);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            Logger.error('RecorderService', `Listener failed for ${event}`, err);
          }
        });
      }
    } catch (err) {
      Logger.error('RecorderService', `emit ${event} failed`, err);
    }
  }
}

export { RecorderService };
export default RecorderService;
