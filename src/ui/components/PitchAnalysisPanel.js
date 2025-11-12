// src/ui/components/PitchAnalysisPanel.js
// Orchestre : Pitch Detection → Smoothing → Visualization → Metrics
import { Logger } from '../../logging/Logger.js';
import { audioEngine } from '../../audio/core/AudioEngine.js';
import { SinusoidalRenderer } from '../../visualization/renderers/SinusoidalRenderer.js';
import { PitchDetector } from '../../audio/analysis/PitchDetector.js';
import { PitchSmoother } from '../../audio/dsp/PitchSmoother.js';

export class PitchAnalysisPanel {
  constructor() {
    this.renderer = null;
    this.pitchDetector = null;
    this.pitchSmoother = null;
    this.scriptProcessor = null;
    this.active = false;
    this.canvas = null;
    
    // Buffer pour pitch detection
    this.audioBuffer = null;
    
    // Dernières métriques détectées
    this.lastMetrics = {
      frequency: 0,
      note: '—',
      cents: 0
    };
    
    Logger.info('[PitchAnalysisPanel] Panneau créé');
  }

  start(canvasEl) {
    if (this.active) {
      Logger.warn('[PitchAnalysisPanel] Déjà actif');
      return;
    }
    
    if (!canvasEl) {
      const err = new Error('Canvas manquant');
      Logger.error('[PitchAnalysisPanel]', err);
      throw err;
    }

    Logger.info('[PitchAnalysisPanel] Démarrage...', { 
      canvasId: canvasEl.id,
      canvasSize: `${canvasEl.width}x${canvasEl.height}`
    });

    // Stocker canvas
    this.canvas = canvasEl;

    // Vérifier que l'AudioEngine est initialisé
    const context = audioEngine.context;
    if (!context) {
      const err = new Error('AudioEngine non initialisé');
      Logger.error('[PitchAnalysisPanel]', err);
      throw err;
    }

    // 1. Créer PitchDetector
    try {
      this.pitchDetector = new PitchDetector({
        sampleRate: context.sampleRate,
        threshold: 0.1,
        minFreq: 80,
        maxFreq: 1400,
        clarityThreshold: 0.85
      });
      Logger.info('[PitchAnalysisPanel] PitchDetector créé');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur création PitchDetector', e);
      throw e;
    }

    // 2. Créer PitchSmoother
    this.pitchSmoother = new PitchSmoother({
      medianSize: 5,
      emaAlpha: 0.3,
      maxJumpCents: 100
    });
    Logger.info('[PitchAnalysisPanel] PitchSmoother créé');

    // 3. Créer SinusoidalRenderer
    try {
      this.renderer = new SinusoidalRenderer(canvasEl, { persistent: true });
      this.renderer.attachPitchDetector(this.pitchDetector, this.pitchSmoother);
      Logger.info('[PitchAnalysisPanel] SinusoidalRenderer créé');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur création renderer', e);
      throw e;
    }

    // 4. Connecter au micro via ScriptProcessor
    this._setupAudioPipeline(context);

    // 5. Démarrer le renderer
    this.renderer.start();

    this.active = true;
    Logger.info('[PitchAnalysisPanel] ✅ Panneau démarré avec succès');
  }

  /**
   * Configurer le pipeline audio : Micro → ScriptProcessor → Pitch Detection
   */
  _setupAudioPipeline(context) {
    const micSource = audioEngine.micSource;
    
    if (!micSource) {
      Logger.warn('[PitchAnalysisPanel] Pas de source micro disponible');
      return;
    }

    // Créer ScriptProcessor pour analyser l'audio
    // Buffer size : 2048 samples = bon compromis latence/précision
    const bufferSize = 2048;
    this.scriptProcessor = context.createScriptProcessor(bufferSize, 1, 1);
    
    // Callback appelé pour chaque buffer audio
    this.scriptProcessor.onaudioprocess = (e) => {
      this._processAudioBuffer(e);
    };

    // Connecter : Micro → ScriptProcessor → Destination
    try {
      micSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(context.destination);
      Logger.info('[PitchAnalysisPanel] Pipeline audio connecté', { bufferSize });
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur connexion pipeline', e);
      throw e;
    }
  }

  /**
   * Traiter chaque buffer audio : détection + lissage + visualisation
   */
  _processAudioBuffer(event) {
    if (!this.active) return;

    // Récupérer les données audio (mono)
    const inputBuffer = event.inputBuffer;
    const audioData = inputBuffer.getChannelData(0);

    // Copier dans un Float32Array (YIN a besoin d'un buffer propre)
    const buffer = new Float32Array(audioData);

    try {
      // 1. Détecter pitch avec YIN
      const pitchData = this.pitchDetector.detect(buffer);

      // 2. Lisser la fréquence
      const frequency = pitchData ? pitchData.frequency : null;
      const smoothedFreq = this.pitchSmoother.smooth(frequency);

      // 3. Envoyer au renderer
      if (smoothedFreq !== null) {
        this.renderer.addPitchPoint(smoothedFreq);
        
        // Mettre à jour les métriques
        this.lastMetrics = {
          frequency: Math.round(smoothedFreq * 10) / 10,
          note: pitchData.note,
          cents: pitchData.cents
        };
        
        // Émettre événement pour mettre à jour l'UI (métriques)
        this._updateMetrics();
      }

    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur traitement buffer', e);
    }
  }

  /**
   * Mettre à jour les métriques affichées dans l'UI
   */
  _updateMetrics() {
    // Trouver les éléments DOM des métriques
    const freqEl = document.getElementById('mFreq');
    const noteEl = document.getElementById('mNote');
    const centsEl = document.getElementById('mCents');

    if (freqEl) {
      freqEl.textContent = this.lastMetrics.frequency > 0 
        ? `${this.lastMetrics.frequency} Hz` 
        : '—';
    }

    if (noteEl) {
      noteEl.textContent = this.lastMetrics.note || '—';
    }

    if (centsEl) {
      const cents = this.lastMetrics.cents;
      if (cents !== 0 && !isNaN(cents)) {
        const sign = cents > 0 ? '+' : '';
        centsEl.textContent = `${sign}${cents}`;
        
        // Couleur selon déviation
        if (Math.abs(cents) <= 10) {
          centsEl.style.color = '#10b981'; // Vert
        } else if (Math.abs(cents) <= 25) {
          centsEl.style.color = '#f59e0b'; // Jaune
        } else {
          centsEl.style.color = '#ef4444'; // Rouge
        }
      } else {
        centsEl.textContent = '—';
        centsEl.style.color = '';
      }
    }
  }

  stop() {
    if (!this.active) {
      Logger.warn('[PitchAnalysisPanel] Pas actif');
      return;
    }
    
    Logger.info('[PitchAnalysisPanel] Arrêt...');

    // Arrêter le renderer
    try { 
      this.renderer?.stop(); 
      Logger.info('[PitchAnalysisPanel] Renderer arrêté');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur arrêt renderer', e);
    }

    // Déconnecter le ScriptProcessor
    try {
      if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
        this.scriptProcessor = null;
      }
      Logger.info('[PitchAnalysisPanel] ScriptProcessor déconnecté');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur déconnexion ScriptProcessor', e);
    }

    // Reset smoothers
    if (this.pitchSmoother) {
      this.pitchSmoother.reset();
    }

    this.renderer = null;
    this.pitchDetector = null;
    this.pitchSmoother = null;
    this.canvas = null;
    this.active = false;
    
    // Reset métriques
    this.lastMetrics = { frequency: 0, note: '—', cents: 0 };
    this._updateMetrics();
    
    Logger.info('[PitchAnalysisPanel] ✅ Panneau arrêté');
  }

  clear() { 
    if (this.renderer) {
      Logger.info('[PitchAnalysisPanel] Effacement du canvas');
      this.renderer.clear();
      
      // Reset métriques
      this.lastMetrics = { frequency: 0, note: '—', cents: 0 };
      this._updateMetrics();
    } else {
      Logger.warn('[PitchAnalysisPanel] Pas de renderer à effacer');
    }
  }

  freeze() {
    // Garde le tracé actuel (arrête l'animation mais conserve l'image)
    if (this.renderer) {
      Logger.info('[PitchAnalysisPanel] Gel du tracé');
      this.renderer.stop();
    }
  }

  isActive() { 
    return this.active; 
  }

  setMode(mode) { 
    Logger.info('[PitchAnalysisPanel] setMode() appelé (réservé pour usage futur)', { mode });
    // Réservé pour modes de visualisation différents (Absolu/A440/Auto)
  }

  /**
   * Obtenir les dernières métriques détectées
   */
  getMetrics() {
    return { ...this.lastMetrics };
  }
}
