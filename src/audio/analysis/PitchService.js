/**
 * PitchService.js - Service d'Analyse Pitch
 * 
 * Orchestre la détection et le lissage des pitches
 * Service de haut niveau pour l'analyse audio
 * 
 * Fichier 10/18 - ANALYSE & LISSAGE
 * Dépend de: Logger.js, AudioEngine.js, PitchDetector.js, PitchSmoother.js, AudioMath.js
 */

import Logger from '../../logging/Logger.js';
import AudioEngine from '../core/AudioEngine.js';
import PitchDetector from './PitchDetector.js';
import PitchSmoother from '../dsp/PitchSmoother.js';
import { hzToNote, centsFrom, isValidHz } from '../../utils/AudioMath.js';
import { PITCH_DETECTION } from '../../config/constants.js';

class PitchService {
  constructor() {
    this.detector = null;
    this.smoother = null;
    this.isRunning = false;
    this.currentPitch = null;
    this.pitchHistory = [];
    this.maxHistorySize = 1000;
    
    // Callbacks
    this.onPitchDetected = null;
    this.onPitchSmoothed = null;
    
    // Stats
    this.stats = {
      totalDetections: 0,
      validDetections: 0,
      invalidDetections: 0,
      avgConfidence: 0
    };
    
    Logger.info('PitchService', 'Service créé');
  }
  
  /**
   * Initialise le service
   * @returns {Promise<boolean>} true si succès
   */
  async init() {
    try {
      Logger.info('PitchService', 'Initialisation...');
      
      // Récupérer le sample rate de l'AudioEngine
      const sampleRate = AudioEngine.getSampleRate() || PITCH_DETECTION.SAMPLE_RATE;
      
      // Créer le détecteur
      this.detector = new PitchDetector(sampleRate);
      
      // Créer le smoother
      this.smoother = new PitchSmoother();
      
      Logger.success('PitchService', 'Service initialisé');
      
      return true;
      
    } catch (error) {
      Logger.error('PitchService', 'Erreur initialisation', error);
      return false;
    }
  }
  
  /**
   * Démarre l'analyse en temps réel
   * @param {Function} callback - Callback appelé à chaque détection
   * @returns {boolean} true si démarré
   */
  start(callback = null) {
    if (this.isRunning) {
      Logger.warn('PitchService', 'Déjà en cours');
      return false;
    }
    
    try {
      Logger.info('PitchService', 'Démarrage analyse temps réel...');
      
      // Initialiser si nécessaire
      if (!this.detector || !this.smoother) {
        this.init();
      }
      
      // Sauvegarder le callback
      if (callback) {
        this.onPitchSmoothed = callback;
      }
      
      this.isRunning = true;
      
      Logger.success('PitchService', 'Analyse démarrée');
      
      return true;
      
    } catch (error) {
      Logger.error('PitchService', 'Erreur démarrage', error);
      return false;
    }
  }
  
  /**
   * Arrête l'analyse
   */
  stop() {
    if (!this.isRunning) {
      Logger.warn('PitchService', 'Déjà arrêté');
      return;
    }
    
    try {
      Logger.info('PitchService', 'Arrêt analyse...');
      
      this.isRunning = false;
      
      Logger.success('PitchService', 'Analyse arrêtée', {
        totalDetections: this.stats.totalDetections,
        validDetections: this.stats.validDetections
      });
      
    } catch (error) {
      Logger.error('PitchService', 'Erreur arrêt', error);
    }
  }
  
  /**
   * Analyse un frame audio
   * @param {Float32Array} buffer - Buffer audio
   * @returns {object|null} Résultat d'analyse
   */
  analyzeFrame(buffer) {
    if (!this.detector || !this.smoother) {
      Logger.warn('PitchService', 'Service non initialisé');
      return null;
    }
    
    try {
      this.stats.totalDetections++;
      
      // Détection du pitch brut
      const rawPitch = this.detector.detect(buffer);
      
      if (!rawPitch || !isValidHz(rawPitch)) {
        this.stats.invalidDetections++;
        
        // Callback avec null si configuré
        if (this.onPitchDetected) {
          this.onPitchDetected(null);
        }
        
        return null;
      }
      
      this.stats.validDetections++;
      
      // Callback pitch brut
      if (this.onPitchDetected) {
        this.onPitchDetected(rawPitch);
      }
      
      // Lissage du pitch
      const smoothedPitch = this.smoother.smooth(rawPitch);
      
      if (!smoothedPitch) {
        return null;
      }
      
      // Conversion en note
      const noteInfo = hzToNote(smoothedPitch);
      
      // Calcul des cents (mode A440 et Auto)
      const centsA440 = centsFrom(smoothedPitch, 'a440');
      const centsAuto = centsFrom(smoothedPitch, 'auto');
      
      // Créer l'objet résultat
      const result = {
        timestamp: Date.now(),
        raw: rawPitch,
        smoothed: smoothedPitch,
        note: noteInfo.note,
        octave: noteInfo.octave,
        fullNote: noteInfo.fullName,
        centsA440: centsA440,
        centsAuto: centsAuto,
        midi: noteInfo.midi
      };
      
      // Sauvegarder dans l'historique
      this.pitchHistory.push(result);
      
      // Limiter la taille de l'historique
      if (this.pitchHistory.length > this.maxHistorySize) {
        this.pitchHistory.shift();
      }
      
      // Mettre à jour le pitch actuel
      this.currentPitch = result;
      
      // Callback pitch lissé
      if (this.onPitchSmoothed) {
        this.onPitchSmoothed(result);
      }
      
      return result;
      
    } catch (error) {
      Logger.error('PitchService', 'Erreur analyse frame', error);
      return null;
    }
  }
  
  /**
   * Analyse un buffer audio complet (post-traitement)
   * @param {Float32Array} audioData - Données audio complètes
   * @param {number} sampleRate - Sample rate
   * @returns {object} Résultats d'analyse
   */
  analyzeAudioBuffer(audioData, sampleRate) {
    try {
      Logger.info('PitchService', 'Analyse buffer complet...', {
        samples: audioData.length,
        duration: (audioData.length / sampleRate).toFixed(2) + 's'
      });
      
      // Réinitialiser le détecteur et smoother pour cette analyse
      const detector = new PitchDetector(sampleRate);
      const smoother = new PitchSmoother();
      
      const results = [];
      const frameSize = PITCH_DETECTION.DETECT_SIZE;
      const hopSize = Math.floor(frameSize / 2); // 50% overlap
      
      // Analyser frame par frame
      for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);
        
        // Détection
        const rawPitch = detector.detect(frame);
        
        if (rawPitch && isValidHz(rawPitch)) {
          // Lissage
          const smoothedPitch = smoother.smooth(rawPitch);
          
          if (smoothedPitch) {
            const noteInfo = hzToNote(smoothedPitch);
            
            results.push({
              time: i / sampleRate,
              raw: rawPitch,
              smoothed: smoothedPitch,
              note: noteInfo.note,
              octave: noteInfo.octave,
              fullNote: noteInfo.fullName,
              centsA440: centsFrom(smoothedPitch, 'a440'),
              centsAuto: centsFrom(smoothedPitch, 'auto'),
              midi: noteInfo.midi
            });
          }
        }
      }
      
      Logger.success('PitchService', 'Analyse terminée', {
        detections: results.length
      });
      
      // Calculer les statistiques
      const statistics = this.calculateStatistics(results);
      
      return {
        detections: results,
        statistics,
        duration: audioData.length / sampleRate,
        sampleRate
      };
      
    } catch (error) {
      Logger.error('PitchService', 'Erreur analyse buffer', error);
      return {
        detections: [],
        statistics: null,
        error: error.message
      };
    }
  }
  
  /**
   * Calcule les statistiques d'une analyse
   * @param {Array} detections - Tableau de détections
   * @returns {object} Statistiques
   */
  calculateStatistics(detections) {
    if (!detections || detections.length === 0) {
      return {
        count: 0,
        avgPitch: 0,
        minPitch: 0,
        maxPitch: 0,
        avgCents: 0,
        notesDistribution: {}
      };
    }
    
    try {
      const pitches = detections.map(d => d.smoothed);
      const cents = detections.map(d => d.centsAuto);
      
      // Stats de base
      const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
      const minPitch = Math.min(...pitches);
      const maxPitch = Math.max(...pitches);
      const avgCents = cents.reduce((a, b) => a + b, 0) / cents.length;
      
      // Distribution des notes
      const notesDistribution = {};
      detections.forEach(d => {
        const key = d.fullNote;
        notesDistribution[key] = (notesDistribution[key] || 0) + 1;
      });
      
      return {
        count: detections.length,
        avgPitch: avgPitch.toFixed(2),
        minPitch: minPitch.toFixed(2),
        maxPitch: maxPitch.toFixed(2),
        avgCents: avgCents.toFixed(1),
        notesDistribution
      };
      
    } catch (error) {
      Logger.error('PitchService', 'Erreur calcul statistiques', error);
      return null;
    }
  }
  
  /**
   * Récupère le pitch actuel
   * @returns {object|null} Pitch actuel
   */
  getCurrentPitch() {
    return this.currentPitch;
  }
  
  /**
   * Récupère l'historique des pitches
   * @param {number} count - Nombre d'entrées (optionnel)
   * @returns {Array} Historique
   */
  getHistory(count = null) {
    if (count === null) {
      return [...this.pitchHistory];
    }
    
    const start = Math.max(0, this.pitchHistory.length - count);
    return this.pitchHistory.slice(start);
  }
  
  /**
   * Efface l'historique
   */
  clearHistory() {
    this.pitchHistory = [];
    this.currentPitch = null;
    
    if (this.smoother) {
      this.smoother.reset();
    }
    
    Logger.info('PitchService', 'Historique effacé');
  }
  
  /**
   * Récupère les statistiques globales
   * @returns {object} Statistiques
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalDetections > 0
        ? ((this.stats.validDetections / this.stats.totalDetections) * 100).toFixed(1) + '%'
        : '0%',
      historySize: this.pitchHistory.length
    };
  }
  
  /**
   * Réinitialise les statistiques
   */
  resetStats() {
    this.stats = {
      totalDetections: 0,
      validDetections: 0,
      invalidDetections: 0,
      avgConfidence: 0
    };
    
    Logger.info('PitchService', 'Statistiques réinitialisées');
  }
  
  /**
   * Configure les callbacks
   * @param {object} callbacks - Objet avec onPitchDetected et onPitchSmoothed
   */
  setCallbacks(callbacks) {
    if (callbacks.onPitchDetected) {
      this.onPitchDetected = callbacks.onPitchDetected;
    }
    
    if (callbacks.onPitchSmoothed) {
      this.onPitchSmoothed = callbacks.onPitchSmoothed;
    }
    
    Logger.info('PitchService', 'Callbacks configurés');
  }
  
  /**
   * Configure le détecteur
   * @param {object} config - Configuration
   */
  setDetectorConfig(config) {
    if (!this.detector) {
      Logger.warn('PitchService', 'Détecteur non initialisé');
      return;
    }
    
    try {
      if (config.threshold !== undefined) {
        this.detector.setThreshold(config.threshold);
      }
      
      if (config.minHz !== undefined && config.maxHz !== undefined) {
        this.detector.setRange(config.minHz, config.maxHz);
      }
      
      Logger.success('PitchService', 'Configuration détecteur mise à jour');
      
    } catch (error) {
      Logger.error('PitchService', 'Erreur config détecteur', error);
    }
  }
  
  /**
   * Configure le smoother
   * @param {object} config - Configuration
   */
  setSmootherConfig(config) {
    if (!this.smoother) {
      Logger.warn('PitchService', 'Smoother non initialisé');
      return;
    }
    
    try {
      this.smoother.setConfig(config);
      Logger.success('PitchService', 'Configuration smoother mise à jour');
      
    } catch (error) {
      Logger.error('PitchService', 'Erreur config smoother', error);
    }
  }
}

// Créer une instance unique (singleton)
const pitchService = new PitchService();

// Exporter l'instance
export default pitchService;
