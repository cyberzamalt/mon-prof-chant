/**
 * AudioEngine.js
 * TYPE: Singleton Manager - Core Audio
 * 
 * Responsabilités:
 * - Point central de tout le système audio
 * - Gestion unique de l'AudioContext
 * - Lifecycle complet (init, start, stop, destroy)
 * - Coordination entre tous les modules audio
 * 
 * Dépendances: Logger, AudioContextManager, AudioBus, ErrorHandler, BrowserDetector
 */

import { Logger } from '../../logging/Logger.js';
import { AudioContextManager } from './AudioContextManager.js';
import { BrowserDetector } from '../../utils/BrowserDetector.js';
import { CONFIG } from '../../config.js';
import { errorHandler } from './ErrorHandler.js';

export class AudioEngine {
  
  // ========================================
  // SINGLETON
  // ========================================
  
  static #instance = null;

  /**
   * Singleton accessor
   */
  static getInstance(config = {}) {
    if (!AudioEngine.#instance) {
      AudioEngine.#instance = new AudioEngine(config);
    }
    return AudioEngine.#instance;
  }

  // ========================================
  // CHAMPS PRIVÉS
  // ========================================
  
  #audioContext = null;
  #contextManager = null;
  #state = 'uninitialized'; // 'uninitialized' | 'initialized' | 'running' | 'stopped' | 'error'
  #config = null;
  #browser = null;
  #initTime = null;

  /**
   * Constructeur privé
   */
  constructor(config = {}) {
    // Empêcher instanciation directe
    if (AudioEngine.#instance) {
      throw new Error('AudioEngine is a singleton. Use AudioEngine.getInstance()');
    }

    // Merge config avec défauts
    this.#config = {
      sampleRate: CONFIG.audio.sampleRate,
      latencyHint: CONFIG.audio.latencyHint,
      ...config,
    };

    Logger.info('AudioEngine', 'Constructor called', this.#config);
  }

  // ========================================
  // INITIALISATION
  // ========================================

  /**
   * Initialise le moteur audio
   * DOIT être appelé depuis un geste utilisateur (clic)
   * @returns {Promise<boolean>} true si succès
   */
  async init() {
    try {
      Logger.info('AudioEngine', '=== INITIALIZING AUDIO ENGINE ===');

      // Vérifier si déjà initialisé
      if (this.#state !== 'uninitialized') {
        Logger.warn('AudioEngine', 'Already initialized', { state: this.#state });
        return this.#state !== 'error';
      }

      this.#initTime = Date.now();

      // Étape 1 : Détecter navigateur
      Logger.info('AudioEngine', '[1/5] Detecting browser...');
      this.#browser = BrowserDetector.detect();
      
      Logger.info('AudioEngine', 'Browser detected', {
        name: this.#browser.name,
        version: this.#browser.version,
        os: this.#browser.os,
        mobile: this.#browser.mobile,
      });

      // Étape 2 : Vérifier support
      Logger.info('AudioEngine', '[2/5] Checking Web Audio support...');
      
      if (!AudioContextManager.canCreate()) {
        throw new Error('Web Audio API not supported');
      }

      // Étape 3 : Créer AudioContext
      Logger.info('AudioEngine', '[3/5] Creating AudioContext...');
      
      this.#audioContext = AudioContextManager.create();
      
      if (!this.#audioContext) {
        throw new Error('Failed to create AudioContext');
      }

      Logger.info('AudioEngine', 'AudioContext created', {
        state: this.#audioContext.state,
        sampleRate: this.#audioContext.sampleRate,
        baseLatency: this.#audioContext.baseLatency || 'N/A',
        outputLatency: this.#audioContext.outputLatency || 'N/A',
      });

      // Étape 4 : Créer AudioContextManager
      Logger.info('AudioEngine', '[4/5] Creating AudioContextManager...');
      
      this.#contextManager = new AudioContextManager(this.#audioContext);

      // Étape 5 : Démarrer le contexte
      Logger.info('AudioEngine', '[5/5] Starting AudioContext...');
      
      if (this.#audioContext.state === 'suspended') {
        const resumed = await this.#contextManager.resume();
        
        if (!resumed) {
          Logger.warn('AudioEngine', 'AudioContext suspended - user gesture may be required');
          // Ce n'est pas une erreur bloquante, on continue
        }
      }

      // Succès !
      this.#state = 'initialized';
      
      const initDuration = Date.now() - this.#initTime;
      
      Logger.info('AudioEngine', '=== AUDIO ENGINE INITIALIZED ===', {
        duration: `${initDuration}ms`,
        state: this.#state,
        contextState: this.#audioContext.state,
      });

      // Stocker info globale (pour debug)
      window.__audioEngineState = {
        initialized: true,
        sampleRate: this.#audioContext.sampleRate,
        state: this.#audioContext.state,
        browser: this.#browser.name,
      };

      return true;

    } catch (error) {
      this.#state = 'error';
      
      Logger.critical('AudioEngine', 'Initialization failed', {
        error: error.message,
        stack: error.stack,
      });

      errorHandler.handle(error, 'AudioEngine.init', true);
      
      return false;
    }
  }

  // ========================================
  // LIFECYCLE METHODS
  // ========================================

  /**
   * Démarre le moteur (reprend si suspendu)
   * @returns {Promise<boolean>}
   */
  async start() {
    try {
      Logger.info('AudioEngine', 'Starting engine...');

      if (this.#state === 'uninitialized') {
        Logger.warn('AudioEngine', 'Not initialized, calling init() first');
        const initialized = await this.init();
        if (!initialized) {
          return false;
        }
      }

      if (this.#state === 'running') {
        Logger.debug('AudioEngine', 'Already running');
        return true;
      }

      // Reprendre le contexte si suspendu
      if (this.#audioContext.state === 'suspended') {
        const resumed = await this.#contextManager.resume();
        
        if (!resumed) {
          Logger.error('AudioEngine', 'Failed to resume context');
          return false;
        }
      }

      this.#state = 'running';
      
      Logger.info('AudioEngine', 'Engine started', {
        contextState: this.#audioContext.state,
      });

      return true;

    } catch (error) {
      Logger.error('AudioEngine', 'Start failed', error);
      errorHandler.handle(error, 'AudioEngine.start', true);
      return false;
    }
  }

  /**
   * Arrête le moteur (suspend le contexte)
   * @returns {Promise<boolean>}
   */
  async stop() {
    try {
      Logger.info('AudioEngine', 'Stopping engine...');

      if (this.#state === 'stopped' || this.#state === 'uninitialized') {
        Logger.debug('AudioEngine', 'Already stopped');
        return true;
      }

      // Suspendre le contexte
      if (this.#contextManager) {
        await this.#contextManager.suspend();
      }

      this.#state = 'stopped';
      
      Logger.info('AudioEngine', 'Engine stopped');
      return true;

    } catch (error) {
      Logger.error('AudioEngine', 'Stop failed', error);
      return false;
    }
  }

  /**
   * Détruit complètement le moteur
   * @returns {Promise<boolean>}
   */
  async destroy() {
    try {
      Logger.info('AudioEngine', 'Destroying engine...');

      // Fermer le contexte
      if (this.#contextManager) {
        await this.#contextManager.close();
      }

      // Nettoyer les références
      this.#audioContext = null;
      this.#contextManager = null;
      this.#state = 'uninitialized';

      // Reset singleton
      AudioEngine.#instance = null;

      Logger.info('AudioEngine', 'Engine destroyed');
      return true;

    } catch (error) {
      Logger.error('AudioEngine', 'Destroy failed', error);
      return false;
    }
  }

  // ========================================
  // GETTERS
  // ========================================

  /**
   * Récupère l'AudioContext
   * @returns {AudioContext|null}
   */
  getContext() {
    if (!this.#audioContext) {
      Logger.warn('AudioEngine', 'getContext() called but context is null');
    }
    return this.#audioContext;
  }

  /**
   * Récupère l'état actuel
   * @returns {string}
   */
  getState() {
    return this.#state;
  }

  /**
   * Vérifie si le moteur est prêt
   * @returns {boolean}
   */
  isReady() {
    return this.#state === 'initialized' || this.#state === 'running';
  }

  /**
   * Vérifie si le moteur est en cours d'exécution
   * @returns {boolean}
   */
  isRunning() {
    return this.#state === 'running' && this.#audioContext?.state === 'running';
  }

  /**
   * Récupère le sample rate
   * @returns {number|null}
   */
  getSampleRate() {
    return this.#audioContext?.sampleRate || null;
  }

  /**
   * Récupère le temps audio actuel
   * @returns {number|null}
   */
  getCurrentTime() {
    return this.#audioContext?.currentTime || null;
  }

  /**
   * Récupère le AudioContextManager
   * @returns {AudioContextManager|null}
   */
  getContextManager() {
    return this.#contextManager;
  }

  /**
   * Récupère les infos navigateur
   * @returns {object|null}
   */
  getBrowserInfo() {
    return this.#browser;
  }

  /**
   * Récupère la configuration
   * @returns {object}
   */
  getConfig() {
    return { ...this.#config };
  }

  // ========================================
  // UTILITAIRES
  // ========================================

  /**
   * Reprend le contexte si suspendu
   * @returns {Promise<boolean>}
   */
  async resume() {
    try {
      if (!this.#contextManager) {
        Logger.warn('AudioEngine', 'Cannot resume - not initialized');
        return false;
      }

      if (this.#audioContext.state === 'running') {
        Logger.debug('AudioEngine', 'Already running');
        return true;
      }

      Logger.info('AudioEngine', 'Resuming context...');
      return await this.#contextManager.resume();

    } catch (error) {
      Logger.error('AudioEngine', 'Resume failed', error);
      return false;
    }
  }

  /**
   * Récupère des infos de debug complètes
   * @returns {object}
   */
  getDebugInfo() {
    const info = {
      engine: {
        state: this.#state,
        initialized: this.#state !== 'uninitialized',
        running: this.isRunning(),
      },
      context: this.#contextManager?.getDebugInfo() || null,
      browser: this.#browser,
      config: this.#config,
    };

    Logger.debug('AudioEngine', 'Debug info', info);
    return info;
  }

  /**
   * Affiche un rapport dans la console
   */
  logStatus() {
    Logger.group('AudioEngine Status', () => {
      Logger.info('AudioEngine', 'State', this.#state);
      Logger.info('AudioEngine', 'Context State', this.#audioContext?.state);
      Logger.info('AudioEngine', 'Sample Rate', this.#audioContext?.sampleRate);
      Logger.info('AudioEngine', 'Current Time', this.#audioContext?.currentTime);
      
      if (this.#contextManager) {
        const debug = this.#contextManager.getDebugInfo();
        Logger.info('AudioEngine', 'Context Manager', debug);
      }
    });
  }
}

// Export par défaut
export default AudioEngine;