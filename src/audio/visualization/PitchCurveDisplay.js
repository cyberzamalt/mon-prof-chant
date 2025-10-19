/**
 * PitchCurveDisplay.js
 * TYPE: Visualization - Real-time Pitch Curve Display
 * 
 * Responsabilités:
 * - Dessiner la courbe de pitch en temps réel sur canvas
 * - Gérer l'axe Y (cents) et X (temps)
 * - Afficher la ligne de référence (0 cent)
 * - Gérer le scroll horizontal
 * - Gérer la fréquence de référence dynamique
 * 
 * Dépendances: Logger, AudioBus
 * Utilisé par: entrainement-chant.html
 */

import { Logger } from '../../logging/Logger.js';
import { AudioBus } from '../core/AudioBus.js';

export class PitchCurveDisplay {
  constructor(canvasId = 'canvasRec') {
    this.logger = new Logger('PitchCurveDisplay');
    this.canvasId = canvasId;
    
    // Trouver le canvas
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.logger.error(`Canvas "${canvasId}" not found in DOM`);
      throw new Error(`Canvas "${canvasId}" not found`);
    }

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      this.logger.error('Failed to get 2D context from canvas');
      throw new Error('Canvas 2D context failed');
    }

    this.logger.info(`Canvas initialized: ${canvasId}`, {
      width: this.canvas.width,
      height: this.canvas.height
    });

    // ========== État interne ==========
    this.pitchData = [];              // Array de { t, hz, cents, x, y }
    this.startTime = null;            // Timestamp du premier pitch
    this.isRecording = false;

    // Fréquence de référence
    this.referenceHz = null;          // Sera défini dynamiquement
    this.fallbackReferenceHz = 100;   // Fallback pour voix graves
    this.minClarityThreshold = 0.3;

    // Configuration d'affichage
    this.pixelsPerSecond = 40;        // Zoom temporel
    this.scrollOffset = 0;            // Pour le scroll H
    this.maxDisplayPoints = 500;      // Limite points en mémoire

    // Dimensions et paramètres visuels
    this.marginLeft = 50;
    this.marginTop = 30;
    this.marginRight = 20;
    this.marginBottom = 40;

    this.centRangeDisplay = 120;      // ±60 cents affiché
    this.pixelsPerCent = this.getPixelsPerCent();

    // Couleurs
    this.colors = {
      background: '#1a1a1a',
      gridMajor: '#444444',
      gridMinor: '#333333',
      referenceLine: '#00ff00',
      pitchCurve: '#ff6600',
      text: '#cccccc',
      error: '#ff3333'
    };

    this.logger.info('PitchCurveDisplay constructed successfully');

    // EventBus pour les événements
    try {
      this.audioBus = new AudioBus();
    } catch (err) {
      this.logger.warn('AudioBus initialization failed', err);
      this.audioBus = null;
    }

    // Initialiser le dessin
    this.drawInitialCanvas();
  }

  /**
   * Calculer pixels par cent (pour l'échelle Y)
   */
  getPixelsPerCent() {
    const canvasHeight = this.canvas.height - this.marginTop - this.marginBottom;
    return canvasHeight / this.centRangeDisplay;
  }

  /**
   * Dessiner le canvas initial (grille + axes)
   */
  drawInitialCanvas() {
    try {
      this.logger.debug('Drawing initial canvas');

      // Fond
      this.ctx.fillStyle = this.colors.background;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Grille
      this.drawGrid();

      // Ligne de référence (0 cents)
      this.drawReferenceLine();

      // Labels
      this.drawLabels();

      this.logger.info('Initial canvas drawn');
    } catch (err) {
      this.logger.error('drawInitialCanvas failed', err);
    }
  }

  /**
   * Dessiner la grille
   */
  drawGrid() {
    try {
      const canvasHeight = this.canvas.height - this.marginTop - this.marginBottom;
      const canvasWidth = this.canvas.width - this.marginLeft - this.marginRight;

      // Grille verticale (temps)
      this.ctx.strokeStyle = this.colors.gridMinor;
      this.ctx.lineWidth = 1;
      for (let i = 0; i < canvasWidth; i += 20) {
        const x = this.marginLeft + i;
        this.ctx.beginPath();
        this.ctx.moveTo(x, this.marginTop);
        this.ctx.lineTo(x, this.canvas.height - this.marginBottom);
        this.ctx.stroke();
      }

      // Grille horizontale (cents)
      for (let i = 0; i < canvasHeight; i += 20) {
        const y = this.marginTop + i;
        this.ctx.beginPath();
        this.ctx.moveTo(this.marginLeft, y);
        this.ctx.lineTo(this.canvas.width - this.marginRight, y);
        this.ctx.stroke();
      }

      // Lignes majeures tous les 60 pixels
      this.ctx.strokeStyle = this.colors.gridMajor;
      this.ctx.lineWidth = 2;

      for (let i = 0; i < canvasWidth; i += 60) {
        const x = this.marginLeft + i;
        this.ctx.beginPath();
        this.ctx.moveTo(x, this.marginTop);
        this.ctx.lineTo(x, this.canvas.height - this.marginBottom);
        this.ctx.stroke();
      }

      for (let i = 0; i < canvasHeight; i += 60) {
        const y = this.marginTop + i;
        this.ctx.beginPath();
        this.ctx.moveTo(this.marginLeft, y);
        this.ctx.lineTo(this.canvas.width - this.marginRight, y);
        this.ctx.stroke();
      }

      this.logger.debug('Grid drawn');
    } catch (err) {
      this.logger.error('drawGrid failed', err);
    }
  }

  /**
   * Dessiner la ligne de référence (0 cents = fréquence de référence)
   */
  drawReferenceLine() {
    try {
      const canvasHeight = this.canvas.height - this.marginTop - this.marginBottom;
      const centerY = this.marginTop + canvasHeight / 2;

      this.ctx.strokeStyle = this.colors.referenceLine;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);

      this.ctx.beginPath();
      this.ctx.moveTo(this.marginLeft, centerY);
      this.ctx.lineTo(this.canvas.width - this.marginRight, centerY);
      this.ctx.stroke();

      this.ctx.setLineDash([]);

      this.logger.debug('Reference line drawn at Y=' + centerY);
    } catch (err) {
      this.logger.error('drawReferenceLine failed', err);
    }
  }

  /**
   * Dessiner les labels (axes)
   */
  drawLabels() {
    try {
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'right';

      // Label Y (cents)
      this.ctx.save();
      this.ctx.translate(20, this.canvas.height / 2);
      this.ctx.rotate(-Math.PI / 2);
      this.ctx.fillText('Cents', 0, 0);
      this.ctx.restore();

      // Label X (temps)
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Time (s)', this.canvas.width / 2, this.canvas.height - 10);

      this.logger.debug('Labels drawn');
    } catch (err) {
      this.logger.error('drawLabels failed', err);
    }
  }

  /**
   * Ajouter un point de pitch
   * @param {number} hz - Fréquence en Hz
   * @param {number} timeSec - Temps en secondes depuis le début
   * @param {number} clarity - Clarté de la détection (0-1)
   */
  addPitchPoint(hz, timeSec, clarity = 1.0) {
    try {
      // Validation
      if (!hz || hz <= 0) {
        this.logger.debug('Invalid Hz received', { hz, timeSec, clarity });
        return;
      }

      if (clarity < this.minClarityThreshold) {
        this.logger.debug('Clarity too low, skipping', { hz, clarity });
        return;
      }

      // Initialiser la fréquence de référence
      if (this.referenceHz === null) {
        this.referenceHz = hz;
        this.logger.info('Reference frequency set', {
          hz: this.referenceHz,
          fallback: this.fallbackReferenceHz
        });
      }

      // Initialiser le temps
      if (this.startTime === null) {
        this.startTime = timeSec;
        this.logger.info('Start time set', { startTime: this.startTime });
      }

      // Calculer les cents
      const relativeHz = hz / this.referenceHz;
      const cents = 1200 * Math.log2(relativeHz);

      // Calculer position X
      const relativeTime = timeSec - this.startTime;
      const x = this.marginLeft + (relativeTime * this.pixelsPerSecond) - this.scrollOffset;

      // Calculer position Y (inversé: plus haut = plus aigu)
      const canvasHeight = this.canvas.height - this.marginTop - this.marginBottom;
      const centerY = this.marginTop + canvasHeight / 2;
      const pixelsPerCent = canvasHeight / this.centRangeDisplay;
      const y = centerY - (cents * pixelsPerCent);

      // Ajouter au buffer
      this.pitchData.push({
        t: timeSec,
        hz: hz,
        cents: cents,
        x: x,
        y: y,
        clarity: clarity
      });

      // Limiter la taille du buffer
      if (this.pitchData.length > this.maxDisplayPoints) {
        this.pitchData.shift();
      }

      this.logger.debug('Pitch point added', {
        hz: hz.toFixed(2),
        cents: cents.toFixed(2),
        x: x.toFixed(0),
        y: y.toFixed(0)
      });

      // Redessiner
      this.redraw();

    } catch (err) {
      this.logger.error('addPitchPoint failed', err);
    }
  }

  /**
   * Redessiner le canvas entièrement
   */
  redraw() {
    try {
      // Effacer
      this.ctx.fillStyle = this.colors.background;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Redessiner la base
      this.drawGrid();
      this.drawReferenceLine();
      this.drawLabels();

      // Redessiner la courbe
      if (this.pitchData.length > 0) {
        this.drawPitchCurve();
      }

      // Info en temps réel
      this.drawDebugInfo();

    } catch (err) {
      this.logger.error('redraw failed', err);
    }
  }

  /**
   * Dessiner la courbe de pitch
   */
  drawPitchCurve() {
    try {
      if (this.pitchData.length === 0) {
        this.logger.debug('No pitch data to draw');
        return;
      }

      this.ctx.strokeStyle = this.colors.pitchCurve;
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      // Tracer la courbe
      this.ctx.beginPath();

      for (let i = 0; i < this.pitchData.length; i++) {
        const point = this.pitchData[i];

        // Vérifier si le point est visible
        if (point.x < this.marginLeft || point.x > this.canvas.width - this.marginRight) {
          continue;
        }

        if (point.y < this.marginTop || point.y > this.canvas.height - this.marginBottom) {
          continue;
        }

        if (i === 0) {
          this.ctx.moveTo(point.x, point.y);
        } else {
          this.ctx.lineTo(point.x, point.y);
        }
      }

      this.ctx.stroke();

      // Dessiner les points
      this.ctx.fillStyle = this.colors.pitchCurve;
      for (const point of this.pitchData) {
        if (point.x >= this.marginLeft && point.x <= this.canvas.width - this.marginRight &&
            point.y >= this.marginTop && point.y <= this.canvas.height - this.marginBottom) {
          this.ctx.beginPath();
          this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }

      this.logger.debug('Pitch curve drawn', {
        points: this.pitchData.length
      });

    } catch (err) {
      this.logger.error('drawPitchCurve failed', err);
    }
  }

  /**
   * Dessiner les infos de debug
   */
  drawDebugInfo() {
    try {
      if (this.pitchData.length === 0) return;

      const lastPoint = this.pitchData[this.pitchData.length - 1];

      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '11px monospace';
      this.ctx.textAlign = 'left';

      const debugText = [
        `Hz: ${lastPoint.hz.toFixed(1)}`,
        `Cents: ${lastPoint.cents.toFixed(1)}`,
        `Ref: ${this.referenceHz.toFixed(1)}`,
        `Points: ${this.pitchData.length}`
      ];

      let y = 20;
      for (const text of debugText) {
        this.ctx.fillText(text, 10, y);
        y += 15;
      }

      this.logger.debug('Debug info drawn', { lastPoint });

    } catch (err) {
      this.logger.error('drawDebugInfo failed', err);
    }
  }

  /**
   * Marquer le début d'enregistrement
   */
  startRecording() {
    try {
      this.logger.info('Recording started');
      this.isRecording = true;
      this.pitchData = [];
      this.startTime = null;
      this.referenceHz = null;
      this.scrollOffset = 0;
      this.drawInitialCanvas();
    } catch (err) {
      this.logger.error('startRecording failed', err);
    }
  }

  /**
   * Marquer la fin d'enregistrement
   */
  stopRecording() {
    try {
      this.logger.info('Recording stopped', {
        pointsRecorded: this.pitchData.length,
        referenceHz: this.referenceHz
      });
      this.isRecording = false;
    } catch (err) {
      this.logger.error('stopRecording failed', err);
    }
  }

  /**
   * Effacer le canvas
   */
  clear() {
    try {
      this.logger.info('Canvas cleared');
      this.pitchData = [];
      this.startTime = null;
      this.referenceHz = null;
      this.scrollOffset = 0;
      this.drawInitialCanvas();
    } catch (err) {
      this.logger.error('clear failed', err);
    }
  }

  /**
   * Obtenir les stats actuelles
   */
  getStats() {
    try {
      if (this.pitchData.length === 0) {
        return null;
      }

      const hzValues = this.pitchData.map(p => p.hz);
      const avgHz = hzValues.reduce((a, b) => a + b, 0) / hzValues.length;
      const minHz = Math.min(...hzValues);
      const maxHz = Math.max(...hzValues);

      const centValues = this.pitchData.map(p => p.cents).filter(c => c !== null);
      const avgCents = centValues.reduce((a, b) => a + b, 0) / centValues.length;

      return {
        pointsDisplayed: this.pitchData.length,
        averageHz: avgHz,
        minHz: minHz,
        maxHz: maxHz,
        rangeSemitones: (maxHz - minHz) / (maxHz / 12),
        averageCents: avgCents,
        referenceHz: this.referenceHz
      };
    } catch (err) {
      this.logger.error('getStats failed', err);
      return null;
    }
  }
}

export default PitchCurveDisplay;
