/**
 * AudioEngine.js
 * Moteur audio central (Singleton)
 * 
 * Responsabilités:
 * - Gérer l'AudioContext unique
 * - Initialisation et état
 * - Accès global au contexte audio
 * 
 * Fichier 5/18 - CORE AUDIO
 * Dépend de: Logger.js
 */

import { Logger } from '../../logging/Logger.js';

export class AudioEngine {
  static #instance = null;
  #audioContext = null;
  #isInitialized = false;

  /**
   * Constructeur privé (singleton)
   */
  constructor() {
    if (AudioEngine.#instance) {
      throw new Error('AudioEngine est un singleton. Utilisez getInstance()');
    }
    Logger.info('AudioEngine', 'Instance créée');
  }

  /**
   * Obtenir l'instance unique
   */
  static getInstance() {
    if (!AudioEngine.#instance) {
      AudioEngine.#instance = new AudioEngine();
    }
    return AudioEngine.#instance;
  }

  /**
   * Initialiser l'AudioContext
   */
  async init() {
    try {
      if (this.#isInitialized) {
        Logger.warn('AudioEngine', 'Déjà initialisé');
        return this.#audioContext;
      }

      Logger.info('AudioEngine', 'Initialisation AudioContext...');

      // Créer AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new Error('AudioContext non supporté');
      }

      this.#audioContext = new AudioContextClass({
        latencyHint: 'interactive',
        sampleRate: 44100
      });

      // Reprendre si suspendu (politique navigateur)
      if (this.#audioContext.state === 'suspended') {
        await this.#audioContext.resume();
      }

      this.#isInitialized = true;

      Logger.info('AudioEngine', 'AudioContext initialisé', {
        sampleRate: this.#audioContext.sampleRate,
        state: this.#audioContext.state
      });

      return this.#audioContext;

    } catch (err) {
      Logger.error('AudioEngine', 'Erreur init', err);
      throw err;
    }
  }

  /**
   * Obtenir l'AudioContext
   */
  getContext() {
    if (!this.#audioContext) {
      Logger.warn('AudioEngine', 'AudioContext non initialisé');
      return null;
    }
    return this.#audioContext;
  }

  /**
   * Vérifier si initialisé
   */
  isInitialized() {
    return this.#isInitialized;
  }

  /**
   * Obtenir l'état de l'AudioContext
   */
  getState() {
    return this.#audioContext ? this.#audioContext.state : 'closed';
  }

  /**
   * Reprendre l'AudioContext
   */
  async resume() {
    try {
      if (!this.#audioContext) {
        throw new Error('AudioContext non initialisé');
      }

      if (this.#audioContext.state === 'suspended') {
        await this.#audioContext.resume();
        Logger.info('AudioEngine', 'AudioContext repris');
      }

    } catch (err) {
      Logger.error('AudioEngine', 'Erreur resume', err);
      throw err;
    }
  }

  /**
   * Suspendre l'AudioContext
   */
  async suspend() {
    try {
      if (!this.#audioContext) return;

      if (this.#audioContext.state === 'running') {
        await this.#audioContext.suspend();
        Logger.info('AudioEngine', 'AudioContext suspendu');
      }

    } catch (err) {
      Logger.error('AudioEngine', 'Erreur suspend', err);
    }
  }

  /**
   * Fermer l'AudioContext
   */
  async close() {
    try {
      if (!this.#audioContext) return;

      await this.#audioContext.close();
      this.#audioContext = null;
      this.#isInitialized = false;

      Logger.info('AudioEngine', 'AudioContext fermé');

    } catch (err) {
      Logger.error('AudioEngine', 'Erreur close', err);
    }
  }
}
