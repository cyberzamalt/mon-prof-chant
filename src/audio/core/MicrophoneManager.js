/**
 * MicrophoneManager.js
 * TYPE: Manager - Microphone Access and Stream Management
 * 
 * Responsabilités:
 * - Gestion permissions micro (getUserMedia)
 * - Gestion du stream audio
 * - Gestion des erreurs permissions
 * - Fallback et recovery
 * 
 * Dépendances: Logger, AudioEngine, ErrorHandler
 * Utilisé par: RecorderService, PitchDetector
 */

import { Logger } from '../logging/Logger.js';
import { AudioEngine } from './AudioEngine.js';
import { ErrorHandler } from './ErrorHandler.js';

class MicrophoneManager {
  #stream = null;
  #source = null;
  #engine = null;
  #errorHandler = null;
  #constraints = {
    audio: {
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
    },
    video: false,
  };
  #state = 'idle';

  constructor(errorHandler = null) {
    try {
      this.#engine = AudioEngine.getInstance();
      this.#errorHandler = errorHandler;
      Logger.info('MicrophoneManager', 'Initialized');
    } catch (err) {
      Logger.error('MicrophoneManager', 'Constructor failed', err);
    }
  }

  /**
   * Demander l'accès au micro
   */
  async requestAccess() {
    try {
      Logger.info('MicrophoneManager', 'Requesting microphone access');
      this.#state = 'requesting';

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }

      this.#stream = await navigator.mediaDevices.getUserMedia(this.#constraints);
      
      Logger.info('MicrophoneManager', 'Microphone access granted', {
        streamId: this.#stream.id,
        tracks: this.#stream.getTracks().length,
      });

      this.#state = 'granted';
      return true;
    } catch (err) {
      Logger.error('MicrophoneManager', 'Microphone access denied', err);
      this.#state = 'denied';

      if (this.#errorHandler) {
        this.#errorHandler.captureError('MicrophoneAccess', err);
      }

      return false;
    }
  }

  /**
   * Vérifier si accès disponible
   */
  isGranted() {
    return this.#state === 'granted' && this.#stream !== null;
  }

  /**
   * Obtenir le stream
   */
  getStream() {
    try {
      if (!this.isGranted()) {
        throw new Error('Microphone not granted');
      }
      return this.#stream;
    } catch (err) {
      Logger.error('MicrophoneManager', 'getStream failed', err);
      return null;
    }
  }

  /**
   * Créer une source audio depuis le stream
   */
  createSource() {
    try {
      if (!this.isGranted()) {
        throw new Error('Microphone not granted');
      }

      if (!this.#engine || !this.#engine.isInitialized()) {
        throw new Error('AudioEngine not initialized');
      }

      const audioContext = this.#engine.getContext();
      this.#source = audioContext.createMediaStreamSource(this.#stream);

      Logger.info('MicrophoneManager', 'Audio source created');
      return this.#source;
    } catch (err) {
      Logger.error('MicrophoneManager', 'createSource failed', err);
      return null;
    }
  }

  /**
   * Obtenir la source audio
   */
  getSource() {
    try {
      if (!this.#source) {
        return this.createSource();
      }
      return this.#source;
    } catch (err) {
      Logger.error('MicrophoneManager', 'getSource failed', err);
      return null;
    }
  }

  /**
   * Arrêter le stream
   */
  stop() {
    try {
      if (this.#stream) {
        this.#stream.getTracks().forEach(track => track.stop());
        Logger.info('MicrophoneManager', 'Stream stopped');
        this.#stream = null;
        this.#source = null;
        this.#state = 'stopped';
      }
    } catch (err) {
      Logger.error('MicrophoneManager', 'stop failed', err);
    }
  }

  /**
   * Obtenir les dispositifs audio disponibles
   */
  async getAudioDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('enumerateDevices not supported');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');

      Logger.info('MicrophoneManager', 'Audio devices enumerated', {
        count: audioInputs.length,
      });

      return audioInputs;
    } catch (err) {
      Logger.error('MicrophoneManager', 'getAudioDevices failed', err);
      return [];
    }
  }

  /**
   * Changer de dispositif audio
   */
  async selectDevice(deviceId) {
    try {
      Logger.info('MicrophoneManager', 'Selecting device', { deviceId });

      this.stop();

      this.#constraints.audio.deviceId = deviceId;
      return await this.requestAccess();
    } catch (err) {
      Logger.error('MicrophoneManager', 'selectDevice failed', err);
      return false;
    }
  }

  /**
   * Obtenir le niveau du micro (amplitude actuelle)
   */
  getMicrophoneLevel() {
    try {
      if (!this.#source) {
        return 0;
      }

      const audioContext = this.#engine.getContext();
      const analyser = audioContext.createAnalyser();
      this.#source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      return Math.round((average / 255) * 100);
    } catch (err) {
      Logger.debug('MicrophoneManager', 'getMicrophoneLevel failed', err);
      return 0;
    }
  }

  /**
   * Obtenir l'état
   */
  getState() {
    return {
      state: this.#state,
      isGranted: this.isGranted(),
      hasStream: this.#stream !== null,
      hasSource: this.#source !== null,
    };
  }

  /**
   * Configurer les contraintes
   */
  setConstraints(constraints) {
    try {
      this.#constraints = { ...this.#constraints, ...constraints };
      Logger.info('MicrophoneManager', 'Constraints updated', this.#constraints);
    } catch (err) {
      Logger.error('MicrophoneManager', 'setConstraints failed', err);
    }
  }

  /**
   * Obtenir les contraintes actuelles
   */
  getConstraints() {
    return { ...this.#constraints };
  }
}

export { MicrophoneManager };
export default MicrophoneManager;
