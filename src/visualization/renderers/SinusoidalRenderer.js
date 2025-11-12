// src/visualization/renderers/SinusoidalRenderer.js
// Rendu de la courbe sinusoïdale de PITCH avec AnalyserNode
import { Logger } from '../../logging/Logger.js';
import { CentsCalculator } from '../../audio/analysis/CentsCalculator.js';

export class SinusoidalRenderer {
  constructor(canvas, opts = {}) {
    if (!canvas) {
      const err = new Error('Canvas manquant dans SinusoidalRenderer');
      Logger.error('[SinusoidalRenderer]', err);
      throw err;
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pitchDetector = null;
    this.pitchSmoother = null;
    this.analyser = null; // AnalyserNode (sera fourni par PitchAnalysisPanel)
    this.running = false;
    this.persistent = !!opts.persistent; // Mode scrolling
    
    // Historique des points de pitch
    this.pitchHistory = []; // { frequency, timestamp, y }
    this.maxHistoryPoints = 2000; // ~33 secondes à 60 FPS
    
    // Buffer pour lecture audio depuis AnalyserNode
    this.audioBuffer = null;
    
    // Timing
    this._timeLastTick = 0;
    this._timeLastGridTime = 0;
    this._gridEvery = 1000; // Grille verticale toutes les 1s
    this._scrollSpeed = 2; // px/frame
    
    // Couleurs
    this._bg = '#0a1224';
    this._grid = '#1d2b4a';
    this._axis = '#2a3b63';
    this._wave = '#2ee59d';
    
    // Plage de fréquences affichées (Hz)
    this.minFreq = 80;    // E2 (basse)
    this.maxFreq = 1400;  // F6 (soprano)
    this.centerFreq = 440; // A4 (ligne centrale)
    
    // Labels registres vocaux (FIXES à gauche)
    this.vocalLabels = [
      { freq: 1400, label: 'Très très aigu', y: null },
      { freq: 900, label: 'Très aigu', y: null },
      { freq: 600, label: 'Aigu', y: null },
      { freq: 440, label: 'Moyen', y: null },      // Ligne centrale
      { freq: 250, label: 'Grave', y: null },
      { freq: 160, label: 'Très grave', y: null },
      { freq: 80, label: 'Très très grave', y: null }
    ];

    Logger.info('[SinusoidalRenderer] Renderer créé', {
      canvasId: canvas.id,
      size: `${canvas.width}x${canvas.height}`,
      persistent: this.persistent,
      range: `${this.minFreq}-${this.maxFreq} Hz`
    });

    this._drawBackdrop();
  }

  /**
   * Attacher le pitch detector, le smoother ET l'analyser
   */
  attachPitchDetector(pitchDetector, pitchSmoother) {
    this.pitchDetector = pitchDetector;
    this.pitchSmoother = pitchSmoother;
    Logger.info('[SinusoidalRenderer] PitchDetector et PitchSmoother attachés');
  }

  /**
   * Attacher l'AnalyserNode pour lire l'audio
   */
  attachAnalyser(analyser) {
    this.analyser = analyser;
    
    // Créer buffer pour lecture audio
    this.audioBuffer = new Float32Array(analyser.fftSize);
    
    Logger.info('[SinusoidalRenderer] AnalyserNode attaché', {
      fftSize: analyser.fftSize,
      bufferSize: this.audioBuffer.length
    });
  }

  start() {
    if (this.running) {
      Logger.warn('[SinusoidalRenderer] Déjà en cours');
      return;
    }
    
    this.running = true;
    this._loop = (t) => { 
      if (!this.running) return; 
      try {
        this._tick(t); 
      } catch (e) {
        Logger.error('[SinusoidalRenderer] Erreur dans _tick()', e);
      }
      requestAnimationFrame(this._loop); 
    };
    requestAnimationFrame(this._loop);
    Logger.info('[SinusoidalRenderer] Boucle démarrée');
  }

  stop() { 
    if (this.running) {
      this.running = false; 
      Logger.info('[SinusoidalRenderer] Boucle arrêtée');
    }
  }

  clear() { 
    this.pitchHistory = [];
    Logger.info('[SinusoidalRenderer] Historique effacé');
    this._drawBackdrop(); 
  }

  _tick(now) {
    const {ctx, canvas} = this;
    const W = canvas.width;
    const H = canvas.height;

    // Vérifier que tout est prêt
    if (!this.analyser || !this.pitchDetector || !this.pitchSmoother) {
      // Clignote si pas prêt
      if (now - this._timeLastTick > 500) { 
        this._drawBackdrop(); 
        this._timeLastTick = now; 
      }
      return;
    }

    // ÉTAPE 1 : Lire les données audio depuis AnalyserNode
    this.analyser.getFloatTimeDomainData(this.audioBuffer);

    // ÉTAPE 2 : Détecter pitch avec YIN
    let pitchData = null;
    let smoothedFreq = null;
    
    try {
      pitchData = this.pitchDetector.detect(this.audioBuffer);
      const frequency = pitchData ? pitchData.frequency : null;
      smoothedFreq = this.pitchSmoother.smooth(frequency);
      
      Logger.debug('[SinusoidalRenderer] Pitch détecté', {
        raw: frequency,
        smoothed: smoothedFreq,
        note: pitchData?.note
      });
      
    } catch (e) {
      Logger.error('[SinusoidalRenderer] Erreur détection pitch', e);
    }

    // Mode scrolling
    if (this.persistent) {
      // Décaler l'image existante vers la gauche
      const img = ctx.getImageData(this._scrollSpeed, 0, W - this._scrollSpeed, H);
      ctx.putImageData(img, 0, 0);
      
      // Effacer colonne droite
      ctx.fillStyle = this._bg;
      ctx.fillRect(W - this._scrollSpeed, 0, this._scrollSpeed, H);
      
      // Grille verticale toutes les ~1s
      if (now - this._timeLastGridTime > this._gridEvery) {
        ctx.fillStyle = this._grid;
        ctx.fillRect(W - this._scrollSpeed, 0, 1, H);
        this._timeLastGridTime = now;
      }
      
      // Redessiner axes et labels FIXES
      this._drawFixedElements();
      
      // ÉTAPE 3 : Dessiner le point de pitch (si détecté)
      if (smoothedFreq !== null) {
        this._drawPitchPointAtEdge(smoothedFreq, H);
      }
      
    } else {
      // Mode non-persistent : redessiner tout
      this._drawBackdrop();
      this._drawPitchCurve(W, H);
    }
  }

  /**
   * Dessiner les éléments fixes (axes + labels)
   * Appelé à chaque frame en mode scrolling
   */
  _drawFixedElements() {
    const {ctx, canvas} = this;
    const H = canvas.height;
    
    // Ligne centrale horizontale (440 Hz)
    const centerY = this._frequencyToY(this.centerFreq, H);
    ctx.strokeStyle = this._axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    
    // Labels registres vocaux (FIXES à gauche)
    ctx.fillStyle = '#9fb7ff';
    ctx.font = '11px system-ui,Arial';
    
    for (const label of this.vocalLabels) {
      const y = this._frequencyToY(label.freq, H);
      ctx.fillText(label.label, 4, y + 4);
    }
  }

  /**
   * Dessiner un point de pitch sur le bord droit du canvas
   * @param {number} frequency - Fréquence en Hz
   * @param {number} H - Hauteur du canvas
   */
  _drawPitchPointAtEdge(frequency, H) {
    const {ctx, canvas} = this;
    const W = canvas.width;
    
    // Filtrer fréquences hors plage
    if (frequency < this.minFreq || frequency > this.maxFreq) {
      Logger.debug('[SinusoidalRenderer] Fréquence hors plage', { frequency });
      return;
    }
    
    // Convertir Hz → position Y
    const y = this._frequencyToY(frequency, H);
    
    // Couleur (vert par défaut, on peut ajouter logique cents plus tard)
    const color = this._wave;
    
    // Dessiner petit segment vertical (2-3 pixels de large)
    ctx.fillStyle = color;
    const x = W - Math.ceil(this._scrollSpeed / 2);
    ctx.fillRect(x, y - 1, 2, 3);
    
    // Ajouter à l'historique pour mode non-persistent
    this.pitchHistory.push({
      frequency: frequency,
      timestamp: performance.now(),
      y: y
    });
    
    // Limiter taille historique
    if (this.pitchHistory.length > this.maxHistoryPoints) {
      this.pitchHistory.shift();
    }
  }

  /**
   * Dessiner toute la courbe de pitch (mode non-persistent)
   */
  _drawPitchCurve(W, H) {
    if (this.pitchHistory.length < 2) return;
    
    const {ctx} = this;
    
    ctx.strokeStyle = this._wave;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Dessiner ligne continue
    const pointsPerPixel = Math.max(1, Math.floor(this.pitchHistory.length / W));
    
    for (let i = 0; i < this.pitchHistory.length; i += pointsPerPixel) {
      const point = this.pitchHistory[i];
      const x = (i / this.pitchHistory.length) * W;
      const y = point.y;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }

  /**
   * Convertir fréquence Hz → position Y sur le canvas
   * Échelle logarithmique pour correspondre à la perception humaine
   */
  _frequencyToY(frequency, canvasHeight) {
    // Échelle logarithmique : log2(freq)
    const logMin = Math.log2(this.minFreq);
    const logMax = Math.log2(this.maxFreq);
    const logFreq = Math.log2(frequency);
    
    // Normaliser entre 0 et 1 (1 = haut, 0 = bas)
    const normalized = (logFreq - logMin) / (logMax - logMin);
    
    // Inverser (0 = bas du canvas, height = haut du canvas)
    const y = canvasHeight - (normalized * canvasHeight);
    
    return Math.max(0, Math.min(canvasHeight, y));
  }

  /**
   * Dessiner le fond avec grille + axes + labels
   */
  _drawBackdrop() {
    const {ctx, canvas} = this;
    const W = canvas.width;
    const H = canvas.height;
    
    // Fond
    ctx.fillStyle = this._bg; 
    ctx.fillRect(0, 0, W, H);

    // Lignes horizontales (registres vocaux)
    ctx.strokeStyle = this._grid; 
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (const label of this.vocalLabels) {
      const y = this._frequencyToY(label.freq, H);
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    
    ctx.stroke();

    // Ligne centrale horizontale (440 Hz) plus visible
    const centerY = this._frequencyToY(this.centerFreq, H);
    ctx.strokeStyle = this._axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(W, centerY);
    ctx.stroke();
    
    // Labels registres vocaux (FIXES à gauche)
    ctx.fillStyle = '#9fb7ff'; 
    ctx.font = '11px system-ui,Arial';
    
    for (const label of this.vocalLabels) {
      const y = this._frequencyToY(label.freq, H);
      ctx.fillText(label.label, 4, y + 4);
    }

    // Axe temps (X) en bas
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px system-ui,Arial';
    
    for (let i = 0; i <= 12; i++) {
      const x = Math.round(i * (W / 12));
      ctx.fillRect(x, H - 10, 1, 10);
      ctx.fillText(String(i), x + 2, H - 2);
    }
  }

  /**
   * Mettre à jour la plage de fréquences affichées
   */
  setFrequencyRange(minFreq, maxFreq, centerFreq = 440) {
    this.minFreq = minFreq;
    this.maxFreq = maxFreq;
    this.centerFreq = centerFreq;
    
    Logger.info('[SinusoidalRenderer] Plage fréquences mise à jour', {
      min: minFreq,
      max: maxFreq,
      center: centerFreq
    });
    
    this._drawBackdrop();
  }
}
