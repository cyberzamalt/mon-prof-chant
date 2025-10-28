/**
 * AudioEngine.js
 * TYPE: Singleton - Core Audio Engine
 */

import { Logger } from '../../logging/Logger.js';
import { AudioContextManager } from './AudioContextManager.js';
import { BrowserDetector } from '../../utils/BrowserDetector.js';

class AudioEngine {
  static #instance = null;
  #audioContext = null;
  #contextManager = null;
  #config = {
    sampleRate: 48000,
    latencyHint: 'interactive',
    channels: 1,
  };
  #state = 'uninitialized';

  static getInstance() {
    try {
      if (!AudioEngine.#instance) {
        AudioEngine.#instance = new AudioEngine();
        Logger.info('AudioEngine', 'Singleton instance created');
      }
      return AudioEngine.#instance;
    } catch (err) {
      Logger.error('AudioEngine', 'getInstance failed', err);
      return null;
    }
  }

  constructor() {
    try {
      Logger.info('AudioEngine', 'Constructor called');
      this.#state = 'constructed';
    } catch (err) {
      Logger.error('AudioEngine', 'Constructor failed', err);
      throw err;
    }
  }

  async initialize(options = {}) {
    try {
      Logger.info('AudioEngine', 'Initialization starting', options);

      if (this.#state === 'initialized') {
        Logger.warn('AudioEngine', 'Already initialized');
        return true;
      }

      this.#config = { ...this.#config, ...options };

      const browser = BrowserDetector.detect();
      Logger.info('AudioEngine', 'Browser detected', browser);

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio API not supported');

      this.#audioContext = new AudioContextClass({
        sampleRate: this.#config.sampleRate,
        latencyHint: this.#config.latencyHint,
      });

      Logger.info('AudioEngine', 'AudioContext created', {
        state: this.#audioContext.state,
        sampleRate: this.#audioContext.sampleRate,
        baseLatency: this.#audioContext.baseLatency,
      });

      this.#contextManager = new AudioContextManager(this.#audioContext);

      if (this.#audioContext.state === 'suspended') {
        Logger.info('AudioEngine', 'Context suspended, attempting resume');
        const resumed = await this.#contextManager.resume();
        if (!resumed) Logger.warn('AudioEngine', 'Could not resume context - need user gesture');
      }

      this.#state = 'initialized';
      Logger.info('AudioEngine', 'Initialization complete');

      window.__audioEngineState = {
        initialized: true,
        sampleRate: this.#audioContext.sampleRate,
        state: this.#audioContext.state,
        timestamp: new Date().toISOString(),
      };

      return true;
    } catch (err) {
      Logger.error('AudioEngine', 'Initialization failed', err);
      this.#state = 'error';
      return false;
    }
  }

  getContext() {
    try {
      if (!this.#audioContext) throw new Error('AudioContext not initialized');
      return this.#audioContext;
    } catch (err) {
      Logger.error('AudioEngine', 'getContext failed', err);
      return null;
    }
  }

  getContextManager() {
    try { return this.#contextManager; }
    catch (err) { Logger.error('AudioEngine', 'getContextManager failed', err); return null; }
  }

  getSampleRate() {
    try { return this.#audioContext?.sampleRate || this.#config.sampleRate; }
    catch (err) { Logger.error('AudioEngine', 'getSampleRate failed', err); return this.#config.sampleRate; }
  }

  ctx() { return this.getContext(); }
  currentTime() {
    try { return this.#audioContext ? this.#audioContext.currentTime : 0; }
    catch (err) { Logger.error('AudioEngine', 'currentTime failed', err); return 0; }
  }
  sampleRate() { return this.getSampleRate(); }

  getState() {
    try { return this.#audioContext?.state || this.#state; }
    catch (err) { Logger.error('AudioEngine', 'getState failed', err); return 'unknown'; }
  }

  isInitialized() { return this.#state === 'initialized' && this.#audioContext !== null; }
  isRunning() {
    try { return this.#audioContext?.state === 'running'; }
    catch (err) { Logger.error('AudioEngine', 'isRunning check failed', err); return false; }
  }

  createAnalyser(fftSize = 2048) {
    try {
      if (!this.#audioContext) throw new Error('AudioContext not initialized');
      const analyser = this.#audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      Logger.info('AudioEngine', 'Analyser created', { fftSize });
      return analyser;
    } catch (err) {
      Logger.error('AudioEngine', 'createAnalyser failed', err);
      return null;
    }
  }

  createGain() {
    try {
      if (!this.#audioContext) throw new Error('AudioContext not initialized');
      const gain = this.#audioContext.createGain();
      Logger.debug('AudioEngine', 'Gain node created');
      return gain;
    } catch (err) {
      Logger.error('AudioEngine', 'createGain failed', err);
      return null;
    }
  }

  getDestination() {
    try {
      if (!this.#audioContext) throw new Error('AudioContext not initialized');
      return this.#audioContext.destination;
    } catch (err) {
      Logger.error('AudioEngine', 'getDestination failed', err);
      return null;
    }
  }

  async resume() {
    try {
      if (!this.#contextManager) throw new Error('Context manager not initialized');
      return await this.#contextManager.resume();
    } catch (err) {
      Logger.error('AudioEngine', 'resume failed', err);
      return false;
    }
  }

  getDiagnostics() {
    try {
      return {
        state: this.#state,
        isInitialized: this.isInitialized(),
        isRunning: this.isRunning(),
        contextState: this.getState(),
        sampleRate: this.getSampleRate(),
        latency: this.#contextManager?.getLatencyInfo() || {},
        config: { ...this.#config },
      };
    } catch (err) {
      Logger.error('AudioEngine', 'getDiagnostics failed', err);
      return { state: 'error' };
    }
  }
}

export { AudioEngine };
export default AudioEngine;
