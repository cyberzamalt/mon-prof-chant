/**
 * MicrophoneManager.js
 * TYPE: Manager - Microphone Access
 * 
 * Responsabilités:
 * - Gérer l'accès au microphone
 * - Demander les permissions utilisateur
 * - Créer le MediaStreamSource
 * - Gérer les erreurs de permission/device
 * - Fournir un stream audio utilisable
 * 
 * Dépendances: Logger, AudioEngine, AudioBus, ErrorHandler, CONFIG
 */

import { Logger } from '../../logging/Logger.js';
import { CONFIG } from '../../config.js';
import { errorHandler } from './ErrorHandler.js';

export class MicrophoneManager {
  #audioEngine = null;
  #eventBus = null;
  #stream = null;
  #sourceNode = null;
  #state = 'uninitialized'; // 'uninitialized' | 'requesting' | 'granted' | 'denied' | 'error'
  #deviceId = null;

  /**
   * Constructeur
   * @param {AudioEngine} audioEngine - Instance d'AudioEngine
   * @param {AudioBus} eventBus - Instance d'AudioBus (optionnel)
   */
  constructor(audioEngine, eventBus = null) {
    if (!audioEngine) throw new Error('[MicrophoneManager] AudioEngine required');
    this.#audioEngine = audioEngine;
    this.#eventBus = eventBus;
    Logger.info('MicrophoneManager', 'Initialized');
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // Accès micro
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * ALIAS de compatibilité : certaines pages appellent requestPermission()
   * → on redirige vers requestAccess()
   * @param {object} constraints
   * @returns {Promise<boolean>}
   */
  async requestPermission(constraints = {}) {
    Logger.debug('MicrophoneManager', 'requestPermission() alias → requestAccess()');
    return this.requestAccess(constraints);
  }

  /**
   * Demande l'accès au microphone (doit être appelé suite à un geste utilisateur)
   * @param {object} constraints - Contraintes audio additionnelles (ex: { deviceId: { exact: "…" } })
   * @returns {Promise<boolean>} true si accès accordé
   */
  async requestAccess(constraints = {}) {
    try {
      Logger.info('MicrophoneManager', 'Requesting microphone access...');

      // Déjà accordé ?
      if (this.#state === 'granted' && this.#stream) {
        Logger.debug('MicrophoneManager', 'Already granted');
        return true;
      }

      // Support ?
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      this.#state = 'requesting';
      this.#eventBus?.emit('microphone:requesting');

      // Contraintes par défaut optimisées voix
      const defaultConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: CONFIG?.audio?.sampleRate ?? 48000, // indicatif, ignoré par certains navigateurs
          channelCount: 1,
        },
        video: false,
      };

      // Merge (les clés passées sont fusionnées dans audio)
      const finalConstraints = {
        ...defaultConstraints,
        audio: {
          ...defaultConstraints.audio,
          ...constraints,
        },
      };

      Logger.debug('MicrophoneManager', 'Constraints', finalConstraints);

      // Demande d’accès
      this.#stream = await navigator.mediaDevices.getUserMedia(finalConstraints);

      // Infos piste
      const audioTrack = this.#stream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings?.() ?? {};
        this.#deviceId = settings.deviceId ?? null;
        Logger.info('MicrophoneManager', 'Microphone track', {
          label: audioTrack.label,
          deviceId: this.#deviceId,
          settings,
        });
      } else {
        Logger.warn('MicrophoneManager', 'No audio track returned by getUserMedia');
      }

      this.#state = 'granted';
      Logger.info('MicrophoneManager', 'Microphone access granted');

      this.#eventBus?.emit('microphone:granted', {
        deviceId: this.#deviceId,
        stream: this.#stream,
      });

      return true;
    } catch (error) {
      this.#state = 'denied';

      Logger.error('MicrophoneManager', 'Microphone access failed', {
        error: error?.message,
        name: error?.name,
      });

      const errorType = this.#analyzeError(error);

      this.#eventBus?.emit('microphone:denied', {
        error: errorType,
        originalError: error,
      });

      errorHandler.handle(error, 'MicrophoneManager.requestAccess', true);
      return false;
    }
  }

  /**
   * Analyse le type d'erreur microphone
   */
  #analyzeError(error) {
    const name = error?.name?.toLowerCase?.() || '';
    const message = error?.message?.toLowerCase?.() || '';

    if (name.includes('notallowed') || name.includes('permission')) return 'permission_denied';
    if (name.includes('notfound') || message.includes('requested device not found')) return 'device_not_found';
    if (name.includes('notreadable') || name.includes('aborterror')) return 'device_in_use';
    if (name.includes('overconstrained')) return 'constraints_not_satisfied';
    return 'unknown';
  }

  /**
   * Crée un MediaStreamSource à partir du stream
   * @returns {MediaStreamAudioSourceNode|null}
   */
  createSource() {
    try {
      if (!this.#stream) {
        Logger.warn('MicrophoneManager', 'No stream available, call requestAccess() first');
        return null;
      }

      const audioContext = this.#audioEngine.getContext();
      if (!audioContext) {
        Logger.error('MicrophoneManager', 'No AudioContext available');
        return null;
      }

      this.#sourceNode = audioContext.createMediaStreamSource(this.#stream);
      Logger.info('MicrophoneManager', 'MediaStreamSource created');

      this.#eventBus?.emit('microphone:source_created', {
        sourceNode: this.#sourceNode,
      });

      return this.#sourceNode;
    } catch (error) {
      Logger.error('MicrophoneManager', 'Failed to create source', error);
      errorHandler.handle(error, 'MicrophoneManager.createSource', false);
      return null;
    }
  }

  /**
   * Arrête le microphone
   */
  stop() {
    try {
      Logger.info('MicrophoneManager', 'Stopping microphone...');

      if (this.#stream) {
        this.#stream.getTracks().forEach(track => {
          try {
            track.stop();
            Logger.debug('MicrophoneManager', 'Track stopped', { label: track.label });
          } catch (e) {
            Logger.debug('MicrophoneManager', 'Track stop error (ignored)', { error: e?.message });
          }
        });
      }

      if (this.#sourceNode) {
        try { this.#sourceNode.disconnect(); } catch (_) {}
        this.#sourceNode = null;
      }

      this.#stream = null;
      this.#state = 'uninitialized';

      Logger.info('MicrophoneManager', 'Microphone stopped');
      this.#eventBus?.emit('microphone:stopped');
    } catch (error) {
      Logger.error('MicrophoneManager', 'Stop failed', error);
    }
  }

  /**
   * Liste les devices audio disponibles
   * @returns {Promise<Array>} Liste des devices audioinput
   */
  async listDevices() {
    try {
      Logger.debug('MicrophoneManager', 'Listing audio devices...');

      if (!navigator.mediaDevices?.enumerateDevices) {
        Logger.warn('MicrophoneManager', 'enumerateDevices not supported');
        return [];
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');

      Logger.info('MicrophoneManager', 'Audio devices found', {
        count: audioInputs.length,
        devices: audioInputs.map(d => ({
          deviceId: d.deviceId,
          label: d.label || 'Unknown',
        })),
      });

      return audioInputs;
    } catch (error) {
      Logger.error('MicrophoneManager', 'List devices failed', error);
      return [];
    }
  }

  /**
   * Change de device (si plusieurs micros)
   * @param {string} deviceId - ID du device
   * @returns {Promise<boolean>}
   */
  async switchDevice(deviceId) {
    try {
      Logger.info('MicrophoneManager', 'Switching device', { deviceId });

      this.stop(); // arrête l’existant proprement

      const success = await this.requestAccess({ deviceId: { exact: deviceId } });
      if (success) Logger.info('MicrophoneManager', 'Device switched successfully');
      return success;
    } catch (error) {
      Logger.error('MicrophoneManager', 'Switch device failed', error);
      return false;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // GETTERS
  // ───────────────────────────────────────────────────────────────────────────────

  getState() { return this.#state; }

  isGranted() { return this.#state === 'granted' && this.#stream !== null; }

  getStream() { return this.#stream; }

  getSourceNode() { return this.#sourceNode; }

  getDeviceId() { return this.#deviceId; }

  getTrackInfo() {
    if (!this.#stream) return null;
    const track = this.#stream.getAudioTracks()[0];
    if (!track) return null;

    return {
      label: track.label,
      deviceId: track.getSettings?.().deviceId,
      settings: track.getSettings?.(),
      capabilities: track.getCapabilities ? track.getCapabilities() : null,
      state: track.readyState,
      enabled: track.enabled,
      muted: track.muted,
    };
    }

  /**
   * Vérifie le statut des permissions
   * @returns {Promise<string>} 'granted' | 'denied' | 'prompt' | 'unknown'
   */
  async checkPermissionStatus() {
    try {
      if (!navigator.permissions?.query) {
        Logger.debug('MicrophoneManager', 'Permissions API not supported');
        return 'unknown';
      }
      const result = await navigator.permissions.query({ name: 'microphone' });
      Logger.debug('MicrophoneManager', 'Permission status', { state: result.state });
      return result.state; // 'granted' | 'denied' | 'prompt'
    } catch (error) {
      Logger.debug('MicrophoneManager', 'Check permission failed', error);
      return 'unknown';
    }
  }

  /**
   * Active/désactive le microphone (mute/unmute)
   */
  setEnabled(enabled) {
    try {
      if (!this.#stream) {
        Logger.warn('MicrophoneManager', 'No stream to enable/disable');
        return false;
      }
      const track = this.#stream.getAudioTracks()[0];
      if (!track) {
        Logger.warn('MicrophoneManager', 'No audio track found');
        return false;
      }
      track.enabled = enabled;
      Logger.info('MicrophoneManager', enabled ? 'Microphone enabled' : 'Microphone disabled');
      this.#eventBus?.emit('microphone:' + (enabled ? 'enabled' : 'disabled'));
      return true;
    } catch (error) {
      Logger.error('MicrophoneManager', 'Set enabled failed', error);
      return false;
    }
  }

  /**
   * Récupère le niveau audio actuel (volume)
   * @returns {number} Niveau 0-1 (stub, nécessite AnalyserNode)
   */
  getAudioLevel() { return 0; }

  /**
   * Affiche un rapport dans la console
   */
  logStatus() {
    Logger.group('MicrophoneManager Status', () => {
      Logger.info('MicrophoneManager', 'State', this.#state);
      Logger.info('MicrophoneManager', 'Has Stream', !!this.#stream);
      Logger.info('MicrophoneManager', 'Has Source Node', !!this.#sourceNode);
      Logger.info('MicrophoneManager', 'Device ID', this.#deviceId || 'N/A');
      const trackInfo = this.getTrackInfo();
      if (trackInfo) Logger.info('MicrophoneManager', 'Track Info', trackInfo);
    });
  }

  /**
   * Détruit le manager (cleanup)
   */
  destroy() {
    Logger.info('MicrophoneManager', 'Destroying...');
    this.stop();
    this.#audioEngine = null;
    this.#eventBus = null;
    Logger.info('MicrophoneManager', 'Destroyed');
  }
}

// Export par défaut + export nommé (flexible pour les imports)
export default MicrophoneManager;
