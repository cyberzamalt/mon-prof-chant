/**
 * Recorder.js
 * TYPE: Recording
 * 
 * Responsabilités:
 * - Enregistrer l'audio du microphone
 * - Gérer MediaRecorder
 * - Convertir WebM → WAV → MP3
 * - Déclencher les événements (start, stop, error)
 * 
 * Dépendances: Logger, AudioEngine, AudioBus
 */

import { Logger } from '../../logging/Logger.js';
import { AudioEngine } from '../core/AudioEngine.js';
import { AudioBus } from '../core/AudioBus.js';

export class Recorder {
  constructor(audioEngine, audioBus) {
    this.logger = new Logger('Recorder');
    this.audioEngine = audioEngine;
    this.audioBus = audioBus;
    
    this.mediaRecorder = null;
    this.micStream = null;
    this.chunks = [];
    this.lastBlob = null;
    this.isRecording = false;
    this.startTime = 0;
    this.recordingDuration = 0;
    
    this.logger.info('Recorder initialized');
  }

  /**
   * Démarrer l'enregistrement
   */
  async startRecording() {
    try {
      // Vérifier que l'audio est prêt
      if (!this.audioEngine.audioCtx) {
        await this.audioEngine.ensureAudioContext();
      }

      // Demander l'accès au microphone
      if (!this.micStream) {
        this.micStream = await this.audioEngine.requestMicrophoneAccess();
      }

      // Réinitialiser
      this.chunks = [];
      this.lastBlob = null;
      this.isRecording = true;
      this.startTime = Date.now();

      // Créer le MediaRecorder
      const options = {
        mimeType: this.getSupportedMimeType(),
        audioBitsPerSecond: 128000
      };

      this.mediaRecorder = new MediaRecorder(this.micStream, options);

      // Événement : données disponibles
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
          this.logger.debug('Recording data chunk', { size: event.data.size });
        }
      };

      // Événement : enregistrement arrêté
      this.mediaRecorder.onstop = () => {
        if (this.chunks.length > 0) {
          this.lastBlob = new Blob(this.chunks, { 
            type: this.getSupportedMimeType() 
          });
          this.logger.info('Recording stopped', { 
            totalSize: this.lastBlob.size,
            duration: this.recordingDuration 
          });
          this.audioBus.publish('recording:stopped', { 
            blob: this.lastBlob,
            duration: this.recordingDuration 
          });
        } else {
          this.logger.warn('No audio data recorded');
        }
      };

      // Événement : erreur
      this.mediaRecorder.onerror = (event) => {
        this.logger.error('MediaRecorder error', { error: event.error });
        this.audioBus.publish('recording:error', { error: event.error });
      };

      // Démarrer
      this.mediaRecorder.start(100); // Événement tous les 100ms

      this.logger.info('Recording started', {
        mimeType: options.mimeType,
        bitrate: options.audioBitsPerSecond
      });

      this.audioBus.publish('recording:started', {
        timestamp: this.startTime
      });

    } catch (err) {
      this.logger.error('Failed to start recording', { error: err.message });
      this.audioBus.publish('recording:error', { error: err.message });
      throw err;
    }
  }

  /**
   * Arrêter l'enregistrement
   */
  stopRecording() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.recordingDuration = (Date.now() - this.startTime) / 1000;
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.logger.info('Recording stop requested');
      } else {
        this.logger.warn('No recording in progress');
      }
    } catch (err) {
      this.logger.error('Failed to stop recording', { error: err.message });
      this.audioBus.publish('recording:error', { error: err.message });
    }
  }

  /**
   * Pause l'enregistrement
   */
  pauseRecording() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.pause();
        this.logger.info('Recording paused');
        this.audioBus.publish('recording:paused', {});
      }
    } catch (err) {
      this.logger.error('Failed to pause recording', { error: err.message });
    }
  }

  /**
   * Reprendre l'enregistrement
   */
  resumeRecording() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
        this.mediaRecorder.resume();
        this.logger.info('Recording resumed');
        this.audioBus.publish('recording:resumed', {});
      }
    } catch (err) {
      this.logger.error('Failed to resume recording', { error: err.message });
    }
  }

  /**
   * Obtenir le dernier enregistrement (blob)
   */
  getLastRecording() {
    return this.lastBlob;
  }

  /**
   * Effacer les données
   */
  clearRecording() {
    this.chunks = [];
    this.lastBlob = null;
    this.recordingDuration = 0;
    this.logger.info('Recording cleared');
  }

  /**
   * Télécharger l'enregistrement (WebM brut)
   */
  downloadWebM(filename = 'recording.webm') {
    if (!this.lastBlob) {
      this.logger.warn('No recording to download');
      return;
    }

    const url = URL.createObjectURL(this.lastBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.logger.info('Downloaded WebM', { filename });
  }

  /**
   * Convertir en WAV
   * Utilise le worker d'export WAV
   */
  async downloadWAV(filename = 'recording.wav') {
    try {
      if (!this.lastBlob) {
        this.logger.warn('No recording to convert to WAV');
        return;
      }

      // Vérifier que WAVExport est disponible
      if (!window.WAVExport) {
        this.logger.error('WAVExport not available');
        this.audioBus.publish('export:error', { 
          error: 'WAVExport module not loaded' 
        });
        return;
      }

      this.logger.info('Converting to WAV...');
      this.audioBus.publish('export:progress', { status: 'converting' });

      const wav = await window.WAVExport.fromWebM(this.lastBlob);

      if (!wav) {
        throw new Error('WAV conversion failed');
      }

      // Télécharger
      const url = URL.createObjectURL(wav);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.logger.info('Downloaded WAV', { filename });
      this.audioBus.publish('export:success', { format: 'WAV' });

    } catch (err) {
      this.logger.error('WAV conversion error', { error: err.message });
      this.audioBus.publish('export:error', { error: err.message });
    }
  }

  /**
   * Convertir en MP3
   * Utilise le worker d'export MP3
   */
  async downloadMP3(filename = 'recording.mp3') {
    try {
      if (!this.lastBlob) {
        this.logger.warn('No recording to convert to MP3');
        return;
      }

      // Vérifier que les modules sont disponibles
      if (!window.WAVExport || !window.MP3Export) {
        this.logger.error('MP3Export or WAVExport not available');
        this.audioBus.publish('export:error', { 
          error: 'Export modules not loaded' 
        });
        return;
      }

      this.logger.info('Converting to MP3...');
      this.audioBus.publish('export:progress', { status: 'converting' });

      // D'abord convertir en WAV
      const wav = await window.WAVExport.fromWebM(this.lastBlob);
      if (!wav) throw new Error('WAV conversion failed');

      // Ensuite MP3
      this.logger.info('Encoding MP3...');
      this.audioBus.publish('export:progress', { status: 'encoding' });

      const mp3 = await window.MP3Export.fromWav(wav);

      if (!mp3) {
        throw new Error('MP3 encoding failed');
      }

      // Télécharger
      const url = URL.createObjectURL(mp3);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.logger.info('Downloaded MP3', { filename });
      this.audioBus.publish('export:success', { format: 'MP3' });

    } catch (err) {
      this.logger.error('MP3 conversion error', { error: err.message });
      this.audioBus.publish('export:error', { error: err.message });
    }
  }

  /**
   * Charger un fichier audio (upload)
   */
  async loadAudioFile(file) {
    try {
      if (!file) {
        this.logger.warn('No file provided');
        return null;
      }

      this.logger.info('Loading audio file', { 
        name: file.name, 
        size: file.size,
        type: file.type 
      });

      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });

      this.lastBlob = blob;
      this.chunks = [blob];

      this.logger.info('Audio file loaded successfully');
      this.audioBus.publish('recording:loaded', {
        filename: file.name,
        size: file.size
      });

      return blob;

    } catch (err) {
      this.logger.error('Failed to load audio file', { error: err.message });
      this.audioBus.publish('recording:error', { error: err.message });
      return null;
    }
  }

  /**
   * Décoder le blob en AudioBuffer (pour analyse)
   */
  async decodeToAudioBuffer() {
    try {
      if (!this.lastBlob) {
        this.logger.warn('No recording to decode');
        return null;
      }

      const arrayBuffer = await this.lastBlob.arrayBuffer();
      const audioBuffer = await this.audioEngine.audioCtx.decodeAudioData(arrayBuffer);

      this.logger.info('Audio decoded', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      });

      return audioBuffer;

    } catch (err) {
      this.logger.error('Failed to decode audio', { error: err.message });
      return null;
    }
  }

  /**
   * Obtenir un channel audio en Float32Array
   */
  async getAudioChannelData(channelIndex = 0) {
    try {
      const audioBuffer = await this.decodeToAudioBuffer();
      if (!audioBuffer) return null;

      const channelData = audioBuffer.getChannelData(channelIndex);
      this.logger.debug('Got channel data', {
        channel: channelIndex,
        samples: channelData.length
      });

      return channelData;

    } catch (err) {
      this.logger.error('Failed to get channel data', { error: err.message });
      return null;
    }
  }

  /**
   * Déterminer le MIME type supporté
   */
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm;codecs=vp8',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        this.logger.debug('Using MIME type', { type });
        return type;
      }
    }

    // Fallback
    return 'audio/webm';
  }

  /**
   * Obtenir l'état actuel
   */
  getState() {
    return {
      isRecording: this.isRecording,
      hasRecording: !!this.lastBlob,
      recordingSize: this.lastBlob?.size || 0,
      recordingDuration: this.recordingDuration,
      recorderState: this.mediaRecorder?.state || 'inactive'
    };
  }

  /**
   * Nettoyer les ressources
   */
  dispose() {
    try {
      if (this.mediaRecorder) {
        if (this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;
      }

      if (this.micStream) {
        this.micStream.getTracks().forEach(track => track.stop());
        this.micStream = null;
      }

      this.chunks = [];
      this.logger.info('Recorder disposed');
    } catch (err) {
      this.logger.error('Error disposing recorder', { error: err.message });
    }
  }
}

export default Recorder;
