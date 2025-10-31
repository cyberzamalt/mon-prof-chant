/**
 * PitchAnalysisPanel.js
 * Composant UI du panneau d'analyse pitch
 * 
 * Responsabilités:
 * - Gérer l'interface d'un panneau (enregistrement ou référence)
 * - Connecter service d'analyse + renderer
 * - Afficher infos temps réel (note, fréquence, cents)
 * - Boutons start/stop/clear
 * - Sélection de mode (Absolu/A440/Auto)
 * 
 * Réutilisable: Peut être instancié 2x (panneau live + référence)
 */

import { Logger } from '../../logging/Logger.js';
import { SinusoidalRenderer } from '../../visualization/renderers/SinusoidalRenderer.js';

export class PitchAnalysisPanel {
  #containerId = null;
  #canvasId = null;
  #canvas = null;
  #renderer = null;
  #pitchService = null;
  #eventBus = null;
  #elements = {};
  #isActive = false;
  #type = 'recording'; // 'recording' ou 'reference'

  /**
   * Constructeur
   * @param {Object} options - Configuration du panneau
   */
  constructor(options = {}) {
    try {
      const {
        type = 'recording',
        containerId,
        canvasId,
        pitchService,
        eventBus
      } = options;

      if (!containerId) {
        throw new Error('[PitchAnalysisPanel] containerId requis');
      }
      if (!canvasId) {
        throw new Error('[PitchAnalysisPanel] canvasId requis');
      }
      if (!pitchService) {
        throw new Error('[PitchAnalysisPanel] pitchService requis');
      }
      if (!eventBus) {
        throw new Error('[PitchAnalysisPanel] eventBus requis');
      }

      this.#type = type;
      this.#containerId = containerId;
      this.#canvasId = canvasId;
      this.#pitchService = pitchService;
      this.#eventBus = eventBus;

      this.#init();

      Logger.info('PitchAnalysisPanel', `Panneau ${type} créé`, {
        container: containerId,
        canvas: canvasId
      });

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur constructeur', err);
      throw err;
    }
  }

  /**
   * Initialiser le panneau
   * @private
   */
  #init() {
    try {
      // Récupérer les éléments DOM
      this.#findElements();

      // Créer le renderer
      this.#createRenderer();

      // Connecter les événements
      this.#connectEvents();

      // Initialiser l'état
      this.#updateUI();

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur init', err);
      throw err;
    }
  }

  /**
   * Récupérer les éléments DOM
   * @private
   */
  #findElements() {
    try {
      // Canvas
      this.#canvas = document.getElementById(this.#canvasId);
      if (!this.#canvas) {
        throw new Error(`Canvas #${this.#canvasId} introuvable`);
      }

      // Container
      const container = document.getElementById(this.#containerId);
      if (!container) {
        throw new Error(`Container #${this.#containerId} introuvable`);
      }

      // Boutons et contrôles (s'ils existent)
      this.#elements = {
        container: container,
        canvas: this.#canvas,
        startBtn: container.querySelector('[data-action="start"]'),
        stopBtn: container.querySelector('[data-action="stop"]'),
        clearBtn: container.querySelector('[data-action="clear"]'),
        modeSelect: container.querySelector('[data-control="mode"]'),
        frequencyDisplay: container.querySelector('[data-display="frequency"]'),
        noteDisplay: container.querySelector('[data-display="note"]'),
        centsDisplay: container.querySelector('[data-display="cents"]'),
        statusDisplay: container.querySelector('[data-display="status"]')
      };

      Logger.debug('PitchAnalysisPanel', 'Éléments DOM trouvés', {
        hasStartBtn: !!this.#elements.startBtn,
        hasCanvas: !!this.#elements.canvas
      });

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur findElements', err);
      throw err;
    }
  }

  /**
   * Créer le renderer de visualisation
   * @private
   */
  #createRenderer() {
    try {
      this.#renderer = new SinusoidalRenderer(this.#canvas, {
        lineColor: this.#type === 'recording' ? '#00ff00' : '#00aaff',
        showGrid: true,
        showAxes: true
      });

      Logger.info('PitchAnalysisPanel', 'Renderer créé');

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur createRenderer', err);
      throw err;
    }
  }

  /**
   * Connecter les événements
   * @private
   */
  #connectEvents() {
    try {
      // Bouton start
      if (this.#elements.startBtn) {
        this.#elements.startBtn.addEventListener('click', () => {
          this.start();
        });
      }

      // Bouton stop
      if (this.#elements.stopBtn) {
        this.#elements.stopBtn.addEventListener('click', () => {
          this.stop();
        });
      }

      // Bouton clear
      if (this.#elements.clearBtn) {
        this.#elements.clearBtn.addEventListener('click', () => {
          this.clear();
        });
      }

      // Sélecteur de mode
      if (this.#elements.modeSelect) {
        this.#elements.modeSelect.addEventListener('change', (e) => {
          this.setMode(e.target.value);
        });
      }

      // Écouter les événements d'analyse
      this.#eventBus.on('pitch:detected', (data) => {
        this.#onPitchDetected(data);
      });

      Logger.debug('PitchAnalysisPanel', 'Événements connectés');

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur connectEvents', err);
    }
  }

  /**
   * Callback quand une fréquence est détectée
   * @private
   */
  #onPitchDetected(data) {
    try {
      if (!this.#isActive) {
        return;
      }

      const { frequency, note, cents, clarity } = data;

      // Ajouter point au renderer
      if (this.#renderer && frequency) {
        this.#renderer.addPoint(frequency, {
          note: note,
          cents: cents,
          clarity: clarity
        });
      }

      // Mettre à jour l'affichage
      this.#updateDisplay(data);

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur onPitchDetected', err);
    }
  }

  /**
   * Mettre à jour l'affichage des données
   * @private
   */
  #updateDisplay(data) {
    try {
      const { frequency, note, octave, cents } = data;

      // Afficher la fréquence
      if (this.#elements.frequencyDisplay && frequency) {
        this.#elements.frequencyDisplay.textContent = `${frequency.toFixed(2)} Hz`;
      }

      // Afficher la note
      if (this.#elements.noteDisplay && note) {
        const noteText = octave !== null ? `${note}${octave}` : note;
        this.#elements.noteDisplay.textContent = noteText;
      }

      // Afficher les cents
      if (this.#elements.centsDisplay && cents !== undefined) {
        const sign = cents >= 0 ? '+' : '';
        this.#elements.centsDisplay.textContent = `${sign}${cents} ¢`;
        
        // Couleur selon la justesse
        if (Math.abs(cents) < 10) {
          this.#elements.centsDisplay.style.color = '#00ff00'; // Juste
        } else if (Math.abs(cents) < 30) {
          this.#elements.centsDisplay.style.color = '#ffaa00'; // Moyen
        } else {
          this.#elements.centsDisplay.style.color = '#ff0000'; // Faux
        }
      }

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur updateDisplay', err);
    }
  }

  /**
   * Mettre à jour l'interface utilisateur
   * @private
   */
  #updateUI() {
    try {
      // État des boutons
      if (this.#elements.startBtn) {
        this.#elements.startBtn.disabled = this.#isActive;
      }
      if (this.#elements.stopBtn) {
        this.#elements.stopBtn.disabled = !this.#isActive;
      }

      // Statut
      if (this.#elements.statusDisplay) {
        this.#elements.statusDisplay.textContent = this.#isActive ? 'Actif' : 'Inactif';
        this.#elements.statusDisplay.style.color = this.#isActive ? '#00ff00' : '#888888';
      }

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur updateUI', err);
    }
  }

  /**
   * Démarrer l'analyse
   */
  start() {
    try {
      if (this.#isActive) {
        Logger.warn('PitchAnalysisPanel', 'Déjà actif');
        return;
      }

      // Démarrer le service d'analyse
      if (this.#pitchService) {
        this.#pitchService.start();
      }

      // Démarrer le renderer
      if (this.#renderer) {
        this.#renderer.start();
      }

      this.#isActive = true;
      this.#updateUI();

      Logger.info('PitchAnalysisPanel', 'Panneau démarré');

      // Émettre événement
      this.#eventBus.emit(`panel:${this.#type}:started`, {
        type: this.#type,
        timestamp: Date.now()
      });

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur start', err);
    }
  }

  /**
   * Arrêter l'analyse
   */
  stop() {
    try {
      if (!this.#isActive) {
        Logger.warn('PitchAnalysisPanel', 'Déjà inactif');
        return;
      }

      // Arrêter le service
      if (this.#pitchService) {
        this.#pitchService.stop();
      }

      // Arrêter le renderer
      if (this.#renderer) {
        this.#renderer.stop();
      }

      this.#isActive = false;
      this.#updateUI();

      Logger.info('PitchAnalysisPanel', 'Panneau arrêté');

      // Émettre événement
      this.#eventBus.emit(`panel:${this.#type}:stopped`, {
        type: this.#type,
        timestamp: Date.now()
      });

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur stop', err);
    }
  }

  /**
   * Effacer la visualisation
   */
  clear() {
    try {
      if (this.#renderer) {
        this.#renderer.clear();
      }

      // Réinitialiser l'affichage
      if (this.#elements.frequencyDisplay) {
        this.#elements.frequencyDisplay.textContent = '---';
      }
      if (this.#elements.noteDisplay) {
        this.#elements.noteDisplay.textContent = '---';
      }
      if (this.#elements.centsDisplay) {
        this.#elements.centsDisplay.textContent = '---';
      }

      Logger.info('PitchAnalysisPanel', 'Panneau effacé');

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur clear', err);
    }
  }

  /**
   * Définir le mode de visualisation
   * @param {string} mode - 'absolute', 'A440', 'auto'
   */
  setMode(mode) {
    try {
      if (this.#renderer) {
        this.#renderer.setMode(mode);
      }
      if (this.#pitchService) {
        this.#pitchService.setMode(mode);
      }

      Logger.info('PitchAnalysisPanel', `Mode changé: ${mode}`);

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur setMode', err);
    }
  }

  /**
   * Obtenir le renderer
   * @returns {SinusoidalRenderer}
   */
  getRenderer() {
    return this.#renderer;
  }

  /**
   * Vérifier si le panneau est actif
   * @returns {boolean}
   */
  isActive() {
    return this.#isActive;
  }

  /**
   * Obtenir le type de panneau
   * @returns {string}
   */
  getType() {
    return this.#type;
  }

  /**
   * Détruire le panneau
   */
  destroy() {
    try {
      // Arrêter si actif
      if (this.#isActive) {
        this.stop();
      }

      // Détruire le renderer
      if (this.#renderer) {
        this.#renderer.stop();
        this.#renderer = null;
      }

      // Nettoyer les éléments
      this.#elements = {};

      Logger.info('PitchAnalysisPanel', 'Panneau détruit');

    } catch (err) {
      Logger.error('PitchAnalysisPanel', 'Erreur destroy', err);
    }
  }
}
