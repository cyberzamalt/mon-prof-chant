// src/audio/core/AudioEngine.js
import { Logger } from '../../logging/Logger.js';

class AudioEngine {
  static #instance;
  #ctx = null;
  #micSource = null;  // Source microphone

  static getInstance() {
    if (!this.#instance) this.#instance = new AudioEngine();
    return this.#instance;
  }

  get context() { return this.#ctx; }
  get micSource() { return this.#micSource; }

  setMicSource(source) {
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

  // Méthode ready() qui était appelée dans app.js et RecordingService.js
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

  /**
   * AJOUT : Créer un ScriptProcessor pour traitement audio custom
   * Utilisé par PitchAnalysisPanel pour la détection pitch
   * @param {number} bufferSize - Taille du buffer (256, 512, 1024, 2048, 4096, 8192, 16384)
   * @param {number} inputChannels - Nombre de canaux d'entrée
   * @param {number} outputChannels - Nombre de canaux de sortie
   * @returns {ScriptProcessorNode}
   */
  createScriptProcessor(bufferSize = 2048, inputChannels = 1, outputChannels = 1) {
    if (!this.#ctx) {
      const err = new Error('AudioEngine non initialisé');
      Logger.error('[AudioEngine]', err);
      throw err;
    }

    // Vérifier que bufferSize est une puissance de 2
    const validSizes = [256, 512, 1024, 2048, 4096, 8192, 16384];
    if (!validSizes.includes(bufferSize)) {
      Logger.warn('[AudioEngine] bufferSize invalide, utilisation de 2048', { bufferSize });
      bufferSize = 2048;
    }

    const processor = this.#ctx.createScriptProcessor(bufferSize, inputChannels, outputChannels);
    
    Logger.info('[AudioEngine] ScriptProcessor créé', { 
      bufferSize, 
      inputChannels, 
      outputChannels 
    });
    
    return processor;
  }

  /**
   * AJOUT : Obtenir les informations du contexte audio
   * @returns {Object}
   */
  getInfo() {
    if (!this.#ctx) {
      return {
        initialized: false,
        sampleRate: 0,
        state: 'closed',
        hasMicSource: false
      };
    }

    return {
      initialized: true,
      sampleRate: this.#ctx.sampleRate,
      state: this.#ctx.state,
      currentTime: this.#ctx.currentTime,
      hasMicSource: !!this.#micSource,
      baseLatency: this.#ctx.baseLatency || 0,
      outputLatency: this.#ctx.outputLatency || 0
    };
  }

  /**
   * AJOUT : Vérifier si le contexte est prêt
   * @returns {boolean}
   */
  isReady() {
    return this.#ctx && this.#ctx.state === 'running';
  }

  /**
   * AJOUT : Reprendre le contexte si suspendu (après user gesture)
   */
  async resume() {
    if (!this.#ctx) {
      Logger.warn('[AudioEngine] Pas de contexte à reprendre');
      return;
    }

    if (this.#ctx.state === 'suspended') {
      try {
        await this.#ctx.resume();
        Logger.info('[AudioEngine] Contexte repris');
      } catch (e) {
        Logger.error('[AudioEngine] Erreur reprise contexte', e);
        throw e;
      }
    }
  }

  /**
   * AJOUT : Fermer proprement le contexte
   */
  async close() {
    if (this.#ctx) {
      try {
        await this.#ctx.close();
        Logger.info('[AudioEngine] Contexte fermé');
      } catch (e) {
        Logger.error('[AudioEngine] Erreur fermeture contexte', e);
      }
      this.#ctx = null;
      this.#micSource = null;
    }
  }
}

export { AudioEngine };
export const audioEngine = AudioEngine.getInstance();
