// src/ui/components/PitchAnalysisPanel.js
// Orchestre : Pitch Detection → Smoothing → Visualization → Metrics
// VERSION ANALYSER (sans ScriptProcessor)
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
    this.analyser = null; // AnalyserNode (remplace ScriptProcessor)
    this.active = false;
    this.canvas = null;
    this.metricsLoopId = null; // ID de la boucle RAF pour métriques
    
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
        clarityThreshold: 0.5
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

    // 3. Créer AnalyserNode
    try {
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 2048; // Buffer de 2048 samples
      this.analyser.smoothingTimeConstant = 0; // Pas de lissage (on le fait nous-mêmes)
      Logger.info('[PitchAnalysisPanel] AnalyserNode créé', { 
        fftSize: this.analyser.fftSize,
        bufferSize: this.analyser.frequencyBinCount
      });
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur création AnalyserNode', e);
      throw e;
    }

    // 4. Connecter AnalyserNode au microphone
    const micSource = audioEngine.micSource;
    if (micSource) {
      try {
        micSource.connect(this.analyser);
        Logger.info('[PitchAnalysisPanel] AnalyserNode connecté au microphone');
      } catch (e) {
        Logger.error('[PitchAnalysisPanel] Erreur connexion AnalyserNode', e);
        throw e;
      }
    } else {
      Logger.warn('[PitchAnalysisPanel] Pas de source micro disponible');
    }

    // 5. Créer SinusoidalRenderer
    try {
      this.renderer = new SinusoidalRenderer(canvasEl, { persistent: true });
      this.renderer.attachPitchDetector(this.pitchDetector, this.pitchSmoother);
      this.renderer.attachAnalyser(this.analyser);
      Logger.info('[PitchAnalysisPanel] SinusoidalRenderer créé et connecté');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur création renderer', e);
      throw e;
    }

    // 6. Démarrer le renderer (boucle de visualisation)
    this.renderer.start();

    // 7. Démarrer la boucle de mise à jour des métriques
    this._startMetricsLoop();

    this.active = true;
    Logger.info('[PitchAnalysisPanel] ✅ Panneau démarré avec succès');
  }

  /**
   * Démarrer la boucle de mise à jour des métriques UI
   * Lit les données pitch depuis le renderer et met à jour l'affichage
   */
  _startMetricsLoop() {
    const updateMetrics = () => {
      if (!this.active || !this.renderer) return;

      // Lire l'historique du renderer (derniers points détectés)
      const history = this.renderer.pitchHistory;
      
      if (history && history.length > 0) {
        // Prendre le dernier point
        const lastPoint = history[history.length - 1];
        
        if (lastPoint && lastPoint.frequency) {
          // Calculer note et cents depuis la fréquence
          const noteData = this._frequencyToNoteData(lastPoint.frequency);
          
          this.lastMetrics = {
            frequency: Math.round(lastPoint.frequency * 10) / 10,
            note: noteData.note,
            cents: noteData.cents
          };
          
          this._updateMetrics();
        }
      }

      // Continuer la boucle
      this.metricsLoopId = requestAnimationFrame(updateMetrics);
    };

    this.metricsLoopId = requestAnimationFrame(updateMetrics);
    Logger.info('[PitchAnalysisPanel] Boucle métriques démarrée');
  }

  /**
   * Convertir fréquence en note + cents (helper local)
   */
  _frequencyToNoteData(frequency) {
    try {
      // Utiliser CentsCalculator si disponible
      const { CentsCalculator } = await import('../../audio/analysis/CentsCalculator.js');
      return CentsCalculator.frequencyToNote(frequency);
    } catch (e) {
      // Fallback simple si import échoue
      Logger.warn('[PitchAnalysisPanel] CentsCalculator non disponible, calcul simplifié');
      return {
        note: '—',
        cents: 0
      };
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

    // Arrêter la boucle métriques
    if (this.metricsLoopId) {
      cancelAnimationFrame(this.metricsLoopId);
      this.metricsLoopId = null;
      Logger.info('[PitchAnalysisPanel] Boucle métriques arrêtée');
    }

    // Arrêter le renderer
    try { 
      this.renderer?.stop(); 
      Logger.info('[PitchAnalysisPanel] Renderer arrêté');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur arrêt renderer', e);
    }

    // Déconnecter l'AnalyserNode
    try {
      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }
      Logger.info('[PitchAnalysisPanel] AnalyserNode déconnecté');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur déconnexion AnalyserNode', e);
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
      
      // Arrêter aussi la boucle métriques
      if (this.metricsLoopId) {
        cancelAnimationFrame(this.metricsLoopId);
        this.metricsLoopId = null;
      }
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
