/**
 * Recorder.js
 * Gestionnaire d'enregistrement audio avec MediaRecorder
 * 
 * Responsabilités:
 * - Enregistrer le flux audio du microphone
 * - Gérer MediaRecorder API
 * - Supporter plusieurs formats (WebM, WAV)
 * - Fallbacks pour compatibilité navigateurs
 * - Gestion de la qualité et du bitrate
 * 
 * Dépendances:
 * - Logger
 */

import { Logger } from '../../logging/Logger.js';

export class Recorder {
  #stream = null;
  #mediaRecorder = null;
  #chunks = [];
  #options = null;
  #isRecording = false;
  #startTime = null;
  #mimeType = null;

  /**
   * Constructeur
   * @param {MediaStream} stream - Stream audio du microphone
   * @param {Object} options - Options d'enregistrement
   */
  constructor(stream, options = {}) {
    try {
      if (!stream || !(stream instanceof MediaStream)) {
        throw new Error('[Recorder] MediaStream requis');
      }

      this.#stream = stream;

      // Options par défaut
      this.#options = {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000, // 128 kbps
        ...options
      };

      // Déterminer le meilleur mimeType supporté
      this.#mimeType = this.#getBestMimeType();

      Logger.info('Recorder', 'Initialisé', {
        mimeType: this.#mimeType,
        bitrate: this.#options.audioBitsPerSecond
      });

    } catch (err) {
      Logger.error('Recorder', 'Erreur constructeur', err);
      throw err;
    }
  }

  /**
   * Déterminer le meilleur mimeType supporté
   * @private
   * @returns {string}
   */
  #getBestMimeType() {
    try {
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];

      // Tester chaque type dans l'ordre de préférence
      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          Logger.info('Recorder', `MimeType supporté: ${type}`);
          return type;
        }
      }

      // Fallback
      Logger.warn('Recorder', 'Aucun mimeType préféré supporté, utilisation par défaut');
      return this.#options.mimeType || 'audio/webm';

    } catch (err) {
      Logger.error('Recorder', 'Erreur getBestMimeType', err);
      return 'audio/webm';
    }
  }

  /**
   * Démarrer l'enregistrement
   * @returns {Promise<void>}
   */
  async start() {
    try {
      Logger.info('Recorder', 'Démarrage...');

      if (this.#isRecording) {
        Logger.warn('Recorder', 'Déjà en cours');
        return;
      }

      // Vérifier support MediaRecorder
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder non supporté par ce navigateur');
      }

      // Créer MediaRecorder
      const recorderOptions = {
        mimeType: this.#mimeType,
        audioBitsPerSecond: this.#options.audioBitsPerSecond
      };

      this.#mediaRecorder = new MediaRecorder(this.#stream, recorderOptions);

      // Initialiser le buffer de chunks
      this.#chunks = [];

      // Événement: données disponibles
      this.#mediaRecorder.ondataavailable = (event) => {
        try {
          if (event.data && event.data.size > 0) {
            this.#chunks.push(event.data);
            Logger.debug('Recorder', `Chunk reçu: ${event.data.size} bytes`);
          }
        } catch (err) {
          Logger.error('Recorder', 'Erreur ondataavailable', err);
        }
      };

      // Événement: erreur
      this.#mediaRecorder.onerror = (event) => {
        Logger.error('Recorder', 'Erreur MediaRecorder', event.error);
      };

      // Événement: arrêt
      this.#mediaRecorder.onstop = () => {
        Logger.info('Recorder', 'MediaRecorder arrêté');
      };

      // Démarrer l'enregistrement
      this.#mediaRecorder.start(100); // Chunk toutes les 100ms
      this.#startTime = Date.now();
      this.#isRecording = true;

      Logger.info('Recorder', 'Enregistrement démarré', {
        mimeType: this.#mediaRecorder.mimeType,
        state: this.#mediaRecorder.state
      });

    } catch (err) {
      Logger.error('Recorder', 'Erreur start', err);
      throw err;
    }
  }

  /**
   * Arrêter l'enregistrement
   * @returns {Promise<Object>} Données de l'enregistrement
   */
  async stop() {
    try {
      Logger.info('Recorder', 'Arrêt...');

      if (!this.#isRecording) {
        Logger.warn('Recorder', 'Aucun enregistrement en cours');
        return null;
      }

      return new Promise((resolve, reject) => {
        try {
          // Callback une fois arrêté
          this.#mediaRecorder.onstop = () => {
            try {
              // Créer le blob à partir des chunks
              const blob = new Blob(this.#chunks, {
                type: this.#mimeType
              });

              // Calculer durée
              const endTime = Date.now();
              const duration = endTime - this.#startTime;

              // Résultat
              const result = {
                blob: blob,
                size: blob.size,
                duration: duration,
                mimeType: this.#mimeType,
                chunks: this.#chunks.length,
                startTime: this.#startTime,
                endTime: endTime
              };

              // Réinitialiser
              this.#isRecording = false;
              this.#chunks = [];

              Logger.info('Recorder', 'Enregistrement terminé', {
                duration: `${(duration / 1000).toFixed(2)}s`,
                size: `${(blob.size / 1024).toFixed(2)} KB`,
                chunks: result.chunks
              });

              resolve(result);

            } catch (err) {
              Logger.error('Recorder', 'Erreur dans onstop callback', err);
              reject(err);
            }
          };

          // Arrêter le recorder
          if (this.#mediaRecorder.state !== 'inactive') {
            this.#mediaRecorder.stop();
          } else {
            // Déjà arrêté, résoudre immédiatement
            this.#mediaRecorder.onstop();
          }

        } catch (err) {
          Logger.error('Recorder', 'Erreur stop', err);
          reject(err);
        }
      });

    } catch (err) {
      Logger.error('Recorder', 'Erreur stop (outer)', err);
      throw err;
    }
  }

  /**
   * Mettre en pause
   */
  pause() {
    try {
      if (!this.#isRecording) {
        Logger.warn('Recorder', 'Aucun enregistrement en cours');
        return;
      }

      if (this.#mediaRecorder.state === 'recording') {
        this.#mediaRecorder.pause();
        Logger.info('Recorder', 'Enregistrement en pause');
      } else {
        Logger.warn('Recorder', `État invalide pour pause: ${this.#mediaRecorder.state}`);
      }

    } catch (err) {
      Logger.error('Recorder', 'Erreur pause', err);
    }
  }

  /**
   * Reprendre
   */
  resume() {
    try {
      if (!this.#isRecording) {
        Logger.warn('Recorder', 'Aucun enregistrement en cours');
        return;
      }

      if (this.#mediaRecorder.state === 'paused') {
        this.#mediaRecorder.resume();
        Logger.info('Recorder', 'Enregistrement repris');
      } else {
        Logger.warn('Recorder', `État invalide pour resume: ${this.#mediaRecorder.state}`);
      }

    } catch (err) {
      Logger.error('Recorder', 'Erreur resume', err);
    }
  }

  /**
   * Obtenir l'état actuel
   * @returns {string} 'inactive', 'recording', 'paused'
   */
  getState() {
    try {
      if (!this.#mediaRecorder) {
        return 'inactive';
      }
      return this.#mediaRecorder.state;
    } catch (err) {
      Logger.error('Recorder', 'Erreur getState', err);
      return 'inactive';
    }
  }

  /**
   * Vérifier si un enregistrement est en cours
   * @returns {boolean}
   */
  isRecording() {
    return this.#isRecording;
  }

  /**
   * Obtenir le mimeType utilisé
   * @returns {string}
   */
  getMimeType() {
    return this.#mimeType;
  }

  /**
   * Obtenir les capacités du navigateur
   * @static
   * @returns {Object}
   */
  static getCapabilities() {
    try {
      if (!window.MediaRecorder) {
        return {
          supported: false,
          types: []
        };
      }

      const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        'audio/wav',
        'audio/mpeg'
      ];

      const supportedTypes = types.filter(type => 
        MediaRecorder.isTypeSupported(type)
      );

      return {
        supported: true,
        types: supportedTypes,
        preferredType: supportedTypes[0] || 'audio/webm'
      };

    } catch (err) {
      Logger.error('Recorder', 'Erreur getCapabilities', err);
      return {
        supported: false,
        types: [],
        error: err.message
      };
    }
  }

  /**
   * Obtenir la durée actuelle de l'enregistrement
   * @returns {number} Durée en millisecondes
   */
  getCurrentDuration() {
    try {
      if (!this.#isRecording || !this.#startTime) {
        return 0;
      }
      return Date.now() - this.#startTime;
    } catch (err) {
      Logger.error('Recorder', 'Erreur getCurrentDuration', err);
      return 0;
    }
  }

  /**
   * Obtenir le nombre de chunks enregistrés
   * @returns {number}
   */
  getChunkCount() {
    return this.#chunks.length;
  }

  /**
   * Obtenir la taille actuelle de l'enregistrement
   * @returns {number} Taille en bytes
   */
  getCurrentSize() {
    try {
      return this.#chunks.reduce((total, chunk) => total + chunk.size, 0);
    } catch (err) {
      Logger.error('Recorder', 'Erreur getCurrentSize', err);
      return 0;
    }
  }

  /**
   * Nettoyer les ressources
   */
  cleanup() {
    try {
      if (this.#isRecording) {
        this.stop();
      }

      this.#mediaRecorder = null;
      this.#chunks = [];
      this.#stream = null;

      Logger.info('Recorder', 'Nettoyage effectué');

    } catch (err) {
      Logger.error('Recorder', 'Erreur cleanup', err);
    }
  }
}
