/**
 * BrowserDetector.js
 * TYPE: Utility
 * 
 * Responsabilités:
 * - Détecter le navigateur et sa version
 * - Identifier le système d'exploitation
 * - Détecter les limitations spécifiques (Safari iOS, etc.)
 * - Fournir des flags pour adapter le comportement
 * 
 * Dépendances: Logger
 */

import { Logger } from '../logging/Logger.js';

// ⚡ Configuration inline (évite l'import CONFIG manquant)
const BROWSER_CONFIG = {
  compatibility: {
    browsers: {
      chrome: {
        min: 90,
        priority: 1,
        limitations: []
      },
      firefox: {
        min: 88,
        priority: 2,
        limitations: []
      },
      safari: {
        min: 14,
        priority: 3,
        limitations: ['mp4_only']
      },
      edge: {
        min: 90,
        priority: 1,
        limitations: []
      }
    },
    required: [
      'AudioContext',
      'getUserMedia',
      'MediaRecorder',
      'AnalyserNode',
      'localStorage',
      'WebAudio'
    ]
  }
};

export class BrowserDetector {
  
  /**
   * Détecte le navigateur et retourne les infos complètes
   * @returns {object} Informations navigateur
   */
  static detect() {
    try {
      const ua = navigator.userAgent;
      const vendor = navigator.vendor || '';
      
      // Initialiser l'objet résultat
      const result = {
        name: 'unknown',
        version: 0,
        fullVersion: '0',
        os: BrowserDetector.detectOS(),
        mobile: BrowserDetector.isMobile(),
        limitations: [],
        supported: false,
        priority: 999,
      };

      // Détection navigateur
      // IMPORTANT : L'ordre compte (Chrome doit être testé avant Safari)
      
      // Edge (basé Chromium depuis 2020)
      if (ua.includes('Edg/') || ua.includes('Edge/')) {
        result.name = 'edge';
        const match = ua.match(/Edg(?:e)?\/(\d+)\.(\d+)/);
        if (match) {
          result.version = parseInt(match[1], 10);
          result.fullVersion = `${match[1]}.${match[2]}`;
        }
      }
      // Chrome (tester avant Safari car Safari contient "Chrome" dans son UA)
      else if (ua.includes('Chrome/') && !ua.includes('Edg') && vendor.includes('Google')) {
        result.name = 'chrome';
        const match = ua.match(/Chrome\/(\d+)\.(\d+)/);
        if (match) {
          result.version = parseInt(match[1], 10);
          result.fullVersion = `${match[1]}.${match[2]}`;
        }
      }
      // Firefox
      else if (ua.includes('Firefox/')) {
        result.name = 'firefox';
        const match = ua.match(/Firefox\/(\d+)\.(\d+)/);
        if (match) {
          result.version = parseInt(match[1], 10);
          result.fullVersion = `${match[1]}.${match[2]}`;
        }
      }
      // Safari (doit être testé après Chrome/Edge)
      else if (ua.includes('Safari/') && vendor.includes('Apple')) {
        result.name = 'safari';
        
        // Détecter iOS Safari spécifiquement
        if (result.os === 'ios') {
          result.name = 'safari';
          result.limitations.push('ios_safari', '14khz_max', 'mp4_only');
        }
        
        // Extraire version Safari
        const match = ua.match(/Version\/(\d+)\.(\d+)/);
        if (match) {
          result.version = parseInt(match[1], 10);
          result.fullVersion = `${match[1]}.${match[2]}`;
        }
      }

      // Vérifier si supporté
      const browserConfig = BROWSER_CONFIG.compatibility.browsers[result.name];
      if (browserConfig) {
        result.supported = result.version >= browserConfig.min;
        result.priority = browserConfig.priority;
        
        // Ajouter limitations connues
        if (browserConfig.limitations) {
          result.limitations.push(...browserConfig.limitations);
        }
      }

      Logger.info('BrowserDetector', 'Browser detected', result);
      return result;
      
    } catch (error) {
      Logger.error('BrowserDetector', 'Detection failed', error);
      
      // Retourner objet par défaut en cas d'erreur
      return {
        name: 'unknown',
        version: 0,
        fullVersion: '0',
        os: 'unknown',
        mobile: false,
        limitations: [],
        supported: false,
        priority: 999,
      };
    }
  }

  /**
   * Détecte le système d'exploitation
   * @returns {string} 'windows'|'macos'|'linux'|'ios'|'android'|'unknown'
   */
  static detectOS() {
    try {
      const ua = navigator.userAgent;
      const platform = navigator.platform || '';

      // iOS (doit être testé en premier)
      if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        return 'ios';
      }
      
      // Android
      if (/Android/.test(ua)) {
        return 'android';
      }
      
      // macOS
      if (/Mac/.test(platform)) {
        return 'macos';
      }
      
      // Windows
      if (/Win/.test(platform)) {
        return 'windows';
      }
      
      // Linux
      if (/Linux/.test(platform)) {
        return 'linux';
      }

      return 'unknown';
      
    } catch (error) {
      Logger.error('BrowserDetector', 'OS detection failed', error);
      return 'unknown';
    }
  }

  /**
   * Détecte si c'est un appareil mobile
   * @returns {boolean}
   */
  static isMobile() {
    try {
      // Méthode 1 : User Agent
      const ua = navigator.userAgent;
      const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      
      // Méthode 2 : Touch support
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Méthode 3 : Largeur écran
      const smallScreen = window.innerWidth <= 768;
      
      // Mobile si UA mobile OU (touch ET petit écran)
      return mobileUA || (hasTouch && smallScreen);
      
    } catch (error) {
      Logger.error('BrowserDetector', 'Mobile detection failed', error);
      return false;
    }
  }

  /**
   * Vérifie si le navigateur est Safari iOS
   * @returns {boolean}
   */
  static isIOSSafari() {
    const info = BrowserDetector.detect();
    return info.name === 'safari' && info.os === 'ios';
  }

  /**
   * Vérifie si le navigateur a des limitations audio
   * @returns {boolean}
   */
  static hasAudioLimitations() {
    const info = BrowserDetector.detect();
    return info.limitations.length > 0;
  }

  /**
   * Récupère les limitations audio spécifiques
   * @returns {Array<string>}
   */
  static getAudioLimitations() {
    const info = BrowserDetector.detect();
    return info.limitations;
  }

  /**
   * Vérifie si une feature spécifique est supportée
   * @param {string} feature - Nom de la feature à tester
   * @returns {boolean}
   */
  static supportsFeature(feature) {
    try {
      switch (feature) {
        case 'AudioContext':
          return !!(window.AudioContext || window.webkitAudioContext);
        
        case 'getUserMedia':
          return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        
        case 'MediaRecorder':
          return typeof MediaRecorder !== 'undefined';
        
        case 'AnalyserNode':
          if (!window.AudioContext && !window.webkitAudioContext) return false;
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const hasAnalyser = typeof ctx.createAnalyser === 'function';
            ctx.close();
            return hasAnalyser;
          } catch (e) {
            return false;
          }
        
        case 'localStorage':
          try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
          } catch (e) {
            return false;
          }
        
        case 'IndexedDB':
          return !!window.indexedDB;
        
        case 'WebAudio':
          return BrowserDetector.supportsFeature('AudioContext') && 
                 BrowserDetector.supportsFeature('AnalyserNode');
        
        default:
          Logger.warn('BrowserDetector', `Unknown feature: ${feature}`);
          return false;
      }
      
    } catch (error) {
      Logger.error('BrowserDetector', `Feature check failed for: ${feature}`, error);
      return false;
    }
  }

  /**
   * Récupère le format d'enregistrement recommandé pour ce navigateur
   * @returns {string} MIME type
   */
  static getRecommendedRecordingFormat() {
    const info = BrowserDetector.detect();
    
    // Safari iOS : OBLIGATOIREMENT mp4
    if (info.name === 'safari' && info.os === 'ios') {
      return 'audio/mp4';
    }
    
    // Chrome/Edge : opus/webm (meilleure compression)
    if (info.name === 'chrome' || info.name === 'edge') {
      return 'audio/webm;codecs=opus';
    }
    
    // Firefox : webm
    if (info.name === 'firefox') {
      return 'audio/webm';
    }
    
    // Safari desktop : mp4
    if (info.name === 'safari') {
      return 'audio/mp4';
    }
    
    // Fallback universel
    return 'audio/wav';
  }

  /**
   * Vérifie si un format d'enregistrement est supporté
   * @param {string} mimeType - MIME type à tester
   * @returns {boolean}
   */
  static supportsRecordingFormat(mimeType) {
    try {
      if (typeof MediaRecorder === 'undefined') {
        return false;
      }
      return MediaRecorder.isTypeSupported(mimeType);
    } catch (error) {
      Logger.error('BrowserDetector', `Format check failed: ${mimeType}`, error);
      return false;
    }
  }

  /**
   * Récupère une description lisible du navigateur
   * @returns {string} Ex: "Chrome 120 on macOS"
   */
  static getDescription() {
    const info = BrowserDetector.detect();
    const browserName = info.name.charAt(0).toUpperCase() + info.name.slice(1);
    const osName = info.os.charAt(0).toUpperCase() + info.os.slice(1);
    return `${browserName} ${info.version} on ${osName}`;
  }

  /**
   * Génère un rapport complet de compatibilité
   * @returns {object}
   */
  static getCompatibilityReport() {
    const info = BrowserDetector.detect();
    
    const report = {
      browser: info,
      features: {},
      recommendations: [],
      warnings: [],
    };

    // Tester toutes les features requises
    BROWSER_CONFIG.compatibility.required.forEach(feature => {
      report.features[feature] = BrowserDetector.supportsFeature(feature);
      
      if (!report.features[feature]) {
        report.warnings.push(`Feature manquante: ${feature}`);
      }
    });

    // Ajouter recommandations selon le navigateur
    if (!info.supported) {
      const browserConfig = BROWSER_CONFIG.compatibility.browsers[info.name];
      if (browserConfig) {
        report.recommendations.push(`Mise à jour recommandée (version minimale: ${browserConfig.min})`);
      }
    }

    if (info.limitations.includes('14khz_max')) {
      report.warnings.push('Limitation Safari iOS: Fréquences limitées à 14kHz (effet "téléphone")');
      report.recommendations.push('Pour une qualité optimale, utilisez Chrome sur desktop');
    }

    if (info.limitations.includes('mp4_only')) {
      report.recommendations.push('Format mp4 obligatoire pour enregistrements');
    }

    if (info.mobile) {
      report.recommendations.push('Sur mobile, utilisez des écouteurs pour éviter l\'effet Larsen');
      report.recommendations.push('Latence plus élevée sur mobile (50-150ms vs 20-70ms sur desktop)');
    }

    Logger.debug('BrowserDetector', 'Compatibility report generated', report);
    return report;
  }
}

// Export par défaut
export default BrowserDetector;
