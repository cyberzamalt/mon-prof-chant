/**
 * EventBus.js
 * Système de communication par événements
 * 
 * Responsabilités:
 * - Pub/Sub pattern pour découpler les modules
 * - Gestion des abonnements et désabonnements
 * - Émission d'événements avec données
 * - Wildcard listener pour debug
 * 
 * Fichier 4/18 - FONDATIONS
 * Pas de dépendances
 */

import { Logger } from '../logging/Logger.js';

export class EventBus {
  #listeners = new Map();
  #wildcardListeners = [];

  /**
   * Constructeur
   */
  constructor() {
    Logger.info('EventBus', 'EventBus initialisé');
  }

  /**
   * S'abonner à un événement
   * @param {string} eventName - Nom de l'événement (ou '*' pour tous)
   * @param {Function} callback - Fonction callback
   * @returns {Function} Fonction de désabonnement
   */
  on(eventName, callback) {
    try {
      if (!eventName || typeof callback !== 'function') {
        Logger.error('EventBus', 'Paramètres invalides pour on()', {
          eventName,
          callback: typeof callback
        });
        return () => {};
      }

      // Wildcard listener
      if (eventName === '*') {
        this.#wildcardListeners.push(callback);
        Logger.debug('EventBus', 'Wildcard listener ajouté');

        // Retourner fonction de désabonnement
        return () => {
          const index = this.#wildcardListeners.indexOf(callback);
          if (index > -1) {
            this.#wildcardListeners.splice(index, 1);
          }
        };
      }

      // Créer le tableau de listeners si nécessaire
      if (!this.#listeners.has(eventName)) {
        this.#listeners.set(eventName, []);
      }

      // Ajouter le callback
      this.#listeners.get(eventName).push(callback);
      Logger.debug('EventBus', `Listener ajouté: ${eventName}`);

      // Retourner fonction de désabonnement
      return () => this.off(eventName, callback);

    } catch (err) {
      Logger.error('EventBus', 'Erreur on()', err);
      return () => {};
    }
  }

  /**
   * S'abonner à un événement (une seule fois)
   * @param {string} eventName - Nom de l'événement
   * @param {Function} callback - Fonction callback
   * @returns {Function} Fonction de désabonnement
   */
  once(eventName, callback) {
    try {
      const wrappedCallback = (data) => {
        callback(data);
        this.off(eventName, wrappedCallback);
      };

      return this.on(eventName, wrappedCallback);

    } catch (err) {
      Logger.error('EventBus', 'Erreur once()', err);
      return () => {};
    }
  }

  /**
   * Se désabonner d'un événement
   * @param {string} eventName - Nom de l'événement
   * @param {Function} callback - Fonction callback à retirer
   */
  off(eventName, callback) {
    try {
      if (!this.#listeners.has(eventName)) {
        Logger.warn('EventBus', `Aucun listener pour: ${eventName}`);
        return;
      }

      const listeners = this.#listeners.get(eventName);
      const index = listeners.indexOf(callback);

      if (index > -1) {
        listeners.splice(index, 1);
        Logger.debug('EventBus', `Listener retiré: ${eventName}`);
      }

      // Nettoyer si plus de listeners
      if (listeners.length === 0) {
        this.#listeners.delete(eventName);
      }

    } catch (err) {
      Logger.error('EventBus', 'Erreur off()', err);
    }
  }

  /**
   * Émettre un événement
   * @param {string} eventName - Nom de l'événement
   * @param {*} data - Données à transmettre
   */
  emit(eventName, data = null) {
    try {
      if (!eventName) {
        Logger.error('EventBus', 'Nom d\'événement manquant');
        return;
      }

      Logger.debug('EventBus', `Événement émis: ${eventName}`, data);

      // Notifier les listeners spécifiques
      if (this.#listeners.has(eventName)) {
        const listeners = this.#listeners.get(eventName);
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            Logger.error('EventBus', `Erreur dans listener ${eventName}`, err);
          }
        });
      }

      // Notifier les wildcard listeners
      this.#wildcardListeners.forEach(callback => {
        try {
          callback(eventName, data);
        } catch (err) {
          Logger.error('EventBus', 'Erreur dans wildcard listener', err);
        }
      });

    } catch (err) {
      Logger.error('EventBus', 'Erreur emit()', err);
    }
  }

  /**
   * Retirer tous les listeners d'un événement
   * @param {string} eventName - Nom de l'événement
   */
  removeAllListeners(eventName = null) {
    try {
      if (eventName) {
        // Retirer listeners d'un événement spécifique
        this.#listeners.delete(eventName);
        Logger.info('EventBus', `Tous les listeners retirés: ${eventName}`);
      } else {
        // Retirer tous les listeners
        this.#listeners.clear();
        this.#wildcardListeners = [];
        Logger.info('EventBus', 'Tous les listeners retirés');
      }

    } catch (err) {
      Logger.error('EventBus', 'Erreur removeAllListeners()', err);
    }
  }

  /**
   * Obtenir le nombre de listeners pour un événement
   * @param {string} eventName - Nom de l'événement
   * @returns {number} Nombre de listeners
   */
  listenerCount(eventName) {
    try {
      if (!this.#listeners.has(eventName)) {
        return 0;
      }
      return this.#listeners.get(eventName).length;

    } catch (err) {
      Logger.error('EventBus', 'Erreur listenerCount()', err);
      return 0;
    }
  }

  /**
   * Obtenir la liste des événements enregistrés
   * @returns {Array<string>} Noms des événements
   */
  eventNames() {
    try {
      return Array.from(this.#listeners.keys());
    } catch (err) {
      Logger.error('EventBus', 'Erreur eventNames()', err);
      return [];
    }
  }

  /**
   * Vérifier si un événement a des listeners
   * @param {string} eventName - Nom de l'événement
   * @returns {boolean}
   */
  hasListeners(eventName) {
    try {
      return this.#listeners.has(eventName) && 
             this.#listeners.get(eventName).length > 0;
    } catch (err) {
      Logger.error('EventBus', 'Erreur hasListeners()', err);
      return false;
    }
  }

  /**
   * Obtenir des statistiques sur l'EventBus
   * @returns {Object} Statistiques
   */
  getStats() {
    try {
      const stats = {
        totalEvents: this.#listeners.size,
        totalListeners: 0,
        wildcardListeners: this.#wildcardListeners.length,
        events: {}
      };

      this.#listeners.forEach((listeners, eventName) => {
        stats.totalListeners += listeners.length;
        stats.events[eventName] = listeners.length;
      });

      return stats;

    } catch (err) {
      Logger.error('EventBus', 'Erreur getStats()', err);
      return {};
    }
  }
}
