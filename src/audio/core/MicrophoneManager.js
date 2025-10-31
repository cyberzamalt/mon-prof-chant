/**
 * MicrophoneManager.js
 * Gestion de l'accès microphone et du stream audio
 * 
 * Responsabilités:
 * - Demander permission microphone
 * - Créer MediaStreamSource
 * - Gérer les contraintes audio (sampleRate, echoCancellation, etc.)
 * - Fournir fallbacks pour différents navigateurs
 * - Gérer l'arrêt propre du stream
 * 
 * Dépendances:
 * - AudioEngine (AudioContext)
 * - EventBus (événements)
 * - Logger
 */

import { Logger } from '../../logging/Logger.js';

export class MicrophoneManager {
  #audioEngine = null;
  #eventBus = null;
  #stream = null;
  #source = null;
  #isActive = false;
  #constraints = null;

  /**
   * Constructeur
   * @param {AudioEngine} audioEngine - Instance AudioEngine
   * @param {EventBus} eventBus - Instance EventBus
   * @param {Object} constraints - Contraintes audio personnalisées
   */
  constructor(audioEngine, eventBus, constraints = {}) {
    try {
      if (!audioEngine) {
        throw new Error('[MicrophoneManager] audioEngine requis');
      }
      if (!eventBus) {
        throw new Error('[MicrophoneManager] eventBus requis');
      }

      this.#audioEngine = audioEngine;
      this.#eventBus = eventBus;

      // Contraintes par défaut optimisées pour l'analyse vocale
      this.#constraints = {
        audio: {
          echoCancellation: true,    // Annulation d'écho
          noiseSuppression: true,    // Réduction de bruit
          autoGainControl: false,    // Pas d'AGC (important pour analyse pitch)
          sampleRate: 48000,         // Haute qualité
          channelCount: 1,           // Mono suffisant
          latency: 0,                // Latence minimale
          ...constraints.audio
        }
      };

      Logger.info('MicrophoneManager', 'Initialisé avec contraintes', this.#constraints);

    } catch (err) {
      Logger.error('MicrophoneManager', 'Erreur constructeur', err);
      throw err;
    }
  }

  /**
   * Démarrer l'accès microphone
   * @returns {Promise<MediaStreamAudioSourceNode>} Source audio connectée
   */
  async start() {
    try {
      Logger.info('MicrophoneManager', 'Demande accès microphone...');

      // Vérifier si déjà actif
      if (this.#isActive) {
        Logger.warn('MicrophoneManager', 'Microphone déjà actif');
        return this.#source;
      }

      // Vérifier support getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia non supporté par ce navigateur');
      }

      // Demander permission et obtenir stream
      this.#stream = await this.#requestMicrophoneAccess();

      // Créer source audio
      this.#source = await this.#createAudioSource();

      // Marquer comme actif
      this.#isActive = true;

      // Émettre événement succès
      this.#eventBus.emit('microphone:started', {
        stream: this.#stream,
        source: this.#source,
        constraints: this.#constraints
      });

      Logger.info('MicrophoneManager', 'Microphone démarré avec succès');

      return this.#source;

    } catch (err) {
      Logger.error('MicrophoneManager', 'Erreur start', err);
      
      // Émettre événement erreur
      this.#eventBus.emit('microphone:error', {
        error: err.message,
        code: err.name
      });

      throw err;
    }
  }

  /**
   * Demander accès microphone avec fallbacks
   * @private
   * @returns {Promise<MediaStream>}
   */
  async #requestMicrophoneAccess() {
    try {
      // Tentative 1: Avec toutes les contraintes
      try {
        Logger.debug('MicrophoneManager', 'Tentative avec contraintes complètes');
        const stream = await navigator.mediaDevices.getUserMedia(this.#constraints);
        Logger.info('MicrophoneManager', 'Accès microphone accordé (contraintes complètes)');
        return stream;
      } catch (err) {
        Logger.warn('MicrophoneManager', 'Échec avec contraintes complètes, fallback...', err.message);
      }

      // Tentative 2: Contraintes simplifiées (sans sampleRate)
      try {
        Logger.debug('MicrophoneManager', 'Tentative avec contraintes simplifiées');
        const simplifiedConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(simplifiedConstraints);
        Logger.info('MicrophoneManager', 'Accès microphone accordé (contraintes simplifiées)');
        return stream;
      } catch (err) {
        Logger.warn('MicrophoneManager', 'Échec avec contraintes simplifiées, fallback...', err.message);
      }

      // Tentative 3: Contraintes minimales
      try {
        Logger.debug('MicrophoneManager', 'Tentative avec contraintes minimales');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        Logger.info('MicrophoneManager', 'Accès microphone accordé (contraintes minimales)');
        return stream;
      } catch (err) {
        Logger.error('MicrophoneManager', 'Toutes les tentatives ont échoué', err);
        throw new Error('Impossible d\'accéder au microphone. Vérifiez les permissions.');
      }

    } catch (err) {
      Logger.error('MicrophoneManager', 'Erreur requestMicrophoneAccess', err);
      throw err;
    }
  }

  /**
   * Créer la source audio depuis le stream
   * @private
   * @returns {Promise<MediaStreamAudioSourceNode>}
   */
  async #createAudioSource() {
    try {
      if (!this.#stream) {
        throw new Error('Aucun stream disponible');
      }

      // Obtenir le contexte audio
      const audioContext = this.#audioEngine.getContext();
      if (!audioContext) {
        throw new Error('AudioContext non disponible');
      }

      // S'assurer que le contexte est démarré
      if (audioContext.state === 'suspended') {
        Logger.debug('MicrophoneManager', 'Reprise du contexte audio...');
        await audioContext.resume();
      }

      // Créer la source
      const source = audioContext.createMediaStreamSource(this.#stream);

      // Logs de diagnostic
      const track = this.#stream.getAudioTracks()[0];
      if (track) {
        const settings = track.getSettings();
        Logger.info('MicrophoneManager', 'Paramètres audio effectifs', {
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl
        });
      }

      return source;

    } catch (err) {
      Logger.error('MicrophoneManager', 'Erreur createAudioSource', err);
      throw err;
    }
  }

  /**
   * Arrêter le microphone
   */
  stop() {
    try {
      Logger.info('MicrophoneManager', 'Arrêt du microphone...');

      // Déconnecter la source
      if (this.#source) {
        try {
          this.#source.disconnect();
          Logger.debug('MicrophoneManager', 'Source déconnectée');
        } catch (err) {
          Logger.warn('MicrophoneManager', 'Erreur déconnexion source', err);
        }
        this.#source = null;
      }

      // Arrêter tous les tracks du stream
      if (this.#stream) {
        this.#stream.getTracks().forEach(track => {
          try {
            track.stop();
            Logger.debug('MicrophoneManager', `Track arrêté: ${track.kind}`);
          } catch (err) {
            Logger.warn('MicrophoneManager', 'Erreur arrêt track', err);
          }
        });
        this.#stream = null;
      }

      // Marquer comme inactif
      this.#isActive = false;

      // Émettre événement
      this.#eventBus.emit('microphone:stopped', {
        timestamp: Date.now()
      });

      Logger.info('MicrophoneManager', 'Microphone arrêté');

    } catch (err) {
      Logger.error('MicrophoneManager', 'Erreur stop', err);
    }
  }

  /**
   * Obtenir le stream actuel
   * @returns {MediaStream|null}
   */
  getStream() {
    return this.#stream;
  }

  /**
   * Obtenir la source audio
   * @returns {MediaStreamAudioSourceNode|null}
   */
  getSource() {
    return this.#source;
  }

  /**
   * Vérifier si le microphone est actif
   * @returns {boolean}
   */
  isActive() {
    return this.#isActive;
  }

  /**
   * Obtenir les capacités du microphone
   * @returns {Promise<Object>} Capacités supportées
   */
  async getCapabilities() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getSupportedConstraints) {
        Logger.warn('MicrophoneManager', 'getSupportedConstraints non supporté');
        return {};
      }

      const supported = navigator.mediaDevices.getSupportedConstraints();
      Logger.info('MicrophoneManager', 'Contraintes supportées', supported);
      
      return supported;

    } catch (err) {
      Logger.error('MicrophoneManager', 'Erreur getCapabilities', err);
      return {};
    }
  }

  /**
   * Changer les contraintes audio (nécessite redémarrage)
   * @param {Object} newConstraints - Nouvelles contraintes
   */
  async updateConstraints(newConstraints) {
    try {
      Logger.info('MicrophoneManager', 'Mise à jour contraintes', newConstraints);

      const wasActive = this.#isActive;

      // Arrêter si actif
      if (wasActive) {
        this.stop();
      }

      // Mettre à jour les contraintes
      this.#constraints = {
        audio: {
          ...this.#constraints.audio,
          ...newConstraints.audio
        }
      };

      // Redémarrer si nécessaire
      if (wasActive) {
        await this.start();
      }

      Logger.info('MicrophoneManager', 'Contraintes mises à jour');

    } catch (err) {
      Logger.error('MicrophoneManager', 'Erreur updateConstraints', err);
      throw err;
    }
  }

  /**
   * Obtenir les paramètres audio actuels
   * @returns {Object|null} Paramètres ou null
   */
  getCurrentSettings() {
    try {
      if (!this.#stream) {
        return null;
      }

      const track = this.#stream.getAudioTracks()[0];
      if (!track) {
        return null;
      }

      return track.getSettings();

    } catch (err) {
      Logger.error('MicrophoneManager', 'Erreur getCurrentSettings', err);
      return null;
    }
  }

  /**
   * Vérifier les permissions microphone
   * @returns {Promise<string>} État de la permission ('granted', 'denied', 'prompt')
   */
  async checkPermission() {
    try {
      if (!navigator.permissions || !navigator.permissions.query) {
        Logger.warn('MicrophoneManager', 'Permissions API non supportée');
        return 'unknown';
      }

      const result = await navigator.permissions.query({ name: 'microphone' });
      Logger.info('MicrophoneManager', `Permission microphone: ${result.state}`);
      
      return result.state;

    } catch (err) {
      Logger.error('MicrophoneManager', 'Erreur checkPermission', err);
      return 'unknown';
    }
  }
}
