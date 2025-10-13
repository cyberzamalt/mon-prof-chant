/**
 * Logger.js
 * TYPE: Singleton Utility
 * 
 * Responsabilités:
 * - Centraliser TOUS les logs de l'application
 * - Formatter les logs avec couleurs et timestamps
 * - Filtrer par niveau (debug, info, warn, error, critical)
 * - Persister les erreurs pour debugging
 * - Fournir un historique consultable
 * 
 * Dépendances: config.js
 */

import { CONFIG, isDebugMode, getActiveLogLevel } from '../config.js';

class LoggerClass {
  // Instance unique (singleton)
  static #instance = null;

  // Historique des logs (max 200 entrées)
  #history = [];
  #maxHistorySize = 200;

  // Niveau actif
  #activeLevel = 'info';

  // Mapping niveaux → valeurs numériques
  #levelValues = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    critical: 4,
  };

  // Couleurs console
  #colors = CONFIG.logging.colors;

  /**
   * Singleton accessor
   */
  static getInstance() {
    if (!LoggerClass.#instance) {
      LoggerClass.#instance = new LoggerClass();
    }
    return LoggerClass.#instance;
  }

  constructor() {
    // Empêcher instanciation directe
    if (LoggerClass.#instance) {
      throw new Error('Use Logger.getInstance() instead');
    }

    // Définir niveau actif
    this.#activeLevel = getActiveLogLevel();

    // Log initial
    this.#rawLog('Logger', 'Initialized', { level: this.#activeLevel }, 'info');
  }

  /**
   * Vérifie si un niveau doit être loggé
   */
  #shouldLog(level) {
    const levelValue = this.#levelValues[level] || 0;
    const activeValue = this.#levelValues[this.#activeLevel] || 0;
    return levelValue >= activeValue;
  }

  /**
   * Formate un timestamp
   */
  #getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * Log interne (utilisé par les méthodes publiques)
   */
  #rawLog(module, message, data = null, level = 'info') {
    // Vérifier si on doit logger ce niveau
    if (!this.#shouldLog(level)) {
      return;
    }

    const timestamp = this.#getTimestamp();
    const color = this.#colors[level] || this.#colors.info;

    // Créer l'entrée de log
    const logEntry = {
      timestamp,
      level,
      module,
      message,
      data,
    };

    // Ajouter à l'historique
    this.#addToHistory(logEntry);

    // Persister les erreurs
    if ((level === 'error' || level === 'critical') && CONFIG.logging.persistErrors) {
      this.#persistError(logEntry);
    }

    // Afficher dans la console avec style
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;
    const fullMessage = data ? `${message} →` : message;

    // Style différent selon le niveau
    if (level === 'error' || level === 'critical') {
      console.error(`%c${prefix}%c ${fullMessage}`, `color: ${color}; font-weight: bold`, 'color: inherit', data || '');
    } else if (level === 'warn') {
      console.warn(`%c${prefix}%c ${fullMessage}`, `color: ${color}; font-weight: bold`, 'color: inherit', data || '');
    } else {
      console.log(`%c${prefix}%c ${fullMessage}`, `color: ${color}; font-weight: bold`, 'color: inherit', data || '');
    }

    // Afficher data si présente
    if (data && typeof data === 'object') {
      console.log(data);
    }
  }

  /**
   * Ajoute une entrée à l'historique (limite à maxHistorySize)
   */
  #addToHistory(logEntry) {
    this.#history.push(logEntry);
    
    // Garder seulement les N dernières entrées
    if (this.#history.length > this.#maxHistorySize) {
      this.#history.shift(); // Enlever la plus ancienne
    }
  }

  /**
   * Persiste une erreur dans localStorage
   */
  #persistError(logEntry) {
    try {
      // Récupérer erreurs existantes
      const stored = localStorage.getItem('vocal_coach_errors');
      let errors = stored ? JSON.parse(stored) : [];

      // Ajouter nouvelle erreur
      errors.push({
        ...logEntry,
        userAgent: navigator.userAgent,
        url: window.location.href,
      });

      // Garder max 50 erreurs
      if (errors.length > CONFIG.logging.maxPersistedErrors) {
        errors = errors.slice(-CONFIG.logging.maxPersistedErrors);
      }

      // Sauvegarder
      localStorage.setItem('vocal_coach_errors', JSON.stringify(errors));
    } catch (error) {
      // Échec silencieux (localStorage peut être plein)
      console.error('Failed to persist error:', error);
    }
  }

  // ========================================
  // MÉTHODES PUBLIQUES
  // ========================================

  /**
   * Log niveau DEBUG
   * @param {string} module - Nom du module (ex: 'AudioEngine')
   * @param {string} message - Message descriptif
   * @param {*} data - Données optionnelles
   */
  debug(module, message, data = null) {
    this.#rawLog(module, message, data, 'debug');
  }

  /**
   * Log niveau INFO
   * @param {string} module - Nom du module
   * @param {string} message - Message descriptif
   * @param {*} data - Données optionnelles
   */
  info(module, message, data = null) {
    this.#rawLog(module, message, data, 'info');
  }

  /**
   * Log niveau WARN
   * @param {string} module - Nom du module
   * @param {string} message - Message descriptif
   * @param {*} data - Données optionnelles
   */
  warn(module, message, data = null) {
    this.#rawLog(module, message, data, 'warn');
  }

  /**
   * Log niveau ERROR
   * @param {string} module - Nom du module
   * @param {string} message - Message descriptif
   * @param {*} data - Données optionnelles (souvent un objet Error)
   */
  error(module, message, data = null) {
    // Si data est une Error, extraire message et stack
    if (data instanceof Error) {
      data = {
        message: data.message,
        stack: data.stack,
        name: data.name,
      };
    }
    this.#rawLog(module, message, data, 'error');
  }

  /**
   * Log niveau CRITICAL
   * @param {string} module - Nom du module
   * @param {string} message - Message descriptif
   * @param {*} data - Données optionnelles
   */
  critical(module, message, data = null) {
    this.#rawLog(module, message, data, 'critical');
  }

  /**
   * Groupe de logs (pour regrouper visuellement)
   * @param {string} groupName - Nom du groupe
   * @param {function} fn - Fonction contenant les logs
   */
  group(groupName, fn) {
    if (!this.#shouldLog('info')) return;
    
    console.group(`📦 ${groupName}`);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Récupère l'historique des logs
   * @param {number} limit - Nombre max d'entrées (défaut: toutes)
   * @returns {Array} Entrées de log
   */
  getHistory(limit = null) {
    if (limit && limit > 0) {
      return this.#history.slice(-limit);
    }
    return [...this.#history];
  }

  /**
   * Récupère les erreurs persistées
   * @returns {Array} Erreurs stockées
   */
  getPersistedErrors() {
    try {
      const stored = localStorage.getItem('vocal_coach_errors');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve persisted errors:', error);
      return [];
    }
  }

  /**
   * Efface les erreurs persistées
   */
  clearPersistedErrors() {
    try {
      localStorage.removeItem('vocal_coach_errors');
      this.info('Logger', 'Persisted errors cleared');
    } catch (error) {
      this.error('Logger', 'Failed to clear persisted errors', error);
    }
  }

  /**
   * Efface l'historique en mémoire
   */
  clearHistory() {
    this.#history = [];
    this.info('Logger', 'History cleared');
  }

  /**
   * Change le niveau actif de log
   * @param {string} level - Nouveau niveau ('debug'|'info'|'warn'|'error'|'critical')
   */
  setLevel(level) {
    if (this.#levelValues.hasOwnProperty(level)) {
      this.#activeLevel = level;
      this.info('Logger', `Level changed to: ${level}`);
    } else {
      this.warn('Logger', `Invalid level: ${level}`);
    }
  }

  /**
   * Récupère le niveau actif
   * @returns {string}
   */
  getLevel() {
    return this.#activeLevel;
  }

  /**
   * Exporte l'historique en texte
   * @returns {string}
   */
  exportHistoryAsText() {
    return this.#history
      .map(entry => {
        const dataStr = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
        return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}${dataStr}`;
      })
      .join('\n');
  }

  /**
   * Exporte l'historique en JSON
   * @returns {string}
   */
  exportHistoryAsJSON() {
    return JSON.stringify(this.#history, null, 2);
  }
}

// Export singleton instance
export const Logger = LoggerClass.getInstance();

// Export class pour tests
export { LoggerClass };