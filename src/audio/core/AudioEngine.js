// AudioEngine.js — Singleton simple, crée l'AudioContext UNIQUEMENT après un geste user.
export default class AudioEngine {
  #ctx = null;
  #ready = false;
  constructor(cfg={}) {
    this.cfg = { sampleRate: 48000, latencyHint: 'interactive', ...cfg };
  }
  isReady(){ return this.#ready && !!this.#ctx; }
  async init(){
    if (this.#ready && this.#ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio non supporté');
    // Important: créer le contexte suite à l’appel provenant d’un événement utilisateur
    this.#ctx = new AC({ sampleRate: this.cfg.sampleRate, latencyHint: this.cfg.latencyHint });
    if (this.#ctx.state === 'suspended') { await this.#ctx.resume(); }
    this.#ready = true;
    return true;
  }
  ctx(){ if(!this.#ctx) throw new Error('AudioContext non initialisé'); return this.#ctx; }
  currentTime(){ return this.#ctx?.currentTime ?? 0; }
  sampleRate(){ return this.#ctx?.sampleRate ?? 0; }
  async destroy(){ try{ await this.#ctx?.close(); }catch{} this.#ctx=null; this.#ready=false; }
}
