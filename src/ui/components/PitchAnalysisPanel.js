// src/ui/components/PitchAnalysisPanel.js
// Orchestre : Pitch Detection → Smoothing → Visualization → Metrics
// VERSION ANALYSER (sans ScriptProcessor)
import { Logger } from '../../logging/Logger.js';
import { audioEngine } from '../../audio/core/AudioEngine.js';
import { SinusoidalRenderer } from '../../visualization/renderers/SinusoidalRenderer.js';
import { PitchDetector } from '../../audio/analysis/PitchDetector.js';
import { PitchSmoother } from '../../audio/dsp/PitchSmoother.js';
import { CentsCalculator } from '../../audio/analysis/CentsCalculator.js';

export class PitchAnalysisPanel {
  constructor() {
    this.renderer = null;
    this.pitchDetector = null;
    this.pitchSmoother = null;
    this.analyser = null;
    this.active = false;
    this.canvas = null;
    this.metricsLoopId = null;
    
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

    this.canvas = canvasEl;

    const context = audioEngine.context;
    if (!context) {
      const err = new Error('AudioEngine non initialisé');
      Logger.error('[PitchAnalysisPanel]', err);
      throw err;
    }

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

    this.pitchSmoother = new PitchSmoother({
      medianSize: 5,
      emaAlpha: 0.3,
      maxJumpCents: 100
    });
    Logger.info('[PitchAnalysisPanel] PitchSmoother créé');

    try {
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0;
      Logger.info('[PitchAnalysisPanel] AnalyserNode créé', { 
        fftSize: this.analyser.fftSize,
        bufferSize: this.analyser.frequencyBinCount
      });
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur création AnalyserNode', e);
      throw e;
    }

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

    try {
      this.renderer = new SinusoidalRenderer(canvasEl, { persistent: true });
      this.renderer.attachPitchDetector(this.pitchDetector, this.pitchSmoother);
      this.renderer.attachAnalyser(this.analyser);
      Logger.info('[PitchAnalysisPanel] SinusoidalRenderer créé et connecté');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur création renderer', e);
      throw e;
    }

    this.renderer.start();

    this._startMetricsLoop();

    this.active = true;
    Logger.info('[PitchAnalysisPanel] ✅ Panneau démarré avec succès');
  }

  _startMetricsLoop() {
    const updateMetrics = () => {
      if (!this.active || !this.renderer) return;

      const history = this.renderer.pitchHistory;
      
      if (history && history.length > 0) {
        const lastPoint = history[history.length - 1];
        
        if (lastPoint && lastPoint.frequency) {
          const noteData = this._frequencyToNoteData(lastPoint.frequency);
          
          this.lastMetrics = {
            frequency: Math.round(lastPoint.frequency * 10) / 10,
            note: noteData.note,
            cents: noteData.cents
          };
          
          this._updateMetrics();
        }
      }

      this.metricsLoopId = requestAnimationFrame(updateMetrics);
    };

    this.metricsLoopId = requestAnimationFrame(updateMetrics);
    Logger.info('[PitchAnalysisPanel] Boucle métriques démarrée');
  }

  _frequencyToNoteData(frequency) {
    try {
      return CentsCalculator.frequencyToNote(frequency);
    } catch (e) {
      Logger.warn('[PitchAnalysisPanel] Erreur conversion fréquence', e);
      return {
        note: '—',
        cents: 0
      };
    }
  }

  _updateMetrics() {
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
        
        if (Math.abs(cents) <= 10) {
          centsEl.style.color = '#10b981';
        } else if (Math.abs(cents) <= 25) {
          centsEl.style.color = '#f59e0b';
        } else {
          centsEl.style.color = '#ef4444';
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

    if (this.metricsLoopId) {
      cancelAnimationFrame(this.metricsLoopId);
      this.metricsLoopId = null;
      Logger.info('[PitchAnalysisPanel] Boucle métriques arrêtée');
    }

    try { 
      this.renderer?.stop(); 
      Logger.info('[PitchAnalysisPanel] Renderer arrêté');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur arrêt renderer', e);
    }

    try {
      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }
      Logger.info('[PitchAnalysisPanel] AnalyserNode déconnecté');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur déconnexion AnalyserNode', e);
    }

    if (this.pitchSmoother) {
      this.pitchSmoother.reset();
    }

    this.renderer = null;
    this.pitchDetector = null;
    this.pitchSmoother = null;
    this.canvas = null;
    this.active = false;
    
    this.lastMetrics = { frequency: 0, note: '—', cents: 0 };
    this._updateMetrics();
    
    Logger.info('[PitchAnalysisPanel] ✅ Panneau arrêté');
  }

  clear() { 
    if (this.renderer) {
      Logger.info('[PitchAnalysisPanel] Effacement du canvas');
      this.renderer.clear();
      
      this.lastMetrics = { frequency: 0, note: '—', cents: 0 };
      this._updateMetrics();
    } else {
      Logger.warn('[PitchAnalysisPanel] Pas de renderer à effacer');
    }
  }

  freeze() {
    if (this.renderer) {
      Logger.info('[PitchAnalysisPanel] Gel du tracé');
      this.renderer.stop();
      
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
  }

  getMetrics() {
    return { ...this.lastMetrics };
  }
}
