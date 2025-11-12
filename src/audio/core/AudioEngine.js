// src/audio/core/AudioEngine.js
import { Logger } from '../../logging/Logger.js';

class AudioEngine {
  static #instance;
  #ctx = null;
  #micSource = null;  // AJOUT : référence à la source micro

  static getInstance() {
    if (!this.#instance) this.#instance = new AudioEngine();
    return this.#instance;
  }

  get context() { return this.#ctx; }
  get micSource() { return this.#micSource; }  // AJOUT : getter pour la source micro

  setMicSource(source) {  // AJOUT : setter pour que MicrophoneManager puisse enregistrer la source
    this.#micSource = source;
    Logger.info('[AudioEngine] Source micro enregistrée', source);
  }

  async init(sampleRateHint) {
    if (this.#ctx) { 
      Logger.warn('[AudioEngine] Déjà initialisé'); 
      return this.#ctx; 
    }
    
    const AC = window.AudioContext || window.webkitAudioContext;
    try {
      this.#ctx = sampleRateHint ? new AC({ sampleRate: sampleRateHint }) : new AC();
    } catch (e) {
      Logger.error('[AudioEngine] Erreur création contexte avec sampleRate, fallback sans hint', e);
      this.#ctx = new AC(); // fallback
    }
    
    try { 
      await this.#ctx.resume(); 
      Logger.info('[AudioEngine] Contexte resumed');
    } catch (e) {
      Logger.warn('[AudioEngine] Impossible de resume le contexte', e);
    }
    
    Logger.info('[AudioEngine] Contexte prêt', {
      sampleRate: this.#ctx.sampleRate,
      state: this.#ctx.state
    });
    return this.#ctx;
  }

  async reinit(targetRate) {
    if (this.#ctx?.sampleRate === targetRate) {
      Logger.info('[AudioEngine] Sample rate déjà correct', targetRate);
      return this.#ctx;
    }
    
    try { 
      await this.#ctx?.close(); 
      Logger.info('[AudioEngine] Ancien contexte fermé');
    } catch (e) {
      Logger.warn('[AudioEngine] Erreur fermeture ancien contexte', e);
    }
    
    this.#ctx = null;
    this.#micSource = null;  // Reset aussi la source
    Logger.warn('[AudioEngine] Recréation du contexte @', targetRate);
    return this.init(targetRate);
  }

  createAnalyser(opts = {}) {
    if (!this.#ctx) {
      const err = new Error('AudioEngine non initialisé - appelez init() d\'abord');
      Logger.error('[AudioEngine]', err);
      throw err;
    }
    
    const analyser = new AnalyserNode(this.#ctx, {
      fftSize: 2048,
      smoothingTimeConstant: 0.85,
      ...opts
    });
    
    Logger.info('[AudioEngine] Analyser créé', { fftSize: analyser.fftSize });
    return analyser;
  }

  // AJOUT : Méthode ready() qui était appelée dans app.js et RecordingService.js
  ready() {
    if (!this.#ctx) {
      const err = new Error('AudioEngine non initialisé - appelez init() d\'abord');
      Logger.error('[AudioEngine]', err);
      throw err;
    }
    
    Logger.info('[AudioEngine] ready() appelé', {
      contextState: this.#ctx.state,
      hasMicSource: !!this.#micSource
    });
    
    return { 
      context: this.#ctx,
      analyser: this.createAnalyser()
    };
  }
}

export { AudioEngine };
export const audioEngine = AudioEngine.getInstance();
