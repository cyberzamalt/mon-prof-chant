// src/ui/components/PitchAnalysisPanel.js
import { Logger } from '../../logging/Logger.js';
import { SinusoidalRenderer } from '../../visualization/renderers/SinusoidalRenderer.js';

export class PitchAnalysisPanel {
  #canvas; #renderer;

  constructor({ canvasId }){
    this.#canvas = document.getElementById(canvasId);
    this.#renderer = new SinusoidalRenderer(this.#canvas);
    Logger.info('[PitchAnalysisPanel] Panneau prêt', { canvasId });
  }

  start(analyser){
    this.#renderer.attachAnalyser(analyser);
    this.#renderer.start();
    Logger.info('[PitchAnalysisPanel] Panneau démarré');
  }

  stop(){ this.#renderer.stop(); }
  clear(){ this.#renderer.clear(); }
  freeze(){ this.#renderer.freeze(); }
}
