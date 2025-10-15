// src/plot/PitchRenderer.js
// Trace la courbe du pitch + curseur

export default class PitchRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.mode = 'cents'; // 'cents'|'abs'
    this.midiRef = 69;
    this.points = []; // {t, midi, cents}
    this.pxPerSec = 100;
    this.timeStart = 0;
    this.timeEnd = 10;
    this.cursorT = null; // secondes
    this.smoothGapMs = 120;
  }

  setMode(m) { this.mode = m; }
  setReference(m) { if (typeof m === 'number') this.midiRef = m; }
  setViewport({ pxPerSec, timeStart, timeEnd }) {
    this.pxPerSec = pxPerSec;
    this.timeStart = timeStart;
    this.timeEnd = timeEnd;
  }
  setCursor(t) { this.cursorT = t; }
  resize(w, h) { this.canvas.width = w; this.canvas.height = h; this.width = w; this.height = h; }

  clearData() { this.points.length = 0; }
  appendPoint(p) { this.points.push(p); }

  draw() {
    const ctx = this.ctx, W = this.width, H = this.height;
    ctx.clearRect(0,0,W,H);

    // courbe
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#60a5fa';
    ctx.beginPath();
    let started = false;
    let lastX = null, lastY = null, lastT = null;

    for (const p of this.points) {
      if (p.t < this.timeStart || p.t > this.timeEnd) continue;
      const x = (p.t - this.timeStart) * this.pxPerSec;
      const y = (this.mode === 'cents')
        ? this._yFromCents(p.cents, H)
        : this._yFromMidi(p.midi, H, this.midiRef);

      if (!started) {
        ctx.moveTo(x,y);
        started = true;
      } else {
        // interpolation des petits trous
        if (lastT != null) {
          const gapMs = (p.t - lastT) * 1000;
          if (gapMs <= this.smoothGapMs) {
            ctx.lineTo(x,y);
          } else {
            // gros trou: lever le stylo
            ctx.moveTo(x,y);
          }
        } else {
          ctx.lineTo(x,y);
        }
      }
      lastX = x; lastY = y; lastT = p.t;
    }
    ctx.stroke();

    // curseur orange
    if (this.cursorT != null && this.cursorT >= this.timeStart && this.cursorT <= this.timeEnd) {
      const x = (this.cursorT - this.timeStart) * this.pxPerSec;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
  }

  _yFromCents(c, H) {
    const mid = H/2;
    const pxPerCent = (H-60) / 600;
    return mid - c * pxPerCent;
  }
  _yFromMidi(m, H, ref) {
    const semiRange = 12; // 12 demi-tons visibles
    const mid = H/2;
    const pxPerSemi = (H-60) / semiRange;
    return mid - (m - ref) * pxPerSemi;
  }
}
