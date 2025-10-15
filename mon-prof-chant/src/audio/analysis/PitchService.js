// src/audio/analysis/PitchService.js
// Service de détection du pitch (YIN) + référence (note médiane) + conversion cents/notes
// API:
//  start({ sourceNode, sampleRate, mode: 'live' | 'record' })
//  stop()
//  on(event, handler) -> 'pitch' | 'reference'
//  setMode('abs'|'cents'), setZoom(z), enableSmoothing({ gapMaxMs, smoothingMs }), resetReference()

import { Logger } from '../../logging/Logger.js';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export default class PitchService {
  constructor() {
    this._listeners = new Map();
    this._running = false;
    this._mode = 'cents'; // 'abs'|'cents'
    this._zoom = 1;
    this._source = null;
    this._ctx = null;
    this._analyser = null;
    this._buffer = null;
    this._raf = 0;

    // Référence (note médiane)
    this._midiRef = null;
    this._refLabel = null;
    this._stabilityMs = 300;
    this._stabilityCents = 25;
    this._lockWindow = []; // timestamps (ms) où le cents ~ 0 vs référence
    this._lastT0 = 0;

    // Smoothing/interp
    this._gapMaxMs = 120;
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

  setMode(mode) { this._mode = (mode === 'abs' ? 'abs' : 'cents'); }
  setZoom(z) { this._zoom = (z === 2 || z === 4) ? z : 1; }
  enableSmoothing(opts = {}) {
    if (typeof opts.gapMaxMs === 'number') this._gapMaxMs = opts.gapMaxMs;
  }
  resetReference() {
    this._midiRef = null;
    this._refLabel = null;
    this._lockWindow = [];
  }

  start({ sourceNode, sampleRate, mode = 'record' }) {
    if (this._running) return;
    this._source = sourceNode;
    this._ctx = sourceNode.context;
    this._mode = this._mode || 'cents';

    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.smoothingTimeConstant = 0;
    sourceNode.connect(this._analyser);

    this._buffer = new Float32Array(this._analyser.fftSize);

    this._running = true;
    this._lastT0 = performance.now();

    const step = () => {
      if (!this._running) return;
      this._analyser.getFloatTimeDomainData(this._buffer);
      const now = performance.now();
      const dt = (now - this._lastT0) / 1000;
      this._lastT0 = now;

      const freq = yinPitch(this._buffer, this._ctx.sampleRate);
      if (freq > 0) {
        const midi = freqToMidi(freq);
        // Gestion référence
        if (this._midiRef == null) {
          // fenêtre de stabilité pour lock
          this._tryLockReference(midi, now);
        }
        const refMidi = (this._midiRef != null) ? this._midiRef : midi;
        const cents = centsDiff(midi, refMidi);
        const data = {
          t: this._ctx.currentTime, // timeline alignée sur AudioContext
          freq, midi, cents,
          conf: 1.0 // placeholder
        };
        this._emit('pitch', data);
      }
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);

    Logger.info('PitchService', 'Started', { mode, sr: this._ctx.sampleRate });
  }

  stop() {
    if (!this._running) return;
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    try { this._source?.disconnect?.(this._analyser); } catch {}
    this._analyser = null;
    this._running = false;
    Logger.info('PitchService', 'Stopped');
  }

  _tryLockReference(midi, nowMs) {
    // Lock si note ~stable : calc la dispersion sur ~300ms
    this._lockWindow.push({ t: nowMs, midi });
    const win = this._lockWindow;
    // purge > stabilityMs
    const cutoff = nowMs - this._stabilityMs;
    while (win.length && win[0].t < cutoff) win.shift();
    if (win.length < 5) return;

    const avg = win.reduce((s, v) => s + v.midi, 0) / win.length;
    const dev = Math.sqrt(win.reduce((s, v) => s + Math.pow(v.midi - avg, 2), 0) / win.length);
    const devCents = Math.abs(dev) * 100; // 1 demi-ton = 100 cents (midi est en demi-tons)
    if (devCents <= this._stabilityCents) {
      this._midiRef = Math.round(avg * 2) / 2; // au 1/2 ton près
      this._refLabel = midiToNote(this._midiRef);
      this._emit('reference', { midiRef: this._midiRef, noteLabel: this._refLabel });
      Logger.info('PitchService', 'Reference locked', { midiRef: this._midiRef, label: this._refLabel });
      this._lockWindow = [];
    }
  }
}

// ---- Utils (math/audio) ----
function yinPitch(buf, sr) {
  // YIN simplifié (difference function + cumulative mean normalized difference + absolute threshold)
  const N = buf.length;
  const tauMax = Math.floor(sr / 80);  // pitch min ~80Hz
  const tauMin = Math.floor(sr / 1000); // pitch max ~1000Hz
  const yin = new Float32Array(tauMax).fill(0);

  // difference function
  for (let tau = 1; tau < tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < N - tau; i++) {
      const d = buf[i] - buf[i + tau];
      sum += d * d;
    }
    yin[tau] = sum;
  }

  // cumulative mean normalized difference
  let runningSum = 0;
  for (let tau = 1; tau < tauMax; tau++) {
    runningSum += yin[tau];
    yin[tau] = yin[tau] * tau / runningSum;
  }

  // absolute threshold
  const thresh = 0.1;
  let tau = -1;
  for (let t = tauMin; t < tauMax; t++) {
    if (yin[t] < thresh) { tau = t; break; }
  }
  if (tau === -1) return 0;

  // parabolic interpolation near tau
  const x0 = (tau < 1) ? tau : tau - 1;
  const x2 = (tau + 1 < yin.length) ? tau + 1 : tau;
  const y0 = yin[x0], y1 = yin[tau], y2 = yin[x2];
  const denom = (y0 + y2 - 2 * y1);
  const betterTau = tau + (denom !== 0 ? (y0 - y2) / (2 * denom) : 0);

  const freq = sr / betterTau;
  return (isFinite(freq) && freq > 0) ? freq : 0;
}

function freqToMidi(f) { return 69 + 12 * Math.log2(f / 440); }
function midiToNote(m) {
  const n = Math.round(m);
  const name = NOTE_NAMES[(n + 1200) % 12];
  const oct = Math.floor(n / 12) - 1;
  return `${name}${oct}`;
}
function centsDiff(midi, midiRef) {
  // diff en cents entre midi et midiRef
  return (midi - midiRef) * 100;
}
