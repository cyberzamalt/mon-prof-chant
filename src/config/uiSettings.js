/**
 * uiSettings.js
 * Configuration de l'interface utilisateur
 * 
 * Responsabilités:
 * - Textes et labels de l'interface
 * - Messages utilisateur
 * - Configuration des composants UI
 * - Thème et styles dynamiques
 */

/**
 * Messages de notification
 */
export const MESSAGES = {
  // Succès
  SUCCESS: {
    MIC_STARTED: 'Microphone démarré avec succès',
    RECORDING_STARTED: 'Enregistrement démarré',
    RECORDING_STOPPED: 'Enregistrement arrêté',
    RECORDING_SAVED: 'Enregistrement sauvegardé',
    EXPORT_SUCCESS: 'Export réussi',
    SETTINGS_SAVED: 'Paramètres sauvegardés'
  },

  // Erreurs
  ERROR: {
    MIC_ACCESS_DENIED: 'Accès au microphone refusé. Vérifiez les permissions.',
    MIC_NOT_FOUND: 'Aucun microphone détecté',
    AUDIO_CONTEXT_FAILED: 'Impossible d\'initialiser le contexte audio',
    RECORDING_FAILED: 'Échec de l\'enregistrement',
    EXPORT_FAILED: 'Échec de l\'export',
    INVALID_FILE: 'Fichier invalide',
    BROWSER_NOT_SUPPORTED: 'Navigateur non supporté'
  },

  // Avertissements
  WARNING: {
    PITCH_UNSTABLE: 'Détection instable. Chantez plus fort.',
    LOW_CLARITY: 'Signal faible. Rapprochez-vous du micro.',
    HIGH_LATENCY: 'Latence élevée détectée',
    MEMORY_WARNING: 'Mémoire faible. Enregistrement court recommandé.'
  },

  // Info
  INFO: {
    INITIALIZING: 'Initialisation...',
    LOADING: 'Chargement...',
    PROCESSING: 'Traitement en cours...',
    READY: 'Prêt',
    CLICK_TO_START: 'Cliquez pour commencer'
  }
};

/**
 * Labels des contrôles
 */
export const LABELS = {
  // Boutons
  BUTTONS: {
    START: 'Démarrer',
    STOP: 'Arrêter',
    PAUSE: 'Pause',
    RESUME: 'Reprendre',
    RECORD: 'Enregistrer',
    PLAY: 'Lire',
    CLEAR: 'Effacer',
    EXPORT: 'Exporter',
    SAVE: 'Sauvegarder',
    CANCEL: 'Annuler',
    CLOSE: 'Fermer'
  },

  // Modes
  MODES: {
    ABSOLUTE: 'Absolu',
    A440: 'La 440 (centré)',
    AUTO: 'Auto-tune'
  },

  // Formats d'export
  FORMATS: {
    WEBM: 'WebM (natif)',
    WAV: 'WAV (sans perte)',
    MP3: 'MP3 (compressé)'
  },

  // Panneaux
  PANELS: {
    RECORDING: 'Enregistrement Live',
    REFERENCE: 'Audio de Référence',
    COMPARISON: 'Comparaison',
    SETTINGS: 'Paramètres'
  }
};

/**
 * Configuration des panneaux
 */
export const PANEL_CONFIG = {
  RECORDING: {
    title: 'Panneau Enregistrement',
    description: 'Analyse en temps réel de votre voix',
    color: '#00ff00',
    icon: '🎤'
  },

  REFERENCE: {
    title: 'Panneau Référence',
    description: 'Chargez un fichier audio de référence',
    color: '#00aaff',
    icon: '🎵'
  },

  COMPARISON: {
    title: 'Comparaison',
    description: 'Comparez votre performance avec la référence',
    color: '#ffaa00',
    icon: '📊'
  }
};

/**
 * Configuration des visualisations
 */
export const VISUALIZATION_CONFIG = {
  // Courbe sinusoïdale
  SINUSOIDAL: {
    lineWidth: 3,
    shadowBlur: 10,
    maxPoints: 300,
    tension: 0.5,
    showGrid: true,
    showAxes: true,
    showStats: true
  },

  // Spectrogramme
  SPECTROGRAM: {
    colorScheme: 'hot',
    fftSize: 2048,
    smoothing: 0.8,
    minDecibels: -90,
    maxDecibels: -10
  },

  // Histogramme de notes
  NOTE_HISTOGRAM: {
    barWidth: 20,
    barSpacing: 5,
    showLabels: true,
    colors: {
      perfect: '#00ff00',
      good: '#88ff00',
      fair: '#ffaa00',
      poor: '#ff0000'
    }
  }
};

/**
 * Configuration des notifications
 */
export const NOTIFICATION_CONFIG = {
  DURATION: {
    SUCCESS: 3000,  // 3 secondes
    ERROR: 5000,    // 5 secondes
    WARNING: 4000,  // 4 secondes
    INFO: 2000      // 2 secondes
  },

  POSITION: 'top-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'

  ANIMATION: {
    enter: 'slideIn',
    exit: 'slideOut',
    duration: 300
  }
};

/**
 * Configuration du thème
 */
export const THEME = {
  COLORS: {
    PRIMARY: '#00ff00',
    SECONDARY: '#00aaff',
    SUCCESS: '#00ff00',
    WARNING: '#ffaa00',
    ERROR: '#ff0000',
    INFO: '#00aaff',
    BACKGROUND: '#000000',
    SURFACE: '#1a1a1a',
    TEXT_PRIMARY: '#ffffff',
    TEXT_SECONDARY: '#aaaaaa',
    BORDER: '#333333'
  },

  FONTS: {
    PRIMARY: 'Arial, sans-serif',
    MONOSPACE: 'Courier New, monospace'
  },

  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32
  },

  BORDER_RADIUS: {
    SM: 4,
    MD: 8,
    LG: 12
  }
};

/**
 * Configuration de l'accessibilité
 */
export const ACCESSIBILITY = {
  ARIA_LABELS: {
    START_RECORDING: 'Démarrer l\'enregistrement',
    STOP_RECORDING: 'Arrêter l\'enregistrement',
    PLAY_AUDIO: 'Lire l\'audio',
    PAUSE_AUDIO: 'Mettre en pause',
    EXPORT_AUDIO: 'Exporter l\'enregistrement',
    MODE_SELECT: 'Sélectionner le mode d\'affichage'
  },

  KEYBOARD_SHORTCUTS: {
    START_STOP: 'Space',
    PLAY_PAUSE: 'Enter',
    CLEAR: 'Delete',
    EXPORT: 'Ctrl+E',
    HELP: 'F1'
  }
};

/**
 * Textes d'aide
 */
export const HELP_TEXTS = {
  RECORDING_PANEL: 'Cliquez sur "Démarrer" pour analyser votre voix en temps réel. La courbe verte montre la hauteur de vos notes.',
  
  REFERENCE_PANEL: 'Chargez un fichier audio de référence pour le comparer à votre enregistrement.',
  
  MODE_ABSOLUTE: 'Mode Absolu : Affiche toutes les fréquences sur une échelle linéaire.',
  
  MODE_A440: 'Mode La 440 : Centre l\'affichage autour de la note La (440 Hz). Idéal pour le chant.',
  
  MODE_AUTO: 'Mode Auto : Ajuste automatiquement l\'échelle selon votre tessiture vocale.',
  
  CENTS_EXPLANATION: 'Les cents indiquent votre justesse. 0 cent = note parfaite. ±10 cents = acceptable. ±50 cents = faux.',
  
  CLARITY_EXPLANATION: 'La clarté indique la qualité de détection. Plus elle est haute, plus la mesure est fiable.'
};

/**
 * Emojis et icônes
 */
export const ICONS = {
  MICROPHONE: '🎤',
  MUSIC: '🎵',
  NOTES: '🎶',
  RECORD: '⏺️',
  STOP: '⏹️',
  PLAY: '▶️',
  PAUSE: '⏸️',
  SAVE: '💾',
  EXPORT: '📤',
  SETTINGS: '⚙️',
  HELP: '❓',
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️'
};

/**
 * Configuration des animations
 */
export const ANIMATIONS = {
  FADE_IN: {
    duration: 300,
    easing: 'ease-in'
  },
  
  FADE_OUT: {
    duration: 200,
    easing: 'ease-out'
  },
  
  SLIDE_IN: {
    duration: 400,
    easing: 'ease-out'
  },
  
  PULSE: {
    duration: 1000,
    iterations: 'infinite'
  }
};

/**
 * Format de date/heure
 */
export const DATE_FORMAT = {
  FULL: 'DD/MM/YYYY HH:mm:ss',
  DATE_ONLY: 'DD/MM/YYYY',
  TIME_ONLY: 'HH:mm:ss',
  FILENAME: 'YYYYMMDD_HHmmss'
};

/**
 * Configuration des tooltips
 */
export const TOOLTIP_CONFIG = {
  delay: 500,        // ms avant affichage
  duration: 3000,    // ms d'affichage
  position: 'top',   // 'top', 'bottom', 'left', 'right'
  arrow: true
};

/**
 * Obtenir un message par clé
 * @param {string} category - Catégorie (SUCCESS, ERROR, etc.)
 * @param {string} key - Clé du message
 * @returns {string} Message
 */
export function getMessage(category, key) {
  try {
    const message = MESSAGES[category]?.[key];
    if (!message) {
      console.warn(`[uiSettings] Message introuvable: ${category}.${key}`);
      return `Message manquant: ${category}.${key}`;
    }
    return message;
  } catch (err) {
    console.error('[uiSettings] Erreur getMessage:', err);
    return 'Erreur';
  }
}

/**
 * Obtenir un label par clé
 * @param {string} category - Catégorie (BUTTONS, MODES, etc.)
 * @param {string} key - Clé du label
 * @returns {string} Label
 */
export function getLabel(category, key) {
  try {
    const label = LABELS[category]?.[key];
    if (!label) {
      console.warn(`[uiSettings] Label introuvable: ${category}.${key}`);
      return key;
    }
    return label;
  } catch (err) {
    console.error('[uiSettings] Erreur getLabel:', err);
    return key;
  }
}

/**
 * Obtenir une couleur du thème
 * @param {string} colorName - Nom de la couleur
 * @returns {string} Code couleur hexadécimal
 */
export function getColor(colorName) {
  try {
    const color = THEME.COLORS[colorName];
    if (!color) {
      console.warn(`[uiSettings] Couleur introuvable: ${colorName}`);
      return '#ffffff';
    }
    return color;
  } catch (err) {
    console.error('[uiSettings] Erreur getColor:', err);
    return '#ffffff';
  }
}
