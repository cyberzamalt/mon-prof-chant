/**
 * app.js
 * Orchestrateur principal de l'application
 *
 * Responsabilités:
 * - Point d'entrée de l'application
 * - Initialisation de tous les services
 * - Création des panneaux UI
 * - Connexion des événements globaux
 * - Gestion du cycle de vie de l'application
 *
 * Architecture:
 * 1. Charger les dépendances externes (YIN, PitchSmoother)
 * 2. Créer les services core (AudioEngine, EventBus, Logger)
 * 3. Créer les services audio (Microphone, Pitch, Recording)
 * 4. Créer les panneaux UI
 * 5. Connecter les événements
 * 6. Émettre app:ready
 */

import { Logger } from './logging/Logger.js';
import { EventBus } from './core/EventBus.js';
import { AudioEngine } from './audio/core/AudioEngine.js';
import MicrophoneManager from './audio/core/MicrophoneManager.js';
import { PitchAnalysisService } from './audio/services/PitchAnalysisService.js';
import { RecordingService } from './audio/services/RecordingService.js';
import { CentsCalculator } from './audio/analysis/CentsCalculator.js';
import { PitchAnalysisPanel } from './ui/components/PitchAnalysisPanel.js';
import { MESSAGES } from './config/uiSettings.js';

/**
 * Classe principale de l'application
 */
class App {
  // Services core
  #eventBus = null;
  #audioEngine = null;
  #logger = null;

  // Services audio
  #microphoneManager = null;
  #pitchAnalysisService = null;
  #recordingService = null;
  #centsCalculator = null;

  // Détecteurs externes
  #yinDetector = null;
  #pitchSmoother = null;

  // Panneaux UI
  #panels = {};

  // État
  #isInitialized = false;
  #isStarted = false;

  constructor() {
    Logger.info('App', '🚀 Initialisation de l\'application...');
  }

  async init() {
    try {
      if (this.#isInitialized) {
        Logger.warn('App', 'Déjà initialisé');
        return;
      }

      Logger.info('App', 'Étape 1/6: Configuration Logger');
      this.#configureLogger();

      Logger.info('App', 'Étape 2/6: Chargement dépendances externes');
      await this.#loadExternalDependencies();

      Logger.info('App', 'Étape 3/6: Création services core');
      await this.#createCoreServices();

      Logger.info('App', 'Étape 4/6: Création services audio');
      await this.#createAudioServices();

      Logger.info('App', 'Étape 5/6: Création panneaux UI');
      await this.#createPanels();

      Logger.info('App', 'Étape 6/6: Connexion événements');
      this.#connectEvents();

      this.#isInitialized = true;

      Logger.info('App', '✅ Application initialisée avec succès');
      this.#eventBus.emit('app:initialized', { timestamp: Date.now() });

    } catch (err) {
      Logger.error('App', 'Erreur initialisation', err);
      this.#handleInitError(err);
      throw err;
    }
  }

  #configureLogger() {
    try {
      const isDev = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';
      Logger.setLevel(isDev ? 'DEBUG' : 'INFO');
      Logger.info('App', `Mode: ${isDev ? 'Development' : 'Production'}`);
    } catch (err) {
      console.error('[App] Erreur configureLogger:', err);
    }
  }

  async #loadExternalDependencies() {
    try {
      if (!window.YinDetector) {
        Logger.warn('App', 'YinDetector non chargé');
        throw new Error('YinDetector requis (vendor/yin-detector.js)');
      }
      this.#yinDetector = new window.YinDetector();
      Logger.info('App', 'YinDetector chargé');

      if (!window.PitchSmoother) {
        Logger.warn('App', 'PitchSmoother non chargé');
        throw new Error('PitchSmoother requis (utils/pitch-smoothing.js)');
      }
      this.#pitchSmoother = new window.PitchSmoother();
      Logger.info('App', 'PitchSmoother chargé');

    } catch (err) {
      Logger.error('App', 'Erreur loadExternalDependencies', err);
      throw err;
    }
  }

  async #createCoreServices() {
    try {
      this.#eventBus = new EventBus();
      Logger.info('App', 'EventBus créé');

      this.#audioEngine = AudioEngine.getInstance();
      Logger.info('App', 'AudioEngine récupéré');
      // L’AudioContext sera créé au premier start()
    } catch (err) {
      Logger.error('App', 'Erreur createCoreServices', err);
      throw err;
    }
  }

  async #createAudioServices() {
    try {
      this.#centsCalculator = new CentsCalculator(440); // A4 = 440Hz
      Logger.info('App', 'CentsCalculator créé');

      this.#pitchAnalysisService = new PitchAnalysisService(
        this.#yinDetector,
        this.#pitchSmoother,
        this.#centsCalculator
      );
      this.#pitchAnalysisService.setMode('A440');
      Logger.info('App', 'PitchAnalysisService créé');

      // MicrophoneManager n’a pas besoin de params: il récupère l’AudioContext depuis AudioEngine
      this.#microphoneManager = new MicrophoneManager();
      Logger.info('App', 'MicrophoneManager créé');

      this.#recordingService = new RecordingService(
        this.#audioEngine,
        this.#eventBus,
        this.#microphoneManager
      );
      Logger.info('App', 'RecordingService créé');

    } catch (err) {
      Logger.error('App', 'Erreur createAudioServices', err);
      throw err;
    }
  }

  async #createPanels() {
    try {
      this.#panels.recording = new PitchAnalysisPanel({
        type: 'recording',
        containerId: 'panel-recording',
        canvasId: 'canvas-recording',
        pitchService: this.#pitchAnalysisService,
        eventBus: this.#eventBus
      });
      Logger.info('App', 'Panneau Recording créé');

      const refContainer = document.getElementById('panel-reference');
      if (refContainer) {
        this.#panels.reference = new PitchAnalysisPanel({
          type: 'reference',
          containerId: 'panel-reference',
          canvasId: 'canvas-reference',
          pitchService: this.#pitchAnalysisService,
          eventBus: this.#eventBus
        });
        Logger.info('App', 'Panneau Reference créé');
      }

    } catch (err) {
      Logger.error('App', 'Erreur createPanels', err);
      Logger.warn('App', 'Certains panneaux UI non créés, application continue');
    }
  }

  #connectEvents() {
    try {
      this.#eventBus.on('microphone:started', () => {
        Logger.info('App', 'Microphone démarré');
        this.#showNotification('success', MESSAGES.SUCCESS.MIC_STARTED);
      });

      this.#eventBus.on('microphone:error', (data) => {
        Logger.error('App', 'Erreur microphone', data?.error);
        this.#showNotification('error', MESSAGES.ERROR.MIC_ACCESS_DENIED);
      });

      this.#eventBus.on('recording:started', () => {
        Logger.info('App', 'Enregistrement démarré');
        this.#showNotification('success', MESSAGES.SUCCESS.RECORDING_STARTED);
      });

      this.#eventBus.on('recording:stopped', (data) => {
        Logger.info('App', 'Enregistrement arrêté', data);
        this.#showNotification('success', MESSAGES.SUCCESS.RECORDING_STOPPED);
      });

      this.#eventBus.on('recording:error', (data) => {
        Logger.error('App', 'Erreur enregistrement', data?.error);
        this.#showNotification('error', MESSAGES.ERROR.RECORDING_FAILED);
      });

      if (Logger.getLevel() === 'DEBUG') {
        this.#eventBus.on('*', (eventName, data) => {
          Logger.debug('App', `Événement: ${eventName}`, data);
        });
      }

      Logger.info('App', 'Événements connectés');

    } catch (err) {
      Logger.error('App', 'Erreur connectEvents', err);
    }
  }

  async start() {
    try {
      if (this.#isStarted) {
        Logger.warn('App', 'Déjà démarré');
        return;
      }

      Logger.info('App', 'Démarrage de l\'application...');

      await this.#audioEngine.init(); // crée l’AudioContext
      Logger.info('App', 'AudioContext initialisé');

      await this.#microphoneManager.start(); // utilise le MÊME AudioContext
      Logger.info('App', 'Microphone démarré');

      this.#isStarted = true;

      Logger.info('App', '✅ Application démarrée');
      this.#eventBus.emit('app:started', { timestamp: Date.now() });

    } catch (err) {
      Logger.error('App', 'Erreur start', err);
      this.#handleStartError(err);
      throw err;
    }
  }

  stop() {
    try {
      Logger.info('App', 'Arrêt de l\'application...');

      if (this.#microphoneManager) this.#microphoneManager.stop();
      if (this.#recordingService && this.#recordingService.isRecording()) {
        this.#recordingService.stop();
      }

      Object.values(this.#panels).forEach(panel => {
        if (panel && panel.isActive && panel.isActive()) panel.stop();
      });

      this.#isStarted = false;

      Logger.info('App', 'Application arrêtée');
      this.#eventBus.emit('app:stopped', { timestamp: Date.now() });

    } catch (err) {
      Logger.error('App', 'Erreur stop', err);
    }
  }

  #showNotification(type, message) {
    try {
      console.log(`[${type.toUpperCase()}] ${message}`);
      if (type === 'error') {
        Logger.error('App', message);
      }
    } catch (err) {
      Logger.error('App', 'Erreur showNotification', err);
    }
  }

  #handleInitError(err) {
    try {
      const errorMessage = err?.message || 'Erreur inconnue';
      if (errorMessage.includes('YinDetector')) {
        this.#showNotification('error',
          'Erreur: YinDetector non chargé. Vérifiez que vendor/yin-detector.js est inclus.');
      } else if (errorMessage.includes('PitchSmoother')) {
        this.#showNotification('error',
          'Erreur: PitchSmoother non chargé. Vérifiez que utils/pitch-smoothing.js est inclus.');
      } else {
        this.#showNotification('error', `Erreur d\'initialisation: ${errorMessage}`);
      }
    } catch (err2) {
      console.error('[App] Erreur handleInitError:', err2);
    }
  }

  #handleStartError(err) {
    try {
      const errorMessage = err?.message || 'Erreur inconnue';
      if (errorMessage.includes('microphone') || errorMessage.includes('getUserMedia')) {
        this.#showNotification('error', MESSAGES.ERROR.MIC_ACCESS_DENIED);
      } else if (errorMessage.includes('AudioContext')) {
        this.#showNotification('error', MESSAGES.ERROR.AUDIO_CONTEXT_FAILED);
      } else {
        this.#showNotification('error', `Erreur de démarrage: ${errorMessage}`);
      }
    } catch (err2) {
      console.error('[App] Erreur handleStartError:', err2);
    }
  }

  getService(serviceName) {
    const services = {
      eventBus: this.#eventBus,
      audioEngine: this.#audioEngine,
      microphone: this.#microphoneManager,
      pitchAnalysis: this.#pitchAnalysisService,
      recording: this.#recordingService,
      centsCalculator: this.#centsCalculator
    };
    return services[serviceName] || null;
  }

  getPanel(panelName) {
    return this.#panels[panelName] || null;
  }

  isInitialized() {
    return this.#isInitialized;
  }

  isStarted() {
    return this.#isStarted;
  }
}

// Export de l'instance unique
const app = new App();
window.App = app;

// Auto-initialisation
document.addEventListener('DOMContentLoaded', async () => {
  try {
    Logger.info('App', 'DOM chargé, initialisation...');
    await app.init();
    Logger.info('App', 'Prêt! Cliquez sur "Démarrer" pour lancer.');
  } catch (err) {
    Logger.error('App', 'Échec initialisation au chargement DOM', err);
  }
});

export default app;
