/**
 * CompatibilityChecker.js
 * TYPE: Utility - Compatibility Verification
 * 
 * Responsabilités:
 * - Vérification complète des APIs requises
 * - Détection des limitations navigateur
 * - Recommendations fallback
 * - Rapport de compatibilité détaillé
 * 
 * Dépendances: Logger, BrowserDetector
 * Utilisé par: app.js, AudioEngine
 */

import { Logger } from './logging/Logger.js';
import { BrowserDetector } from './utils/BrowserDetector.js';

class CompatibilityChecker {
  static #checksCache = null;

  /**
   * Vérifier toutes les compatibilités
   */
  static checkAll() {
    try {
      if (CompatibilityChecker.#checksCache) {
        return CompatibilityChecker.#checksCache;
      }

      Logger.info('CompatibilityChecker', 'Running full compatibility check');

      const checks = {
        timestamp: new Date().toISOString(),
        browser: BrowserDetector.detect(),
        apis: {
          webAudio: CompatibilityChecker.#checkWebAudio(),
          mediaRecorder: CompatibilityChecker.#checkMediaRecorder(),
          mediaDevices: CompatibilityChecker.#checkMediaDevices(),
          audioWorklet: CompatibilityChecker.#checkAudioWorklet(),
          webWorker: CompatibilityChecker.#checkWebWorker(),
          promise: CompatibilityChecker.#checkPromise(),
          fetch: CompatibilityChecker.#checkFetch(),
          indexedDB: CompatibilityChecker.#checkIndexedDB(),
          localStorage: CompatibilityChecker.#checkLocalStorage(),
        },
        overallSupport: false,
        criticalsIssues: [],
        warnings: [],
        recommendations: [],
      };

      // Déterminer si compatible
      checks.overallSupport = CompatibilityChecker.#evaluateOverallSupport(checks);

      // Collecter les problèmes
      CompatibilityChecker.#collectIssues(checks);

      CompatibilityChecker.#checksCache = checks;
      Logger.info('CompatibilityChecker', 'Check complete', checks);

      return checks;
    } catch (err) {
      Logger.error('CompatibilityChecker', 'Check failed', err);
      return CompatibilityChecker.#getFallbackChecks();
    }
  }

  /**
   * Vérifier Web Audio API
   */
  static #checkWebAudio() {
    try {
      const supported = !!(window.AudioContext || window.webkitAudioContext);
      Logger.debug('CompatibilityChecker', 'Web Audio API', { supported });
      return {
        supported,
        name: 'Web Audio API',
        critical: true,
        fallback: 'None - Application will not work',
      };
    } catch (err) {
      Logger.warn('CompatibilityChecker', 'Web Audio check failed', err);
      return { supported: false, name: 'Web Audio API', critical: true, fallback: 'None' };
    }
  }

  /**
   * Vérifier MediaRecorder
   */
  static #checkMediaRecorder() {
    try {
      const supported = !!window.MediaRecorder;
      Logger.debug('CompatibilityChecker', 'MediaRecorder', { supported });
      return {
        supported,
        name: 'MediaRecorder API',
        critical: true,
        fallback: 'Audio-recorder-polyfill available',
      };
    } catch (err) {
      Logger.warn('CompatibilityChecker', 'MediaRecorder check failed', err);
      return { supported: false, name: 'MediaRecorder API', critical: true, fallback: 'Polyfill' };
    }
  }

  /**
   * Vérifier MediaDevices (getUserMedia)
   */
  static #checkMediaDevices() {
    try {
      const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      Logger.debug('CompatibilityChecker', 'MediaDevices', { supported });
      return {
        supported,
        name: 'MediaDevices (getUserMedia)',
        critical: true,
        fallback: 'None - Microphone access required',
      };
    } catch (err) {
      Logger.warn('CompatibilityChecker', 'MediaDevices check failed', err);
      return { supported: false, name: 'MediaDevices', critical: true, fallback: 'None' };
    }
  }

  /**
   * Vérifier AudioWorklet
   */
  static #checkAudioWorklet() {
    try {
      const supported = !!(window.AudioContext && window.AudioContext.prototype.audioWorklet);
      Logger.debug('CompatibilityChecker', 'AudioWorklet', { supported });
      return {
        supported,
        name: 'AudioWorklet',
        critical: false,
        fallback: 'ScriptProcessorNode (deprecated but functional)',
      };
    } catch (err) {
      Logger.warn('CompatibilityChecker', 'AudioWorklet check failed', err);
      return { supported: false, name: 'AudioWorklet', critical: false, fallback: 'ScriptProcessorNode' };
    }
  }

  /**
   * Vérifier Web Workers
   */
  static #checkWebWorker() {
    try {
      const supported = typeof Worker !== 'undefined';
      Logger.debug('CompatibilityChecker', 'Web Workers', { supported });
      return {
        supported,
        name: 'Web Workers',
        critical: false,
        fallback: 'Main thread (slower for MP3 encoding)',
      };
    } catch (err) {
      Logger.warn('CompatibilityChecker', 'Web Workers check failed', err);
      return { supported: false, name: 'Web Workers', critical: false, fallback: 'Main thread' };
    }
  }

  /**
   * Vérifier Promises
   */
  static #checkPromise() {
    try {
      const supported = typeof Promise !== 'undefined';
      Logger.debug('CompatibilityChecker', 'Promises', { supported });
      return {
        supported,
        name: 'Promises',
        critical: true,
        fallback: 'None - Required for async',
      };
    } catch (err) {
      Logger.warn('CompatibilityChecker', 'Promises check failed', err);
      return { supported: false, name: 'Promises', critical: true, fallback: 'None' };
    }
  }

  /**
   * Vérifier Fetch API
   */
  static #checkFetch() {
    try {
      const supported = typeof fetch !== 'undefined';
      Logger.debug('CompatibilityChecker', 'Fetch API', { supported });
      return {
        supported,
        name: 'Fetch API',
        critical: false,
        fallback: 'XMLHttpRequest',
      };
    } catch (err) {
      Logger.warn('CompatibilityChecker', 'Fetch check failed', err);
      return { supported: false, name: 'Fetch API', critical: false, fallback: 'XMLHttpRequest' };
    }
  }

  /**
   * Vérifier IndexedDB
   */
  static #checkIndexedDB() {
    try {
      const supported = !!(window.indexedDB || window.webkitIndexedDB);
      Logger.debug('CompatibilityChecker', 'IndexedDB', { supported });
      return {
        supported,
        name: 'IndexedDB',
        critical: false,
        fallback: 'localStorage (limité à 5MB)',
      };
    } catch (err) {
      Logger.warn('CompatibilityChecker', 'IndexedDB check failed', err);
      return { supported: false, name: 'IndexedDB', critical: false, fallback: 'localStorage' };
    }
  }

  /**
   * Vérifier localStorage
   */
  static #checkLocalStorage() {
    try {
      const test = '__compat_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      Logger.debug('CompatibilityChecker', 'localStorage', { supported: true });
      return {
        supported: true,
        name: 'localStorage',
        critical: false,
        fallback: 'In-memory storage only',
      };
    } catch (err) {
      Logger.warn('CompatibilityChecker', 'localStorage check failed', err);
      return { supported: false, name: 'localStorage', critical: false, fallback: 'In-memory' };
    }
  }

  /**
   * Évaluer si globalement compatible
   */
  static #evaluateOverallSupport(checks) {
    try {
      const criticals = Object.values(checks.apis).filter(api => api.critical);
      const allCriticalsSupported = criticals.every(api => api.supported);
      Logger.info('CompatibilityChecker', 'Overall support evaluation', { allCriticalsSupported });
      return allCriticalsSupported;
    } catch (err) {
      Logger.error('CompatibilityChecker', 'Support evaluation failed', err);
      return false;
    }
  }

  /**
   * Collecter les problèmes et warnings
   */
  static #collectIssues(checks) {
    try {
      Object.values(checks.apis).forEach(api => {
        if (api.critical && !api.supported) {
          checks.criticalsIssues.push(`${api.name} is not supported`);
        } else if (!api.supported) {
          checks.warnings.push(`${api.name} not supported, will use: ${api.fallback}`);
        }
      });

      // Recommendations spécifiques
      if (!checks.apis.audioWorklet.supported) {
        checks.recommendations.push('AudioWorklet not supported - using deprecated ScriptProcessorNode');
      }
      if (!checks.apis.webWorker.supported) {
        checks.recommendations.push('Web Workers not supported - MP3 encoding will block main thread');
      }
      if (!checks.apis.indexedDB.supported && checks.apis.localStorage.supported) {
        checks.recommendations.push('IndexedDB not available - recordings limited to 5MB');
      }

      Logger.info('CompatibilityChecker', 'Issues collected', {
        criticalsCount: checks.criticalsIssues.length,
        warningsCount: checks.warnings.length,
        recommendationsCount: checks.recommendations.length,
      });
    } catch (err) {
      Logger.error('CompatibilityChecker', 'Issue collection failed', err);
    }
  }

  /**
   * Obtenir rapport lisible
   */
  static getReport() {
    try {
      const checks = CompatibilityChecker.checkAll();
      const report = {
        overall: checks.overallSupport,
        browser: `${checks.browser.browser} ${checks.browser.version} on ${checks.browser.os}`,
        criticalIssues: checks.criticalsIssues,
        warnings: checks.warnings,
        recommendations: checks.recommendations,
        details: checks.apis,
        canProceed: checks.overallSupport,
      };
      Logger.info('CompatibilityChecker', 'Report generated', report);
      return report;
    } catch (err) {
      Logger.error('CompatibilityChecker', 'Report generation failed', err);
      return CompatibilityChecker.#getFallbackReport();
    }
  }

  /**
   * Fallback en cas d'erreur
   */
  static #getFallbackChecks() {
    return {
      timestamp: new Date().toISOString(),
      browser: { browser: 'Unknown', os: 'Unknown', version: 'Unknown' },
      apis: {},
      overallSupport: false,
      criticalsIssues: ['Compatibility check failed'],
      warnings: [],
      recommendations: ['Please use a modern browser (Chrome, Firefox, Safari)'],
    };
  }

  static #getFallbackReport() {
    return {
      overall: false,
      browser: 'Unknown',
      criticalIssues: ['Compatibility check failed'],
      warnings: [],
      recommendations: ['Use modern browser'],
      canProceed: false,
    };
  }
}

export { CompatibilityChecker };
export default CompatibilityChecker;
