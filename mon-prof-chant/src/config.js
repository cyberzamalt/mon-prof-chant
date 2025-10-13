/**
 * config.js
 * TYPE: Configuration centrale
 * 
 * Responsabilités:
 * - Centraliser TOUTES les configurations de l'application
 * - Fournir des valeurs par défaut cohérentes
 * - Éviter les magic numbers dans le code
 * - Faciliter les ajustements sans toucher au code
 * 
 * Dépendances: Aucune (fichier de base)
 */

export const CONFIG = {
  
  // ========================================
  // APPLICATION
  // ========================================
  app: {
    name: 'Mon Professeur de Chant',
    version: '1.0.0',
    environment: 'production', // 'development' | 'production'
    debug: false, // Active les logs détaillés
  },

  // ========================================
  // AUDIO CORE
  // ========================================
  audio: {
    // Contexte audio
    sampleRate: 48000, // Hz - Standard professionnel
    latencyHint: 'interactive', // 'interactive' | 'balanced' | 'playback'
    
    // Buffers
    bufferSize: 512, // frames - Compromis latence/CPU (256|512|1024)
    minBufferSize: 256,
    maxBufferSize: 2048,
    
    // FFT pour analyse spectrale
    fftSize: 2048, // Doit être puissance de 2 (512|1024|2048|4096|8192)
    fftSizeVoice: 2048, // Optimal pour voix humaines
    
    // Latence
    targetLatency: 20, // ms - Objectif pour feedback temps réel
    maxAcceptableLatency: 100, // ms - Au-delà = mode dégradé
    
    // Formats d'enregistrement (détection auto par navigateur)
    formats: {
      chrome: 'audio/webm;codecs=opus',
      firefox: 'audio/webm',
      safari: 'audio/mp4', // OBLIGATOIRE pour iOS
      fallback: 'audio/wav', // Polyfill universel
    },
  },

  // ========================================
  // DETECTION DE PITCH
  // ========================================
  pitch: {
    // Pitchy (temps réel)
    clarityThreshold: 0.85, // Rejeter si clarity < 0.85 (0-1)
    minFrequency: 50, // Hz - En-dessous = bruit
    maxFrequency: 2000, // Hz - Au-dessus = harmoniques
    
    // CREPE (post-enregistrement haute précision)
    crepeModel: 'tiny', // 'tiny' | 'small' | 'medium' | 'large'
    crepeVocoderOff: true, // Désactiver vocoder pour plus de rapidité
    
    // Plages vocales standard
    ranges: {
      bass: { min: 82, max: 294 },      // E2-D4
      baritone: { min: 98, max: 392 },  // G2-G4
      tenor: { min: 130, max: 523 },    // C3-C5
      alto: { min: 175, max: 698 },     // F3-F5
      mezzo: { min: 196, max: 784 },    // G3-G5
      soprano: { min: 262, max: 1047 }, // C4-C6
    },
  },

  // ========================================
  // METRIQUES ET SCORING
  // ========================================
  metrics: {
    // Justesse (cents)
    cents: {
      excellent: 10,  // ±10 cents = Elite classique
      good: 20,       // ±20 cents = Professionnel
      fair: 35,       // ±35 cents = Bon amateur
      poor: 50,       // ±50+ cents = Débutant
    },
    
    // Vibrato (chant)
    vibrato: {
      rateMin: 4.5,    // Hz - Vitesse minimale saine
      rateMax: 6.5,    // Hz - Vitesse maximale saine
      rateIdeal: 5.5,  // Hz - Vibrato idéal
      extentMin: 40,   // cents - Amplitude minimale
      extentMax: 60,   // cents - Amplitude maximale
      extentIdeal: 50, // cents - Amplitude idéale
    },
    
    // SPR (Singing Power Ratio)
    spr: {
      excellent: -15,  // dB - Voix très résonnante
      good: -12,       // dB - Bonne projection
      fair: -8,        // dB - Projection moyenne
      poor: -5,        // dB - Voix étouffée
    },
    
    // HNR (Harmonics-to-Noise Ratio)
    hnr: {
      excellent: 20,   // dB - Voix très claire
      good: 15,        // dB - Voix claire
      fair: 10,        // dB - Acceptable
      poor: 7,         // dB - Voix soufflée/rauque
    },
    
    // Score global
    weights: {
      pitch: 0.40,     // 40% justesse
      timing: 0.30,    // 30% timing/rythme
      quality: 0.30,   // 30% qualité vocale (SPR+HNR)
    },
  },

  // ========================================
  // PEDAGOGIE
  // ========================================
  pedagogy: {
    // Niveaux utilisateur
    levels: {
      debutant: {
        id: 'debutant',
        label: 'Débutant',
        description: 'Je n\'ai JAMAIS chanté/joué',
        feedbackPositiveRatio: 0.70, // 70% positif, 30% correctif
        vulgarization: 'systematic',  // Tout expliquer
        analogies: true,
        technicalTerms: 'explained',  // Toujours avec explication
      },
      averti: {
        id: 'averti',
        label: 'Averti',
        description: 'J\'ai déjà pratiqué 6-12 mois',
        feedbackPositiveRatio: 0.50,
        vulgarization: 'selective',
        analogies: false,
        technicalTerms: 'standard',
      },
      expert: {
        id: 'expert',
        label: 'Expert',
        description: 'Musicien expérimenté',
        feedbackPositiveRatio: 0.30,
        vulgarization: 'none',
        analogies: false,
        technicalTerms: 'direct',
      },
    },
    
    // Modes professeur
    modes: {
      actif: {
        id: 'actif',
        label: 'Actif',
        description: 'Feedback détaillé après chaque analyse',
        frequency: 'always',
        verbosity: 'high',
      },
      moyen: {
        id: 'moyen',
        label: 'Moyen',
        description: 'Feedback modéré',
        frequency: 'always',
        verbosity: 'medium',
      },
      passif: {
        id: 'passif',
        label: 'Passif',
        description: 'Feedback seulement si problème',
        frequency: 'onProblem',
        verbosity: 'low',
      },
      absent: {
        id: 'absent',
        label: 'Absent',
        description: 'Données brutes uniquement',
        frequency: 'never',
        verbosity: 'none',
      },
    },
    
    // Progression 12-24 mois
    phases: {
      foundation: {
        id: 'foundation',
        label: 'Fondation',
        duration: '0-3 mois',
        focusAreas: ['breathing', 'posture', 'simple_sounds'],
      },
      basicTechnique: {
        id: 'basic_technique',
        label: 'Technique de base',
        duration: '3-6 mois',
        focusAreas: ['onset', 'scales', 'resonance'],
      },
      coordination: {
        id: 'coordination',
        label: 'Coordination',
        duration: '6-12 mois',
        focusAreas: ['register_blend', 'articulation', 'repertoire'],
      },
      integration: {
        id: 'integration',
        label: 'Intégration',
        duration: '12-24 mois',
        focusAreas: ['full_range', 'dynamics', 'performance'],
      },
    },
  },

  // ========================================
  // INTERFACE UTILISATEUR
  // ========================================
  ui: {
    // Thèmes
    defaultTheme: 'auto', // 'light' | 'dark' | 'auto'
    
    // Visualisations
    visualizations: {
      frequencyBars: {
        count: 24,           // Nombre de barres
        smoothing: 0.8,      // 0-1, lissage temporel
        minDecibels: -90,    // dB - Seuil minimum
        maxDecibels: -10,    // dB - Seuil maximum
        refreshRate: 60,     // FPS
      },
      
      pitchCurve: {
        windowSize: 10,      // secondes affichées
        refreshRate: 60,     // FPS
        lineWidth: 2,        // px
        colors: {
          excellent: '#10b981', // Vert - ±10 cents
          good: '#fbbf24',      // Jaune - ±25 cents
          poor: '#ef4444',      // Rouge - >25 cents
          target: '#9ca3af',    // Gris - Ligne cible
        },
      },
      
      spectrogram: {
        enabled: false,      // Désactivé par défaut (avancé)
        colorMap: 'hot',     // 'hot' | 'viridis' | 'plasma'
      },
    },
    
    // Notifications
    notifications: {
      duration: 3000,        // ms - Durée d'affichage
      position: 'top-right', // Position des toasts
    },
    
    // Animation
    transitions: {
      fast: 150,   // ms
      normal: 300, // ms
      slow: 500,   // ms
    },
  },

  // ========================================
  // STORAGE
  // ========================================
  storage: {
    // Seuils pour choix localStorage vs IndexedDB
    smallFileThreshold: 5 * 1024 * 1024, // 5 MB
    
    // Limites
    maxStorageSize: 500 * 1024 * 1024,   // 500 MB
    maxRecordings: 100,                   // Nombre max d'enregistrements
    
    // Rétention
    retentionDays: 90,                    // Jours avant suppression auto
    
    // Clés localStorage
    keys: {
      userLevel: 'vocal_coach_user_level',
      professorMode: 'vocal_coach_professor_mode',
      theme: 'vocal_coach_theme',
      settings: 'vocal_coach_settings',
      lastRecordings: 'vocal_coach_last_recordings',
    },
    
    // IndexedDB
    dbName: 'VocalCoachDB',
    dbVersion: 1,
    stores: {
      recordings: 'recordings',
      references: 'references',
      history: 'history',
    },
  },

  // ========================================
  // INSTRUMENTS
  // ========================================
  instruments: {
    chant: {
      id: 'chant',
      label: 'Chant',
      icon: '🎤',
      page: 'entrainement-chant.html',
      metrics: ['pitch', 'vibrato', 'spr', 'hnr', 'formants'],
    },
    guitare: {
      id: 'guitare',
      label: 'Guitare',
      icon: '🎸',
      page: 'entrainement-guitare.html',
      metrics: ['pitch', 'timing', 'chords'],
      tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], // Standard
    },
    ukulele: {
      id: 'ukulele',
      label: 'Ukulélé',
      icon: '🎸',
      page: 'entrainement-ukulele.html',
      metrics: ['pitch', 'timing', 'chords'],
      tuning: ['G4', 'C4', 'E4', 'A4'], // Standard
    },
    piano: {
      id: 'piano',
      label: 'Piano',
      icon: '🎹',
      page: 'entrainement-piano.html',
      metrics: ['pitch', 'timing', 'chords'],
      range: { min: 'A0', max: 'C8' }, // 88 touches
    },
  },

  // ========================================
  // COMPATIBILITE NAVIGATEURS
  // ========================================
  compatibility: {
    // Features requises
    required: [
      'AudioContext',
      'getUserMedia',
      'MediaRecorder',
      'AnalyserNode',
      'localStorage',
      'IndexedDB',
    ],
    
    // Navigateurs supportés
    browsers: {
      chrome: { min: 90, priority: 1 },
      firefox: { min: 88, priority: 2 },
      safari: { min: 14, priority: 3, limitations: ['14kHz_max', 'mp4_only'] },
      edge: { min: 90, priority: 1 },
    },
    
    // Fallbacks
    fallbacks: {
      noMediaRecorder: 'audio-recorder-polyfill',
      noGetUserMedia: 'show_error_modal',
    },
  },

  // ========================================
  // ERREURS ET DEBUGGING
  // ========================================
  logging: {
    // Niveaux de log
    levels: {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4,
    },
    
    // Niveau actif (basé sur environment)
    activeLevel: 'info', // 'debug' en development, 'info' en production
    
    // Console styling
    colors: {
      debug: '#9ca3af',   // Gris
      info: '#3b82f6',    // Bleu
      warn: '#f59e0b',    // Orange
      error: '#ef4444',   // Rouge
      critical: '#dc2626', // Rouge foncé
    },
    
    // Persister les erreurs
    persistErrors: true,
    maxPersistedErrors: 50,
  },

  // ========================================
  // MESSAGES D'ERREUR UTILISATEUR
  // ========================================
  errorMessages: {
    fr: {
      mic_permission_denied: 'Permission microphone refusée. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.',
      mic_not_found: 'Aucun microphone détecté. Vérifiez que votre micro est bien branché.',
      audio_context_failed: 'Impossible d\'initialiser le système audio. Essayez de recharger la page.',
      browser_not_supported: 'Votre navigateur n\'est pas compatible. Veuillez utiliser Chrome, Firefox ou Safari récent.',
      no_sound_detected: 'Aucun son détecté dans l\'enregistrement. Vérifiez votre microphone.',
      recording_too_short: 'Enregistrement trop court (moins de 2 secondes). Essayez à nouveau.',
      file_too_large: 'Fichier trop volumineux (max 50 MB).',
      format_not_supported: 'Format de fichier non supporté. Utilisez MP3, WAV ou M4A.',
      storage_full: 'Espace de stockage plein. Supprimez d\'anciens enregistrements.',
    },
  },

  // ========================================
  // URLS ET RESSOURCES EXTERNES
  // ========================================
  resources: {
    // CDN pour bibliothèques
    cdn: {
      pitchy: 'https://cdn.jsdelivr.net/npm/pitchy@4.1.0/dist/pitchy.min.js',
      wavesurfer: 'https://unpkg.com/wavesurfer.js@7',
      meyda: 'https://unpkg.com/meyda@5.4.0/dist/web/meyda.min.js',
      ml5: 'https://unpkg.com/ml5@1.2.2/dist/ml5.min.js',
      recorderPolyfill: 'https://cdn.jsdelivr.net/npm/audio-recorder-polyfill@0.4.1/index.js',
    },
    
    // Documentation
    docs: {
      glossary: 'glossaire.html',
      manual: 'manuel.html',
      history: 'historique.html',
    },
  },
};

// ========================================
// FONCTIONS UTILITAIRES DE CONFIG
// ========================================

/**
 * Récupère une valeur de config par chemin
 * @param {string} path - Chemin avec notation pointée (ex: 'audio.sampleRate')
 * @param {*} defaultValue - Valeur par défaut si non trouvé
 * @returns {*} Valeur de config
 */
export function getConfig(path, defaultValue = null) {
  try {
    const keys = path.split('.');
    let value = CONFIG;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  } catch (error) {
    console.error('[Config] Error getting config:', path, error);
    return defaultValue;
  }
}

/**
 * Vérifie si on est en mode debug
 * @returns {boolean}
 */
export function isDebugMode() {
  return CONFIG.app.debug === true || CONFIG.app.environment === 'development';
}

/**
 * Récupère le niveau de log actif
 * @returns {string}
 */
export function getActiveLogLevel() {
  if (isDebugMode()) {
    return 'debug';
  }
  return CONFIG.logging.activeLevel;
}

/**
 * Récupère les paramètres audio pour un navigateur spécifique
 * @param {string} browserName - Nom du navigateur
 * @returns {object}
 */
export function getAudioSettingsForBrowser(browserName) {
  const settings = {
    sampleRate: CONFIG.audio.sampleRate,
    latencyHint: CONFIG.audio.latencyHint,
    bufferSize: CONFIG.audio.bufferSize,
  };
  
  // Ajustements spécifiques Safari/iOS
  if (browserName === 'safari' || browserName === 'ios') {
    settings.format = CONFIG.audio.formats.safari;
    settings.bufferSize = Math.max(512, CONFIG.audio.bufferSize); // Minimum 512 pour Safari
  } else if (browserName === 'chrome' || browserName === 'edge') {
    settings.format = CONFIG.audio.formats.chrome;
  } else if (browserName === 'firefox') {
    settings.format = CONFIG.audio.formats.firefox;
  } else {
    settings.format = CONFIG.audio.formats.fallback;
  }
  
  return settings;
}

// Export par défaut
export default CONFIG;