/**
 * ErrorHandler.js - Gestionnaire d'Erreurs
 * 
 * Gestion centralisée des erreurs de l'application
 * Affichage user-friendly et logging détaillé
 * 
 * Fichier 6/18 - CORE AUDIO
 * Dépend de: Logger.js, constants.js
 */

import Logger from '../../logging/Logger.js';
import { ERRORS } from '../../config/constants.js';

class ErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.userNotifications = true;
    
    this.init();
  }
  
  /**
   * Initialise le gestionnaire d'erreurs
   */
  init() {
    try {
      Logger.info('ErrorHandler', 'Gestionnaire d\'erreurs initialisé');
      
      // Écouter les erreurs globales
      window.addEventListener('error', (event) => {
        this.handleGlobalError(event);
      });
      
      // Écouter les promesses rejetées
      window.addEventListener('unhandledrejection', (event) => {
        this.handleUnhandledRejection(event);
      });
      
    } catch (err) {
      console.error('Erreur init ErrorHandler:', err);
    }
  }
  
  /**
   * Gère une erreur globale non capturée
   * @param {ErrorEvent} event - Événement d'erreur
   */
  handleGlobalError(event) {
    try {
      const error = {
        type: 'GlobalError',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString()
      };
      
      this.logError(error);
      
      // Notifier l'utilisateur si activé
      if (this.userNotifications) {
        this.notifyUser('Une erreur inattendue est survenue', 'error');
      }
      
    } catch (err) {
      console.error('Erreur dans handleGlobalError:', err);
    }
  }
  
  /**
   * Gère une promesse rejetée non gérée
   * @param {PromiseRejectionEvent} event - Événement de rejet
   */
  handleUnhandledRejection(event) {
    try {
      const error = {
        type: 'UnhandledRejection',
        reason: event.reason,
        timestamp: new Date().toISOString()
      };
      
      this.logError(error);
      
      // Notifier l'utilisateur si activé
      if (this.userNotifications) {
        this.notifyUser('Une opération a échoué', 'error');
      }
      
    } catch (err) {
      console.error('Erreur dans handleUnhandledRejection:', err);
    }
  }
  
  /**
   * Gère une erreur micro
   * @param {Error} error - Objet erreur
   * @returns {string} Message user-friendly
   */
  handleMicrophoneError(error) {
    let userMessage = ERRORS.MICROPHONE_ACCESS_DENIED;
    
    try {
      if (error.name === 'NotAllowedError') {
        userMessage = ERRORS.MICROPHONE_ACCESS_DENIED;
        Logger.error('ErrorHandler', 'Accès micro refusé', error);
      } else if (error.name === 'NotFoundError') {
        userMessage = ERRORS.MICROPHONE_NOT_FOUND;
        Logger.error('ErrorHandler', 'Micro non trouvé', error);
      } else if (error.name === 'NotReadableError') {
        userMessage = 'Le microphone est utilisé par une autre application';
        Logger.error('ErrorHandler', 'Micro déjà utilisé', error);
      } else {
        userMessage = 'Erreur d\'accès au microphone';
        Logger.error('ErrorHandler', 'Erreur micro inconnue', error);
      }
      
      this.logError({
        type: 'MicrophoneError',
        name: error.name,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (this.userNotifications) {
        this.notifyUser(userMessage, 'error');
      }
      
    } catch (err) {
      console.error('Erreur dans handleMicrophoneError:', err);
    }
    
    return userMessage;
  }
  
  /**
   * Gère une erreur AudioContext
   * @param {Error} error - Objet erreur
   * @returns {string} Message user-friendly
   */
  handleAudioContextError(error) {
    let userMessage = ERRORS.AUDIO_CONTEXT_FAILED;
    
    try {
      Logger.error('ErrorHandler', 'Erreur AudioContext', error);
      
      this.logError({
        type: 'AudioContextError',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (this.userNotifications) {
        this.notifyUser(userMessage, 'error');
      }
      
    } catch (err) {
      console.error('Erreur dans handleAudioContextError:', err);
    }
    
    return userMessage;
  }
  
  /**
   * Gère une erreur de détection pitch
   * @param {Error} error - Objet erreur
   * @returns {string} Message user-friendly
   */
  handlePitchDetectionError(error) {
    let userMessage = ERRORS.PITCH_DETECTION_FAILED;
    
    try {
      Logger.warn('ErrorHandler', 'Détection pitch impossible', error);
      
      this.logError({
        type: 'PitchDetectionError',
        message: error.message || 'Aucun pitch détecté',
        timestamp: new Date().toISOString()
      });
      
      // Pas de notification user pour ce type d'erreur
      // (trop fréquent, normal dans certains cas)
      
    } catch (err) {
      console.error('Erreur dans handlePitchDetectionError:', err);
    }
    
    return userMessage;
  }
  
  /**
   * Gère une erreur d'enregistrement
   * @param {Error} error - Objet erreur
   * @returns {string} Message user-friendly
   */
  handleRecordingError(error) {
    let userMessage = ERRORS.RECORDING_FAILED;
    
    try {
      Logger.error('ErrorHandler', 'Erreur enregistrement', error);
      
      this.logError({
        type: 'RecordingError',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (this.userNotifications) {
        this.notifyUser(userMessage, 'error');
      }
      
    } catch (err) {
      console.error('Erreur dans handleRecordingError:', err);
    }
    
    return userMessage;
  }
  
  /**
   * Gère une erreur d'export
   * @param {Error} error - Objet erreur
   * @returns {string} Message user-friendly
   */
  handleExportError(error) {
    let userMessage = ERRORS.EXPORT_FAILED;
    
    try {
      Logger.error('ErrorHandler', 'Erreur export', error);
      
      this.logError({
        type: 'ExportError',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (this.userNotifications) {
        this.notifyUser(userMessage, 'error');
      }
      
    } catch (err) {
      console.error('Erreur dans handleExportError:', err);
    }
    
    return userMessage;
  }
  
  /**
   * Gère une erreur de stockage
   * @param {Error} error - Objet erreur
   * @returns {string} Message user-friendly
   */
  handleStorageError(error) {
    let userMessage = ERRORS.STORAGE_FULL;
    
    try {
      if (error.name === 'QuotaExceededError') {
        userMessage = ERRORS.STORAGE_FULL;
      } else {
        userMessage = 'Erreur de sauvegarde';
      }
      
      Logger.error('ErrorHandler', 'Erreur stockage', error);
      
      this.logError({
        type: 'StorageError',
        name: error.name,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (this.userNotifications) {
        this.notifyUser(userMessage, 'error');
      }
      
    } catch (err) {
      console.error('Erreur dans handleStorageError:', err);
    }
    
    return userMessage;
  }
  
  /**
   * Gère une erreur réseau
   * @param {Error} error - Objet erreur
   * @returns {string} Message user-friendly
   */
  handleNetworkError(error) {
    let userMessage = ERRORS.NETWORK_ERROR;
    
    try {
      Logger.error('ErrorHandler', 'Erreur réseau', error);
      
      this.logError({
        type: 'NetworkError',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (this.userNotifications) {
        this.notifyUser(userMessage, 'error');
      }
      
    } catch (err) {
      console.error('Erreur dans handleNetworkError:', err);
    }
    
    return userMessage;
  }
  
  /**
   * Log une erreur dans l'historique
   * @param {object} error - Objet erreur
   */
  logError(error) {
    try {
      this.errorHistory.push(error);
      
      // Limiter la taille de l'historique
      if (this.errorHistory.length > this.maxHistorySize) {
        this.errorHistory.shift();
      }
      
    } catch (err) {
      console.error('Erreur dans logError:', err);
    }
  }
  
  /**
   * Notifie l'utilisateur d'une erreur
   * @param {string} message - Message à afficher
   * @param {string} type - Type de notification (error, warning, info)
   */
  notifyUser(message, type = 'error') {
    try {
      // Créer une notification visuelle
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      
      // Ajouter au DOM
      let container = document.getElementById('notifications');
      
      if (!container) {
        // Créer le conteneur s'il n'existe pas
        container = document.createElement('div');
        container.id = 'notifications';
        container.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
        `;
        document.body.appendChild(container);
      }
      
      container.appendChild(notification);
      
      // Style de la notification
      notification.style.cssText = `
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 5px;
        color: white;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        max-width: 300px;
        background-color: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
      `;
      
      // Retirer après 5 secondes
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 5000);
      
    } catch (err) {
      console.error('Erreur dans notifyUser:', err);
    }
  }
  
  /**
   * Récupère l'historique des erreurs
   * @param {string} type - Filtrer par type (optionnel)
   * @returns {Array} Historique filtré
   */
  getErrorHistory(type = null) {
    if (!type) {
      return [...this.errorHistory];
    }
    
    return this.errorHistory.filter(error => error.type === type);
  }
  
  /**
   * Efface l'historique des erreurs
   */
  clearHistory() {
    this.errorHistory = [];
    Logger.info('ErrorHandler', 'Historique d\'erreurs effacé');
  }
  
  /**
   * Active/désactive les notifications utilisateur
   * @param {boolean} enabled - true pour activer
   */
  setUserNotifications(enabled) {
    this.userNotifications = enabled;
    Logger.info('ErrorHandler', `Notifications ${enabled ? 'activées' : 'désactivées'}`);
  }
  
  /**
   * Exporte l'historique des erreurs
   * @returns {string} JSON des erreurs
   */
  exportHistory() {
    try {
      return JSON.stringify(this.errorHistory, null, 2);
    } catch (err) {
      console.error('Erreur export historique:', err);
      return null;
    }
  }
}

// Créer une instance unique (singleton)
const errorHandler = new ErrorHandler();

// Exporter l'instance
export default errorHandler;
