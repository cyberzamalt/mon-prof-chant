// src/audio/core/AudioEngine.js
import { Logger } from '../../logging/Logger.js';

export class AudioEngine {
  static #instance;
  context = null;
  analyser = null;

  static getInstance(){
    if(!this.#instance) this.#instance = new AudioEngine();
    return this.#instance;
  }

  async init(){
    if(this.context) { Logger.warn('[AudioEngine] Déjà initialisé'); return this.context; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.context = new AC({ sampleRate: 44100 });
    Logger.info('[AudioEngine] Contexte prêt', this.context);

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;
    return this.context;
  }

  ready(){
    if(!this.context) throw new Error('AudioContext non prêt');
    return { context:this.context, analyser:this.analyser };
  }
}
export const audioEngine = AudioEngine.getInstance();
