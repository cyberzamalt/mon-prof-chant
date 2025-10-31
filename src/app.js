/**
 * src/app.js — Orchestrateur
 */
import { Logger } from './logging/Logger.js';
import { EventBus } from './core/EventBus.js';
import { AudioEngine } from './audio/core/AudioEngine.js';
import { MicrophoneManager } from './audio/core/MicrophoneManager.js'; // ✅ import nommé (pas de /src/)
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
    Logger.info('[App] 🚀 Initialisation de l\'application...');
  }

  async init() {
    if (this.#isInitialized) return;
    this.#configureLogger();
    await this.#loadExternalDependencies();
    await this.#createCoreServices();
    await this.#createAudioServices();
    await this.#createPanels();
    this.#connectEvents();
    this.#isInitialized = true;
    Logger.info('[App] ✅ Application initialisée avec succès');
    this.#eventBus.emit('app:initialized', { timestamp: Date.now() });
  }

  #configureLogger() {
    const isDev = ['localhost','127.0.0.1'].includes(location.hostname);
    Logger.setLevel(isDev ? 'DEBUG' : 'INFO');
    Logger.info('[App] Mode:', isDev ? 'Development' : 'Production');
  }

  async #loadExternalDependencies() {
    if (!window.YinDetector) throw new Error('YinDetector requis (vendor/yin-detector.js)');
    this.#yinDetector = new window.YinDetector();
    Logger.info('[App] YinDetector chargé');

    if (!window.PitchSmoother) throw new Error('PitchSmoother requis (utils/pitch-smoothing.js)');
    this.#pitchSmoother = new window.PitchSmoother();
    Logger.info('[App] PitchSmoother chargé');
  }

  async #createCoreServices() {
    this.#eventBus = new EventBus();
    Logger.info('[App] EventBus créé');

    this.#audioEngine = AudioEngine.getInstance();
    Logger.info('[App] AudioEngine récupéré');
  }

  async #createAudioServices() {
    this.#centsCalculator = new CentsCalculator(440);
    Logger.info('[App] CentsCalculator créé');

    this.#pitchAnalysisService = new PitchAnalysisService(
      this.#yinDetector, this.#pitchSmoother, this.#centsCalculator
    );
    this.#pitchAnalysisService.setMode('A440');
    Logger.info('[App] PitchAnalysisService créé');

    this.#microphoneManager = new MicrophoneManager();
    Logger.info('[App] MicrophoneManager créé');

    this.#recordingService = new RecordingService(
      this.#audioEngine, this.#eventBus, this.#microphoneManager
    );
    Logger.info('[App] RecordingService créé');
  }

  async #createPanels() {
    this.#panels.recording = new PitchAnalysisPanel({
      type: 'recording',
      containerId: 'panel-recording',
      canvasId: 'canvas-recording',
      pitchService: this.#pitchAnalysisService,
      eventBus: this.#eventBus,
      audioEngine: this.#audioEngine,        // ✅ pour le renderer
      microphone: this.#microphoneManager    // ✅ pour le renderer
    });
    Logger.info('[App] Panneau Recording créé');

    const refContainer = document.getElementById('panel-reference');
    if (refContainer) {
      this.#panels.reference = new PitchAnalysisPanel({
        type: 'reference',
        containerId: 'panel-reference',
        canvasId: 'canvas-reference',
        pitchService: this.#pitchAnalysisService,
        eventBus: this.#eventBus,
        audioEngine: this.#audioEngine,
        microphone: this.#microphoneManager
      });
      Logger.info('[App] Panneau Reference créé');
    }
  }

  #connectEvents() {
    // Micro
    this.#eventBus.on('microphone:started', () => {
      Logger.info('[App] Microphone démarré');
    });
    this.#eventBus.on('microphone:error', (e) => {
      Logger.error('[App] Erreur microphone', e?.error);
    });

    // Recording → ajoute une barre de lecture + download (sans toucher au HTML)
    this.#eventBus.on('recording:stopped', ({ blob, url, duration }) => {
      this.#ensurePlaybackBar(url, blob, duration);
      Logger.info('[App] Enregistrement arrêté', { duration });
    });

    if (Logger.getLevel() === 'DEBUG') {
      this.#eventBus.on('*', (name, data) => Logger.debug('[App] Évt', name, data));
    }

    Logger.info('[App] Événements connectés');
  }

  async start() {
    if (this.#isStarted) return;

    // Initialise AudioContext sur geste utilisateur
    await this.#audioEngine.init();
    Logger.info('[AudioEngine] Contexte prêt', this.#audioEngine?.context);

    // Lance le micro
    await this.#microphoneManager.start();
    this.#eventBus.emit('microphone:started');

    // Lance le panneau principal (le renderer se connecte à l’Analyser)
    this.#panels.recording?.start();

    this.#isStarted = true;
    Logger.info('[App] ✅ Application démarrée');
  }

  stop() {
    this.#panels.recording?.stop();
    this.#microphoneManager?.stop();
    this.#isStarted = false;
    this.#eventBus.emit('app:stopped', { timestamp: Date.now() });
  }

  // Mini lecteur intégré (créé dynamiquement)
  #ensurePlaybackBar(url, blob, durationMs) {
    let bar = document.getElementById('mpc-playback-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'mpc-playback-bar';
      bar.style.position = 'fixed';
      bar.style.left = '0';
      bar.style.right = '0';
      bar.style.bottom = '0';
      bar.style.background = '#0f172a';
      bar.style.borderTop = '1px solid #334155';
      bar.style.padding = '10px 12px';
      bar.style.display = 'flex';
      bar.style.gap = '12px';
      bar.style.alignItems = 'center';
      bar.style.zIndex = '9999';
      document.body.appendChild(bar);
    } else {
      bar.innerHTML = '';
    }

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;
    audio.style.flex = '1';

    const a = document.createElement('a');
    a.textContent = '⬇️ Télécharger';
    a.download = `enregistrement_${Math.floor(Date.now()/1000)}.webm`;
    a.href = url;
    a.style.color = '#e2e8f0';
    a.style.textDecoration = 'none';

    const span = document.createElement('span');
    span.textContent = `Durée ~ ${(durationMs/1000).toFixed(1)} s`;
    span.style.color = '#94a3b8';

    bar.appendChild(audio);
    bar.appendChild(span);
    bar.appendChild(a);
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

  getPanel(name) {
    return this.#panels[name] || null;
  }

  isInitialized() { return this.#isInitialized; }
  isStarted() { return this.#isStarted; }
}

// Instance unique
const app = new App();
window.App = app;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    Logger.info('[App] DOM chargé, initialisation...');
    await app.init();
    Logger.info('[App] Prêt! Cliquez sur "Démarrer" pour lancer.');
  } catch (e) {
    Logger.error('[App] Échec initialisation au chargement DOM', e);
  }
});

export default app;
