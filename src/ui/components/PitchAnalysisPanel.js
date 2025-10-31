// src/ui/components/PitchAnalysisPanel.js
import { Logger } from '../../logging/Logger.js';
import { audioEngine } from '../../audio/core/AudioEngine.js';
import { SinusoidalRenderer } from '../../visualization/renderers/SinusoidalRenderer.js';

export class PitchAnalysisPanel {
  constructor({ type, eventBus }) {
    this.type = type;
    this.eventBus = eventBus;
    this.renderer = null;
    this.analyser = null;
    this.active = false;
    Logger.info('[PitchAnalysisPanel] Panneau prêt', { type });
  }

  start(canvasEl) {
    if (this.active) return;
    if (!canvasEl) throw new Error('Canvas manquant');

    // Analyser créé dans le contexte partagé
    this.analyser = audioEngine.createAnalyser({ fftSize: 2048, smoothingTimeConstant: 0.85 });

    // Si c'est le panneau “recording”, on relie la source micro
    if (this.type === 'recording') {
      const mic = window.App?.getService('microphone');
      const src = mic?.getSource?.();
      if (src) src.connect(this.analyser);
    }

    // Rendu sinusoidale persistante (défilement vers la gauche)
    this.renderer = new SinusoidalRenderer(canvasEl, { persistent: true });
    this.renderer.attachAnalyser(this.analyser);
    this.renderer.start();

    this.active = true;
    this.eventBus?.emit?.(`panel:${this.type}:started`);
    Logger.info('[PitchAnalysisPanel] Panneau démarré');
  }

  stop() {
    if (!this.active) return;
    try { this.renderer?.stop(); } catch {}
    try { this.analyser?.disconnect(); } catch {}
    this.renderer = null;
    this.analyser = null;
    this.active = false;
  }

  clear(){ this.renderer?.clear(); }
  isActive(){ return this.active; }
  setMode(_){ /* réservé */ }
}
