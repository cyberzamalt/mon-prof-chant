// src/audio/dsp/median-queue.js
// Petite file glissante pour médiane — UMD (global: MedianQueue)
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MedianQueue = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class MedianQueue {
    constructor(size = 5) {
      this.n = Math.max(1, size|0);
      this.buf = new Array(this.n).fill(0);
      this.i = 0;
      this.filled = 0;
    }
    clear() { this.i = 0; this.filled = 0; this.buf.fill(0); }
    push(v) {
      this.buf[this.i] = +v || 0;
      this.i = (this.i + 1) % this.n;
      if (this.filled < this.n) this.filled++;
      return this.median();
    }
    values() {
      return this.buf.slice(0, this.filled);
    }
    median() {
      if (!this.filled) return 0;
      const a = this.values().slice().sort((x,y)=>x-y);
      const mid = (a.length - 1) >> 1;
      return a.length % 2 ? a[mid] : 0.5 * (a[mid] + a[mid+1]);
    }
  }

  return MedianQueue;
});
