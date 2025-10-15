// AudioEngine.js — garantit un AudioContext non nul et running
import { Logger } from '../../logging/Logger.js';

let _instance = null;

export default class AudioEngine {
  constructor(opts={}) {
    this.opts = opts;
    this.ctx = null;
    this.ready = false;
    Logger.info('AudioEngine', 'Constructor called', opts);
  }

  static getInstance(opts={}) {
    if(!_instance) _instance = new AudioEngine(opts);
    return _instance;
  }

  async initialize(){
    if(this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) throw new Error('WebAudio non supporté');
    this.ctx = new Ctx({ sampleRate: this.opts.sampleRate ?? undefined, latencyHint: this.opts.latencyHint ?? 'interactive' });
    Logger.info('AudioEngine', 'AudioContext created', { sampleRate: this.ctx.sampleRate, state: this.ctx.state });
  }

  async resume(){
    if(!this.ctx) await this.initialize();
    if(this.ctx.state !== 'running'){
      Logger.info('AudioEngine', 'Resuming context…');
      await this.ctx.resume();
      Logger.info('AudioEngine', 'Context resumed', { state: this.ctx.state });
    }
    this.ready = (this.ctx && this.ctx.state === 'running');
  }

  getContext(){
    if(!this.ctx) Logger.warn('AudioEngine', 'getContext() called but context is null');
    return this.ctx || null;
  }

  isReady(){ return !!this.ready && !!this.ctx && this.ctx.state==='running'; }

  async close(){
    if(this.ctx){
      await this.ctx.close();
      this.ctx = null; this.ready=false;
      Logger.info('AudioEngine', 'Context closed');
    }
  }
}
