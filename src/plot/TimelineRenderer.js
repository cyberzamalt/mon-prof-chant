// TimelineRenderer.js — dessin courbe + axes propres (évite chevauchements)
export default class TimelineRenderer {
  constructor(canvas, { mode='cents', zoom=1 }={}){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = mode; // 'cents' | 'notes'
    this.zoom = zoom;

    // données
    this.points = []; // [{t, v}] (cents) ou [{t, hz}] en mode notes
    this.cursor = 0;
    this.medianLabel = '';

    // layout
    this.padding = { top:18, right:18, bottom:28, left:42 }; // marges généreuses
    this.gridColor = '#1f2937';
    this.axisColor = '#334155';
    this.curveColor = '#38bdf8';
    this.cursorColor = '#f59e0b';

    // notes vertical
    this.noteLines = ['D#5','D5','C#5','C5','B4','A#4','A4','G#4','G4','F#4','F4','E4','D#4'];
    this._running=false;

    // DPR
    this.onResize();
    window.addEventListener('resize', ()=>this.onResize());
  }

  onResize(){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = Math.max(600, Math.floor(rect.width * dpr));
    this.canvas.height = Math.floor(340 * dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.renderStatic();
  }

  onLayoutFixed(){
    // Appelée une fois depuis la page pour forcer un premier layout et éviter “ctx null”
    this.renderStatic();
  }

  setMode(m){ this.mode=m; this.clear(); }
  setZoom(z){ this.zoom=z; }
  setMedianLabel(txt){ this.medianLabel = txt; }

  resetTimeline(){ this.points.length=0; this.cursor=0; this.clear(); }
  startIfIdle(){ if(!this._running){ this._running=true; this.renderStatic(); } }

  setCursor(t){ this.cursor = t; }

  pushPoint(t, cents){ this.points.push({ t, v:cents }); if(this.points.length>20000) this.points.shift(); }
  pushNote(t, hz){ this.points.push({ t, hz }); if(this.points.length>20000) this.points.shift(); }

  clear(){ const {width,height}=this.canvas; this.ctx.clearRect(0,0,width,height); }

  // --- Helpers mapping ---
  _plotRect(){
    const w=this.canvas.clientWidth, h=this.canvas.clientHeight;
    return { x:this.padding.left, y:this.padding.top, w:w-this.padding.left-this.padding.right, h:h-this.padding.top-this.padding.bottom };
  }

  _yFromCents(c){
    // range +- 300 cents (zoom applique)
    const r = this._plotRect();
    const span = 600/this.zoom;
    const top = +span/2, bottom = -span/2;
    const norm = (c-bottom)/(top-bottom);
    return r.y + (1-norm)*r.h;
  }

  _yFromHz(hz){
    //  notes verticales approximées autour d'A4..D#5 (pour une grille lisible)
    //  mappage log2, médiane = ref note (A4 par défaut si aucune ref)
    const r = this._plotRect();
    const topNoteHz = 622.25;  // D#5 ~ 622 Hz
    const botNoteHz = 311.13;  // D#4 ~ 311 Hz
    const span = Math.log2(topNoteHz/botNoteHz);
    const norm = (Math.log2(hz/botNoteHz))/span;
    return r.y + (1-norm)*r.h;
  }

  _xFromT(t){
    const r = this._plotRect();
    const secSpan = 10/this.zoom; // 10s visibles à x1
    const start= Math.max(0, this.cursor-secSpan);
    const norm = (t-start)/secSpan;
    return r.x + norm*r.w;
  }

  // --- Rendu ---
  renderStatic(){
    this.clear();
    const r = this._plotRect();
    const ctx=this.ctx;

    // fond
    ctx.fillStyle='#0b1220';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    // lignes de grille
    ctx.strokeStyle=this.gridColor; ctx.lineWidth=1;

    if(this.mode==='cents'){
      const ticks=[-300,-200,-100,0,100,200,300];
      ctx.font='12px ui-sans-serif';
      ctx.fillStyle='#94a3b8';
      ctx.textAlign='left'; ctx.textBaseline='middle';
      ticks.forEach(v=>{
        const y=this._yFromCents(v);
        ctx.globalAlpha = v===0 ? 0.9 : 0.5;
        ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x+r.w, y); ctx.stroke();
        ctx.globalAlpha = 1;
        // labels à gauche
        ctx.fillText((v>0?'+':'')+v+' c', r.x-34, y);
      });
      // median label
      ctx.fillStyle='#94a3b8'; ctx.textAlign='right'; ctx.fillText(this.medianLabel||'0 cents (réf.)', r.x+r.w, r.y-4);
    }else{
      // notes
      ctx.font='12px ui-sans-serif';
      ctx.fillStyle='#94a3b8';
      ctx.textAlign='left'; ctx.textBaseline='middle';
      const notes=this.noteLines;
      notes.forEach(n=>{
        const hz = noteNameToHz(n);
        const y = this._yFromHz(hz);
        ctx.globalAlpha= n.endsWith('#') ? 0.25 : 0.5;
        ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x+r.w, y); ctx.stroke();
        ctx.globalAlpha=1;
        ctx.fillText(n, r.x-28, y);
      });
      ctx.fillStyle='#94a3b8'; ctx.textAlign='right'; ctx.fillText('Ligne médiane = note de référence', r.x+r.w, r.y-4);
    }

    // axe temps (éviter chevauchement coin bas gauche)
    ctx.strokeStyle=this.axisColor; ctx.globalAlpha=1; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(r.x, r.y+r.h+0.5); ctx.lineTo(r.x+r.w, r.y+r.h+0.5); ctx.stroke();
    ctx.font='12px ui-sans-serif'; ctx.fillStyle='#94a3b8'; ctx.textAlign='center'; ctx.textBaseline='top';
    const secSpan = 10/this.zoom; const start=Math.max(0, this.cursor-secSpan);
    const step = (this.zoom>=4?0.5:this.zoom>=2?1:2);
    for(let s=Math.ceil(start/step)*step; s<=start+secSpan; s+=step){
      const x=this._xFromT(s);
      ctx.globalAlpha=0.6;
      ctx.beginPath(); ctx.moveTo(x, r.y+r.h); ctx.lineTo(x, r.y+r.h+4); ctx.stroke();
      ctx.globalAlpha=1;
      const mm = String(Math.floor(s/60)).padStart(2,'0');
      const ss = String(Math.floor(s%60)).padStart(2,'0');
      const label = `${mm}:${ss}`;
      // petit décalage pour éviter chevauchement initial avec label vertical
      ctx.fillText(label, x+ (s===0 ? 8:0), r.y+r.h+6);
    }
  }

  renderDynamic(){
    const r = this._plotRect(), ctx=this.ctx;
    // courbe
    ctx.save();
    ctx.beginPath();
    let moved=false;
    for(let i=0;i<this.points.length;i++){
      const p=this.points[i];
      const x=this._xFromT(p.t);
      let y;
      if(this.mode==='cents' && typeof p.v==='number') y=this._yFromCents(p.v);
      else if(this.mode==='notes' && typeof p.hz==='number') y=this._yFromHz(p.hz);
      else continue;

      if(!moved){ ctx.moveTo(x,y); moved=true; } else { ctx.lineTo(x,y); }
    }
    ctx.strokeStyle=this.curveColor; ctx.lineWidth=2; ctx.globalAlpha=0.95; ctx.stroke();
    ctx.restore();

    // curseur temps (orange)
    const cx=this._xFromT(this.cursor);
    ctx.beginPath(); ctx.moveTo(cx, r.y); ctx.lineTo(cx, r.y+r.h);
    ctx.strokeStyle=this.cursorColor; ctx.lineWidth=2; ctx.globalAlpha=.9; ctx.stroke();
    ctx.globalAlpha=1;
  }
}

/* --- helpers notes --- */
function noteNameToHz(name){
  // ex "C#5"
  const A4=440, A4_MIDI=69;
  const m = name.match(/^([A-G])(#?)(-?\d+)$/);
  if(!m) return 440;
  const base = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]];
  const sharp = m[2] ? 1 : 0;
  const oct = parseInt(m[3],10);
  const midi = (oct+1)*12 + base + sharp;
  return A4 * Math.pow(2,(midi-69)/12);
}
