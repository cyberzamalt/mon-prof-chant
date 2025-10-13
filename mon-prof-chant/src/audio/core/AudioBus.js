/**
 * AudioBus.js
 * TYPE: Event System (Pub/Sub)
 * 
 * Responsabilités:
 * - Communication découplée entre modules
 * - Pattern Pub/Sub avec priorités
 * - Synchronisation avec AudioContext.currentTime
 * - Gestion d'événements audio
 * 
 * Dépendances: Logger
 */

import { Logger } from '../../logging/Logger.js';

export class AudioBus {
  
  // Map des souscriptions: eventName → Array<{callback, priority}>
  #subscribers = new Map();
  
  // AudioContext (optionnel, pour timestamps audio)
  #audioContext = null;
  
  // Statistiques
  #stats = {
    totalEvents: 0,
    eventCounts: {},
  };

  /**
   * Constructeur
   * @param {AudioContext} audioContext - Contexte audio (optionnel)
   */
  constructor(audioContext = null) {
    this.#audioContext = audioContext;
    
    Logger.info('AudioBus', 'Initialized', {
      hasAudioContext: !!audioContext,
    });
  }

  /**
   * Injecte ou met à jour l'AudioContext
   * @param {AudioContext} audioContext
   */
  setAudioContext(audioContext) {
    this.#audioContext = audioContext;
    Logger.debug('AudioBus', 'AudioContext injected');
  }

  /**
   * Subscribe à un événement
   * @param {string} eventName - Nom de l'événement
   * @param {function} callback - Fonction callback(data, audioTime)
   * @param {number} priority - Priorité (plus haut = appelé en premier), défaut: 0
   * @returns {function} Fonction de désinscription
   */
  on(eventName, callback, priority = 0) {
    try {
      if (!eventName || typeof eventName !== 'string') {
        Logger.warn('AudioBus', 'Invalid event name', { eventName });
        return () => {};
      }

      if (typeof callback !== 'function') {
        Logger.warn('AudioBus', 'Invalid callback', { eventName });
        return () => {};
      }

      // Créer le tableau si premier subscriber
      if (!this.#subscribers.has(eventName)) {
        this.#subscribers.set(eventName, []);
      }

      // Ajouter le subscriber
      const subscriber = { callback, priority };
      this.#subscribers.get(eventName).push(subscriber);

      // Trier par priorité décroissante
      this.#subscribers.get(eventName).sort((a, b) => b.priority - a.priority);

      Logger.debug('AudioBus', `Subscribed to "${eventName}"`, { 
        priority,
        totalSubscribers: this.#subscribers.get(eventName).length,
      });

      // Retourner fonction de désinscription
      return () => this.off(eventName, callback);

    } catch (error) {
      Logger.error('AudioBus', 'Subscribe failed', error);
      return () => {};
    }
  }

  /**
   * Unsubscribe d'un événement
   * @param {string} eventName - Nom de l'événement
   * @param {function} callback - Fonction callback à retirer
   */
  off(eventName, callback) {
    try {
      if (!this.#subscribers.has(eventName)) {
        Logger.debug('AudioBus', `No subscribers for "${eventName}"`);
        return;
      }

      const subscribers = this.#subscribers.get(eventName);
      const initialLength = subscribers.length;

      // Filtrer pour retirer le callback
      const filtered = subscribers.filter(sub => sub.callback !== callback);
      
      this.#subscribers.set(eventName, filtered);

      // Si plus de subscribers, supprimer la clé
      if (filtered.length === 0) {
        this.#subscribers.delete(eventName);
      }

      Logger.debug('AudioBus', `Unsubscribed from "${eventName}"`, {
        removed: initialLength - filtered.length,
        remaining: filtered.length,
      });

    } catch (error) {
      Logger.error('AudioBus', 'Unsubscribe failed', error);
    }
  }

  /**
   * Émet un événement
   * @param {string} eventName - Nom de l'événement
   * @param {*} data - Données à transmettre
   * @param {number} audioTime - Temps audio (optionnel)
   */
  emit(eventName, data = null, audioTime = null) {
    try {
      // Utiliser audioContext.currentTime si disponible
      const time = audioTime || this.#audioContext?.currentTime || null;

      Logger.debug('AudioBus', `Emitting "${eventName}"`, { 
        hasData: data !== null,
        audioTime: time,
      });

      // Incrémenter stats
      this.#stats.totalEvents++;
      this.#stats.eventCounts[eventName] = (this.#stats.eventCounts[eventName] || 0) + 1;

      // Récupérer subscribers
      const subscribers = this.#subscribers.get(eventName);

      if (!subscribers || subscribers.length === 0) {
        Logger.debug('AudioBus', `No subscribers for "${eventName}"`);
        return;
      }

      // Appeler chaque callback
      let successCount = 0;
      let errorCount = 0;

      for (const { callback } of subscribers) {
        try {
          callback(data, time);
          successCount++;
        } catch (error) {
          errorCount++;
          Logger.error('AudioBus', `Error in "${eventName}" subscriber`, {
            error: error.message,
            stack: error.stack,
          });
        }
      }

      Logger.debug('AudioBus', `Event "${eventName}" processed`, {
        success: successCount,
        errors: errorCount,
      });

    } catch (error) {
      Logger.error('AudioBus', 'Emit failed', error);
    }
  }

  /**
   * Subscribe une seule fois (auto-unsubscribe après premier appel)
   * @param {string} eventName
   * @param {function} callback
   * @param {number} priority
   * @returns {function} Fonction de désinscription
   */
  once(eventName, callback, priority = 0) {
    const wrappedCallback = (data, time) => {
      callback(data, time);
      this.off(eventName, wrappedCallback);
    };

    return this.on(eventName, wrappedCallback, priority);
  }

  /**
   * Efface tous les subscribers d'un événement
   * @param {string} eventName - Nom de l'événement (si null, efface tout)
   */
  clear(eventName = null) {
    try {
      if (eventName) {
        // Effacer un événement spécifique
        const count = this.#subscribers.get(eventName)?.length || 0;
        this.#subscribers.delete(eventName);
        
        Logger.info('AudioBus', `Cleared subscribers for "${eventName}"`, { count });
      } else {
        // Effacer tous les événements
        const totalCount = Array.from(this.#subscribers.values())
          .reduce((sum, subs) => sum + subs.length, 0);
        
        this.#subscribers.clear();
        
        Logger.info('AudioBus', 'Cleared ALL subscribers', { count: totalCount });
      }

    } catch (error) {
      Logger.error('AudioBus', 'Clear failed', error);
    }
  }

  /**
   * Récupère le nombre de subscribers pour un événement
   * @param {string} eventName
   * @returns {number}
   */
  getSubscriberCount(eventName) {
    return this.#subscribers.get(eventName)?.length || 0;
  }

  /**
   * Récupère tous les noms d'événements enregistrés
   * @returns {Array<string>}
   */
  getEventNames() {
    return Array.from(this.#subscribers.keys());
  }

  /**
   * Vérifie si un événement a des subscribers
   * @param {string} eventName
   * @returns {boolean}
   */
  hasSubscribers(eventName) {
    return this.#subscribers.has(eventName) && this.#subscribers.get(eventName).length > 0;
  }

  /**
   * Récupère les statistiques
   * @returns {object}
   */
  getStats() {
    return {
      totalEvents: this.#stats.totalEvents,
      eventCounts: { ...this.#stats.eventCounts },
      registeredEvents: this.#subscribers.size,
      totalSubscribers: Array.from(this.#subscribers.values())
        .reduce((sum, subs) => sum + subs.length, 0),
    };
  }

  /**
   * Reset les statistiques
   */
  resetStats() {
    this.#stats.totalEvents = 0;
    this.#stats.eventCounts = {};
    Logger.debug('AudioBus', 'Stats reset');
  }

  /**
   * Affiche un rapport dans la console
   */
  logStatus() {
    Logger.group('AudioBus Status', () => {
      const stats = this.getStats();
      
      Logger.info('AudioBus', 'Total Events Emitted', stats.totalEvents);
      Logger.info('AudioBus', 'Registered Events', stats.registeredEvents);
      Logger.info('AudioBus', 'Total Subscribers', stats.totalSubscribers);
      
      if (Object.keys(stats.eventCounts).length > 0) {
        Logger.info('AudioBus', 'Event Counts', stats.eventCounts);
      }

      Logger.info('AudioBus', 'Event Names', this.getEventNames());
    });
  }

  /**
   * Crée un namespace pour grouper des événements
   * @param {string} namespace - Préfixe pour les événements
   * @returns {object} API avec on/emit préfixés
   */
  namespace(namespace) {
    return {
      on: (eventName, callback, priority) => 
        this.on(`${namespace}:${eventName}`, callback, priority),
      
      off: (eventName, callback) => 
        this.off(`${namespace}:${eventName}`, callback),
      
      emit: (eventName, data, audioTime) => 
        this.emit(`${namespace}:${eventName}`, data, audioTime),
      
      once: (eventName, callback, priority) => 
        this.once(`${namespace}:${eventName}`, callback, priority),
      
      clear: () => {
        const events = this.getEventNames().filter(name => name.startsWith(`${namespace}:`));
        events.forEach(event => this.clear(event));
      },
    };
  }

  /**
   * Détruit le bus (cleanup)
   */
  destroy() {
    Logger.info('AudioBus', 'Destroying...');
    
    this.clear(); // Effacer tous les subscribers
    this.#audioContext = null;
    this.resetStats();
    
    Logger.info('AudioBus', 'Destroyed');
  }
}

// Export par défaut
export default AudioBus;