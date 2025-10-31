// src/ui/components/PitchAnalysisPanel.js
import { Logger } from '../../logging/Logger.js';
import { audioEngine } from '../../audio/core/AudioEngine.js';
import { SinusoidalRenderer } from '../../visualization/renderers/SinusoidalRenderer.js';

export class PitchAnalysisPanel {
  #type; #container; #canvas; #renderer;
  #analyser = null; #active = false; #eventBus;

  constructor({ type, containerId, canvasId, eventBus }) {
    this.#type = type;
    this.#container = document.getElementById(containerId);
    this.#canvas = document.getElementById(canvasId);
    this.#renderer = new SinusoidalRenderer(this.#canvas);
    this.#eventBus = eventBus;
    Logger.info('[PitchAnalysisPanel] Panneau prêt', { container: containerId, canvas: canvasId });
  }

  isActive() { return this.#active; }

  start() {
    if (this.#active) return;

    // Analyser créé dans le contexte **partagé**
    this.#analyser = audioEngine.createAnalyser();

    // Relier la source micro -> analyser
    const mic = window.App?.getService('microphone');
    const src = mic?.getSource?.();
    if (src) {
      src.connect(this.#analyser);
      Logger.info('[SinusoidalRenderer] Analyser connecté au micro');
    }

    this.#renderer.attachAnalyser(this.#analyser);
    this.#renderer.start();

    this.#active = true;
    this.#eventBus?.emit?.(`panel:${this.#type}:started`);
    Logger.info('[PitchAnalysisPanel] Panneau démarré');
  }

  stop() {
    if (!this.#active) return;
    try { this.#renderer.stop(); } catch (_) {}
    try { this.#analyser?.disconnect(); } catch (_) {}
    this.#analyser = null;
    this.#active = false;
  }

  clear() { this.#renderer.clear?.(); }
  setMode(_) { /* réservé */ }
}

export default PitchAnalysisPanel;
