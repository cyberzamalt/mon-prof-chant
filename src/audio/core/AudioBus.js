/**
 * AudioBus.js
 * TYPE: Event System - Publish-Subscribe for Audio Events
 * 
 * Responsabilités:
 * - Système événements pour modules audio
 * - Publish-subscribe pattern
 * - Gestion asynchrone événements
 * - Fallback robuste
 * 
 * Dépendances: Logger
 * Utilisé par: PitchDetector, RecorderService, app.js
 */

import { Logger } from '../../logging/Logger.js';

class AudioBus {
  #subscribers = new Map();
  #eventHistory = [];
  #maxHistory = 100;
  #isProcessing = false;
  #eventQueue = [];

  /**
   * Constructeur
   */
  constructor(audioContext = null) {
    try {
      Logger.info('AudioBus', 'Initialized');
    } catch (err) {
      console.error('[AudioBus] Constructor failed:', err);
    }
  }

  /**
   * S'abonner à un événement
   */
  on(eventName, callback) {
    try {
      if (!eventName || typeof callback !== 'function') {
        throw new Error('Invalid event name or callback');
      }

      if (!this.#subscribers.has(eventName)) {
        this.#subscribers.set(eventName, new Set());
      }

      this.#subscribers.get(eventName).add(callback);
      Logger.debug('AudioBus', `Listener added for ${eventName}`);

      // Retourner fonction de désabonnement
      return () => {
        this.#subscribers.get(eventName).delete(callback);
        Logger.debug('AudioBus', `Listener removed for ${eventName}`);
      };
    } catch (err) {
      Logger.error('AudioBus', 'on failed', err);
      return () => {};
    }
  }

  /**
   * S'abonner une seule fois
   */
  once(eventName, callback) {
    try {
      const unsubscribe = this.on(eventName, (data) => {
        callback(data);
        unsubscribe();
      });
      return unsubscribe;
    } catch (err) {
      Logger.error('AudioBus', 'once failed', err);
      return () => {};
    }
  }

  /**
   * Émettre un événement
   */
  emit(eventName, data = null) {
    try {
      if (!eventName) {
        throw new Error('Event name required');
      }

      const event = {
        name: eventName,
        data: data,
        timestamp: new Date().toISOString(),
      };

      // Ajouter à l'historique
      this.#eventHistory.push(event);
      if (this.#eventHistory.length > this.#maxHistory) {
        this.#eventHistory = this.#eventHistory.slice(-this.#maxHistory);
      }

      // Ajouter à la queue si en cours de traitement
      if (this.#isProcessing) {
        this.#eventQueue.push(event);
        return;
      }

      // Traiter immédiatement
      this.#processEvent(event);
    } catch (err) {
      Logger.error('AudioBus', `emit ${eventName} failed`, err);
    }
  }

  /**
   * Traiter un événement
   */
  #processEvent(event) {
    try {
      this.#isProcessing = true;

      const listeners = this.#subscribers.get(event.name);
      if (listeners && listeners.size > 0) {
        listeners.forEach(callback => {
          try {
            callback(event.data);
          } catch (err) {
            Logger.error('AudioBus', `Listener callback failed for ${event.name}`, err);
          }
        });
      }

      this.#isProcessing = false;

      // Traiter la queue s'il y a d'autres événements
      if (this.#eventQueue.length > 0) {
        const nextEvent = this.#eventQueue.shift();
        this.#processEvent(nextEvent);
      }
    } catch (err) {
      Logger.error('AudioBus', 'processEvent failed', err);
      this.#isProcessing = false;
    }
  }

  /**
   * Émettre un événement de manière asynchrone
   */
  async emitAsync(eventName, data = null) {
    try {
      return new Promise((resolve) => {
        this.emit(eventName, data);
        resolve(true);
      });
    } catch (err) {
      Logger.error('AudioBus', `emitAsync ${eventName} failed`, err);
      return false;
    }
  }

  /**
   * Obtenir tous les abonnés d'un événement
   */
  getSubscribers(eventName) {
    try {
      const listeners = this.#subscribers.get(eventName);
      return listeners ? listeners.size : 0;
    } catch (err) {
      Logger.error('AudioBus', 'getSubscribers failed', err);
      return 0;
    }
  }

  /**
   * Obtenir l'historique événements
   */
  getHistory(eventName = null) {
    try {
      if (eventName) {
        return this.#eventHistory.filter(e => e.name === eventName);
      }
      return [...this.#eventHistory];
    } catch (err) {
      Logger.error('AudioBus', 'getHistory failed', err);
      return [];
    }
  }

  /**
   * Nettoyer l'historique
   */
  clearHistory() {
    try {
      this.#eventHistory = [];
      Logger.info('AudioBus', 'History cleared');
    } catch (err) {
      Logger.error('AudioBus', 'clearHistory failed', err);
    }
  }

  /**
   * Désabonner tous les listeners d'un événement
   */
  off(eventName) {
    try {
      if (this.#subscribers.has(eventName)) {
        this.#subscribers.delete(eventName);
        Logger.info('AudioBus', `All listeners removed for ${eventName}`);
      }
    } catch (err) {
      Logger.error('AudioBus', 'off failed', err);
    }
  }

  /**
   * Désabonner tous les listeners de tous les événements
   */
  offAll() {
    try {
      this.#subscribers.clear();
      Logger.info('AudioBus', 'All listeners removed');
    } catch (err) {
      Logger.error('AudioBus', 'offAll failed', err);
    }
  }

  /**
   * Obtenir rapport
   */
  getStatus() {
    try {
      const eventNames = Array.from(this.#subscribers.keys());
      return {
        eventsMonitored: eventNames,
        totalListeners: Array.from(this.#subscribers.values()).reduce((sum, set) => sum + set.size, 0),
        historySize: this.#eventHistory.length,
        isProcessing: this.#isProcessing,
        queueSize: this.#eventQueue.length,
      };
    } catch (err) {
      Logger.error('AudioBus', 'getStatus failed', err);
      return {};
    }
  }
}

export { AudioBus };
export default AudioBus;
