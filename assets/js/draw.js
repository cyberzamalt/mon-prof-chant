/*!
 * draw.js — fond + mappage + courbe lisse (Catmull-Rom→Bezier)
 * (FICHIER JS PUR — PAS DE <script> DEDANS)
 */
(function(){
  const Y_RANGE_CENTS = 200;
  // même logique que dans app.js pour A440
  const A440_RANGE_CENTS = 3000;

  function hzToMidi(hz){ return 69 + 12 * Math.log2(hz/440); }
  function midiToHz(m){ return 440 * Math.pow(2, (m-69)/12); }
  function clamp(v,a,b){ return v<a?a:v>b?b:v; }

  function centsFrom(hz, mode){
    if (mode==='a440') return 1200 * Math.log2(hz/440);
    const midi = Math.round(hzToMidi(hz));
    const base = midiToHz(midi);
    return 1200 * Math.log2(hz/base);
  }

  // Prend un range paramétrable (A440 utilise une grande fenêtre)
  function mapCentsToY(cents, h, range = Y_RANGE_CENTS){
    const H = h - 80, mid = h/2, pxPerCent = H / (2 * range);
    return mid - cents * pxPerCent;
  }
  function mapMidiToY(midi, h, minMidi, maxMidi){
    const top=20, bot=h-60;
    const n = (midi - minMidi) / (maxMidi - minMidi);
    return bot - clamp(n,0,1) * (bot-top);
  }
  function mapPitchToY(hz, h, mode, minMidi, maxMidi){
    if (mode==='abs') return mapMidiToY(hzToMidi(hz), h, minMidi, maxMidi);
    const range = (mode==='a440') ? A440_RANGE_CENTS : Y_RANGE_CENTS;
    const c = clamp(centsFrom(hz, mode), -range, range);
    return mapCentsToY(c, h, range);
  }

  function drawBase(ctx, w, h, t0, tSpan){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#0b1324'; ctx.fillRect(0,0,w,h);

    ctx.strokeStyle = '#1a2642'; ctx.lineWidth=0.5;
    for(let i=0;i<5;i++){ const y=(h/4)*i; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

    ctx.strokeStyle='#10b981'; ctx.setLineDash([4,4]); ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke(); ctx.setLineDash([]);

    // Labels vocaux
    ctx.fillStyle='#9ca3af'; ctx.font='9px monospace'; ctx.textAlign='left';
    const labels=['🔝 Très très aigu','Très aigu','Aigu','Moyen aigu','🎯 Milieu','Moyen grave','Grave','Très grave','🔻 Très très grave'];
    const pos=[0.05,0.18,0.30,0.42,0.50,0.58,0.70,0.82,0.95];
    for(let i=0;i<labels.length;i++){
      const y = pos[i]*(h-80)+40;
      ctx.fillText(labels[i], 2, y+3);
      ctx.strokeStyle='#2a3a54'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(58,y); ctx.stroke();
    }

    // Temps
    const left=60, right=20, drawW=w-left-right;
    ctx.strokeStyle='#22304f'; ctx.lineWidth=0.5; ctx.fillStyle='#9ca3af'; ctx.font='10px monospace'; ctx.textAlign='center';
    const start = Math.floor(t0), end = Math.ceil(t0 + tSpan);
    for(let s=start; s<=end; s++){
      const x = left + ((s - t0)/tSpan) * drawW;
      if (x<left || x>w-right) continue;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
      if (s%5===0){
        const mm=String(Math.floor(s/60)).padStart(2,'0');
        const ss=String(s%60).padStart(2,'0');
        ctx.fillText(`${mm}:${ss}`, x, h-4);
      }
    }
  }

  function drawSmooth(ctx, pts, tension=0.5){
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2){ ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke(); return; }
    for (let i=0; i<pts.length-1; i++){
      const p0 = pts[Math.max(0, i-1)];
      const p1 = pts[i];
      const p2 = pts[i+1];
      const p3 = pts[Math.min(pts.length-1, i+2)];
      const cp1x = p1.x + (p2.x - p0.x)/6 * tension;
      const cp1y = p1.y + (p2.y - p0.y)/6 * tension;
      const cp2x = p2.x - (p3.x - p1.x)/6 * tension;
      const cp2y = p2.y - (p3.y - p1.y)/6 * tension;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.stroke();
  }

  window.DrawUtils = {
    Y_RANGE_CENTS,
    A440_RANGE_CENTS,
    hzToMidi,
    mapPitchToY,
    drawBase,
    drawSmooth,
    clamp
  };
})();
