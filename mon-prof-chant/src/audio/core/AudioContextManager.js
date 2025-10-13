/**
 * AudioContextManager.js
 * TYPE: Manager - AudioContext Lifecycle
 * 
 * Responsabilités:
 * - Gérer le cycle de vie de l'AudioContext
 * - Résoudre les problèmes d'autoplay (nécessite user gesture)
 * - Reprendre le contexte quand il est suspendu
 * - Optimiser les paramètres selon le navigateur
 * 
 * Dépendances: Logger, BrowserDetector
 */

import { Logger } from '../../logging/Logger.js';
import { BrowserDetector } from '../../utils/BrowserDetector.js';

export class AudioContextManager {
  
  #audioContext = null;
  #state = 'uninitialized'; // 'uninitialized' | 'running' | 'suspended' | 'closed'
  #resumeAttempts = 0;
  #maxResumeAttempts = 3;

  /**
   * Constructeur
   * @param {AudioContext} audioContext - Instance d'AudioContext à gérer
   */
  constructor(audioContext) {
    if (!audioContext) {
      throw new Error('[AudioContextManager] AudioContext required');
    }

    this.#audioContext = audioContext;
    this.#state = audioContext.state;

    Logger.info('AudioContextManager', 'Initialized', {
      initialState: this.#state,
      sampleRate: audioContext.sampleRate,
    });

    // Écouter les changements d'état
    this.#setupStateListeners();
  }

  /**
   * Configure les listeners d'état
   */
  #setupStateListeners() {
    try {
      this.#audioContext.addEventListener('statechange', () => {
        const newState = this.#audioContext.state;
        
        Logger.info('AudioContextManager', 'State changed', {
          from: this.#state,
          to: newState,
        });

        this.#state = newState;

        // Si suspendu automatiquement, tenter de reprendre
        if (newState === 'suspended') {
          Logger.warn('AudioContextManager', 'Context suspended, will attempt resume on next interaction');
        }
      });

    } catch (error) {
      Logger.error('AudioContextManager', 'Failed to setup state listeners', error);
    }
  }

  /**
   * Démarre ou reprend le contexte audio
   * DOIT être appelé depuis un geste utilisateur (clic, touch)
   * @returns {Promise<boolean>} true si succès
   */
  async resume() {
    try {
      Logger.info('AudioContextManager', 'Attempting to resume context', {
        currentState: this.#state,
        attempt: this.#resumeAttempts + 1,
      });

      // Si déjà running, rien à faire
      if (this.#audioContext.state === 'running') {
        Logger.debug('AudioContextManager', 'Already running');
        return true;
      }

      // Si closed, impossible de reprendre
      if (this.#audioContext.state === 'closed') {
        Logger.error('AudioContextManager', 'Cannot resume closed context');
        return false;
      }

      // Tenter de reprendre
      await this.#audioContext.resume();
      
      this.#resumeAttempts++;
      this.#state = this.#audioContext.state;

      if (this.#audioContext.state === 'running') {
        Logger.info('AudioContextManager', 'Context resumed successfully');
        this.#resumeAttempts = 0; // Reset compteur
        return true;
      } else {
        Logger.warn('AudioContextManager', 'Context not running after resume', {
          state: this.#audioContext.state,
        });
        return false;
      }

    } catch (error) {
      Logger.error('AudioContextManager', 'Resume failed', error);
      this.#resumeAttempts++;
      
      // Si trop de tentatives échouées
      if (this.#resumeAttempts >= this.#maxResumeAttempts) {
        Logger.critical('AudioContextManager', 'Max resume attempts reached', {
          attempts: this.#resumeAttempts,
        });
      }

      return false;
    }
  }

  /**
   * Suspend le contexte (pour économiser CPU)
   * @returns {Promise<boolean>}
   */
  async suspend() {
    try {
      Logger.info('AudioContextManager', 'Suspending context');

      if (this.#audioContext.state === 'suspended') {
        Logger.debug('AudioContextManager', 'Already suspended');
        return true;
      }

      if (this.#audioContext.state === 'closed') {
        Logger.warn('AudioContextManager', 'Cannot suspend closed context');
        return false;
      }

      await this.#audioContext.suspend();
      this.#state = this.#audioContext.state;

      Logger.info('AudioContextManager', 'Context suspended');
      return true;

    } catch (error) {
      Logger.error('AudioContextManager', 'Suspend failed', error);
      return false;
    }
  }

  /**
   * Ferme définitivement le contexte
   * @returns {Promise<boolean>}
   */
  async close() {
    try {
      Logger.info('AudioContextManager', 'Closing context');

      if (this.#audioContext.state === 'closed') {
        Logger.debug('AudioContextManager', 'Already closed');
        return true;
      }

      await this.#audioContext.close();
      this.#state = 'closed';

      Logger.info('AudioContextManager', 'Context closed');
      return true;

    } catch (error) {
      Logger.error('AudioContextManager', 'Close failed', error);
      return false;
    }
  }

  /**
   * Récupère l'état actuel
   * @returns {string} 'running' | 'suspended' | 'closed'
   */
  getState() {
    return this.#audioContext.state;
  }

  /**
   * Vérifie si le contexte est prêt à être utilisé
   * @returns {boolean}
   */
  isReady() {
    return this.#audioContext.state === 'running';
  }

  /**
   * Récupère le contexte audio
   * @returns {AudioContext}
   */
  getContext() {
    return this.#audioContext;
  }

  /**
   * Récupère des infos de debug
   * @returns {object}
   */
  getDebugInfo() {
    return {
      state: this.#audioContext.state,
      sampleRate: this.#audioContext.sampleRate,
      currentTime: this.#audioContext.currentTime,
      baseLatency: this.#audioContext.baseLatency || 0,
      outputLatency: this.#audioContext.outputLatency || 0,
      resumeAttempts: this.#resumeAttempts,
    };
  }

  /**
   * Configure les paramètres optimaux selon le navigateur
   * @static
   * @returns {object} Configuration recommandée
   */
  static getOptimalConfig() {
    const browser = BrowserDetector.detect();
    
    const config = {
      sampleRate: 48000,
      latencyHint: 'interactive',
    };

    // Ajustements spécifiques Safari iOS
    if (browser.name === 'safari' && browser.os === 'ios') {
      config.latencyHint = 'balanced'; // Plus stable sur iOS
      Logger.debug('AudioContextManager', 'iOS Safari detected, using balanced latency');
    }

    // Ajustements Firefox
    if (browser.name === 'firefox') {
      // Firefox gère mieux la latency interactive
      config.latencyHint = 'interactive';
    }

    Logger.debug('AudioContextManager', 'Optimal config', config);
    return config;
  }

  /**
   * Teste si le contexte peut être créé
   * @static
   * @returns {boolean}
   */
  static canCreate() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /**
   * Crée un nouveau contexte avec config optimale
   * @static
   * @returns {AudioContext|null}
   */
  static create() {
    try {
      if (!AudioContextManager.canCreate()) {
        Logger.error('AudioContextManager', 'AudioContext not supported');
        return null;
      }

      const config = AudioContextManager.getOptimalConfig();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass(config);

      Logger.info('AudioContextManager', 'AudioContext created', {
        sampleRate: context.sampleRate,
        state: context.state,
      });

      return context;

    } catch (error) {
      Logger.error('AudioContextManager', 'Failed to create AudioContext', error);
      return null;
    }
  }
}

// Export par défaut
export default AudioContextManager;