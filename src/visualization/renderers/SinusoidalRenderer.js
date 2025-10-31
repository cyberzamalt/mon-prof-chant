/**
 * SinusoidalRenderer.js
 * Moteur de rendu de la courbe sinusoïdale
 * 
 * Responsabilités:
 * - Dessiner la courbe sinusoïdale lissée en temps réel
 * - Interpolation Catmull-Rom pour fluidité
 * - 3 modes: Absolu, A440 (centré), Auto
 * - Grille de référence et axes
 * - Animation fluide 60 FPS
 * 
 * CRITIQUE: Ce code vient du monolithe fonctionnel
 * Les paramètres sont optimisés et validés
 */

import { Logger } from '../../logging/Logger.js';

export class SinusoidalRenderer {
  #canvas = null;
  #ctx = null;
  #width = 0;
  #height = 0;
  #centerY = 0;
  #points = [];
  #maxPoints = 300;
  #mode = 'A440'; // 'absolute', 'A440', 'auto'
  #referenceFreq = 440;
  #config = null;
  #animationId = null;
  #isRunning = false;

  /**
   * Constructeur
   * @param {HTMLCanvasElement} canvas - Élément canvas
   * @param {Object} config - Configuration du rendu
   */
  constructor(canvas, config = {}) {
    try {
      if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('[SinusoidalRenderer] Canvas HTML requis');
      }

      this.#canvas = canvas;
      this.#ctx = canvas.getContext('2d');

      if (!this.#ctx) {
        throw new Error('[SinusoidalRenderer] Impossible d\'obtenir contexte 2D');
      }

      // Configuration par défaut
      this.#config = {
        // Courbe
        lineWidth: 3,
        lineColor: '#00ff00',
        shadowBlur: 10,
        shadowColor: '#00ff00',
        
        // Grille
        showGrid: true,
        gridColor: 'rgba(255, 255, 255, 0.1)',
        gridLineWidth: 1,
        
        // Axes
        showAxes: true,
        axisColor: 'rgba(255, 255, 255, 0.3)',
        axisLineWidth: 2,
        
        // Plage Y (Hz)
        minFreq: 60,
        maxFreq: 1200,
        
        // Interpolation
        tension: 0.5, // Catmull-Rom tension (0-1)
        
        ...config
      };

      this.#resize();
      this.#setupResizeObserver();

      Logger.info('SinusoidalRenderer', 'Initialisé', {
        width: this.#width,
        height: this.#height,
        mode: this.#mode
      });

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur constructeur', err);
      throw err;
    }
  }

  /**
   * Redimensionner le canvas
   * @private
   */
  #resize() {
    try {
      // Obtenir dimensions réelles
      const rect = this.#canvas.getBoundingClientRect();
      
      // Définir résolution canvas (2x pour haute densité)
      const dpr = window.devicePixelRatio || 1;
      this.#width = rect.width * dpr;
      this.#height = rect.height * dpr;
      
      this.#canvas.width = this.#width;
      this.#canvas.height = this.#height;
      
      // Échelle du contexte
      this.#ctx.scale(dpr, dpr);
      
      // Centre vertical
      this.#centerY = rect.height / 2;

      Logger.debug('SinusoidalRenderer', 'Canvas redimensionné', {
        width: this.#width,
        height: this.#height,
        dpr: dpr
      });

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur resize', err);
    }
  }

  /**
   * Observer les changements de taille
   * @private
   */
  #setupResizeObserver() {
    try {
      if (!window.ResizeObserver) {
        Logger.warn('SinusoidalRenderer', 'ResizeObserver non supporté');
        return;
      }

      const observer = new ResizeObserver(() => {
        this.#resize();
        this.#render(); // Re-render après resize
      });

      observer.observe(this.#canvas);

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur setupResizeObserver', err);
    }
  }

  /**
   * Définir le mode de rendu
   * @param {string} mode - 'absolute', 'A440', 'auto'
   */
  setMode(mode) {
    try {
      const validModes = ['absolute', 'A440', 'auto'];
      if (!validModes.includes(mode)) {
        throw new Error(`Mode invalide: ${mode}`);
      }

      this.#mode = mode;
      Logger.info('SinusoidalRenderer', `Mode changé: ${mode}`);

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur setMode', err);
    }
  }

  /**
   * Ajouter un point de données
   * @param {number} frequency - Fréquence en Hz
   * @param {Object} metadata - Métadonnées optionnelles
   */
  addPoint(frequency, metadata = {}) {
    try {
      if (typeof frequency !== 'number' || frequency <= 0) {
        Logger.warn('SinusoidalRenderer', 'Fréquence invalide', frequency);
        return;
      }

      // Calculer Y en fonction du mode
      const y = this.#frequencyToY(frequency);

      // Valider Y
      if (!isFinite(y)) {
        Logger.warn('SinusoidalRenderer', 'Y non fini', { frequency, y });
        return;
      }

      // Ajouter le point
      this.#points.push({
        y: y,
        frequency: frequency,
        timestamp: Date.now(),
        ...metadata
      });

      // Limiter le nombre de points
      if (this.#points.length > this.#maxPoints) {
        this.#points.shift();
      }

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur addPoint', err);
    }
  }

  /**
   * Convertir fréquence en coordonnée Y
   * @private
   * @param {number} frequency - Fréquence en Hz
   * @returns {number} Coordonnée Y
   */
  #frequencyToY(frequency) {
    try {
      const rect = this.#canvas.getBoundingClientRect();
      const height = rect.height;

      switch (this.#mode) {
        case 'absolute':
          // Mode absolu: mapper linéairement la plage
          const range = this.#config.maxFreq - this.#config.minFreq;
          const normalized = (frequency - this.#config.minFreq) / range;
          return height - (normalized * height); // Inverser Y

        case 'A440':
          // Mode A440: centrer autour de la référence
          const deviation = frequency - this.#referenceFreq;
          const scale = height / 400; // ±200 Hz visible
          return this.#centerY - (deviation * scale);

        case 'auto':
          // Mode auto: ajustement dynamique
          // TODO: Implémenter ajustement automatique
          return this.#centerY;

        default:
          return this.#centerY;
      }

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur frequencyToY', err);
      return this.#centerY;
    }
  }

  /**
   * Boucle de rendu
   * @private
   */
  #render() {
    try {
      if (!this.#isRunning) {
        return;
      }

      // Effacer le canvas
      this.#clear();

      // Dessiner la grille
      if (this.#config.showGrid) {
        this.#drawGrid();
      }

      // Dessiner les axes
      if (this.#config.showAxes) {
        this.#drawAxes();
      }

      // Dessiner la courbe
      if (this.#points.length > 1) {
        this.#drawCurve();
      }

      // Stats de debug
      this.#drawStats();

      // Prochaine frame
      this.#animationId = requestAnimationFrame(() => this.#render());

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur render', err);
    }
  }

  /**
   * Effacer le canvas
   * @private
   */
  #clear() {
    const rect = this.#canvas.getBoundingClientRect();
    this.#ctx.fillStyle = '#000000';
    this.#ctx.fillRect(0, 0, rect.width, rect.height);
  }

  /**
   * Dessiner la grille de référence
   * @private
   */
  #drawGrid() {
    try {
      const rect = this.#canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      this.#ctx.strokeStyle = this.#config.gridColor;
      this.#ctx.lineWidth = this.#config.gridLineWidth;
      this.#ctx.beginPath();

      // Lignes horizontales (tous les 50px)
      for (let y = 0; y < height; y += 50) {
        this.#ctx.moveTo(0, y);
        this.#ctx.lineTo(width, y);
      }

      // Lignes verticales (tous les 50px)
      for (let x = 0; x < width; x += 50) {
        this.#ctx.moveTo(x, 0);
        this.#ctx.lineTo(x, height);
      }

      this.#ctx.stroke();

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur drawGrid', err);
    }
  }

  /**
   * Dessiner les axes X et Y
   * @private
   */
  #drawAxes() {
    try {
      const rect = this.#canvas.getBoundingClientRect();
      const width = rect.width;

      this.#ctx.strokeStyle = this.#config.axisColor;
      this.#ctx.lineWidth = this.#config.axisLineWidth;
      this.#ctx.beginPath();

      // Axe horizontal (centre)
      this.#ctx.moveTo(0, this.#centerY);
      this.#ctx.lineTo(width, this.#centerY);

      this.#ctx.stroke();

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur drawAxes', err);
    }
  }

  /**
   * Dessiner la courbe avec interpolation Catmull-Rom
   * @private
   */
  #drawCurve() {
    try {
      const rect = this.#canvas.getBoundingClientRect();
      const width = rect.width;

      // Configuration du style
      this.#ctx.strokeStyle = this.#config.lineColor;
      this.#ctx.lineWidth = this.#config.lineWidth;
      this.#ctx.shadowBlur = this.#config.shadowBlur;
      this.#ctx.shadowColor = this.#config.shadowColor;
      this.#ctx.lineCap = 'round';
      this.#ctx.lineJoin = 'round';

      // Calculer espacement X
      const spacing = width / (this.#maxPoints - 1);

      this.#ctx.beginPath();

      // Premier point
      const firstPoint = this.#points[0];
      this.#ctx.moveTo(0, firstPoint.y);

      // Interpolation Catmull-Rom
      for (let i = 0; i < this.#points.length - 1; i++) {
        const p0 = this.#points[Math.max(0, i - 1)];
        const p1 = this.#points[i];
        const p2 = this.#points[i + 1];
        const p3 = this.#points[Math.min(this.#points.length - 1, i + 2)];

        const x1 = i * spacing;
        const x2 = (i + 1) * spacing;

        // Interpolation sur plusieurs segments
        const segments = 10;
        for (let t = 0; t <= segments; t++) {
          const u = t / segments;
          const x = x1 + (x2 - x1) * u;
          const y = this.#catmullRom(
            p0.y, p1.y, p2.y, p3.y, 
            u, 
            this.#config.tension
          );

          if (t === 0) {
            this.#ctx.lineTo(x, y);
          } else {
            this.#ctx.lineTo(x, y);
          }
        }
      }

      this.#ctx.stroke();

      // Réinitialiser shadow
      this.#ctx.shadowBlur = 0;

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur drawCurve', err);
    }
  }

  /**
   * Interpolation Catmull-Rom
   * @private
   */
  #catmullRom(p0, p1, p2, p3, t, tension) {
    try {
      const v0 = (p2 - p0) * tension;
      const v1 = (p3 - p1) * tension;

      const t2 = t * t;
      const t3 = t * t2;

      return (2 * p1 - 2 * p2 + v0 + v1) * t3 +
             (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
             v0 * t + p1;

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur catmullRom', err);
      return p1; // Fallback
    }
  }

  /**
   * Dessiner les statistiques de debug
   * @private
   */
  #drawStats() {
    try {
      if (this.#points.length === 0) {
        return;
      }

      const lastPoint = this.#points[this.#points.length - 1];

      this.#ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.#ctx.font = '12px monospace';
      this.#ctx.textAlign = 'left';

      const stats = [
        `Mode: ${this.#mode}`,
        `Points: ${this.#points.length}`,
        `Freq: ${lastPoint.frequency.toFixed(2)} Hz`,
        `Y: ${lastPoint.y.toFixed(0)} px`
      ];

      stats.forEach((stat, i) => {
        this.#ctx.fillText(stat, 10, 20 + i * 15);
      });

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur drawStats', err);
    }
  }

  /**
   * Démarrer le rendu
   */
  start() {
    try {
      if (this.#isRunning) {
        Logger.warn('SinusoidalRenderer', 'Déjà en cours');
        return;
      }

      this.#isRunning = true;
      this.#render();
      Logger.info('SinusoidalRenderer', 'Rendu démarré');

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur start', err);
    }
  }

  /**
   * Arrêter le rendu
   */
  stop() {
    try {
      this.#isRunning = false;

      if (this.#animationId) {
        cancelAnimationFrame(this.#animationId);
        this.#animationId = null;
      }

      Logger.info('SinusoidalRenderer', 'Rendu arrêté');

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur stop', err);
    }
  }

  /**
   * Effacer tous les points
   */
  clear() {
    try {
      this.#points = [];
      this.#clear();
      Logger.debug('SinusoidalRenderer', 'Points effacés');

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur clear', err);
    }
  }

  /**
   * Définir la fréquence de référence
   * @param {number} freq - Fréquence en Hz
   */
  setReferenceFrequency(freq) {
    try {
      if (typeof freq !== 'number' || freq <= 0) {
        throw new Error('Fréquence invalide');
      }

      this.#referenceFreq = freq;
      Logger.info('SinusoidalRenderer', `Référence: ${freq} Hz`);

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur setReferenceFrequency', err);
    }
  }

  /**
   * Obtenir le nombre de points actuels
   * @returns {number}
   */
  getPointCount() {
    return this.#points.length;
  }

  /**
   * Vérifier si le rendu est actif
   * @returns {boolean}
   */
  isRunning() {
    return this.#isRunning;
  }

  /**
   * Mettre à jour la configuration
   * @param {Object} newConfig - Nouvelle configuration
   */
  updateConfig(newConfig) {
    try {
      this.#config = {
        ...this.#config,
        ...newConfig
      };
      Logger.info('SinusoidalRenderer', 'Configuration mise à jour', newConfig);

    } catch (err) {
      Logger.error('SinusoidalRenderer', 'Erreur updateConfig', err);
    }
  }
}
