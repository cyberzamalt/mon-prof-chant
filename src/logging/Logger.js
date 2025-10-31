/**
 * Logger.js
 * Système de logging centralisé
 * 
 * Responsabilités:
 * - Logger les événements de l'application
 * - 4 niveaux: DEBUG, INFO, WARN, ERROR
 * - Formatage console avec couleurs
 * - Historique en mémoire
 * 
 * Fichier 1/18 - FONDATIONS
 * Pas de dépendances
 */

class Logger {
  static #instance = null;
  static #level = 'INFO';
  static #levels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  static #history = [];
  static #maxHistorySize = 500;

  /**
   * Obtenir l'instance unique (singleton)
   */
  static getInstance() {
    if (!Logger.#instance) {
      Logger.#instance = new Logger();
    }
    return Logger.#instance;
  }

  /**
   * Définir le niveau de log
   * @param {string} level - 'DEBUG', 'INFO', 'WARN', 'ERROR'
   */
  static setLevel(level) {
    if (Logger.#levels[level] !== undefined) {
      Logger.#level = level;
      console.log(`[Logger] Niveau défini: ${level}`);
    }
  }

  /**
   * Obtenir le niveau actuel
   * @returns {string}
   */
  static getLevel() {
    return Logger.#level;
  }

  /**
   * Vérifier si un niveau doit être loggé
   * @private
   */
  static #shouldLog(level) {
    return Logger.#levels[level] >= Logger.#levels[Logger.#level];
  }

  /**
   * Ajouter à l'historique
   * @private
   */
  static #addToHistory(level, module, message, data) {
    try {
      Logger.#history.push({
        timestamp: new Date().toISOString(),
        level: level,
        module: module,
        message: message,
        data: data
      });

      // Limiter la taille
      if (Logger.#history.length > Logger.#maxHistorySize) {
        Logger.#history.shift();
      }
    } catch (err) {
      console.error('[Logger] Erreur addToHistory:', err);
    }
  }

  /**
   * Logger DEBUG
   */
  static debug(module, message, data = null) {
    if (!Logger.#shouldLog('DEBUG')) return;

    const prefix = `[DEBUG][${module}]`;
    if (data) {
      console.log(`%c${prefix}%c ${message}`, 'color: #888', 'color: inherit', data);
    } else {
      console.log(`%c${prefix}%c ${message}`, 'color: #888', 'color: inherit');
    }

    Logger.#addToHistory('DEBUG', module, message, data);
  }

  /**
   * Logger INFO
   */
  static info(module, message, data = null) {
    if (!Logger.#shouldLog('INFO')) return;

    const prefix = `[INFO][${module}]`;
    if (data) {
      console.log(`%c${prefix}%c ${message}`, 'color: #00aaff', 'color: inherit', data);
    } else {
      console.log(`%c${prefix}%c ${message}`, 'color: #00aaff', 'color: inherit');
    }

    Logger.#addToHistory('INFO', module, message, data);
  }

  /**
   * Logger WARN
   */
  static warn(module, message, data = null) {
    if (!Logger.#shouldLog('WARN')) return;

    const prefix = `[WARN][${module}]`;
    if (data) {
      console.warn(`%c${prefix}%c ${message}`, 'color: #ffaa00', 'color: inherit', data);
    } else {
      console.warn(`%c${prefix}%c ${message}`, 'color: #ffaa00', 'color: inherit');
    }

    Logger.#addToHistory('WARN', module, message, data);
  }

  /**
   * Logger ERROR
   */
  static error(module, message, error = null) {
    if (!Logger.#shouldLog('ERROR')) return;

    const prefix = `[ERROR][${module}]`;
    if (error) {
      console.error(`%c${prefix}%c ${message}`, 'color: #ff0000', 'color: inherit', error);
    } else {
      console.error(`%c${prefix}%c ${message}`, 'color: #ff0000', 'color: inherit');
    }

    Logger.#addToHistory('ERROR', module, message, error);
  }

  /**
   * Obtenir l'historique
   */
  static getHistory(level = null) {
    if (!level) return [...Logger.#history];
    return Logger.#history.filter(entry => entry.level === level);
  }

  /**
   * Effacer l'historique
   */
  static clearHistory() {
    Logger.#history = [];
    console.log('[Logger] Historique effacé');
  }

  /**
   * Exporter l'historique en JSON
   */
  static exportHistory() {
    try {
      return JSON.stringify(Logger.#history, null, 2);
    } catch (err) {
      console.error('[Logger] Erreur export:', err);
      return null;
    }
  }
}

// Export
export { Logger };
