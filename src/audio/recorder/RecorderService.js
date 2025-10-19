// src/audio/recorder/RecorderService.js
// Wrapper MediaRecorder (WebM/Opus) + tick mm:ss

import { Logger } from '../../logging/Logger.js';

export default class RecorderService {
  constructor() {
    this.rec = null;
    this.chunks = [];
    this._listeners = new Map();
    this._tickInt = null;
    this._t0 = 0;
  }

  on(evt, fn) {
    if (!this._listeners.has(evt)) this._listeners.set(evt, new Set());
    this._listeners.get(evt).add(fn);
    return () => this._listeners.get(evt)?.delete(fn);
  }
  _emit(evt, payload) {
    const set = this._listeners.get(evt);
    if (set) for (const fn of set) try { fn(payload); } catch {}
  }

  start({ stream, mimeType = 'audio/webm;codecs=opus' }) {
    this.chunks = [];
    this.rec = new MediaRecorder(stream, { mimeType });
    this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => {
      const blob = new Blob(this.chunks, { type: mimeType });
      this._emit('stop', { blob });
    };
    this.rec.start(250); // timeslice
    this._t0 = performance.now();
    this._tickInt = setInterval(() => {
      const t = Math.floor((performance.now() - this._t0) / 1000);
      this._emit('tick', { sec: t });
    }, 250);
    Logger.info('RecorderService', 'Recording started');
  }

  stop() {
    if (!this.rec) return;
    try { this.rec.stop(); } catch {}
    clearInterval(this._tickInt);
    this._tickInt = null;
    Logger.info('RecorderService', 'Recording stopped');
  }

  isRecording() { return this.rec && this.rec.state === 'recording'; }
}
