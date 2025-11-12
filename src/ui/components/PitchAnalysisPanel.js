// src/ui/components/PitchAnalysisPanel.js
import { Logger } from '../../logging/Logger.js';
import { audioEngine } from '../../audio/core/AudioEngine.js';
import { SinusoidalRenderer } from '../../visualization/renderers/SinusoidalRenderer.js';

export class PitchAnalysisPanel {
  constructor() {
    this.renderer = null;
    this.analyser = null;
    this.active = false;
    this.canvas = null;
    Logger.info('[PitchAnalysisPanel] Panneau créé');
  }

  start(canvasEl) {
    if (this.active) {
      Logger.warn('[PitchAnalysisPanel] Déjà actif, ignoré');
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

    // Stocker la référence au canvas
    this.canvas = canvasEl;

    // Créer un analyser depuis audioEngine
    try {
      this.analyser = audioEngine.createAnalyser({ 
        fftSize: 2048, 
        smoothingTimeConstant: 0.85 
      });
      Logger.info('[PitchAnalysisPanel] Analyser créé');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur création analyser', e);
      throw e;
    }

    // Connecter la source micro à l'analyser
    const micSource = audioEngine.micSource;
    if (micSource) {
      try {
        micSource.connect(this.analyser);
        Logger.info('[PitchAnalysisPanel] Source micro connectée à l\'analyser');
      } catch (e) {
        Logger.error('[PitchAnalysisPanel] Erreur connexion micro -> analyser', e);
        throw e;
      }
    } else {
      Logger.warn('[PitchAnalysisPanel] Pas de source micro disponible - visualisation sans audio');
    }

    // Créer le renderer sinusoidal avec mode persistent (scrolling)
    try {
      this.renderer = new SinusoidalRenderer(canvasEl, { persistent: true });
      this.renderer.attachAnalyser(this.analyser);
      this.renderer.start();
      Logger.info('[PitchAnalysisPanel] Renderer démarré en mode persistent');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur démarrage renderer', e);
      throw e;
    }

    this.active = true;
    Logger.info('[PitchAnalysisPanel] ✅ Panneau démarré avec succès');
  }

  stop() {
    if (!this.active) {
      Logger.warn('[PitchAnalysisPanel] Pas actif, ignoré');
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

    // Déconnecter l'analyser
    try { 
      this.analyser?.disconnect(); 
      Logger.info('[PitchAnalysisPanel] Analyser déconnecté');
    } catch (e) {
      Logger.error('[PitchAnalysisPanel] Erreur déconnexion analyser', e);
    }

    this.renderer = null;
    this.analyser = null;
    this.canvas = null;
    this.active = false;
    
    Logger.info('[PitchAnalysisPanel] ✅ Panneau arrêté');
  }

  clear() { 
    if (this.renderer) {
      Logger.info('[PitchAnalysisPanel] Effacement du canvas');
      this.renderer.clear(); 
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
    // Réservé pour usage futur (modes de visualisation différents)
  }
}
