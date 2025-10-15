// src/plot/TimelineRenderer.js
// Orchestrateur : gère axes + pitch + viewport + auto-scroll

import AxisRenderer from './AxisRenderer.js';
import PitchRenderer from './PitchRenderer.js';

export default class TimelineRenderer {
  constructor({ axisCanvas, pitchCanvas }) {
    this.axis = new AxisRenderer(axisCanvas);
    this.pitch = new PitchRenderer(pitchCanvas);

    this.mode = 'cents';
    this.pxPerSec = 100;   // x1
    this.timeStart = 0;
    this.timeEnd = 10;
    this.autoFollow = true; // suit le curseur pendant rec
    this.midiRef = 69;

    this.resize();
  }

  resize() {
    const W = this.axis.canvas.clientWidth || 800;
    const H = this.axis.canvas.clientHeight || 260;
    this.axis.resize(W, H);
    this.pitch.resize(W, H);
    this._updateViewport();
    this.draw();
  }

  setMode(mode) {
    this.mode = mode;
    this.axis.setMode(mode);
    this.pitch.setMode(mode);
  }
  setZoom(z) {
    const mult = (z === 2 || z === 4) ? z : 1;
    this.pxPerSec = 100 * mult;
    this._updateViewport();
  }

  setReference(midiRef, label) {
    this.midiRef = midiRef ?? this.midiRef;
    this.axis.setReference(this.midiRef);
    this.pitch.setReference(this.midiRef);
  }

  clear() {
    this.timeStart = 0;
    this.timeEnd = 10;
    this.pitch.clearData();
    this.pitch.setCursor(null);
    this.draw();
  }

  appendPoint(p) {
    this.pitch.appendPoint(p);
    if (this.autoFollow) {
      const t = p.t;
      const margin = (this.axis.width * 0.1) / this.pxPerSec;
      while (t > this.timeEnd - margin) {
        this.timeStart += 1;
        this.timeEnd += 1;
      }
    }
  }

  setCursor(t) {
    this.pitch.setCursor(t);
  }

  setAutoFollow(on) { this.autoFollow = !!on; }

  _updateViewport() {
    this.axis.setViewport({ pxPerSec: this.pxPerSec, timeStart: this.timeStart, timeEnd: this.timeEnd });
    this.pitch.setViewport({ pxPerSec: this.pxPerSec, timeStart: this.timeStart, timeEnd: this.timeEnd });
  }

  draw() {
    this._updateViewport();
    this.axis.draw();
    this.pitch.draw();
  }
}
