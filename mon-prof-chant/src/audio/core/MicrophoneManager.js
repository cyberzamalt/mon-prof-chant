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
    if (!audioEngine) {
      throw new Error('[MicrophoneManager] AudioEngine required');
    }

    this.#audioEngine = audioEngine;
    this.#eventBus = eventBus;

    Logger.info('MicrophoneManager', 'Initialized');
  }

  /**
   * Demande l'accès au microphone
   * DOIT être appelé depuis un geste utilisateur
   * @param {object} constraints - Contraintes getUserMedia (optionnel)
   * @returns {Promise<boolean>} true si accès accordé
   */
  async requestAccess(constraints = {}) {
    try {
      Logger.info('MicrophoneManager', 'Requesting microphone access...');

      // Vérifier si déjà accordé
      if (this.#state === 'granted' && this.#stream) {
        Logger.debug('MicrophoneManager', 'Already granted');
        return true;
      }

      // Vérifier support getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      this.#state = 'requesting';

      // Émettre événement
      this.#eventBus?.emit('microphone:requesting');

      // Contraintes par défaut optimisées pour voix
      const defaultConstraints = {
        audio: {
          echoCancellation: true,   // Annulation écho
          noiseSuppression: true,   // Réduction bruit
          autoGainControl: true,    // Gain automatique
          sampleRate: CONFIG.audio.sampleRate,
          channelCount: 1,          // Mono (suffisant pour voix)
        },
        video: false,
      };

      // Merger avec contraintes custom
      const finalConstraints = {
        ...defaultConstraints,
        audio: {
          ...defaultConstraints.audio,
          ...constraints,
        },
      };

      Logger.debug('MicrophoneManager', 'Constraints', finalConstraints);

      // Demander accès
      this.#stream = await navigator.mediaDevices.getUserMedia(finalConstraints);

      // Récupérer device ID
      const audioTrack = this.#stream.getAudioTracks()[0];
      if (audioTrack) {
        this.#deviceId = audioTrack.getSettings().deviceId;
        
        Logger.info('MicrophoneManager', 'Microphone track', {
          label: audioTrack.label,
          deviceId: this.#deviceId,
          settings: audioTrack.getSettings(),
        });
      }

      this.#state = 'granted';

      Logger.info('MicrophoneManager', 'Microphone access granted');

      // Émettre événement
      this.#eventBus?.emit('microphone:granted', {
        deviceId: this.#deviceId,
        stream: this.#stream,
      });

      return true;

    } catch (error) {
      this.#state = 'denied';

      Logger.error('MicrophoneManager', 'Microphone access failed', {
        error: error.message,
        name: error.name,
      });

      // Analyser le type d'erreur
      const errorType = this.#analyzeError(error);

      // Émettre événement
      this.#eventBus?.emit('microphone:denied', {
        error: errorType,
        originalError: error,
      });

      // Afficher message utilisateur
      errorHandler.handle(error, 'MicrophoneManager.requestAccess', true);

      return false;
    }
  }

  /**
   * Analyse le type d'erreur microphone
   */
  #analyzeError(error) {
    const name = error.name?.toLowerCase() || '';
    const message = error.message?.toLowerCase() || '';

    if (name.includes('notallowed') || name.includes('permission')) {
      return 'permission_denied';
    }

    if (name.includes('notfound') || message.includes('requested device not found')) {
      return 'device_not_found';
    }

    if (name.includes('notreadable') || name.includes('aborterror')) {
      return 'device_in_use';
    }

    if (name.includes('overconstrained')) {
      return 'constraints_not_satisfied';
    }

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

      // Créer le source node
      this.#sourceNode = audioContext.createMediaStreamSource(this.#stream);

      Logger.info('MicrophoneManager', 'MediaStreamSource created');

      // Émettre événement
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

      // Arrêter toutes les tracks
      if (this.#stream) {
        this.#stream.getTracks().forEach(track => {
          track.stop();
          Logger.debug('MicrophoneManager', 'Track stopped', { 
            label: track.label,
          });
        });
      }

      // Déconnecter le source node
      if (this.#sourceNode) {
        this.#sourceNode.disconnect();
        this.#sourceNode = null;
      }

      this.#stream = null;
      this.#state = 'uninitialized';

      Logger.info('MicrophoneManager', 'Microphone stopped');

      // Émettre événement
      this.#eventBus?.emit('microphone:stopped');

    } catch (error) {
      Logger.error('MicrophoneManager', 'Stop failed', error);
    }
  }

  /**
   * Liste les devices audio disponibles
   * @returns {Promise<Array>} Liste des devices
   */
  async listDevices() {
    try {
      Logger.debug('MicrophoneManager', 'Listing audio devices...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        Logger.warn('MicrophoneManager', 'enumerateDevices not supported');
        return [];
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');

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

      // Arrêter le stream actuel
      this.stop();

      // Demander nouveau stream avec le device spécifique
      const success = await this.requestAccess({ deviceId: { exact: deviceId } });

      if (success) {
        Logger.info('MicrophoneManager', 'Device switched successfully');
      }

      return success;

    } catch (error) {
      Logger.error('MicrophoneManager', 'Switch device failed', error);
      return false;
    }
  }

  // ========================================
  // GETTERS
  // ========================================

  /**
   * Récupère l'état actuel
   */
  getState() {
    return this.#state;
  }

  /**
   * Vérifie si l'accès est accordé
   */
  isGranted() {
    return this.#state === 'granted' && this.#stream !== null;
  }

  /**
   * Récupère le stream
   */
  getStream() {
    return this.#stream;
  }

  /**
   * Récupère le source node
   */
  getSourceNode() {
    return this.#sourceNode;
  }

  /**
   * Récupère le device ID actuel
   */
  getDeviceId() {
    return this.#deviceId;
  }

  /**
   * Récupère les infos du track audio
   */
  getTrackInfo() {
    if (!this.#stream) return null;

    const track = this.#stream.getAudioTracks()[0];
    if (!track) return null;

    return {
      label: track.label,
      deviceId: track.getSettings().deviceId,
      settings: track.getSettings(),
      capabilities: track.getCapabilities ? track.getCapabilities() : null,
      state: track.readyState,
      enabled: track.enabled,
      muted: track.muted,
    };
  }

  /**
   * Vérifie le statut des permissions
   * @returns {Promise<string>} 'granted' | 'denied' | 'prompt'
   */
  async checkPermissionStatus() {
    try {
      if (!navigator.permissions || !navigator.permissions.query) {
        Logger.debug('MicrophoneManager', 'Permissions API not supported');
        return 'unknown';
      }

      const result = await navigator.permissions.query({ name: 'microphone' });
      
      Logger.debug('MicrophoneManager', 'Permission status', { 
        state: result.state,
      });

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

      // Émettre événement
      this.#eventBus?.emit('microphone:' + (enabled ? 'enabled' : 'disabled'));

      return true;

    } catch (error) {
      Logger.error('MicrophoneManager', 'Set enabled failed', error);
      return false;
    }
  }

  /**
   * Récupère le niveau audio actuel (volume)
   * @returns {number} Niveau 0-1
   */
  getAudioLevel() {
    // Cette méthode nécessiterait un AnalyserNode
    // Pour l'instant, retourner 0
    // TODO: Implémenter avec AnalyserNode dans un prochain module
    return 0;
  }

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
      if (trackInfo) {
        Logger.info('MicrophoneManager', 'Track Info', trackInfo);
      }
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

// Export par défaut
export default MicrophoneManager;