/**
 * constants.js - Configuration Centralisée
 * 
 * Toutes les constantes de l'application
 * Valeurs optimisées et validées du monolithe
 * 
 * Fichier 2/18 - FONDATIONS
 * Pas de dépendances
 */

/**
 * DÉTECTION PITCH - Paramètres YIN
 */
export const PITCH_DETECTION = {
  // Taille du buffer de détection (2048 = optimal)
  DETECT_SIZE: 2048,
  
  // Plage de fréquences détectables
  MIN_HZ: 60,      // Sol grave (G2)
  MAX_HZ: 1200,    // Ré aigu (D6)
  
  // Seuil YIN pour considérer une détection valide
  YIN_THRESHOLD: 0.05,
  
  // Nombre minimum de détections consécutives
  MIN_CONSECUTIVE_DETECTIONS: 2,
  
  // Fréquence de référence A440
  A440_HZ: 440,
  
  // Taux d'échantillonnage
  SAMPLE_RATE: 44100
};

/**
 * LISSAGE - Paramètres de smoothing
 */
export const SMOOTHING = {
  // Facteur de lissage EMA (0.76 = optimal)
  FACTOR: 0.76,
  
  // Taille de la fenêtre médiane
  MEDIAN_WINDOW_SIZE: 5,
  
  // Seuil de changement brusque (en cents)
  JUMP_THRESHOLD_CENTS: 150,
  
  // Nombre d'étapes de lissage
  STAGES: 3,
  
  // Activation du lissage multi-stage
  MULTI_STAGE_ENABLED: true
};

/**
 * VISUALISATION - Paramètres canvas
 */
export const VISUALIZATION = {
  // Dimensions canvas
  CANVAS_WIDTH: 900,
  CANVAS_HEIGHT: 360,
  
  // FPS cible
  TARGET_FPS: 60,
  
  // Plage verticale en cents (mode Absolu)
  Y_RANGE_CENTS: 200,
  
  // Plage verticale en cents (mode A440)
  A440_RANGE_CENTS: 3000,
  
  // Plage verticale en cents (mode Auto)
  AUTO_RANGE_CENTS: 1200,
  
  // Couleurs
  COLORS: {
    BACKGROUND: '#1a1a1a',
    GRID: '#333333',
    AXIS: '#666666',
    TEXT: '#ffffff',
    CURVE_GREEN: '#00ff00',   // Juste (-10 à +10 cents)
    CURVE_YELLOW: '#ffff00',  // Proche (-25 à +25 cents)
    CURVE_RED: '#ff0000',     // Décalé (>25 cents)
    TARGET_LINE: '#888888'
  },
  
  // Épaisseur des lignes
  LINE_WIDTH: {
    GRID: 1,
    AXIS: 2,
    CURVE: 3,
    TARGET: 1
  },
  
  // Mode par défaut
  DEFAULT_MODE: 'a440', // 'absolu', 'a440', ou 'auto'
  
  // Interpolation
  INTERPOLATION_TYPE: 'catmull-rom', // 'catmull-rom' ou 'linear'
  INTERPOLATION_SMOOTHNESS: 0.5
};

/**
 * AUDIO - Paramètres Web Audio API
 */
export const AUDIO = {
  // Configuration AudioContext
  LATENCY_HINT: 'interactive',
  
  // Taille du buffer pour analyse
  BUFFER_SIZE: 2048,
  
  // Nombre de canaux
  CHANNELS: 1, // Mono
  
  // Contraintes micro
  CONSTRAINTS: {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: 44100
    },
    video: false
  },
  
  // Volume par défaut
  DEFAULT_VOLUME: 0.8,
  
  // Gain micro par défaut
  DEFAULT_MIC_GAIN: 1.0
};

/**
 * ENREGISTREMENT - Paramètres MediaRecorder
 */
export const RECORDING = {
  // Format audio préféré
  MIME_TYPE: 'audio/webm;codecs=opus',
  
  // Fallbacks si webm non supporté
  MIME_TYPE_FALLBACKS: [
    'audio/webm',
    'audio/ogg',
    'audio/mp4'
  ],
  
  // Bitrate audio
  AUDIO_BITRATE: 128000, // 128 kbps
  
  // Durée max d'enregistrement (en secondes)
  MAX_DURATION: 600, // 10 minutes
  
  // Intervalle de sauvegarde (en ms)
  TIMESLICE: 1000
};

/**
 * EXPORT - Paramètres d'export audio
 */
export const EXPORT = {
  // Formats supportés
  FORMATS: {
    WEBM: { ext: 'webm', mime: 'audio/webm' },
    WAV: { ext: 'wav', mime: 'audio/wav' },
    MP3: { ext: 'mp3', mime: 'audio/mpeg' }
  },
  
  // Qualité MP3 (bitrate)
  MP3_BITRATE: 128, // kbps
  
  // Qualité WAV (bits par échantillon)
  WAV_BIT_DEPTH: 16,
  
  // Préfixe des fichiers exportés
  FILENAME_PREFIX: 'mon-prof-chant-',
  
  // Format date pour les noms de fichiers
  DATE_FORMAT: 'YYYY-MM-DD_HH-mm-ss'
};

/**
 * UI - Paramètres interface utilisateur
 */
export const UI = {
  // Durée des animations (ms)
  ANIMATION_DURATION: 300,
  
  // Délai avant auto-hide des messages
  MESSAGE_DURATION: 3000,
  
  // Durée affichage tooltip
  TOOLTIP_DELAY: 500,
  
  // Classes CSS
  CLASSES: {
    ACTIVE: 'active',
    DISABLED: 'disabled',
    HIDDEN: 'hidden',
    ERROR: 'error',
    SUCCESS: 'success',
    WARNING: 'warning'
  },
  
  // Boutons
  BUTTONS: {
    RECORD: 'btn-record',
    PAUSE: 'btn-pause',
    STOP: 'btn-stop',
    PLAY: 'btn-play',
    ANALYZE: 'btn-analyze',
    EXPORT: 'btn-export',
    CLEAR: 'btn-clear'
  }
};

/**
 * NOTES MUSICALES - Constantes
 */
export const MUSIC = {
  // Notes par octave
  NOTES_PER_OCTAVE: 12,
  
  // Cents par demi-ton
  CENTS_PER_SEMITONE: 100,
  
  // Noms des notes (notation anglaise)
  NOTE_NAMES: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  
  // Noms des notes (notation française)
  NOTE_NAMES_FR: ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
  
  // Référence MIDI pour A440
  A440_MIDI: 69,
  
  // Octave de référence
  REFERENCE_OCTAVE: 4
};

/**
 * PERFORMANCE - Limites et seuils
 */
export const PERFORMANCE = {
  // Mémoire max pour l'historique (nombre de points)
  MAX_HISTORY_POINTS: 10000,
  
  // Intervalle de nettoyage mémoire (ms)
  CLEANUP_INTERVAL: 30000, // 30 secondes
  
  // Seuil CPU pour réduire qualité
  CPU_THRESHOLD_PERCENT: 80,
  
  // Nombre max de logs en mémoire
  MAX_LOGS: 500,
  
  // Timeout réseau (ms)
  NETWORK_TIMEOUT: 10000
};

/**
 * DEBUG - Options de débogage
 */
export const DEBUG = {
  // Activer logs détaillés
  VERBOSE_LOGGING: false,
  
  // Afficher les FPS
  SHOW_FPS: false,
  
  // Afficher les stats mémoire
  SHOW_MEMORY_STATS: false,
  
  // Afficher la grille de debug
  SHOW_DEBUG_GRID: false,
  
  // Activer les breakpoints audio
  AUDIO_BREAKPOINTS: false
};

/**
 * STOCKAGE - LocalStorage et IndexedDB
 */
export const STORAGE = {
  // Clés LocalStorage
  KEYS: {
    SETTINGS: 'mon-prof-chant-settings',
    HISTORY: 'mon-prof-chant-history',
    PROFILE: 'mon-prof-chant-profile'
  },
  
  // Nom de la base IndexedDB
  DB_NAME: 'mon-prof-chant-db',
  
  // Version de la DB
  DB_VERSION: 1,
  
  // Stores IndexedDB
  STORES: {
    RECORDINGS: 'recordings',
    ANALYSES: 'analyses',
    EXPORTS: 'exports'
  },
  
  // Taille max LocalStorage (approximatif, en octets)
  LOCAL_STORAGE_MAX_SIZE: 5 * 1024 * 1024, // 5 MB
  
  // Taille max IndexedDB (approximatif, en octets)
  INDEXED_DB_MAX_SIZE: 50 * 1024 * 1024 // 50 MB
};

/**
 * ERREURS - Messages d'erreur standards
 */
export const ERRORS = {
  MICROPHONE_ACCESS_DENIED: 'Accès au microphone refusé',
  MICROPHONE_NOT_FOUND: 'Aucun microphone détecté',
  AUDIO_CONTEXT_FAILED: 'Impossible d\'initialiser l\'audio',
  PITCH_DETECTION_FAILED: 'Détection de hauteur impossible',
  RECORDING_FAILED: 'Échec de l\'enregistrement',
  EXPORT_FAILED: 'Échec de l\'export',
  STORAGE_FULL: 'Espace de stockage saturé',
  NETWORK_ERROR: 'Erreur réseau',
  BROWSER_NOT_SUPPORTED: 'Navigateur non supporté'
};

/**
 * VERSION - Informations version
 */
export const VERSION = {
  APP: '2.0.0',
  ARCHITECTURE: 'modulaire',
  BUILD_DATE: '2025-10-29',
  AUTHOR: 'Nicolas Abriou (cyberzamalt)'
};

// Export global de toutes les constantes
export default {
  PITCH_DETECTION,
  SMOOTHING,
  VISUALIZATION,
  AUDIO,
  RECORDING,
  EXPORT,
  UI,
  MUSIC,
  PERFORMANCE,
  DEBUG,
  STORAGE,
  ERRORS,
  VERSION
};
