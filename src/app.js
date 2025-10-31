// src/app.js
/**
 * Orchestrateur principal
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

class App {
  #eventBus = null;
  #audioEngine = null;

  #microphoneManager = null;
  #pitchAnalysisService = null;
  #recordingService = null;
  #centsCalculator = null;

  #yinDetector = null;
  #pitchSmoother = null;

  #panels = {};
  #isInitialized = false;
  #isStarted = false;

  constructor() {
    Logger.info('App', '🚀 Initialisation de l\'application...');
  }

  async init() {
    try {
      if (this.#isInitialized) return;

      this.#configureLogger();
      await this.#loadExternalDependencies();
      await this.#createCoreServices();
      await this.#createAudioServices();
      await this.#createPanels();
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
    const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    Logger.setLevel(isDev ? 'DEBUG' : 'INFO');
    Logger.info('App', `Mode: ${isDev ? 'Development' : 'Production'}`);
  }

  async #loadExternalDependencies() {
    if (!window.YinDetector) throw new Error('YinDetector requis (vendor/yin-detector.js)');
    if (!window.PitchSmoother) throw new Error('PitchSmoother requis (utils/pitch-smoothing.js)');
    this.#yinDetector = new window.YinDetector();
    this.#pitchSmoother = new window.PitchSmoother();
    Logger.info('App', 'YinDetector chargé');
    Logger.info('App', 'PitchSmoother chargé');
  }

  async #createCoreServices() {
    this.#eventBus = new EventBus();
    Logger.info('App', 'EventBus créé');

    this.#audioEngine = AudioEngine.getInstance();
    Logger.info('App', 'AudioEngine récupéré');
  }

  async #createAudioServices() {
    this.#centsCalculator = new CentsCalculator(440);
    Logger.info('App', 'CentsCalculator créé');

    this.#pitchAnalysisService = new PitchAnalysisService(
      this.#yinDetector,
      this.#pitchSmoother,
      this.#centsCalculator
    );
    this.#pitchAnalysisService.setMode('A440');
    Logger.info('App', 'PitchAnalysisService créé');

    this.#microphoneManager = new MicrophoneManager(this.#audioEngine, this.#eventBus);
    Logger.info('App', 'MicrophoneManager créé');

    this.#recordingService = new RecordingService(
      this.#audioEngine,
      this.#eventBus,
      this.#microphoneManager
    );
    Logger.info('App', 'RecordingService créé');
  }

  async #createPanels() {
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
  }

  #connectEvents() {
    // Micro
    this.#eventBus.on('microphone:started', () => {
      Logger.info('App', 'Microphone démarré');
      this.#showNotification('success', MESSAGES.SUCCESS.MIC_STARTED);
    });
    this.#eventBus.on('microphone:error', (d) => {
      Logger.error('App', 'Erreur microphone', d.error);
      this.#showNotification('error', MESSAGES.ERROR.MIC_ACCESS_DENIED);
    });

    // Enregistrement
    this.#eventBus.on('recording:started', () => {
      Logger.info('App', 'Enregistrement démarré');
      this.#showNotification('success', MESSAGES.SUCCESS.RECORDING_STARTED);
    });

    // Alimente le lecteur et le lien de téléchargement automatiquement
    this.#eventBus.on('recording:stopped', ({ blob, url, duration }) => {
      Logger.info('App', 'Enregistrement arrêté ', { duration });
      this.#showNotification('success', MESSAGES.SUCCESS.RECORDING_STOPPED);

      const panel = document.getElementById('panel-recording');
      if (!panel) return;

      let wrap = panel.querySelector('#playback-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'playback-wrap';
        wrap.style.marginTop = '12px';

        const audio = document.createElement('audio');
        audio.id = 'last-recording-player';
        audio.controls = true;
        audio.style.width = '100%';

        const row = document.createElement('div');
        row.style.marginTop = '8px';

        const a = document.createElement('a');
        a.id = 'last-recording-download';
        a.textContent = '💾 Télécharger l’enregistrement';
        a.download = 'recording.webm';

        row.appendChild(a);
        wrap.appendChild(audio);
        wrap.appendChild(row);
        panel.appendChild(wrap);
      }

      const player = wrap.querySelector('#last-recording-player');
      const dl = wrap.querySelector('#last-recording-download');

      player.src = url;
      player.load();

      const ext = (blob?.type || '').includes('ogg') ? 'ogg' : 'webm';
      dl.href = url;
      dl.download = `recording.${ext}`;
    });

    Logger.info('App', 'Événements connectés');
  }

  async start() {
    try {
      if (this.#isStarted) {
        Logger.warn('App', 'Déjà démarré');
        return;
      }

      Logger.info('App', 'Démarrage de l\'application...');
      await this.#audioEngine.init();
      Logger.info('App', '[AudioEngine] Contexte prêt', this.#audioEngine.context);

      // Micro ON
      const { source } = await this.#microphoneManager.start();
      Logger.info('App', 'Microphone démarré');

      // Brancher la source au panneau pour la waveform
      this.#panels.recording?.setAudioSource(source, this.#audioEngine.context);
      this.#panels.recording?.start();

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
      if (this.#panels.recording?.isActive()) this.#panels.recording.stop();
      if (this.#recordingService?.isRecording()) this.#recordingService.stop();
      this.#microphoneManager?.stop();

      this.#isStarted = false;
      this.#eventBus.emit('app:stopped', { timestamp: Date.now() });
      Logger.info('App', 'Application arrêtée');
    } catch (err) {
      Logger.error('App', 'Erreur stop', err);
    }
  }

  getService(name) {
    const map = {
      eventBus: this.#eventBus,
      audioEngine: this.#audioEngine,
      microphone: this.#microphoneManager,
      pitchAnalysis: this.#pitchAnalysisService,
      recording: this.#recordingService,
      centsCalculator: this.#centsCalculator
    };
    return map[name] || null;
  }

  getPanel(name) { return this.#panels[name] || null; }
  isInitialized() { return this.#isInitialized; }
  isStarted() { return this.#isStarted; }

  #showNotification(type, message) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    if (type === 'error') Logger.error('App', message);
  }

  #handleInitError(err) {
    const msg = err?.message || 'Erreur inconnue';
    if (msg.includes('YinDetector')) this.#showNotification('error', 'Erreur: YinDetector non chargé.');
    else if (msg.includes('PitchSmoother')) this.#showNotification('error', 'Erreur: PitchSmoother non chargé.');
    else this.#showNotification('error', `Erreur d'initialisation: ${msg}`);
  }

  #handleStartError(err) {
    const msg = err?.message || 'Erreur inconnue';
    if (msg.includes('microphone') || msg.includes('getUserMedia'))
      this.#showNotification('error', MESSAGES.ERROR.MIC_ACCESS_DENIED);
    else if (msg.includes('AudioContext'))
      this.#showNotification('error', MESSAGES.ERROR.AUDIO_CONTEXT_FAILED);
    else
      this.#showNotification('error', `Erreur de démarrage: ${msg}`);
  }
}

const app = new App();
window.App = app;

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
