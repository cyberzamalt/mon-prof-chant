/**
 * ErrorHandler.js
 * TYPE: Global Error Handler
 * 
 * Responsabilités:
 * - Capturer TOUTES les erreurs de l'application
 * - Logger et persister les erreurs
 * - Afficher des messages utilisateur clairs
 * - Proposer des solutions selon le type d'erreur
 * 
 * Dépendances: Logger, AudioBus, CONFIG
 */

import { Logger } from '../../logging/Logger.js';
import { CONFIG } from '../../config.js';

export class ErrorHandler {
  
  // Singleton
  static #instance = null;
  
  // EventBus (optionnel, sera injecté)
  #eventBus = null;
  
  // Compteur d'erreurs
  #errorCount = 0;
  
  // Dernière erreur (pour éviter les doublons)
  #lastError = null;
  #lastErrorTime = 0;

  /**
   * Singleton accessor
   */
  static getInstance() {
    if (!ErrorHandler.#instance) {
      ErrorHandler.#instance = new ErrorHandler();
    }
    return ErrorHandler.#instance;
  }

  constructor() {
    if (ErrorHandler.#instance) {
      throw new Error('Use ErrorHandler.getInstance() instead');
    }

    this.#init();
  }

  /**
   * Initialisation
   */
  #init() {
    try {
      Logger.info('ErrorHandler', 'Initializing global error handler...');

      // Capturer les erreurs non gérées
      window.addEventListener('error', (event) => this.#handleGlobalError(event));

      // Capturer les promesses rejetées non gérées
      window.addEventListener('unhandledrejection', (event) => this.#handleUnhandledRejection(event));

      Logger.info('ErrorHandler', 'Error handler initialized');

    } catch (error) {
      console.error('[ErrorHandler] Initialization failed:', error);
    }
  }

  /**
   * Injecter l'EventBus (appelé par AudioEngine)
   */
  setEventBus(eventBus) {
    this.#eventBus = eventBus;
    Logger.debug('ErrorHandler', 'EventBus injected');
  }

  /**
   * Gestion des erreurs globales window.onerror
   */
  #handleGlobalError(event) {
    try {
      const error = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        type: 'global',
      };

      Logger.error('ErrorHandler', 'Global error caught', error);

      // Éviter les doublons
      if (this.#isDuplicate(error.message)) {
        return;
      }

      this.#errorCount++;
      this.#processError(error);

      // Empêcher l'erreur de se propager dans la console (optionnel)
      // event.preventDefault();

    } catch (err) {
      console.error('[ErrorHandler] Failed to handle global error:', err);
    }
  }

  /**
   * Gestion des promesses rejetées
   */
  #handleUnhandledRejection(event) {
    try {
      const error = {
        message: event.reason?.message || event.reason || 'Unknown rejection',
        stack: event.reason?.stack,
        type: 'promise',
      };

      Logger.error('ErrorHandler', 'Unhandled promise rejection', error);

      // Éviter les doublons
      if (this.#isDuplicate(error.message)) {
        return;
      }

      this.#errorCount++;
      this.#processError(error);

      // Empêcher l'affichage dans la console
      event.preventDefault();

    } catch (err) {
      console.error('[ErrorHandler] Failed to handle rejection:', err);
    }
  }

  /**
   * Vérifie si l'erreur est un doublon (même message < 1 seconde)
   */
  #isDuplicate(message) {
    const now = Date.now();
    
    if (this.#lastError === message && (now - this.#lastErrorTime) < 1000) {
      return true;
    }

    this.#lastError = message;
    this.#lastErrorTime = now;
    return false;
  }

  /**
   * Traite une erreur
   */
  #processError(error) {
    try {
      // Logger
      Logger.error('ErrorHandler', 'Processing error', error);

      // Émettre événement (si EventBus disponible)
      if (this.#eventBus) {
        this.#eventBus.emit('error:occurred', error);
      }

      // Analyser le type d'erreur et proposer solution
      const analysis = this.#analyzeError(error);

      // Afficher message utilisateur (si critique)
      if (analysis.severity === 'critical') {
        this.#showUserError(analysis);
      }

    } catch (err) {
      console.error('[ErrorHandler] Failed to process error:', err);
    }
  }

  /**
   * Analyse une erreur et détermine sa sévérité + solution
   */
  #analyzeError(error) {
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';

    const analysis = {
      severity: 'error', // 'info' | 'warning' | 'error' | 'critical'
      category: 'unknown',
      userMessage: null,
      solution: null,
      originalError: error,
    };

    // Erreurs audio
    if (message.includes('audiocontext') || message.includes('webaudio')) {
      analysis.category = 'audio';
      analysis.userMessage = CONFIG.errorMessages.fr.audio_context_failed;
      analysis.solution = 'Rechargez la page ou essayez un autre navigateur';
      analysis.severity = 'critical';
    }

    // Erreurs microphone
    else if (message.includes('getusermedia') || message.includes('notallowederror') || message.includes('permission')) {
      analysis.category = 'microphone';
      analysis.userMessage = CONFIG.errorMessages.fr.mic_permission_denied;
      analysis.solution = 'Autorisez l\'accès au microphone dans les paramètres de votre navigateur';
      analysis.severity = 'critical';
    }

    // Micro introuvable
    else if (message.includes('notfounderror') || message.includes('no microphone')) {
      analysis.category = 'microphone';
      analysis.userMessage = CONFIG.errorMessages.fr.mic_not_found;
      analysis.solution = 'Branchez un microphone et rechargez la page';
      analysis.severity = 'critical';
    }

    // Erreurs de module
    else if (message.includes('failed to load') || message.includes('module')) {
      analysis.category = 'loading';
      analysis.userMessage = 'Erreur de chargement de l\'application';
      analysis.solution = 'Rechargez la page (Ctrl+R)';
      analysis.severity = 'critical';
    }

    // Erreurs de stockage
    else if (message.includes('quota') || message.includes('storage')) {
      analysis.category = 'storage';
      analysis.userMessage = CONFIG.errorMessages.fr.storage_full;
      analysis.solution = 'Supprimez d\'anciens enregistrements ou videz le cache';
      analysis.severity = 'warning';
    }

    // Autres erreurs
    else {
      analysis.userMessage = 'Une erreur inattendue s\'est produite';
      analysis.solution = 'Rechargez la page ou contactez le support';
      analysis.severity = 'error';
    }

    Logger.debug('ErrorHandler', 'Error analyzed', analysis);
    return analysis;
  }

  /**
   * Affiche un message d'erreur à l'utilisateur
   */
  #showUserError(analysis) {
    try {
      // Créer une notification d'erreur
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-notification error-critical';
      errorDiv.innerHTML = `
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-text">
            <div class="error-title">Erreur</div>
            <div class="error-message">${analysis.userMessage}</div>
            ${analysis.solution ? `<div class="error-solution">💡 ${analysis.solution}</div>` : ''}
          </div>
          <button class="error-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
      `;

      // Injecter CSS si pas déjà fait
      this.#injectErrorStyles();

      // Ajouter au DOM
      document.body.appendChild(errorDiv);

      // Auto-supprimer après 10 secondes (sauf si critique)
      if (analysis.severity !== 'critical') {
        setTimeout(() => {
          if (errorDiv.parentElement) {
            errorDiv.remove();
          }
        }, 10000);
      }

      Logger.debug('ErrorHandler', 'User error displayed');

    } catch (err) {
      console.error('[ErrorHandler] Failed to show user error:', err);
    }
  }

  /**
   * Injecte les styles CSS pour les erreurs
   */
  #injectErrorStyles() {
    if (document.getElementById('error-handler-styles')) {
      return; // Déjà injecté
    }

    const style = document.createElement('style');
    style.id = 'error-handler-styles';
    style.textContent = `
      .error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
      }
      
      .error-critical {
        border-left: 4px solid #ef4444;
      }
      
      .error-content {
        display: flex;
        padding: 16px;
        gap: 12px;
      }
      
      .error-icon {
        font-size: 24px;
        flex-shrink: 0;
      }
      
      .error-text {
        flex: 1;
      }
      
      .error-title {
        font-weight: bold;
        font-size: 16px;
        color: #1f2937;
        margin-bottom: 4px;
      }
      
      .error-message {
        font-size: 14px;
        color: #4b5563;
        margin-bottom: 8px;
      }
      
      .error-solution {
        font-size: 13px;
        color: #6b7280;
        font-style: italic;
      }
      
      .error-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }
      
      .error-close:hover {
        color: #4b5563;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Gestion manuelle d'erreur (depuis try/catch)
   * @param {Error} error - Objet Error
   * @param {string} context - Contexte de l'erreur
   * @param {boolean} showUser - Afficher à l'utilisateur
   */
  handle(error, context = 'Unknown', showUser = false) {
    try {
      Logger.error('ErrorHandler', `Error in ${context}`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      const processedError = {
        message: error.message,
        stack: error.stack,
        context: context,
        type: 'manual',
      };

      // Éviter doublons
      if (this.#isDuplicate(error.message)) {
        return;
      }

      this.#errorCount++;

      // Émettre événement
      if (this.#eventBus) {
        this.#eventBus.emit('error:occurred', processedError);
      }

      // Afficher à l'utilisateur si demandé
      if (showUser) {
        const analysis = this.#analyzeError(processedError);
        this.#showUserError(analysis);
      }

    } catch (err) {
      console.error('[ErrorHandler] Failed to handle manual error:', err);
    }
  }

  /**
   * Récupère le nombre total d'erreurs
   */
  getErrorCount() {
    return this.#errorCount;
  }

  /**
   * Reset le compteur
   */
  resetErrorCount() {
    this.#errorCount = 0;
    Logger.debug('ErrorHandler', 'Error count reset');
  }
}

// Export singleton
export const errorHandler = ErrorHandler.getInstance();

// Export class pour tests
export default ErrorHandler;