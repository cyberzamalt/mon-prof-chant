/**
 * Logger.js - Système de Logging Centralisé
 * 
 * Gère tous les logs de l'application (info, warn, error, success)
 * Permet un debug facile et un suivi des opérations
 * 
 * Fichier 1/18 - FONDATIONS
 * Pas de dépendances
 */

class Logger {
  constructor() {
    this.enabled = true;
    this.logHistory = [];
    this.maxHistorySize = 500;
    
    // Préfixes colorés pour la console
    this.prefixes = {
      info: '🔵 [INFO]',
      warn: '⚠️  [WARN]',
      error: '🔴 [ERROR]',
      success: '✅ [SUCCESS]',
      debug: '🐛 [DEBUG]'
    };
    
    this.colors = {
      info: 'color: #2196F3',
      warn: 'color: #FF9800',
      error: 'color: #F44336; font-weight: bold',
      success: 'color: #4CAF50',
      debug: 'color: #9E9E9E'
    };
    
    this.init();
  }
  
  /**
   * Initialise le logger
   */
  init() {
    try {
      this.log('Logger', 'Système de logging initialisé', {}, 'info');
      
      // Écouter les erreurs globales
      window.addEventListener('error', (event) => {
        this.error('Global', 'Erreur non capturée', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
      
      // Écouter les promesses rejetées non gérées
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Global', 'Promise rejetée non gérée', {
          reason: event.reason
        });
      });
      
    } catch (err) {
      console.error('Erreur init Logger:', err);
    }
  }
  
  /**
   * Log générique
   * @param {string} module - Nom du module qui log
   * @param {string} message - Message à logger
   * @param {object} data - Données additionnelles
   * @param {string} level - Niveau (info/warn/error/success/debug)
   */
  log(module, message, data = {}, level = 'info') {
    if (!this.enabled) return;
    
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        module,
        message,
        data,
        level
      };
      
      // Ajouter à l'historique
      this.logHistory.push(logEntry);
      
      // Limiter la taille de l'historique
      if (this.logHistory.length > this.maxHistorySize) {
        this.logHistory.shift();
      }
      
      // Afficher dans la console
      const prefix = this.prefixes[level] || this.prefixes.info;
      const color = this.colors[level] || this.colors.info;
      
      const consoleArgs = [
        `%c${prefix} [${module}] ${message}`,
        color
      ];
      
      if (Object.keys(data).length > 0) {
        consoleArgs.push(data);
      }
      
      switch (level) {
        case 'error':
          console.error(...consoleArgs);
          break;
        case 'warn':
          console.warn(...consoleArgs);
          break;
        default:
          console.log(...consoleArgs);
      }
      
    } catch (err) {
      console.error('Erreur dans Logger.log:', err);
    }
  }
  
  /**
   * Log d'information
   * @param {string} module - Nom du module
   * @param {string} message - Message
   * @param {object} data - Données additionnelles
   */
  info(module, message, data = {}) {
    this.log(module, message, data, 'info');
  }
  
  /**
   * Log d'avertissement
   * @param {string} module - Nom du module
   * @param {string} message - Message
   * @param {object} data - Données additionnelles
   */
  warn(module, message, data = {}) {
    this.log(module, message, data, 'warn');
  }
  
  /**
   * Log d'erreur
   * @param {string} module - Nom du module
   * @param {string} message - Message
   * @param {object} data - Données ou objet Error
   */
  error(module, message, data = {}) {
    // Si data est un objet Error, extraire les infos utiles
    if (data instanceof Error) {
      data = {
        message: data.message,
        stack: data.stack,
        name: data.name
      };
    }
    
    this.log(module, message, data, 'error');
  }
  
  /**
   * Log de succès
   * @param {string} module - Nom du module
   * @param {string} message - Message
   * @param {object} data - Données additionnelles
   */
  success(module, message, data = {}) {
    this.log(module, message, data, 'success');
  }
  
  /**
   * Log de debug (uniquement en mode développement)
   * @param {string} module - Nom du module
   * @param {string} message - Message
   * @param {object} data - Données additionnelles
   */
  debug(module, message, data = {}) {
    this.log(module, message, data, 'debug');
  }
  
  /**
   * Récupère l'historique des logs
   * @param {string} level - Filtrer par niveau (optionnel)
   * @param {string} module - Filtrer par module (optionnel)
   * @returns {Array} Logs filtrés
   */
  getHistory(level = null, module = null) {
    let history = [...this.logHistory];
    
    if (level) {
      history = history.filter(log => log.level === level);
    }
    
    if (module) {
      history = history.filter(log => log.module === module);
    }
    
    return history;
  }
  
  /**
   * Récupère les erreurs uniquement
   * @returns {Array} Logs d'erreurs
   */
  getErrors() {
    return this.getHistory('error');
  }
  
  /**
   * Efface l'historique
   */
  clearHistory() {
    this.logHistory = [];
    this.info('Logger', 'Historique effacé');
  }
  
  /**
   * Active/désactive le logger
   * @param {boolean} enabled - true pour activer
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`Logger ${enabled ? 'activé' : 'désactivé'}`);
  }
  
  /**
   * Exporte les logs en format JSON
   * @returns {string} Logs au format JSON
   */
  exportLogs() {
    try {
      return JSON.stringify(this.logHistory, null, 2);
    } catch (err) {
      console.error('Erreur export logs:', err);
      return null;
    }
  }
  
  /**
   * Télécharge les logs dans un fichier
   */
  downloadLogs() {
    try {
      const logsJson = this.exportLogs();
      if (!logsJson) return;
      
      const blob = new Blob([logsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `logs-${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.success('Logger', 'Logs téléchargés');
      
    } catch (err) {
      this.error('Logger', 'Erreur téléchargement logs', err);
    }
  }
}

// Créer une instance unique (singleton)
const logger = new Logger();

// Exporter l'instance
export default logger;
