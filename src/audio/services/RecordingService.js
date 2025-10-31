/**
 * RecordingService.js
 * Service de gestion des enregistrements audio
 * 
 * Responsabilités:
 * - Orchestrer l'enregistrement via Recorder
 * - Gérer le cycle de vie (start/stop/pause/resume)
 * - Fournir métadonnées d'enregistrement
 * - Interface haut niveau pour l'application
 * 
 * Dépendances:
 * - AudioEngine
 * - EventBus
 * - MicrophoneManager
 * - Recorder (à créer)
 * - Logger
 */

import { Logger } from '../../logging/Logger.js';

export class RecordingService {
  #audioEngine = null;
  #eventBus = null;
  #microphoneManager = null;
  #recorder = null;
  #isRecording = false;
  #isPaused = false;
  #startTime = null;
  #pauseTime = null;
  #totalPauseDuration = 0;
  #recordingData = null;

  /**
   * Constructeur
   * @param {AudioEngine} audioEngine - Instance AudioEngine
   * @param {EventBus} eventBus - Instance EventBus
   * @param {MicrophoneManager} microphoneManager - Instance MicrophoneManager
   */
  constructor(audioEngine, eventBus, microphoneManager = null) {
    try {
      if (!audioEngine) {
        throw new Error('[RecordingService] audioEngine requis');
      }
      if (!eventBus) {
        throw new Error('[RecordingService] eventBus requis');
      }

      this.#audioEngine = audioEngine;
      this.#eventBus = eventBus;
      this.#microphoneManager = microphoneManager;

      Logger.info('RecordingService', 'Service créé');

    } catch (err) {
      Logger.error('RecordingService', 'Erreur constructeur', err);
      throw err;
    }
  }

  /**
   * Démarrer un enregistrement
   * @param {Object} options - Options d'enregistrement
   * @returns {Promise<void>}
   */
  async start(options = {}) {
    try {
      Logger.info('RecordingService', 'Démarrage enregistrement...');

      // Vérifier si déjà en cours
      if (this.#isRecording) {
        Logger.warn('RecordingService', 'Enregistrement déjà en cours');
        return;
      }

      // S'assurer que le microphone est actif
      if (this.#microphoneManager && !this.#microphoneManager.isActive()) {
        Logger.info('RecordingService', 'Démarrage du microphone...');
        await this.#microphoneManager.start();
      }

      // Créer le recorder si nécessaire
      if (!this.#recorder) {
        await this.#createRecorder(options);
      }

      // Démarrer l'enregistrement
      await this.#recorder.start();

      // Initialiser les timestamps
      this.#startTime = Date.now();
      this.#pauseTime = null;
      this.#totalPauseDuration = 0;
      this.#isRecording = true;
      this.#isPaused = false;

      // Émettre événement
      this.#eventBus.emit('recording:started', {
        startTime: this.#startTime,
        options: options
      });

      Logger.info('RecordingService', 'Enregistrement démarré');

    } catch (err) {
      Logger.error('RecordingService', 'Erreur start', err);
      
      this.#eventBus.emit('recording:error', {
        error: err.message,
        phase: 'start'
      });

      throw err;
    }
  }

  /**
   * Créer l'instance Recorder
   * @private
   */
  async #createRecorder(options) {
    try {
      // Vérifier si Recorder est disponible
      // Note: Recorder sera créé dans le prochain fichier
      if (!window.Recorder && !this.Recorder) {
        Logger.warn('RecordingService', 'Recorder non chargé, utilisation fallback');
        
        // Fallback: Créer un recorder basique avec MediaRecorder
        this.#recorder = await this.#createFallbackRecorder(options);
        return;
      }

      // Obtenir le stream du microphone
      const stream = this.#microphoneManager ? 
        this.#microphoneManager.getStream() : null;

      if (!stream) {
        throw new Error('Aucun stream audio disponible');
      }

      // Créer le recorder
      const RecorderClass = window.Recorder || this.Recorder;
      this.#recorder = new RecorderClass(stream, {
        mimeType: options.mimeType || 'audio/webm',
        audioBitsPerSecond: options.bitrate || 128000,
        ...options
      });

      Logger.info('RecordingService', 'Recorder créé');

    } catch (err) {
      Logger.error('RecordingService', 'Erreur createRecorder', err);
      throw err;
    }
  }

  /**
   * Créer un recorder de fallback basique
   * @private
   */
  async #createFallbackRecorder(options) {
    try {
      const stream = this.#microphoneManager.getStream();
      
      // Recorder basique avec MediaRecorder
      const recorder = {
        chunks: [],
        mediaRecorder: null,

        start: async function() {
          const mimeType = options.mimeType || 'audio/webm';
          this.mediaRecorder = new MediaRecorder(stream, { mimeType });
          
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              this.chunks.push(e.data);
            }
          };

          this.mediaRecorder.start();
          Logger.debug('RecordingService', 'Fallback recorder started');
        },

        stop: async function() {
          return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
              const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
              resolve({
                blob: blob,
                duration: 0,
                size: blob.size
              });
            };
            this.mediaRecorder.stop();
          });
        },

        pause: function() {
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
          }
        },

        resume: function() {
          if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
          }
        }
      };

      Logger.info('RecordingService', 'Fallback recorder créé');
      return recorder;

    } catch (err) {
      Logger.error('RecordingService', 'Erreur createFallbackRecorder', err);
      throw err;
    }
  }

  /**
   * Arrêter l'enregistrement
   * @returns {Promise<Object>} Données de l'enregistrement
   */
  async stop() {
    try {
      Logger.info('RecordingService', 'Arrêt enregistrement...');

      if (!this.#isRecording) {
        Logger.warn('RecordingService', 'Aucun enregistrement en cours');
        return null;
      }

      // Arrêter le recorder
      const recordingData = await this.#recorder.stop();

      // Calculer durée totale
      const endTime = Date.now();
      const totalDuration = endTime - this.#startTime - this.#totalPauseDuration;

      // Enrichir les données
      this.#recordingData = {
        ...recordingData,
        startTime: this.#startTime,
        endTime: endTime,
        duration: totalDuration,
        pauseDuration: this.#totalPauseDuration,
        timestamp: new Date().toISOString()
      };

      // Réinitialiser l'état
      this.#isRecording = false;
      this.#isPaused = false;
      this.#startTime = null;

      // Émettre événement
      this.#eventBus.emit('recording:stopped', {
        data: this.#recordingData,
        duration: totalDuration
      });

      Logger.info('RecordingService', 'Enregistrement arrêté', {
        duration: `${(totalDuration / 1000).toFixed(2)}s`,
        size: `${(this.#recordingData.size / 1024).toFixed(2)} KB`
      });

      return this.#recordingData;

    } catch (err) {
      Logger.error('RecordingService', 'Erreur stop', err);
      
      this.#eventBus.emit('recording:error', {
        error: err.message,
        phase: 'stop'
      });

      throw err;
    }
  }

  /**
   * Mettre en pause l'enregistrement
   */
  pause() {
    try {
      if (!this.#isRecording) {
        Logger.warn('RecordingService', 'Aucun enregistrement en cours');
        return;
      }

      if (this.#isPaused) {
        Logger.warn('RecordingService', 'Déjà en pause');
        return;
      }

      // Pause du recorder
      if (this.#recorder && this.#recorder.pause) {
        this.#recorder.pause();
      }

      this.#pauseTime = Date.now();
      this.#isPaused = true;

      this.#eventBus.emit('recording:paused', {
        pauseTime: this.#pauseTime
      });

      Logger.info('RecordingService', 'Enregistrement en pause');

    } catch (err) {
      Logger.error('RecordingService', 'Erreur pause', err);
    }
  }

  /**
   * Reprendre l'enregistrement
   */
  resume() {
    try {
      if (!this.#isRecording) {
        Logger.warn('RecordingService', 'Aucun enregistrement en cours');
        return;
      }

      if (!this.#isPaused) {
        Logger.warn('RecordingService', 'Pas en pause');
        return;
      }

      // Resume du recorder
      if (this.#recorder && this.#recorder.resume) {
        this.#recorder.resume();
      }

      // Calculer durée de pause
      const resumeTime = Date.now();
      this.#totalPauseDuration += (resumeTime - this.#pauseTime);
      this.#pauseTime = null;
      this.#isPaused = false;

      this.#eventBus.emit('recording:resumed', {
        resumeTime: resumeTime,
        totalPauseDuration: this.#totalPauseDuration
      });

      Logger.info('RecordingService', 'Enregistrement repris');

    } catch (err) {
      Logger.error('RecordingService', 'Erreur resume', err);
    }
  }

  /**
   * Obtenir les données du dernier enregistrement
   * @returns {Object|null}
   */
  getRecordingData() {
    return this.#recordingData;
  }

  /**
   * Obtenir la durée actuelle de l'enregistrement
   * @returns {number} Durée en millisecondes
   */
  getCurrentDuration() {
    try {
      if (!this.#isRecording) {
        return 0;
      }

      const now = Date.now();
      let duration = now - this.#startTime - this.#totalPauseDuration;

      // Si en pause, ajouter la pause en cours
      if (this.#isPaused && this.#pauseTime) {
        duration -= (now - this.#pauseTime);
      }

      return Math.max(0, duration);

    } catch (err) {
      Logger.error('RecordingService', 'Erreur getCurrentDuration', err);
      return 0;
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
   * Vérifier si l'enregistrement est en pause
   * @returns {boolean}
   */
  isPaused() {
    return this.#isPaused;
  }

  /**
   * Exporter l'enregistrement dans un format
   * @param {string} format - 'webm', 'wav', 'mp3'
   * @returns {Promise<Blob>}
   */
  async export(format = 'webm') {
    try {
      if (!this.#recordingData) {
        throw new Error('Aucun enregistrement disponible');
      }

      Logger.info('RecordingService', `Export en ${format}...`);

      // Si format natif, retourner directement
      if (format === 'webm' && this.#recordingData.blob) {
        return this.#recordingData.blob;
      }

      // Conversions (nécessitent les modules wav-export, mp3-export)
      switch (format) {
        case 'wav':
          return await this.#exportToWAV();
        case 'mp3':
          return await this.#exportToMP3();
        default:
          throw new Error(`Format non supporté: ${format}`);
      }

    } catch (err) {
      Logger.error('RecordingService', 'Erreur export', err);
      throw err;
    }
  }

  /**
   * Exporter en WAV
   * @private
   */
  async #exportToWAV() {
    try {
      // TODO: Implémenter conversion WAV
      // Nécessite wav-export.js du monolithe
      Logger.warn('RecordingService', 'Export WAV non encore implémenté');
      throw new Error('Export WAV en développement');
    } catch (err) {
      Logger.error('RecordingService', 'Erreur exportToWAV', err);
      throw err;
    }
  }

  /**
   * Exporter en MP3
   * @private
   */
  async #exportToMP3() {
    try {
      // TODO: Implémenter conversion MP3
      // Nécessite mp3-export.js et LAME
      Logger.warn('RecordingService', 'Export MP3 non encore implémenté');
      throw new Error('Export MP3 en développement');
    } catch (err) {
      Logger.error('RecordingService', 'Erreur exportToMP3', err);
      throw err;
    }
  }

  /**
   * Télécharger l'enregistrement
   * @param {string} filename - Nom du fichier
   * @param {string} format - Format d'export
   */
  async download(filename = null, format = 'webm') {
    try {
      const blob = await this.export(format);

      // Générer nom de fichier si non fourni
      if (!filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `recording_${timestamp}.${format}`;
      }

      // Créer lien de téléchargement
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();

      // Nettoyer
      setTimeout(() => URL.revokeObjectURL(url), 100);

      Logger.info('RecordingService', `Téléchargement: ${filename}`);

      this.#eventBus.emit('recording:downloaded', {
        filename: filename,
        format: format,
        size: blob.size
      });

    } catch (err) {
      Logger.error('RecordingService', 'Erreur download', err);
      throw err;
    }
  }

  /**
   * Réinitialiser le service
   */
  reset() {
    try {
      // Arrêter si en cours
      if (this.#isRecording) {
        this.stop();
      }

      // Nettoyer
      this.#recorder = null;
      this.#recordingData = null;
      this.#startTime = null;
      this.#pauseTime = null;
      this.#totalPauseDuration = 0;

      Logger.info('RecordingService', 'Service réinitialisé');

    } catch (err) {
      Logger.error('RecordingService', 'Erreur reset', err);
    }
  }

  /**
   * Obtenir les statistiques d'enregistrement
   * @returns {Object}
   */
  getStats() {
    return {
      isRecording: this.#isRecording,
      isPaused: this.#isPaused,
      currentDuration: this.getCurrentDuration(),
      hasRecording: !!this.#recordingData,
      lastRecording: this.#recordingData ? {
        duration: this.#recordingData.duration,
        size: this.#recordingData.size,
        timestamp: this.#recordingData.timestamp
      } : null
    };
  }
}
