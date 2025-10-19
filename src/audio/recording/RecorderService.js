// src/audio/recording/RecorderService.js
// Façade sûre autour de Recorder.js (évite de casser l’existant)
// - Relais start/stop/pause/resume
// - Events simples: 'start' | 'stop' | 'blob' | 'pause' | 'resume' | 'error'
// - Méthodes download/exports si disponibles dans Recorder (fallBack no-op)

import Recorder from './Recorder.js';
import { Logger } from '../../logging/Logger.js';

export default class RecorderService {
  constructor() {
    this.rec = new Recorder();
    this._listeners = new Map(); // Map<evt, Set<fn>>
  }

  // --- Event bus minimal ---
  on(evt, fn) {
    if (!this._listeners.has(evt)) this._listeners.set(evt, new Set());
    this._listeners.get(evt).add(fn);
  }
  off(evt, fn) {
    if (!this._listeners.has(evt)) return;
    this._listeners.get(evt).delete(fn);
  }
  _emit(evt, payload) {
    const set = this._listeners.get(evt);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); } catch (e) { /* silencieux */ }
    }
  }

  // --- Contrôle enregistrement ---
  async start(stream, mimeType = 'audio/webm;codecs=opus') {
    try {
      if (!this.rec || !this.rec.start) throw new Error('Recorder.start indisponible');
      const ret = await this.rec.start(stream, mimeType);
      this._emit('start', { mimeType });
      return ret;
    } catch (err) {
      Logger?.error?.('[RecorderService] start', err);
      this._emit('error', err);
      throw err;
    }
  }

  async stop() {
    try {
      if (!this.rec || !this.rec.stop) throw new Error('Recorder.stop indisponible');
      const ret = await this.rec.stop();
      // compat : certains Recorder retournent { blob, mimeType, durationMs }
      const blob = ret?.blob ?? (this.rec.getBlob ? this.rec.getBlob() : null);
      if (blob) this._emit('blob', blob);
      this._emit('stop', ret);
      return ret;
    } catch (err) {
      Logger?.error?.('[RecorderService] stop', err);
      this._emit('error', err);
      throw err;
    }
  }

  pause() {
    try {
      if (this.rec?.pause) this.rec.pause();
      this._emit('pause');
    } catch (err) {
      Logger?.error?.('[RecorderService] pause', err);
      this._emit('error', err);
    }
  }

  resume() {
    try {
      if (this.rec?.resume) this.rec.resume();
      this._emit('resume');
    } catch (err) {
      Logger?.error?.('[RecorderService] resume', err);
      this._emit('error', err);
    }
  }

  // --- Accès données ---
  getBlob() {
    try {
      return this.rec?.getBlob ? this.rec.getBlob() : null;
    } catch { return null; }
  }

  // --- Downloads / exports (si dispo dans Recorder) ---
  async downloadWebM(filename = 'take.webm') {
    if (this.rec?.downloadWebM) return this.rec.downloadWebM(filename);
    // no-op si indisponible
  }
  async downloadWav(filename = 'take.wav') {
    if (this.rec?.downloadWav) return this.rec.downloadWav(filename);
  }
  async downloadMp3(filename = 'take.mp3') {
    if (this.rec?.downloadMp3) return this.rec.downloadMp3(filename);
  }

  // --- Chargement d’un fichier existant pour lecture/analyse ---
  async loadFile(file) {
    if (this.rec?.loadFile) {
      return this.rec.loadFile(file); // souvent retourne { arrayBuffer | audioBuffer | blob }
    }
    return null;
  }
}
