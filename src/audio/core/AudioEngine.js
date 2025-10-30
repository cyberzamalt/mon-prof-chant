/**
 * AudioEngine.js - Moteur Audio Principal
 * 
 * Gestion centralisée de l'AudioContext et du microphone
 * Singleton qui orchestre toutes les opérations audio
 * 
 * Fichier 7/18 - CORE AUDIO
 * Dépend de: Logger.js, ErrorHandler.js, constants.js
 */

import Logger from '../../logging/Logger.js';
import ErrorHandler from './ErrorHandler.js';
import { AUDIO, PITCH_DETECTION } from '../../config/constants.js';

class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.microphone = null;
    this.micStream = null;
    this.analyser = null;
    this.gainNode = null;
    
    this.isInitialized = false;
    this.isMicrophoneActive = false;
    
    this.sampleRate = PITCH_DETECTION.SAMPLE_RATE;
    this.bufferSize = AUDIO.BUFFER_SIZE;
    
    Logger.info('AudioEngine', 'Instance créée');
  }
  
  /**
   * Initialise l'AudioContext
   * @returns {Promise<boolean>} true si succès
   */
  async init() {
    if (this.isInitialized) {
      Logger.warn('AudioEngine', 'Déjà initialisé');
      return true;
    }
    
    try {
      Logger.info('AudioEngine', 'Initialisation du moteur audio...');
      
      // Vérifier la compatibilité navigateur
      if (!this.checkBrowserCompatibility()) {
        throw new Error('Navigateur non compatible avec Web Audio API');
      }
      
      // Créer l'AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({
        latencyHint: AUDIO.LATENCY_HINT,
        sampleRate: this.sampleRate
      });
      
      Logger.info('AudioEngine', 'AudioContext créé', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state
      });
      
      // Créer le nœud de gain
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = AUDIO.DEFAULT_MIC_GAIN;
      
      // Créer l'analyseur
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize * 2;
      this.analyser.smoothingTimeConstant = 0;
      
      // Connecter gain → analyser
      this.gainNode.connect(this.analyser);
      
      // Reprendre le contexte si suspendu (autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.resume();
      }
      
      this.isInitialized = true;
      Logger.success('AudioEngine', 'Moteur audio initialisé');
      
      return true;
      
    } catch (error) {
      Logger.error('AudioEngine', 'Erreur initialisation', error);
      ErrorHandler.handleAudioContextError(error);
      return false;
    }
  }
  
  /**
   * Vérifie la compatibilité du navigateur
   * @returns {boolean} true si compatible
   */
  checkBrowserCompatibility() {
    try {
      const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      if (!hasAudioContext) {
        Logger.error('AudioEngine', 'AudioContext non supporté');
      }
      
      if (!hasGetUserMedia) {
        Logger.error('AudioEngine', 'getUserMedia non supporté');
      }
      
      return hasAudioContext && hasGetUserMedia;
      
    } catch (error) {
      Logger.error('AudioEngine', 'Erreur vérification compatibilité', error);
      return false;
    }
  }
  
  /**
   * Reprend l'AudioContext (après suspension)
   * @returns {Promise<void>}
   */
  async resume() {
    try {
      if (!this.audioContext) {
        throw new Error('AudioContext non initialisé');
      }
      
      if (this.audioContext.state === 'suspended') {
        Logger.info('AudioEngine', 'Reprise AudioContext...');
        await this.audioContext.resume();
        Logger.success('AudioEngine', 'AudioContext repris');
      }
      
    } catch (error) {
      Logger.error('AudioEngine', 'Erreur reprise AudioContext', error);
      throw error;
    }
  }
  
  /**
   * Démarre le microphone
   * @returns {Promise<MediaStream>} Stream audio
   */
  async startMicrophone() {
    if (this.isMicrophoneActive) {
      Logger.warn('AudioEngine', 'Microphone déjà actif');
      return this.micStream;
    }
    
    try {
      Logger.info('AudioEngine', 'Demande accès microphone...');
      
      // Initialiser l'AudioContext si nécessaire
      if (!this.isInitialized) {
        await this.init();
      }
      
      // Reprendre le contexte si nécessaire
      await this.resume();
      
      // Demander accès au microphone
      this.micStream = await navigator.mediaDevices.getUserMedia(AUDIO.CONSTRAINTS);
      
      Logger.success('AudioEngine', 'Accès microphone accordé');
      
      // Créer la source audio depuis le stream
      this.microphone = this.audioContext.createMediaStreamSource(this.micStream);
      
      // Connecter micro → gain → analyser
      this.microphone.connect(this.gainNode);
      
      this.isMicrophoneActive = true;
      
      Logger.success('AudioEngine', 'Microphone démarré', {
        tracks: this.micStream.getAudioTracks().length
      });
      
      return this.micStream;
      
    } catch (error) {
      Logger.error('AudioEngine', 'Erreur démarrage microphone', error);
      ErrorHandler.handleMicrophoneError(error);
      throw error;
    }
  }
  
  /**
   * Arrête le microphone
   */
  stopMicrophone() {
    try {
      if (!this.isMicrophoneActive) {
        Logger.warn('AudioEngine', 'Microphone déjà arrêté');
        return;
      }
      
      Logger.info('AudioEngine', 'Arrêt microphone...');
      
      // Déconnecter la source
      if (this.microphone) {
        this.microphone.disconnect();
        this.microphone = null;
      }
      
      // Arrêter les tracks du stream
      if (this.micStream) {
        this.micStream.getTracks().forEach(track => {
          track.stop();
          Logger.info('AudioEngine', 'Track arrêté', { kind: track.kind });
        });
        this.micStream = null;
      }
      
      this.isMicrophoneActive = false;
      
      Logger.success('AudioEngine', 'Microphone arrêté');
      
    } catch (error) {
      Logger.error('AudioEngine', 'Erreur arrêt microphone', error);
    }
  }
  
  /**
   * Récupère les données audio brutes du microphone
   * @returns {Float32Array} Buffer audio
   */
  getMicrophoneData() {
    if (!this.analyser) {
      Logger.warn('AudioEngine', 'Analyser non initialisé');
      return new Float32Array(this.bufferSize);
    }
    
    try {
      const buffer = new Float32Array(this.bufferSize);
      this.analyser.getFloatTimeDomainData(buffer);
      return buffer;
      
    } catch (error) {
      Logger.error('AudioEngine', 'Erreur récupération données', error);
      return new Float32Array(this.bufferSize);
    }
  }
  
  /**
   * Récupère les données de fréquence (FFT)
   * @returns {Uint8Array} Données FFT
   */
  getFrequencyData() {
    if (!this.analyser) {
      Logger.warn('AudioEngine', 'Analyser non initialisé');
      return new Uint8Array(this.analyser.frequencyBinCount);
    }
    
    try {
      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(buffer);
      return buffer;
      
    } catch (error) {
      Logger.error('AudioEngine', 'Erreur récupération FFT', error);
      return new Uint8Array(this.analyser.frequencyBinCount);
    }
  }
  
  /**
   * Définit le gain du microphone
   * @param {number} value - Valeur de gain (0-2)
   */
  setMicrophoneGain(value) {
    if (!this.gainNode) {
      Logger.warn('AudioEngine', 'GainNode non initialisé');
      return;
    }
    
    try {
      const clampedValue = Math.max(0, Math.min(2, value));
      this.gainNode.gain.value = clampedValue;
      
      Logger.info('AudioEngine', 'Gain micro modifié', { gain: clampedValue });
      
    } catch (error) {
      Logger.error('AudioEngine', 'Erreur modification gain', error);
    }
  }
  
  /**
   * Récupère le gain actuel du microphone
   * @returns {number} Valeur de gain
   */
  getMicrophoneGain() {
    return this.gainNode ? this.gainNode.gain.value : AUDIO.DEFAULT_MIC_GAIN;
  }
  
  /**
   * Récupère l'AudioContext
   * @returns {AudioContext} L'AudioContext
   */
  getAudioContext() {
    return this.audioContext;
  }
  
  /**
   * Récupère le sample rate
   * @returns {number} Sample rate
   */
  getSampleRate() {
    return this.audioContext ? this.audioContext.sampleRate : this.sampleRate;
  }
  
  /**
   * Récupère le temps actuel de l'AudioContext
   * @returns {number} Temps en secondes
   */
  getCurrentTime() {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }
  
  /**
   * Vérifie si le microphone est actif
   * @returns {boolean} true si actif
   */
  isMicActive() {
    return this.isMicrophoneActive;
  }
  
  /**
   * Vérifie si l'AudioContext est suspendu
   * @returns {boolean} true si suspendu
   */
  isSuspended() {
    return this.audioContext && this.audioContext.state === 'suspended';
  }
  
  /**
   * Récupère l'état de l'AudioContext
   * @returns {string} État (suspended, running, closed)
   */
  getState() {
    return this.audioContext ? this.audioContext.state : 'uninitialized';
  }
  
  /**
   * Ferme l'AudioContext et libère les ressources
   */
  async close() {
    try {
      Logger.info('AudioEngine', 'Fermeture moteur audio...');
      
      // Arrêter le micro
      this.stopMicrophone();
      
      // Fermer l'AudioContext
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
      
      this.isInitialized = false;
      
      Logger.success('AudioEngine', 'Moteur audio fermé');
      
    } catch (error) {
      Logger.error('AudioEngine', 'Erreur fermeture', error);
    }
  }
  
  /**
   * Récupère les informations de debug
   * @returns {object} Infos de debug
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      isMicrophoneActive: this.isMicrophoneActive,
      audioContextState: this.getState(),
      sampleRate: this.getSampleRate(),
      bufferSize: this.bufferSize,
      gain: this.getMicrophoneGain(),
      currentTime: this.getCurrentTime()
    };
  }
}

// Créer une instance unique (singleton)
const audioEngine = new AudioEngine();

// Exporter l'instance
export default audioEngine;
