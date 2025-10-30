/**
 * selectors.js - Sélecteurs DOM Centralisés
 * 
 * Tous les sélecteurs d'éléments DOM de l'application
 * Évite les magic strings dispersés dans le code
 * 
 * Fichier 3/18 - FONDATIONS
 * Pas de dépendances
 */

/**
 * CONTENEURS PRINCIPAUX
 */
export const CONTAINERS = {
  // Panneau d'enregistrement
  PANEL_RECORDING: '#panel-recording',
  
  // Panneau de référence
  PANEL_REFERENCE: '#panel-reference',
  
  // Zone de visualisation
  VISUALIZATION_AREA: '#visualization-area',
  
  // Zone de résultats
  RESULTS_AREA: '#results-area',
  
  // Zone de contrôles
  CONTROLS_AREA: '#controls-area'
};

/**
 * BOUTONS - ENREGISTREMENT
 */
export const BUTTONS_RECORDING = {
  // Contrôles enregistrement
  RECORD: '#btn-record',
  PAUSE: '#btn-pause',
  RESUME: '#btn-resume',
  STOP: '#btn-stop',
  SAVE: '#btn-save',
  CLEAR: '#btn-clear',
  
  // Modes de visualisation
  MODE_ABSOLU: '#btn-mode-abs',
  MODE_A440: '#btn-mode-440',
  MODE_AUTO: '#btn-mode-auto',
  
  // Exports
  EXPORT_WEBM: '#btn-down-webm',
  EXPORT_WAV: '#btn-down-wav',
  EXPORT_MP3: '#btn-down-mp3',
  EXPORT_PNG: '#btn-export-png-rec',
  
  // Upload
  UPLOAD_FILE: '#file-upload-rec'
};

/**
 * BOUTONS - RÉFÉRENCE
 */
export const BUTTONS_REFERENCE = {
  // Contrôles lecture
  PLAY: '#btn-ref-play',
  PAUSE: '#btn-ref-pause',
  STOP: '#btn-ref-stop',
  
  // Analyse
  ANALYZE: '#btn-ref-analyze',
  CLEAR: '#btn-ref-clear',
  
  // Modes de visualisation
  MODE_ABSOLU: '#btn-ref-mode-abs',
  MODE_A440: '#btn-ref-mode-440',
  MODE_AUTO: '#btn-ref-mode-auto',
  
  // Upload
  UPLOAD_FILE: '#file-upload-ref',
  LOAD_YOUTUBE: '#btn-load-youtube'
};

/**
 * CANVAS - Éléments de visualisation
 */
export const CANVAS = {
  // Canvas enregistrement
  RECORDING: '#canvas-rec',
  
  // Canvas référence
  REFERENCE: '#canvas-ref',
  
  // Canvas comparaison (si existe)
  COMPARISON: '#canvas-comparison'
};

/**
 * AFFICHAGE - Statuts et compteurs
 */
export const DISPLAYS = {
  // Enregistrement
  TIMER_REC: '#timer-rec',
  COUNTER_REC: '#counter-rec',
  DURATION_REC: '#duration-rec',
  
  // Référence
  TIMER_REF: '#timer-ref',
  COUNTER_REF: '#counter-ref',
  DURATION_REF: '#duration-ref',
  
  // Statut général
  STATUS: '#status',
  MESSAGE: '#message',
  
  // FPS (debug)
  FPS_COUNTER: '#fps-counter'
};

/**
 * INPUTS - Contrôles utilisateur
 */
export const INPUTS = {
  // Volume
  VOLUME_RECORDING: '#volume-rec',
  VOLUME_REFERENCE: '#volume-ref',
  VOLUME_MASTER: '#volume-master',
  
  // URL YouTube
  YOUTUBE_URL: '#youtube-url',
  
  // Paramètres
  PITCH_MIN: '#pitch-min',
  PITCH_MAX: '#pitch-max',
  SMOOTHING_FACTOR: '#smoothing-factor',
  
  // Sélecteur de mode professeur
  TEACHER_MODE: '#teacher-mode',
  
  // Niveau élève
  STUDENT_LEVEL: '#student-level'
};

/**
 * RÉSULTATS - Affichage d'analyse
 */
export const RESULTS = {
  // Conteneur principal
  CONTAINER: '#results-container',
  
  // Métriques
  PITCH_ACCURACY: '#pitch-accuracy',
  PITCH_DEVIATION_AVG: '#pitch-deviation-avg',
  PITCH_DEVIATION_MAX: '#pitch-deviation-max',
  NOTES_IN_TUNE_PERCENT: '#notes-in-tune-percent',
  
  // Qualité vocale
  SPR_VALUE: '#spr-value',
  HNR_VALUE: '#hnr-value',
  
  // Vibrato
  VIBRATO_RATE: '#vibrato-rate',
  VIBRATO_EXTENT: '#vibrato-extent',
  
  // Score
  SCORE_GLOBAL: '#score-global',
  SCORE_PITCH: '#score-pitch',
  SCORE_TIMING: '#score-timing',
  SCORE_QUALITY: '#score-quality',
  
  // Feedback professeur
  FEEDBACK_TEXT: '#feedback-text',
  RECOMMENDATIONS: '#recommendations'
};

/**
 * MODALS - Fenêtres modales
 */
export const MODALS = {
  // Modal générique
  MODAL: '#modal',
  MODAL_TITLE: '#modal-title',
  MODAL_CONTENT: '#modal-content',
  MODAL_CLOSE: '#modal-close',
  
  // Modal d'erreur
  ERROR_MODAL: '#error-modal',
  ERROR_MESSAGE: '#error-message',
  
  // Modal de paramètres
  SETTINGS_MODAL: '#settings-modal',
  
  // Modal glossaire
  GLOSSARY_MODAL: '#glossary-modal',
  GLOSSARY_SEARCH: '#glossary-search',
  GLOSSARY_CONTENT: '#glossary-content'
};

/**
 * NOTIFICATIONS
 */
export const NOTIFICATIONS = {
  // Conteneur des notifications
  CONTAINER: '#notifications',
  
  // Templates
  SUCCESS: '.notification-success',
  ERROR: '.notification-error',
  WARNING: '.notification-warning',
  INFO: '.notification-info'
};

/**
 * NAVIGATION
 */
export const NAVIGATION = {
  // Menu principal
  NAV_MENU: '#nav-menu',
  NAV_TOGGLE: '#nav-toggle',
  
  // Liens navigation
  NAV_HOME: '#nav-home',
  NAV_TRAINING: '#nav-training',
  NAV_HISTORY: '#nav-history',
  NAV_GLOSSARY: '#nav-glossary',
  NAV_SETTINGS: '#nav-settings',
  NAV_HELP: '#nav-help'
};

/**
 * HISTORIQUE
 */
export const HISTORY = {
  // Liste des enregistrements
  LIST: '#history-list',
  ITEM_TEMPLATE: '.history-item-template',
  
  // Filtres
  FILTER_DATE: '#filter-date',
  FILTER_TYPE: '#filter-type',
  FILTER_SEARCH: '#filter-search',
  
  // Actions
  EXPORT_HISTORY: '#export-history',
  CLEAR_HISTORY: '#clear-history'
};

/**
 * GLOSSAIRE
 */
export const GLOSSARY = {
  // Recherche
  SEARCH: '#glossary-search',
  
  // Liste des termes
  LIST: '#glossary-list',
  TERM_TEMPLATE: '.glossary-term-template',
  
  // Détail d'un terme
  DETAIL: '#glossary-detail',
  TERM_NAME: '#term-name',
  TERM_DEFINITION: '#term-definition',
  TERM_EXAMPLE: '#term-example',
  
  // Navigation alphabétique
  ALPHA_NAV: '#glossary-alpha-nav'
};

/**
 * CHARGEMENT
 */
export const LOADING = {
  // Overlay de chargement
  OVERLAY: '#loading-overlay',
  SPINNER: '#loading-spinner',
  MESSAGE: '#loading-message',
  
  // Barre de progression
  PROGRESS_BAR: '#progress-bar',
  PROGRESS_PERCENT: '#progress-percent'
};

/**
 * CLASSES CSS (Utilitaires)
 */
export const CLASSES = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  HIDDEN: 'hidden',
  VISIBLE: 'visible',
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading',
  RECORDING: 'recording',
  PLAYING: 'playing',
  PAUSED: 'paused'
};

/**
 * DATA ATTRIBUTES (pour stocker des données dans le DOM)
 */
export const DATA_ATTRS = {
  RECORDING_ID: 'data-recording-id',
  TIMESTAMP: 'data-timestamp',
  DURATION: 'data-duration',
  MODE: 'data-mode',
  STATE: 'data-state',
  TYPE: 'data-type'
};

/**
 * Fonction helper pour obtenir un élément DOM
 * @param {string} selector - Sélecteur CSS
 * @returns {HTMLElement|null} Élément trouvé ou null
 */
export function getElement(selector) {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`Élément non trouvé: ${selector}`);
    }
    return element;
  } catch (error) {
    console.error(`Erreur sélecteur: ${selector}`, error);
    return null;
  }
}

/**
 * Fonction helper pour obtenir plusieurs éléments DOM
 * @param {string} selector - Sélecteur CSS
 * @returns {NodeList} Liste d'éléments
 */
export function getElements(selector) {
  try {
    return document.querySelectorAll(selector);
  } catch (error) {
    console.error(`Erreur sélecteur: ${selector}`, error);
    return [];
  }
}

/**
 * Fonction helper pour vérifier si un élément existe
 * @param {string} selector - Sélecteur CSS
 * @returns {boolean} true si existe
 */
export function elementExists(selector) {
  return document.querySelector(selector) !== null;
}

// Export global de tous les sélecteurs
export default {
  CONTAINERS,
  BUTTONS_RECORDING,
  BUTTONS_REFERENCE,
  CANVAS,
  DISPLAYS,
  INPUTS,
  RESULTS,
  MODALS,
  NOTIFICATIONS,
  NAVIGATION,
  HISTORY,
  GLOSSARY,
  LOADING,
  CLASSES,
  DATA_ATTRS,
  getElement,
  getElements,
  elementExists
};
