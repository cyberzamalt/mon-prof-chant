/**
 * PitchCurveDisplay.js
 * TYPE: Visualization
 * 
 * Responsabilités:
 * - Dessiner la courbe de pitch en temps réel sur canvas
 * - Gérer l'axe Y (cents) et X (temps)
 * - Afficher la ligne de référence (0 cent = 440 Hz)
 * - Gérer le scroll horizontal quand la courbe dépasse le canvas
 * 
 * Dépendances: Logger, AudioMath, AudioBus
 */

import { Logger } from '../../logging/Logger.js';
import { AudioMath } from '../../utils/AudioMath.js';
import { AudioBus } from '../core/AudioBus.js';

export class PitchCurveDisplay {
  constructor(canvasId) {
    this.logger = new Logger('PitchCurveDisplay');
    this.canvasId = canvasId;
    this.canvas = document.getElementById(canvasId);
    
    if (!this.canvas) {
      this.logger.error(`Canvas ${canvasId} not found`);
      throw new Error(`Canvas ${canvasId} not found`);
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.audioMath = AudioMath;
    
    // État interne
    this.pitchData = [];           // { t, hz, cents, x, y }
    this.startTime = 0;
    this.maxDisplayTime = 30;      // Afficher max 30 secondes
    this.pixelsPerSecond = 20;     // 20 pixels = 1 seconde
    this.scrollOffset = 0;         // Pour le scroll horizontal
    this.isRecording = false;
    
    // Dimensions
    this.updateCanvasDimensions();
    window.addEventListener('resize', () => this.updateCanvasDimensions());
    
    // Couleurs
    this.colors = {
      bg: '#0b1324',
      grid: '#1a2642',
      gridLight: '#2a3a54',
      curveRaw: '#ef4444',        // Rouge = détection brute
      curveSmoothed: '#3b82f6',   // Bleu = lissée
      reference: '#10b981',        // Vert = 0 cent
      text: '#9ca3af',
      inTune: '#22c55e',           // Vert clair = juste
      warning: '#f59e0b',          // Orange = un peu faux
      error: '#ef4444'             // Rouge = faux
    };
    
    this.logger.info('PitchCurveDisplay initialized', { canvasId });
  }

  /**
   * Mettre à jour les dimensions du canvas
   */
  updateCanvasDimensions() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
    
    this.logger.debug('Canvas resized', {
      width: this.displayWidth,
      height: this.displayHeight
    });
  }

  /**
   * Ajouter un point de pitch détecté
   * @param {number} hz - Fréquence en Hz
   * @param {number} elapsedTime - Temps écoulé depuis le début
   * @param {boolean} isSmoothed - Si c'est déjà lissé ou brut
   */
  addPitchPoint(hz, elapsedTime, isSmoothed = false) {
    if (!hz || hz <= 0) {
      this.logger.debug('Skipping invalid Hz', { hz });
      return;
    }

    const cents = this.audioMath.hzToCents(hz, 440);
    
    // Position X : basée sur le temps écoulé
    const x = this.timeToPixels(elapsedTime) - this.scrollOffset;
    
    // Position Y : basée sur les cents
    const y = this.centsToPixels(cents);
    
    // Ajouter le point
    this.pitchData.push({
      t: elapsedTime,
      hz,
      cents,
      x,
      y,
      isSmoothed
    });

    // Scroll automatique si dépassement
    this.autoScroll(elapsedTime);

    // Redessiner
    this.draw();
  }

  /**
   * Convertir le temps (secondes) en pixels (X)
   */
  timeToPixels(seconds) {
    return 60 + (seconds * this.pixelsPerSecond);
  }

  /**
   * Convertir les cents en pixels (Y)
   * 0 cents = milieu du canvas
   * +60 cents = haut
   * -60 cents = bas
   */
  centsToPixels(cents) {
    const centerY = this.displayHeight / 2;
    const centsPerPixel = 120 / (this.displayHeight - 100);
    return centerY - (cents / centsPerPixel);
  }

  /**
   * Scroll automatique quand la courbe dépasse
   */
  autoScroll(elapsedTime) {
    const rightEdge = this.displayWidth - 100;
    const currentX = this.timeToPixels(elapsedTime);
    
    if (currentX - this.scrollOffset > rightEdge) {
      this.scrollOffset = currentX - rightEdge;
    }
  }

  /**
   * Dessiner le canvas complet
   */
  draw() {
    try {
      this.drawBackground();
      this.drawGrid();
      this.drawReferenceLine();
      this.drawLabels();
      this.drawCurve();
      this.drawLegend();
    } catch (err) {
      this.logger.error('Draw error', { error: err.message });
    }
  }

  /**
   * Fond du canvas
   */
  drawBackground() {
    this.ctx.fillStyle = this.colors.bg;
    this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
  }

  /**
   * Grille
   */
  drawGrid() {
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;

    // Lignes horizontales (cents)
    for (let cents = -120; cents <= 120; cents += 30) {
      const y = this.centsToPixels(cents);
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.displayWidth, y);
      this.ctx.stroke();
    }

    // Lignes verticales (temps)
    for (let i = 0; i < this.displayWidth; i += this.pixelsPerSecond * 5) {
      const x = i - this.scrollOffset;
      if (x < 0 || x > this.displayWidth) continue;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.displayHeight);
      this.ctx.stroke();
    }
  }

  /**
   * Ligne de référence (0 cent = 440 Hz)
   */
  drawReferenceLine() {
    const y = this.centsToPixels(0);
    this.ctx.strokeStyle = this.colors.reference;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.displayWidth, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  /**
   * Labels (axes)
   */
  drawLabels() {
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'right';

    // Axe Y (cents)
    for (let cents = -120; cents <= 120; cents += 60) {
      const y = this.centsToPixels(cents);
      const label = cents > 0 ? `+${cents}c` : `${cents}c`;
      this.ctx.fillText(label, 50, y + 4);
    }

    // Axe X (temps)
    this.ctx.textAlign = 'center';
    const startTime = Math.floor(this.scrollOffset / this.pixelsPerSecond);
    for (let sec = startTime; sec < startTime + 60; sec += 5) {
      const x = this.timeToPixels(sec) - this.scrollOffset;
      if (x < 0 || x > this.displayWidth) continue;
      
      const label = `${sec}s`;
      this.ctx.fillText(label, x, this.displayHeight - 10);
    }
  }

  /**
   * Tracer la courbe de pitch
   */
  drawCurve() {
    if (this.pitchData.length === 0) return;

    // Séparer brute et lissée
    const rawPoints = this.pitchData.filter(p => !p.isSmoothed);
    const smoothedPoints = this.pitchData.filter(p => p.isSmoothed);

    // Tracer la courbe lissée (priorité)
    if (smoothedPoints.length > 0) {
      this.drawCurveLine(smoothedPoints, this.colors.curveSmoothed, 2.5);
    }

    // Tracer les points (cercles)
    this.drawCurvePoints(this.pitchData);
  }

  /**
   * Tracer une ligne courbe
   */
  drawCurveLine(points, color, lineWidth) {
    if (points.length < 2) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();

    let first = true;
    for (const p of points) {
      const x = p.x - this.scrollOffset;
      const y = p.y;

      if (x < -10 || x > this.displayWidth + 10) continue;

      if (first) {
        this.ctx.moveTo(x, y);
        first = false;
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();
  }

  /**
   * Tracer les points (cercles colorés)
   */
  drawCurvePoints(points) {
    for (const p of points) {
      const x = p.x - this.scrollOffset;
      const y = p.y;

      if (x < -10 || x > this.displayWidth + 10) continue;

      // Couleur selon la justesse
      let color;
      if (Math.abs(p.cents) < 25) {
        color = this.colors.inTune;        // Juste
      } else if (Math.abs(p.cents) < 50) {
        color = this.colors.warning;       // Un peu faux
      } else {
        color = this.colors.error;         // Faux
      }

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Légende en bas du canvas
   */
  drawLegend() {
    const legendY = this.displayHeight - 20;
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '11px monospace';
    this.ctx.textAlign = 'left';

    const stats = {
      points: this.pitchData.length,
      smoothed: this.pitchData.filter(p => p.isSmoothed).length,
      raw: this.pitchData.filter(p => !p.isSmoothed).length
    };

    const text = `Points: ${stats.points} | Lissés: ${stats.smoothed} | Bruts: ${stats.raw}`;
    this.ctx.fillText(text, 60, legendY);
  }

  /**
   * Réinitialiser l'affichage
   */
  reset() {
    this.pitchData = [];
    this.scrollOffset = 0;
    this.startTime = 0;
    this.draw();
    this.logger.info('Display reset');
  }

  /**
   * Démarrer l'enregistrement (optionnel, juste pour logs)
   */
  startRecording() {
    this.isRecording = true;
    this.startTime = Date.now();
    this.logger.debug('Display recording started');
  }

  /**
   * Arrêter l'enregistrement
   */
  stopRecording() {
    this.isRecording = false;
    this.logger.debug('Display recording stopped', {
      totalPoints: this.pitchData.length
    });
  }

  /**
   * Exporter les données (optionnel)
   */
  exportData() {
    return {
      points: this.pitchData,
      count: this.pitchData.length,
      timestamp: new Date().toISOString()
    };
  }
}

export default PitchCurveDisplay;
