/**
 * Logger.js
 * TYPE: Utility - Singleton Logging System
 * 
 * Responsabilités:
 * - Logging centralisé avec timestamps précis
 * - Niveaux: DEBUG, INFO, WARN, ERROR, FATAL
 * - Affichage console + storage en mémoire
 * - Fallback robuste si quelque chose échoue
 * 
 * Dépendances: AUCUNE (fondation)
 * Utilisé par: TOUS les autres modules
 */

class Logger {
  /**
   * Configuration statique du logger
   */
  static #config = {
    maxLogs: 500,
    minLevel: 0,
    enableConsole: true,
    enableStorage: true,
  };

  /**
   * Niveaux de log avec priorités
   */
  static #levels = {
    DEBUG: { value: 0, color: '#888', style: '[DEBUG]' },
    INFO: { value: 1, color: '#0ea5e9', style: '[INFO]' },
    WARN: { value: 2, color: '#f59e0b', style: '[WARN]' },
    ERROR: { value: 3, color: '#ef4444', style: '[ERROR]' },
    FATAL: { value: 4, color: '#dc2626', style: '[FATAL]' },
  };

  /**
   * Stockage des logs en mémoire
   */
  static #logBuffer = [];

  /**
   * État du logger
   */
  static #initialized = false;

  /**
   * Initialiser le logger
   */
  static initialize(options = {}) {
    try {
      Logger.#config = { ...Logger.#config, ...options };
      Logger.#initialized = true;
      Logger.info('Logger', 'Initialized');
      return true;
    } catch (err) {
      console.error('[Logger] Initialization failed:', err);
      return false;
    }
  }

  /**
   * DEBUG - Informations détaillées pour le développement
   */
  static debug(module, message, data = null) {
    Logger.#log('DEBUG', module, message, data);
  }

  /**
   * INFO - Informations générales
   */
  static info(module, message, data = null) {
    Logger.#log('INFO', module, message, data);
  }

  /**
   * WARN - Avertissements
   */
  static warn(module, message, data = null) {
    Logger.#log('WARN', module, message, data);
  }

  /**
   * ERROR - Erreurs
   */
  static error(module, message, data = null) {
    Logger.#log('ERROR', module, message, data);
  }

  /**
   * FATAL - Erreurs critiques
   */
  static fatal(module, message, data = null) {
    Logger.#log('FATAL', module, message, data);
  }

  /**
   * Fonction interne: Traitement du log
   */
  static #log(levelName, module, message, data = null) {
    try {
      const level = Logger.#levels[levelName];
      if (!level || level.value < Logger.#config.minLevel) {
        return;
      }

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const timestamp = `${hours}:${minutes}:${seconds}.${ms}`;

      const logEntry = {
        timestamp,
        level: levelName,
        module: module || 'Unknown',
        message: message || '(no message)',
        data: data || null,
        formattedMessage: `[${timestamp}] ${level.style} [${module}] ${message}`,
      };

      if (Logger.#config.enableConsole) {
        Logger.#logToConsole(level, logEntry);
      }

      if (Logger.#config.enableStorage) {
        Logger.#logToBuffer(logEntry);
      }
    } catch (err) {
      try {
        console.error('[Logger FALLBACK]', err.message);
      } catch (_) {
        // Abandon silencieux
      }
    }
  }

  /**
   * Affichage console avec couleurs et données
   */
  static #logToConsole(level, logEntry) {
    try {
      const style = `color: ${level.color}; font-weight: bold; font-family: monospace;`;
      const dataStr = logEntry.data ? ` | Data: ${JSON.stringify(logEntry.data)}` : '';

      console.log(
        `%c${logEntry.formattedMessage}${dataStr}`,
        style
      );

      if (level.value >= 3) {
        console.trace('[Stack trace]');
      }
    } catch (err) {
      console.log(logEntry.formattedMessage, logEntry.data || '');
    }
  }

  /**
   * Stockage en mémoire (buffer)
   */
  static #logToBuffer(logEntry) {
    try {
      Logger.#logBuffer.push(logEntry);

      if (Logger.#logBuffer.length > Logger.#config.maxLogs) {
        Logger.#logBuffer = Logger.#logBuffer.slice(-Logger.#config.maxLogs);
      }
    } catch (err) {
      // Fallback silencieux
    }
  }

  /**
   * Récupérer tous les logs en mémoire
   */
  static getLogs() {
    try {
      return [...Logger.#logBuffer];
    } catch (_) {
      return [];
    }
  }

  /**
   * Récupérer les logs formatés (string)
   */
  static getLogsFormatted() {
    try {
      return Logger.#logBuffer
        .map(log => log.formattedMessage)
        .join('\n');
    } catch (_) {
      return '';
    }
  }

  /**
   * Nettoyer les logs
   */
  static clearLogs() {
    try {
      Logger.#logBuffer = [];
      Logger.info('Logger', 'Logs cleared');
    } catch (_) {
      console.log('[Logger] Logs cleared');
    }
  }

  /**
   * Exporter les logs (pour debugging)
   */
  static exportLogs() {
    try {
      return JSON.stringify(Logger.#logBuffer, null, 2);
    } catch (_) {
      return '[]';
    }
  }

  /**
   * Configurer le logger
   */
  static setConfig(options) {
    try {
      Logger.#config = { ...Logger.#config, ...options };
      Logger.info('Logger', 'Configuration updated');
    } catch (_) {
      console.log('[Logger] Config update failed');
    }
  }

  /**
   * Vérifier si le logger est initialisé
   */
  static isInitialized() {
    return Logger.#initialized;
  }
}

// Alias court pour usage rapide
window.Log = Logger;

// Export pour modules ES6
export { Logger };
export default Logger;
