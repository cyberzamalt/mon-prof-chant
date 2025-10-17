// src/plot/AxisRenderer.js
// Rendu des axes : temps (bas) et hauteur (gauche)

export default class AxisRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.mode = 'cents'; // 'cents'|'abs'
    this.pxPerSec = 100;
    this.timeStart = 0;
    this.timeEnd = 10;
    this.midiRef = 69; // A4
    this.noteLabels = true;
  }

  setViewport({ pxPerSec, timeStart, timeEnd }) {
    this.pxPerSec = pxPerSec;
    this.timeStart = timeStart;
    this.timeEnd = timeEnd;
  }
  setMode(mode) { this.mode = mode; }
  setReference(midiRef) { this.midiRef = midiRef ?? this.midiRef; }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.width = w; this.height = h;
  }

  draw() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;
    ctx.clearRect(0,0,W,H);

    // fond
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0,0,W,H);

    // Axe temps (en bas)
    const yBase = H - 20;
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    ctx.lineTo(W, yBase);
    ctx.stroke();

    const secTick = 1;
    const secLabel = 5;
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    for (let s = Math.ceil(this.timeStart); s <= this.timeEnd; s += secTick) {
      const x = (s - this.timeStart) * this.pxPerSec;
      ctx.strokeStyle = s % secLabel === 0 ? '#374151' : '#1f2937';
      ctx.beginPath();
      ctx.moveTo(x, yBase);
      ctx.lineTo(x, yBase - (s % secLabel === 0 ? 10 : 5));
      ctx.stroke();
      if (s % secLabel === 0) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(formatSec(s), x - 10, yBase + 14);
      }
    }
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Échelle de temps (s)', 6, H - 4);

    // Axe vertical (gauche)
    const left = 48; // marge labels
    // grille horizontale
    const grid = (y) => {
      ctx.strokeStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    };

    if (this.mode === 'cents') {
      // ±300 cents autour de la médiane
      const range = 600; // total
      for (let c = -300; c <= 300; c += 50) {
        const y = this._yFromCents(c, H);
        grid(y);
        if (c % 100 === 0) {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText((c>0?'+':'') + c + ' c', 4, y + 4);
        }
      }
      // médiane
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(0, this._yFromCents(0, H)); ctx.lineTo(W, this._yFromCents(0,H)); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Absolu (notes) : lignes de 1/2 ton
      const semiPerScreen = 12; // ~12 demi-tons visibles
      const topMidi = this.midiRef + semiPerScreen/2;
      const botMidi = this.midiRef - semiPerScreen/2;

      for (let m = Math.ceil(botMidi); m <= topMidi; m += 0.5) {
        const y = this._yFromMidi(m, H, this.midiRef, semiPerScreen);
        grid(y);
        const isNote = Math.abs(m - Math.round(m)) < 1e-3;
        if (isNote) {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(midiToLabel(m), 6, y + 4);
        }
      }
      // médiane (note de référence)
      const y0 = this._yFromMidi(this.midiRef, H, this.midiRef, semiPerScreen);
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Curseur orange sera dessiné par TimelineRenderer
  }

  _yFromCents(c, H) {
    // 0 au milieu
    const mid = H/2;
    // ±300c mappés au H
    const pxPerCent = (H-60) / 600; // marges
    return mid - c * pxPerCent;
  }
  _yFromMidi(m, H, ref, semiRange) {
    const mid = H/2;
    const pxPerSemi = (H-60) / semiRange;
    return mid - (m - ref) * pxPerSemi;
  }
}

function midiToLabel(m) {
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const n = Math.round(m);
  const name = NOTE_NAMES[(n + 1200) % 12];
  const oct = Math.floor(n / 12) - 1;
  return `${name}${oct}`;
}
function formatSec(s) {
  const m = Math.floor(s/60);
  const ss = Math.floor(s%60);
  return (m>0 ? `${m}:${String(ss).padStart(2,'0')}` : `0:${String(ss).padStart(2,'0')}`);
}
