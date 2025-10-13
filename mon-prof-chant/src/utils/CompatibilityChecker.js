/**
 * CompatibilityChecker.js
 * TYPE: Utility - Compatibility Validator
 * 
 * Responsabilités:
 * - Vérifier que toutes les features requises sont disponibles
 * - Générer un rapport de compatibilité détaillé
 * - Fournir des messages d'erreur clairs pour l'utilisateur
 * - Suggérer des solutions si incompatibilité
 * 
 * Dépendances: Logger, BrowserDetector, CONFIG
 */

import { Logger } from '../logging/Logger.js';
import { BrowserDetector } from './BrowserDetector.js';
import { CONFIG } from '../config.js';

export class CompatibilityChecker {

  /**
   * Vérifie la compatibilité complète
   * @returns {object} Rapport de compatibilité
   */
  static check() {
    Logger.info('CompatibilityChecker', 'Starting compatibility check...');

    try {
      const report = {
        compatible: true,
        browser: null,
        features: {},
        missing: [],
        warnings: [],
        recommendations: [],
        canProceed: true,
      };

      // 1. Détecter le navigateur
      report.browser = BrowserDetector.detect();
      Logger.debug('CompatibilityChecker', 'Browser info', report.browser);

      // 2. Vérifier chaque feature requise
      const requiredFeatures = CONFIG.compatibility.required;
      
      for (const feature of requiredFeatures) {
        const supported = BrowserDetector.supportsFeature(feature);
        report.features[feature] = supported;

        if (!supported) {
          report.missing.push(feature);
          report.compatible = false;
          Logger.warn('CompatibilityChecker', `Missing feature: ${feature}`);
        }
      }

      // 3. Vérifier version navigateur
      if (!report.browser.supported) {
        const minVersion = CONFIG.compatibility.browsers[report.browser.name]?.min;
        report.warnings.push(
          `Version ${report.browser.name} trop ancienne (minimum: ${minVersion}, actuelle: ${report.browser.version})`
        );
        report.recommendations.push('Mettez à jour votre navigateur pour une meilleure expérience');
      }

      // 4. Vérifier limitations spécifiques
      if (report.browser.limitations.length > 0) {
        report.warnings.push(`Limitations détectées: ${report.browser.limitations.join(', ')}`);
        
        if (report.browser.limitations.includes('14khz_max')) {
          report.recommendations.push('Pour une qualité audio optimale, utilisez Chrome sur ordinateur');
        }
      }

      // 5. Vérifier mobile
      if (report.browser.mobile) {
        report.warnings.push('Appareil mobile détecté - latence plus élevée possible');
        report.recommendations.push('Utilisez des écouteurs pour éviter l\'effet Larsen');
      }

      // 6. Déterminer si on peut continuer
      report.canProceed = report.missing.length === 0;

      // 7. Générer messages utilisateur
      report.userMessage = CompatibilityChecker.#generateUserMessage(report);

      Logger.info('CompatibilityChecker', 'Compatibility check complete', {
        compatible: report.compatible,
        canProceed: report.canProceed,
        missingCount: report.missing.length,
        warningCount: report.warnings.length,
      });

      return report;

    } catch (error) {
      Logger.error('CompatibilityChecker', 'Compatibility check failed', error);
      
      // Retourner un rapport d'erreur
      return {
        compatible: false,
        canProceed: false,
        error: true,
        userMessage: 'Impossible de vérifier la compatibilité. Rechargez la page.',
        missing: ['unknown'],
        features: {},
        warnings: [],
        recommendations: [],
      };
    }
  }

  /**
   * Génère un message utilisateur clair
   * @private
   */
  static #generateUserMessage(report) {
    if (report.canProceed && report.compatible) {
      return {
        type: 'success',
        title: 'Navigateur compatible !',
        message: 'Votre navigateur supporte toutes les fonctionnalités nécessaires.',
        details: report.warnings.length > 0 ? report.warnings : null,
      };
    }

    if (!report.canProceed) {
      const messages = CONFIG.errorMessages.fr;
      
      return {
        type: 'error',
        title: 'Navigateur non compatible',
        message: messages.browser_not_supported,
        details: report.missing,
        recommendations: report.recommendations,
      };
    }

    return {
      type: 'warning',
      title: 'Compatibilité partielle',
      message: 'Votre navigateur fonctionne mais avec des limitations.',
      details: report.warnings,
      recommendations: report.recommendations,
    };
  }

  /**
   * Vérifie si une feature spécifique est disponible
   * @param {string} feature - Nom de la feature
   * @returns {boolean}
   */
  static hasFeature(feature) {
    return BrowserDetector.supportsFeature(feature);
  }

  /**
   * Vérifie spécifiquement les APIs audio
   * @returns {object} Rapport audio
   */
  static checkAudio() {
    Logger.debug('CompatibilityChecker', 'Checking audio features...');

    const audioReport = {
      audioContext: false,
      analyser: false,
      mediaRecorder: false,
      getUserMedia: false,
      webAudio: false,
      recommendedFormat: null,
      supportedFormats: [],
    };

    try {
      // AudioContext
      audioReport.audioContext = BrowserDetector.supportsFeature('AudioContext');

      // AnalyserNode
      audioReport.analyser = BrowserDetector.supportsFeature('AnalyserNode');

      // MediaRecorder
      audioReport.mediaRecorder = BrowserDetector.supportsFeature('MediaRecorder');

      // getUserMedia
      audioReport.getUserMedia = BrowserDetector.supportsFeature('getUserMedia');

      // Web Audio complet
      audioReport.webAudio = audioReport.audioContext && audioReport.analyser;

      // Format recommandé
      audioReport.recommendedFormat = BrowserDetector.getRecommendedRecordingFormat();

      // Formats supportés
      const formats = Object.values(CONFIG.audio.formats);
      for (const format of formats) {
        if (BrowserDetector.supportsRecordingFormat(format)) {
          audioReport.supportedFormats.push(format);
        }
      }

      Logger.debug('CompatibilityChecker', 'Audio check complete', audioReport);
      return audioReport;

    } catch (error) {
      Logger.error('CompatibilityChecker', 'Audio check failed', error);
      return audioReport;
    }
  }

  /**
   * Vérifie les APIs de storage
   * @returns {object} Rapport storage
   */
  static checkStorage() {
    Logger.debug('CompatibilityChecker', 'Checking storage features...');

    const storageReport = {
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      localStorageSize: 0,
    };

    try {
      // localStorage
      storageReport.localStorage = BrowserDetector.supportsFeature('localStorage');

      // sessionStorage
      try {
        const test = '__session_test__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        storageReport.sessionStorage = true;
      } catch (e) {
        storageReport.sessionStorage = false;
      }

      // IndexedDB
      storageReport.indexedDB = BrowserDetector.supportsFeature('IndexedDB');

      // Taille utilisée (approximation)
      if (storageReport.localStorage) {
        try {
          let size = 0;
          for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
              size += localStorage[key].length + key.length;
            }
          }
          storageReport.localStorageSize = size;
        } catch (e) {
          // Ignore
        }
      }

      Logger.debug('CompatibilityChecker', 'Storage check complete', storageReport);
      return storageReport;

    } catch (error) {
      Logger.error('CompatibilityChecker', 'Storage check failed', error);
      return storageReport;
    }
  }

  /**
   * Vérifie la performance du système
   * @returns {object} Rapport performance
   */
  static async checkPerformance() {
    Logger.debug('CompatibilityChecker', 'Checking performance...');

    const perfReport = {
      cores: 1,
      memory: 0,
      connection: 'unknown',
      deviceMemory: 0,
      hardwareConcurrency: 1,
    };

    try {
      // Nombre de cores
      perfReport.hardwareConcurrency = navigator.hardwareConcurrency || 1;
      perfReport.cores = perfReport.hardwareConcurrency;

      // Mémoire appareil (si disponible)
      if ('deviceMemory' in navigator) {
        perfReport.deviceMemory = navigator.deviceMemory; // En GB
      }

      // Type de connexion
      if ('connection' in navigator) {
        const conn = navigator.connection;
        perfReport.connection = conn.effectiveType || 'unknown';
        perfReport.downlink = conn.downlink; // Mbps
        perfReport.rtt = conn.rtt; // ms
      }

      Logger.debug('CompatibilityChecker', 'Performance check complete', perfReport);
      return perfReport;

    } catch (error) {
      Logger.error('CompatibilityChecker', 'Performance check failed', error);
      return perfReport;
    }
  }

  /**
   * Génère un rapport complet (tout)
   * @returns {object} Rapport global
   */
  static async generateFullReport() {
    Logger.info('CompatibilityChecker', 'Generating full compatibility report...');

    try {
      const report = {
        timestamp: new Date().toISOString(),
        general: CompatibilityChecker.check(),
        audio: CompatibilityChecker.checkAudio(),
        storage: CompatibilityChecker.checkStorage(),
        performance: await CompatibilityChecker.checkPerformance(),
      };

      Logger.info('CompatibilityChecker', 'Full report generated', report);
      return report;

    } catch (error) {
      Logger.error('CompatibilityChecker', 'Full report generation failed', error);
      return null;
    }
  }

  /**
   * Exporte le rapport en texte lisible
   * @returns {string}
   */
  static async exportReportAsText() {
    const report = await CompatibilityChecker.generateFullReport();
    
    if (!report) return 'Erreur lors de la génération du rapport';

    let text = '=== RAPPORT DE COMPATIBILITÉ ===\n\n';
    text += `Date: ${report.timestamp}\n\n`;

    // Navigateur
    text += '--- NAVIGATEUR ---\n';
    text += `Nom: ${report.general.browser.name}\n`;
    text += `Version: ${report.general.browser.fullVersion}\n`;
    text += `OS: ${report.general.browser.os}\n`;
    text += `Mobile: ${report.general.browser.mobile ? 'Oui' : 'Non'}\n`;
    text += `Compatible: ${report.general.compatible ? 'Oui' : 'Non'}\n\n`;

    // Features
    text += '--- FEATURES ---\n';
    for (const [feature, supported] of Object.entries(report.general.features)) {
      text += `${feature}: ${supported ? '✓' : '✗'}\n`;
    }
    text += '\n';

    // Audio
    text += '--- AUDIO ---\n';
    text += `Web Audio: ${report.audio.webAudio ? '✓' : '✗'}\n`;
    text += `MediaRecorder: ${report.audio.mediaRecorder ? '✓' : '✗'}\n`;
    text += `getUserMedia: ${report.audio.getUserMedia ? '✓' : '✗'}\n`;
    text += `Format recommandé: ${report.audio.recommendedFormat}\n\n`;

    // Storage
    text += '--- STORAGE ---\n';
    text += `localStorage: ${report.storage.localStorage ? '✓' : '✗'}\n`;
    text += `IndexedDB: ${report.storage.indexedDB ? '✓' : '✗'}\n`;
    text += `Taille utilisée: ${(report.storage.localStorageSize / 1024).toFixed(2)} KB\n\n`;

    // Performance
    text += '--- PERFORMANCE ---\n';
    text += `Cores CPU: ${report.performance.cores}\n`;
    text += `Mémoire: ${report.performance.deviceMemory || 'N/A'} GB\n`;
    text += `Connexion: ${report.performance.connection}\n\n`;

    // Warnings
    if (report.general.warnings.length > 0) {
      text += '--- AVERTISSEMENTS ---\n';
      report.general.warnings.forEach(w => text += `⚠ ${w}\n`);
      text += '\n';
    }

    // Recommendations
    if (report.general.recommendations.length > 0) {
      text += '--- RECOMMANDATIONS ---\n';
      report.general.recommendations.forEach(r => text += `💡 ${r}\n`);
    }

    return text;
  }
}

// Export par défaut
export default CompatibilityChecker;