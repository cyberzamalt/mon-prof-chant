// src/ui/components/PitchAnalysisPanel.js
// Panneau qui pilote le renderer “sinusoïdale persistante” + affiche les infos
import { Logger } from '../../logging/Logger.js';
import { EventBus } from '../../core/EventBus.js';
import { CentsCalculator } from '../../audio/analysis/CentsCalculator.js';
import SinusoidalRenderer from '../../visualization/renderers/SinusoidalRenderer.js';

export class PitchAnalysisPanel {
  constructor({
    type = 'recording',
    containerId,
    canvasId,
    pitchService,
    eventBus,
    audioEngine,     // 🔥 nouveau
    microphone       // 🔥 nouveau
  }) {
    this.type = type;
    this.container = document.getElementById(containerId);
    this.canvas = document.getElementById(canvasId);
    this.pitchService = pitchService;
    this.eventBus = eventBus || new EventBus();

    // 🔥 références audio
    this.audioEngine = audioEngine;
    this.microphone = microphone;

    // État
    this.active = false;

    // Renderer : sinusoïde très visible + axes + persistance
    this.renderer = new SinusoidalRenderer(this.canvas, {
      audioEngine: this.audioEngine,
      microphone: this.microphone,
      persistent: true
    });

    Logger.info('[PitchAnalysisPanel] Renderer créé');
  }

  start() {
    if (this.active) return;
    // Le micro est déjà démarré au moment où handleStart() t’appelle → connect & go
    this.renderer.start();
    this.active = true;
    Logger.info('[PitchAnalysisPanel] Panneau démarré');
  }

  stop() {
    if (!this.active) return;
    this.renderer.stop();
    this.active = false;
  }

  clear() {
    this.renderer.clear();
    Logger.info('[PitchAnalysisPanel] Panneau effacé');
  }

  isActive() {
    return this.active;
  }

  setMode(mode) {
    this.renderer.setMode(mode);
    if (this.pitchService) this.pitchService.setMode?.(mode);
    Logger.info('[PitchAnalysisPanel] Mode changé:', mode);
  }
}

export default PitchAnalysisPanel;
