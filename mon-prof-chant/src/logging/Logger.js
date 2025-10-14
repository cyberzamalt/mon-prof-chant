/**
 * Logger.js
 * TYPE: Utility - Logging System
 * 
 * Responsabilités:
 * - Logging centralisé pour toute l'application
 * - Niveaux de log : DEBUG, INFO, WARN, ERROR, CRITICAL
 * - Formatage des messages
 * - Stockage optionnel des logs
 * 
 * Dépendances: Aucune (module de base)
 */

export class Logger {
  // Niveaux de log
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
  };

  // Niveau minimum à afficher (défaut: INFO)
  static minLevel = Logger.LEVELS.INFO;

  // Historique des logs (optionnel)
  static history = [];
  static maxHistorySize = 1000;

  // Activation/désactivation
  static enabled = true;

  /**
   * Configure le logger
   * @param {object} config - Configuration
   */
  static configure(config = {}) {
    if (config.minLevel !== undefined) {
      Logger.minLevel = config.minLevel;
    }
    if (config.enabled !== undefined) {
      Logger.enabled = config.enabled;
    }
    if (config.maxHistorySize !== undefined) {
      Logger.maxHistorySize = config.maxHistorySize;
    }
  }

  /**
   * Formate un message de log
   * @private
   */
  static #formatMessage(level, module, message, data) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(Logger.LEVELS).find(
      key => Logger.LEVELS[key] === level
    );
    
    let formatted = `[${timestamp}] [${levelName}] [${module}] ${message}`;
    
    if (data !== undefined) {
      formatted += ` | Data: ${JSON.stringify(data)}`;
    }
    
    return formatted;
  }

  /**
   * Enregistre un log
   * @private
   */
  static #log(level, module, message, data) {
    if (!Logger.enabled) return;
    if (level < Logger.minLevel) return;

    const formatted = Logger.#formatMessage(level, module, message, data);

    // Ajouter à l'historique
    Logger.history.push({
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data
    });

    // Limiter la taille de l'historique
    if (Logger.history.length > Logger.maxHistorySize) {
      Logger.history.shift();
    }

    // Afficher dans la console
    switch (level) {
      case Logger.LEVELS.DEBUG:
        console.debug(formatted, data !== undefined ? data : '');
        break;
      case Logger.LEVELS.INFO:
        console.info(formatted, data !== undefined ? data : '');
        break;
      case Logger.LEVELS.WARN:
        console.warn(formatted, data !== undefined ? data : '');
        break;
      case Logger.LEVELS.ERROR:
        console.error(formatted, data !== undefined ? data : '');
        break;
      case Logger.LEVELS.CRITICAL:
        console.error('🔴 CRITICAL:', formatted, data !== undefined ? data : '');
        break;
    }
  }

  /**
   * Log DEBUG
   */
  static debug(module, message, data) {
    Logger.#log(Logger.LEVELS.DEBUG, module, message, data);
  }

  /**
   * Log INFO
   */
  static info(module, message, data) {
    Logger.#log(Logger.LEVELS.INFO, module, message, data);
  }

  /**
   * Log WARN
   */
  static warn(module, message, data) {
    Logger.#log(Logger.LEVELS.WARN, module, message, data);
  }

  /**
   * Log ERROR
   */
  static error(module, message, data) {
    Logger.#log(Logger.LEVELS.ERROR, module, message, data);
  }

  /**
   * Log CRITICAL
   */
  static critical(module, message, data) {
    Logger.#log(Logger.LEVELS.CRITICAL, module, message, data);
  }

  /**
   * Récupère l'historique des logs
   */
  static getHistory(filter = {}) {
    let filtered = Logger.history;

    if (filter.level !== undefined) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter.module !== undefined) {
      filtered = filtered.filter(log => log.module === filter.module);
    }

    if (filter.since !== undefined) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= filter.since);
    }

    return filtered;
  }

  /**
   * Efface l'historique
   */
  static clearHistory() {
    Logger.history = [];
  }

  /**
   * Exporte les logs en texte
   */
  static exportLogs() {
    return Logger.history.map(log => 
      Logger.#formatMessage(log.level, log.module, log.message, log.data)
    ).join('\n');
  }
}

// Export par défaut aussi
export default Logger;
