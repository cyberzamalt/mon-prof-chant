/* Graph — fonctions de dessin: grilles, labels, courbes lissées */
(function () {
  const Graph = {};

  // Mapping / conversions
  const hzToMidi = (hz) => 69 + 12 * Math.log2(hz / 440);
  const centsFromA440 = (hz) => 1200 * Math.log2(hz / 440);
  const centsFromNearest = (hz) => {
    const midi = Math.round(hzToMidi(hz));
    const baseHz = 440 * Math.pow(2, (midi - 69) / 12);
    return 1200 * Math.log2(hz / baseHz);
  };

  Graph.mappers = function ({ scaleMode, minHz = 60, maxHz = 1200, yCents = 200, height }) {
    const MIDI_MIN = hzToMidi(minHz);
    const MIDI_MAX = hzToMidi(maxHz);
    const top = 20, bottom = height - 60;
    const H = height - 80, mid = height / 2, pxPerCent = H / (2 * yCents);

    const mapMidiToY = (midi) => {
      const n = (midi - MIDI_MIN) / (MIDI_MAX - MIDI_MIN);
      return bottom - Math.min(1, Math.max(0, n)) * (bottom - top);
    };
    const mapCentsToY = (c) => mid - Math.max(-yCents, Math.min(yCents, c)) * pxPerCent;

    const mapPitchToY = (hz) => {
      if (scaleMode === "abs") return mapMidiToY(hzToMidi(hz));
      if (scaleMode === "a440") return mapCentsToY(centsFromA440(hz));
      return mapCentsToY(centsFromNearest(hz)); // auto
    };

    return { mapPitchToY };
  };

  // Grille + labels
  Graph.drawBase = function (canvas, { t0 = 0, windowSec = 30, duration = null, yCents = 200, labels = true }) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b1324"; ctx.fillRect(0, 0, w, h);

    // lignes horizontales discrètes
    ctx.strokeStyle = "#1a2642"; ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) { const y = (h / 4) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // ligne centrale (0 cent)
    ctx.strokeStyle = "#10b981"; ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke(); ctx.setLineDash([]);

    // bandes/ticks vocaux (option visuel)
    if (labels) {
      ctx.fillStyle = "#9ca3af"; ctx.font = "9px monospace"; ctx.textAlign = "left";
      const L = ['🔝 Très très aigu', 'Très aigu', 'Aigu', 'Moyen aigu', '🎯 Milieu', 'Moyen grave', 'Grave', 'Très grave', '🔻 Très très grave'];
      const pos = [0.05, 0.18, 0.30, 0.42, 0.50, 0.58, 0.70, 0.82, 0.95];
      for (let i = 0; i < L.length; i++) {
        const y = pos[i] * (h - 80) + 40;
        ctx.fillText(L[i], 6, y + 3);
        ctx.strokeStyle = "#2a3a54"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(58, y); ctx.stroke();
      }
      // borne numérique
      ctx.fillStyle = "#9ca3af"; ctx.font = "10px monospace"; ctx.textAlign = "right";
      ctx.fillText(`+${yCents}c`, 55, 16); ctx.textAlign = "left"; ctx.fillText(`-${yCents}c`, 65, 16);
    }

    // abscisse (live vs ref)
    ctx.strokeStyle = "#22304f"; ctx.lineWidth = 0.5; ctx.fillStyle = "#9ca3af"; ctx.font = "10px monospace"; ctx.textAlign = "center";
    const left = 60, right = 20, drawW = w - left - right;

    const fmt = (s) => {
      s = Math.max(0, s | 0);
      const mm = String((s / 60) | 0).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      return `${mm}:${ss}`;
    };

    if (duration == null) {
      const startSec = Math.floor(t0);
      for (let s = startSec; s <= t0 + windowSec; s += 1) {
        const x = left + ((s - t0) / windowSec) * drawW;
        if (x >= left && x <= w - right) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
          if (s % 5 === 0) ctx.fillText(fmt(s), x, h - 4);
        }
      }
    } else {
      const step = duration <= 30 ? 1 : Math.ceil(duration / 30);
      for (let s = 0; s <= Math.ceil(duration); s += step) {
        const x = left + (s / duration) * drawW;
        if (x <= w - right) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.fillText(fmt(s), x, h - 4); }
      }
    }
  };

  // Courbe lissée (Catmull-Rom → Bezier)
  Graph.strokeSmooth = function (ctx, pts, { strokeStyle = "#3b82f6", lineWidth = 3.5, tension = 0.5, drawDots = false }) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
    } else {
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
        const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
        const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
        const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    }
    ctx.stroke();

    if (drawDots) {
      ctx.fillStyle = strokeStyle;
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  };

  window.Graph = Graph;
})();
