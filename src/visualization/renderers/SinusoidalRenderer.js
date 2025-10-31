// src/visualization/renderers/SinusoidalRenderer.js
// Oscilloscope persistant + axes (temps & niveau "grave → aigu")
import { Logger } from '../../logging/Logger.js';

export class SinusoidalRenderer {
  constructor(canvas, { audioEngine, microphone, persistent = true } = {}) {
    this.canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    this.ctx = this.canvas.getContext('2d');

    this.audioEngine = audioEngine;
    this.microphone = microphone;

    this.persistent = persistent;
    this.running = false;

    this.analyser = null;
    this.timeData = null;

    // Mise en page
    this.margin = { left: 64, right: 16, top: 16, bottom: 40 };
    this.plotW = this.canvas.width - this.margin.left - this.margin.right;
    this.plotH = this.canvas.height - this.margin.top - this.margin.bottom;

    // Curseur horizontal (avance jusqu'au bord droit puis s'arrête si persistent=true)
    this.x = 0;

    // Pré-rendu axes
    this.axesLayer = document.createElement('canvas');
    this.axesLayer.width = this.canvas.width;
    this.axesLayer.height = this.canvas.height;
    this.axesCtx = this.axesLayer.getContext('2d');

    this._drawAxes();

    // Style
    this.waveColor = '#31c48d'; // vert lisible (pas fluo)
    this.gridColor = 'rgba(255,255,255,0.10)';
    this.textColor = 'rgba(255,255,255,0.85)';
    this.zeroColor = 'rgba(255,255,255,0.30)';
  }

  _px(x, y) {
    return {
      x: this.margin.left + x,
      y: this.margin.top + y
    };
  }

  _drawAxes() {
    const g = this.axesCtx;
    const { width, height } = this.canvas;

    g.clearRect(0, 0, width, height);

    // Fond surface
    g.fillStyle = 'rgba(0,0,0,0.85)';
    g.fillRect(0, 0, width, height);

    // Cadre
    g.strokeStyle = this.gridColor;
    g.lineWidth = 1;
    g.strokeRect(this.margin.left, this.margin.top, this.plotW, this.plotH);

    // Lignes horizontales (échelle “grave → aigu”)
    const bands = [
      'Très très grave', 'Très grave', 'Grave', 'Peu grave',
      'Moyen', 'Peu aigu', 'Aigu', 'Très aigu', 'Très très aigu'
    ];
    g.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    g.fillStyle = this.textColor;
    g.textBaseline = 'middle';

    for (let i = 0; i < bands.length; i++) {
      const yRel = i / (bands.length - 1);                    // 0..1
      const y = this.margin.top + (1 - yRel) * this.plotH;    // haut=aigu, bas=grave
      g.strokeStyle = this.gridColor;
      g.beginPath();
      g.moveTo(this.margin.left, y);
      g.lineTo(this.margin.left + this.plotW, y);
      g.stroke();

      g.fillText(bands[i], 8, y);
    }

    // Axe temps (ticks 0,1,2,3… sec — on écrira les valeurs depuis le renderer)
    g.fillStyle = this.textColor;
    g.textBaseline = 'top';
    g.fillText('temps (s)', this.margin.left, height - this.margin.bottom + 14);

    // Ligne zéro (milieu vertical)
    g.strokeStyle = this.zeroColor;
    g.beginPath();
    const zeroY = this.margin.top + this.plotH / 2;
    g.moveTo(this.margin.left, zeroY);
    g.lineTo(this.margin.left + this.plotW, zeroY);
    g.stroke();
  }

  connectToMicrophone() {
    // Utilise le même AudioContext que l’app
    const ctx = this.audioEngine?.context;
    const src = this.microphone?.source;

    if (!ctx || !src) {
      Logger.warn('[SinusoidalRenderer] Micro/AudioEngine manquants → connexion différée');
      return false;
    }

    // Un Analyser dédié pour le scope
    this.analyser = new AnalyserNode(ctx, { fftSize: 2048 });
    this.timeData = new Float32Array(this.analyser.fftSize);
    try {
      src.connect(this.analyser);
      Logger.info('[SinusoidalRenderer] Analyser connecté au micro');
      return true;
    } catch (e) {
      Logger.error('[SinusoidalRenderer] Connexion Analyser échouée', e);
      return false;
    }
  }

  start() {
    if (this.running) return;
    if (!this.analyser) this.connectToMicrophone();
    if (!this.analyser) return; // attendra un prochain start() après que le micro soit prêt
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
  }

  clear() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.axesLayer, 0, 0);
    this.x = 0;
  }

  setMode(_) {
    // placeholder pour compat avec le panneau (A440/absolute/auto)
  }

  _loop() {
    if (!this.running) return;

    // Dessine axes en fond (mais on laisse les anciennes courbes visibles : pas d’effacement total)
    // On ne redessine PAS l’axesLayer à chaque frame pour conserver le tracé (persistant).
    // Simplement, on re-blitte l’axesLayer si on est au tout début (x === 0).
    if (this.x === 0) {
      this.ctx.drawImage(this.axesLayer, 0, 0);
      // Tics de temps init à 0s sur l’axe
      this._drawTimeTick(0, '0');
    }

    // Si on a atteint le bord droit et qu’on veut de la persistance, on fige
    if (this.persistent && this.x >= this.plotW) {
      requestAnimationFrame(() => this._loop());
      return;
    }

    // Récupère un chunk des échantillons temporels
    this.analyser.getFloatTimeDomainData(this.timeData);

    // Choix : on trace ~256 points par frame pour avoir une courbe bien lisible
    const stepSample = Math.max(1, Math.floor(this.timeData.length / 256));
    const points = Math.floor(this.timeData.length / stepSample);

    // Échelle verticale (on “amplifie” légèrement)
    const amp = (this.plotH * 0.4);

    // Position de départ du tracé courant
    let xCanvas = this.margin.left + this.x;
    let yPrev = null;

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = this.waveColor;
    this.ctx.beginPath();

    for (let i = 0; i < points; i++) {
      const v = this.timeData[i * stepSample]; // -1..1
      const y = this.margin.top + (this.plotH / 2) - v * amp;

      if (yPrev == null) {
        this.ctx.moveTo(xCanvas, y);
      } else {
        this.ctx.lineTo(xCanvas, yPrev);
        this.ctx.lineTo(xCanvas + 1, y);
      }
      yPrev = y;

      // Avance doucement : ~1 px pour 4 points pour remplir tranquillement la largeur
      if (i % 4 === 0) xCanvas += 1;
    }
    this.ctx.stroke();

    // Met à jour le curseur x (combien de pixels on a réellement ajoutés)
    const advanced = Math.max(0, Math.min(this.plotW - this.x, Math.floor(points / 4)));
    const oldX = this.x;
    this.x += advanced;

    // Ajoute des tics de temps toutes les ~0.5 s (estimation)
    // Estimation simple : fftSize / sampleRate ≈ 2048/44100 ≈ 46.4ms par buffer
    // Comme on avance ~points/4 px, on peut approximer 1s ≈ 22 px (ajustable).
    const pxPerSec = 22; // empirique pour affichage lisible
    const oldSec = Math.floor(oldX / pxPerSec);
    const newSec = Math.floor(this.x / pxPerSec);
    if (newSec !== oldSec) {
      this._drawTimeTick(this.x, String(newSec));
    }

    requestAnimationFrame(() => this._loop());
  }

  _drawTimeTick(xPlot, label) {
    // Dessine la graduation verticale (temps) dans le canvas principal (par-dessus)
    const x = this.margin.left + xPlot;
    const y1 = this.margin.top + this.plotH;
    const y2 = y1 + 6;

    this.ctx.strokeStyle = this.gridColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y1);
    this.ctx.lineTo(x, y2);
    this.ctx.stroke();

    this.ctx.fillStyle = this.textColor;
    this.ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(label, x, y2 + 2);
  }
}

export default SinusoidalRenderer;
