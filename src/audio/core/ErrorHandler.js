/**
 * ErrorHandler.js
 * TYPE: Manager - Centralized Error Handling
 * 
 * Responsabilités:
 * - Capture et logging des erreurs
 * - Émission erreurs via bus
 * - Fallback et recovery
 * - Rapport d'erreurs
 * 
 * Dépendances: Logger, AudioBus
 * Utilisé par: AudioEngine, MicrophoneManager, RecorderService
 */

import { Logger } from '../logging/Logger.js';

class ErrorHandler {
  #audioBus = null;
  #errors = [];
  #maxErrors = 100;
  #errorCallbacks = [];

  constructor(audioBus = null) {
    try {
      this.#audioBus = audioBus;
      Logger.info('ErrorHandler', 'Initialized');
      this.#setupGlobalHandlers();
    } catch (err) {
      Logger.error('ErrorHandler', 'Constructor failed', err);
    }
  }

  /**
   * Configurer les global handlers
   */
  #setupGlobalHandlers() {
    try {
      window.addEventListener('error', (event) => {
        this.captureError('WindowError', new Error(event.message), { filename: event.filename, lineno: event.lineno });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError('UnhandledPromiseRejection', event.reason);
      });

      Logger.info('ErrorHandler', 'Global handlers setup complete');
    } catch (err) {
      Logger.error('ErrorHandler', 'Global handlers setup failed', err);
    }
  }

  /**
   * Capturer une erreur
   */
  captureError(context, error, additionalData = null) {
    try {
      const errorObj = {
        timestamp: new Date().toISOString(),
        context: context || 'Unknown',
        message: error?.message || String(error) || 'Unknown error',
        stack: error?.stack || '',
        additionalData: additionalData || {},
        isFatal: false,
      };

      this.#errors.push(errorObj);
      if (this.#errors.length > this.#maxErrors) {
        this.#errors = this.#errors.slice(-this.#maxErrors);
      }

      Logger.error('ErrorHandler', `Error captured: ${context}`, errorObj);

      if (this.#audioBus) {
        this.#audioBus.emit('error:captured', errorObj);
      }

      this.#errorCallbacks.forEach(callback => {
        try {
          callback(errorObj);
        } catch (_) {
          // Ignore callback errors
        }
      });

      return errorObj;
    } catch (err) {
      Logger.error('ErrorHandler', 'captureError failed', err);
      return null;
    }
  }

  /**
   * Capturer erreur fatale
   */
  captureFatal(context, error, additionalData = null) {
    try {
      const errorObj = this.captureError(context, error, additionalData);
      if (errorObj) {
        errorObj.isFatal = true;
        Logger.fatal('ErrorHandler', `FATAL ERROR: ${context}`, errorObj);
        
        if (this.#audioBus) {
          this.#audioBus.emit('error:fatal', errorObj);
        }
      }
      return errorObj;
    } catch (err) {
      Logger.error('ErrorHandler', 'captureFatal failed', err);
      return null;
    }
  }

  /**
   * Obtenir tous les erreurs
   */
  getErrors() {
    try {
      return [...this.#errors];
    } catch (_) {
      return [];
    }
  }

  /**
   * Obtenir erreurs filtrées par contexte
   */
  getErrorsByContext(context) {
    try {
      return this.#errors.filter(e => e.context === context);
    } catch (_) {
      return [];
    }
  }

  /**
   * Obtenir erreurs récentes
   */
  getRecentErrors(count = 10) {
    try {
      return this.#errors.slice(-count);
    } catch (_) {
      return [];
    }
  }

  /**
   * Nettoyer les erreurs
   */
  clearErrors() {
    try {
      this.#errors = [];
      Logger.info('ErrorHandler', 'Errors cleared');
    } catch (_) {
      console.log('Errors cleared (silent)');
    }
  }

  /**
   * S'abonner aux erreurs
   */
  onError(callback) {
    try {
      this.#errorCallbacks.push(callback);
      return () => {
        const idx = this.#errorCallbacks.indexOf(callback);
        if (idx > -1) this.#errorCallbacks.splice(idx, 1);
      };
    } catch (err) {
      Logger.error('ErrorHandler', 'onError failed', err);
      return () => {};
    }
  }

  /**
   * Exporter les erreurs
   */
  exportErrors() {
    try {
      return JSON.stringify(this.#errors, null, 2);
    } catch (_) {
      return '[]';
    }
  }

  /**
   * Rapport d'erreurs
   */
  getReport() {
    try {
      const fatalCount = this.#errors.filter(e => e.isFatal).length;
      const recentErrors = this.#errors.slice(-5);
      return {
        totalErrors: this.#errors.length,
        fatalErrors: fatalCount,
        recentErrors: recentErrors,
      };
    } catch (err) {
      Logger.error('ErrorHandler', 'getReport failed', err);
      return { totalErrors: 0, fatalErrors: 0 };
    }
  }
}

export { ErrorHandler };
export default ErrorHandler;
