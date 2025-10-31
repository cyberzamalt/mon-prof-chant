// src/ui/components/PitchAnalysisPanel.js
import { Logger } from '../../logging/Logger.js';

export class PitchAnalysisPanel {
  #type;
  #canvas;
  #ctx;
  #eventBus;
  #pitchService;

  #analyser = null;
  #data = null;
  #raf = 0;
  #mode = 'A440';
  #active = false;

  constructor({ type, containerId, canvasId, pitchService, eventBus }) {
    this.#type = type;
    this.#eventBus = eventBus;
    this.#pitchService = pitchService;

    const canvas = document.getElementById(canvasId);
    this.#canvas = canvas;
    this.#ctx = canvas?.getContext('2d');

    Logger.info('PitchAnalysisPanel', `Panneau ${type} créé `, { container: containerId, canvas: canvasId });
  }

  isActive() { return this.#active; }

  setMode(mode) {
    this.#mode = mode;
    Logger.info('PitchAnalysisPanel', 'Mode changé:', mode);
  }

  /**
   * Brancher une source audio (MediaStreamAudioSourceNode) pour l’affichage waveform
   */
  setAudioSource(sourceNode, audioContext) {
    if (!sourceNode || !audioContext) return;
    // Analyser pour affichage temporel (forme d’onde « sinusoidale »)
    this.#analyser = audioContext.createAnalyser();
    this.#analyser.fftSize = 2048;
    this.#data = new Uint8Array(this.#analyser.fftSize);
    sourceNode.connect(this.#analyser);
    Logger.info('PitchAnalysisPanel', 'Source audio connectée au visualiseur');
  }

  start() {
    if (this.#active) return;
    this.#active = true;
    Logger.info('PitchAnalysisPanel', 'Panneau démarré');
    this.#loop();
  }

  stop() {
    this.#active = false;
    if (this.#raf) cancelAnimationFrame(this.#raf);
    this.clear();
  }

  clear() {
    if (!this.#ctx || !this.#canvas) return;
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    Logger.info('PitchAnalysisPanel', 'Panneau effacé');
  }

  #loop = () => {
    if (!this.#active) return;

    if (this.#analyser && this.#data) {
      this.#analyser.getByteTimeDomainData(this.#data);
      this.#drawWaveform(this.#data);
    } else {
      // Affichage idle
      this.#drawIdle();
    }

    this.#raf = requestAnimationFrame(this.#loop);
  };

  #drawWaveform(data) {
    if (!this.#ctx || !this.#canvas) return;

    const { width, height } = this.#canvas;
    const ctx = this.#ctx;

    ctx.clearRect(0, 0, width, height);

    // grille légère
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // axe médian
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // waveform
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const slice = width / data.length;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0;            // 0..255 → 0..~2
      const y = (v * height) / 2;           // centré
      const x = i * slice;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  #drawIdle() {
    if (!this.#ctx || !this.#canvas) return;
    const { width, height } = this.#canvas;
    const ctx = this.#ctx;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '12px monospace';
    ctx.fillText('En attente du micro…', 10, 20);
  }
}

export default PitchAnalysisPanel;
