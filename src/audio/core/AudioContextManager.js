/**
 * AudioContextManager.js
 * TYPE: Manager - AudioContext Lifecycle Management
 * 
 * Responsabilités:
 * - Gestion du cycle de vie AudioContext
 * - Gestion restrictions autoplay (user gesture required)
 * - Resume/suspend context
 * - Gestion états context
 * - Fallback navigateurs iOS
 * 
 * Dépendances: Logger, BrowserDetector
 * Utilisé par: AudioEngine
 */

import { Logger } from '../logging/Logger.js';
import { BrowserDetector } from '../utils/BrowserDetector.js';

class AudioContextManager {
  #audioContext = null;
  #state = 'suspended';
  #listeners = new Map();
  #resumeAttempts = 0;
  #maxResumeAttempts = 5;

  /**
   * Constructeur
   */
  constructor(audioContext) {
    try {
      if (!audioContext) {
        throw new Error('AudioContext required');
      }
      this.#audioContext = audioContext;
      this.#state = audioContext.state || 'suspended';
      Logger.info('AudioContextManager', 'Initialized', { state: this.#state });
      this.#setupListeners();
    } catch (err) {
      Logger.error('AudioContextManager', 'Constructor failed', err);
      throw err;
    }
  }

  /**
   * Configurer les listeners
   */
  #setupListeners() {
    try {
      if (this.#audioContext.onstatechange) {
        this.#audioContext.onstatechange = () => {
          const newState = this.#audioContext.state;
          Logger.info('AudioContextManager', 'State changed', { from: this.#state, to: newState });
          this.#state = newState;
          this.#emit('statechange', { state: newState });
        };
      }
    } catch (err) {
      Logger.warn('AudioContextManager', 'Listener setup failed', err);
    }
  }

  /**
   * Obtenir l'état actuel
   */
  getState() {
    try {
      this.#state = this.#audioContext.state || this.#state;
      return this.#state;
    } catch (err) {
      Logger.error('AudioContextManager', 'getState failed', err);
      return 'unknown';
    }
  }

  /**
   * Obtenir le contexte audio
   */
  getContext() {
    try {
      return this.#audioContext;
    } catch (err) {
      Logger.error('AudioContextManager', 'getContext failed', err);
      return null;
    }
  }

  /**
   * Vérifier si contexte est suspendu
   */
  isSuspended() {
    return this.getState() === 'suspended';
  }

  /**
   * Vérifier si contexte est running
   */
  isRunning() {
    return this.getState() === 'running';
  }

  /**
   * Résumer le contexte (nécessite user gesture)
   */
  async resume() {
    try {
      const currentState = this.getState();
      Logger.info('AudioContextManager', 'Resume requested', { currentState, attempts: this.#resumeAttempts });

      if (currentState === 'running') {
        Logger.info('AudioContextManager', 'Context already running');
        return true;
      }

      if (this.#resumeAttempts >= this.#maxResumeAttempts) {
        Logger.error('AudioContextManager', 'Max resume attempts reached');
        return false;
      }

      this.#resumeAttempts++;

      if (this.#audioContext.resume) {
        await this.#audioContext.resume();
        Logger.info('AudioContextManager', 'Resume successful');
        this.#state = 'running';
        this.#emit('resumed', {});
        return true;
      } else {
        Logger.warn('AudioContextManager', 'Resume not available');
        return false;
      }
    } catch (err) {
      Logger.error('AudioContextManager', 'Resume failed', err);
      return false;
    }
  }

  /**
   * Suspendre le contexte
   */
  async suspend() {
    try {
      Logger.info('AudioContextManager', 'Suspend requested');

      if (this.#audioContext.suspend) {
        await this.#audioContext.suspend();
        Logger.info('AudioContextManager', 'Suspend successful');
        this.#state = 'suspended';
        this.#emit('suspended', {});
        return true;
      }
      return false;
    } catch (err) {
      Logger.error('AudioContextManager', 'Suspend failed', err);
      return false;
    }
  }

  /**
   * Fermer le contexte (irréversible)
   */
  async close() {
    try {
      Logger.info('AudioContextManager', 'Close requested');

      if (this.#audioContext.close) {
        await this.#audioContext.close();
        Logger.info('AudioContextManager', 'Close successful');
        this.#state = 'closed';
        this.#emit('closed', {});
        return true;
      }
      return false;
    } catch (err) {
      Logger.error('AudioContextManager', 'Close failed', err);
      return false;
    }
  }

  /**
   * Vérifier si iOS (restrictions spéciales)
   */
  isIOS() {
    try {
      const browser = BrowserDetector.detect();
      return browser.os === 'iOS';
    } catch (err) {
      Logger.warn('AudioContextManager', 'iOS check failed', err);
      return false;
    }
  }

  /**
   * Vérifier si Safari
   */
  isSafari() {
    try {
      const browser = BrowserDetector.detect();
      return browser.browser === 'Safari';
    } catch (err) {
      Logger.warn('AudioContextManager', 'Safari check failed', err);
      return false;
    }
  }

  /**
   * Obtenir informations latence
   */
  getLatencyInfo() {
    try {
      const info = {
        baseLatency: this.#audioContext.baseLatency || 0,
        outputLatency: this.#audioContext.outputLatency || 0,
        sampleRate: this.#audioContext.sampleRate || 0,
        currentTime: this.#audioContext.currentTime || 0,
      };
      Logger.debug('AudioContextManager', 'Latency info', info);
      return info;
    } catch (err) {
      Logger.error('AudioContextManager', 'getLatencyInfo failed', err);
      return { baseLatency: 0, outputLatency: 0, sampleRate: 0, currentTime: 0 };
    }
  }

  /**
   * Écouter les changements d'état
   */
  on(event, callback) {
    try {
      if (!this.#listeners.has(event)) {
        this.#listeners.set(event, new Set());
      }
      this.#listeners.get(event).add(callback);
      Logger.debug('AudioContextManager', `Listener added for ${event}`);
      return () => this.#listeners.get(event).delete(callback);
    } catch (err) {
      Logger.error('AudioContextManager', 'on failed', err);
      return () => {};
    }
  }

  /**
   * Émettre un événement
   */
  #emit(event, data) {
    try {
      const listeners = this.#listeners.get(event);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            Logger.error('AudioContextManager', `Listener callback failed for ${event}`, err);
          }
        });
      }
    } catch (err) {
      Logger.error('AudioContextManager', `emit failed for ${event}`, err);
    }
  }

  /**
   * Obtenir état complet
   */
  getStatus() {
    try {
      return {
        state: this.getState(),
        isRunning: this.isRunning(),
        isSuspended: this.isSuspended(),
        isIOS: this.isIOS(),
        isSafari: this.isSafari(),
        latency: this.getLatencyInfo(),
        resumeAttempts: this.#resumeAttempts,
      };
    } catch (err) {
      Logger.error('AudioContextManager', 'getStatus failed', err);
      return { state: 'unknown' };
    }
  }
}

export { AudioContextManager };
export default AudioContextManager;
