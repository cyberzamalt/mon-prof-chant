/**
 * BrowserDetector.js
 * TYPE: Utility - Browser Detection
 * 
 * Responsabilités:
 * - Détection navigateur (Chrome, Firefox, Safari, Edge, Opera, iOS)
 * - Détection OS (Windows, macOS, Linux, iOS, Android)
 * - Détection version navigateur
 * - Résumé de compatibilité
 * 
 * Dépendances: Logger
 * Utilisé par: AudioEngine, AudioContextManager, CompatibilityChecker
 */

import { Logger } from '../../logging/Logger.js';

class BrowserDetector {
  static #detectionCache = null;

  /**
   * Détecter le navigateur et retourner infos
   */
  static detect() {
    try {
      if (BrowserDetector.#detectionCache) {
        return BrowserDetector.#detectionCache;
      }

      const ua = navigator.userAgent;
      Logger.debug('BrowserDetector', 'User Agent:', { ua });

      const detection = {
        userAgent: ua,
        browser: BrowserDetector.#detectBrowser(ua),
        os: BrowserDetector.#detectOS(ua),
        version: BrowserDetector.#detectVersion(ua),
        isWebAudioSupported: !!window.AudioContext || !!window.webkitAudioContext,
        isMediaRecorderSupported: !!window.MediaRecorder,
        isWebWorkerSupported: typeof Worker !== 'undefined',
        isPromiseSupported: typeof Promise !== 'undefined',
        isES6Supported: true,
      };

      BrowserDetector.#detectionCache = detection;
      Logger.info('BrowserDetector', 'Detection complete', detection);

      return detection;
    } catch (err) {
      Logger.error('BrowserDetector', 'Detection failed', err);
      return BrowserDetector.#getFallback();
    }
  }

  /**
   * Détecter le navigateur
   */
  static #detectBrowser(ua) {
    try {
      if (ua.indexOf('Firefox') > -1) return 'Firefox';
      if (ua.indexOf('SamsungBrowser') > -1) return 'Samsung';
      if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
      if (ua.indexOf('Edge') > -1) return 'Edge';
      if (ua.indexOf('Chrome') > -1) return 'Chrome';
      if (ua.indexOf('Safari') > -1) return 'Safari';
      if (ua.indexOf('Trident') > -1) return 'IE';
      return 'Unknown';
    } catch (err) {
      Logger.warn('BrowserDetector', 'Browser detection failed', err);
      return 'Unknown';
    }
  }

  /**
   * Détecter l'OS
   */
  static #detectOS(ua) {
    try {
      if (ua.indexOf('Win') > -1) return 'Windows';
      if (ua.indexOf('Mac') > -1) return 'macOS';
      if (ua.indexOf('Linux') > -1) return 'Linux';
      if (ua.indexOf('X11') > -1) return 'Linux';
      if (ua.indexOf('iPhone') > -1) return 'iOS';
      if (ua.indexOf('iPad') > -1) return 'iOS';
      if (ua.indexOf('Android') > -1) return 'Android';
      return 'Unknown';
    } catch (err) {
      Logger.warn('BrowserDetector', 'OS detection failed', err);
      return 'Unknown';
    }
  }

  /**
   * Détecter la version du navigateur
   */
  static #detectVersion(ua) {
    try {
      const match = ua.match(/version\/(\d+)/i);
      if (match) return match[1];

      const chromeMatch = ua.match(/Chrome\/(\d+)/);
      if (chromeMatch) return chromeMatch[1];

      const firefoxMatch = ua.match(/Firefox\/(\d+)/);
      if (firefoxMatch) return firefoxMatch[1];

      const safariMatch = ua.match(/Version\/(\d+)/);
      if (safariMatch) return safariMatch[1];

      return 'Unknown';
    } catch (err) {
      Logger.warn('BrowserDetector', 'Version detection failed', err);
      return 'Unknown';
    }
  }

  /**
   * Vérifier si le navigateur est supporté
   */
  static isSupported() {
    try {
      const detection = BrowserDetector.detect();
      const requiredFeatures = [
        detection.isWebAudioSupported,
        detection.isMediaRecorderSupported,
        detection.isPromiseSupported,
      ];

      const isSupported = requiredFeatures.every(feature => feature === true);
      Logger.info('BrowserDetector', 'Support check', { isSupported, features: requiredFeatures });

      return isSupported;
    } catch (err) {
      Logger.error('BrowserDetector', 'Support check failed', err);
      return false;
    }
  }

  /**
   * Obtenir les features manquantes
   */
  static getMissingFeatures() {
    try {
      const detection = BrowserDetector.detect();
      const missing = [];

      if (!detection.isWebAudioSupported) missing.push('Web Audio API');
      if (!detection.isMediaRecorderSupported) missing.push('MediaRecorder API');
      if (!detection.isWebWorkerSupported) missing.push('Web Workers');
      if (!detection.isPromiseSupported) missing.push('Promises');

      return missing;
    } catch (err) {
      Logger.error('BrowserDetector', 'Missing features check failed', err);
      return ['Unknown'];
    }
  }

  /**
   * Rapport complet de compatibilité
   */
  static getReport() {
    try {
      const detection = BrowserDetector.detect();
      const missing = BrowserDetector.getMissingFeatures();
      const isSupported = BrowserDetector.isSupported();

      const report = {
        ...detection,
        isSupported,
        missingFeatures: missing,
        recommendation: isSupported ? 'Fully supported' : `Missing: ${missing.join(', ')}`,
      };

      Logger.info('BrowserDetector', 'Report generated', report);
      return report;
    } catch (err) {
      Logger.error('BrowserDetector', 'Report generation failed', err);
      return BrowserDetector.#getFallback();
    }
  }

  /**
   * Fallback si détection échoue
   */
  static #getFallback() {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      version: 'Unknown',
      isWebAudioSupported: false,
      isMediaRecorderSupported: false,
      isWebWorkerSupported: false,
      isPromiseSupported: false,
      isES6Supported: false,
      isSupported: false,
      missingFeatures: ['All features unknown'],
    };
  }
}

export { BrowserDetector };
export default BrowserDetector;
