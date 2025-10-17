// PitchCurveDisplay.js — Canvas performant, axes (temps + cents), ligne médiane, curseur, zoom
export default class PitchCurveDisplay {
  constructor(canvas, {mode='cents', yZoom=1, showCursor=false} = {}){
    this.cv = canvas; this.cx = canvas.getContext('2d');
    this.points = [];        // {t, v}  (t en secondes, v = cents ou Hz)
    this.t0 = 0;             // origine time
    this.mode = mode;        // 'cents' | 'notes' (pour cette version on trace surtout 'cents')
    this.yZoom = yZoom;      // 1 / 2 / 4  (plus grand = plus “zoomé”)
    this.live = false;
    this.cursor = showCursor;
    this.cursorTime = 0;
    this.animate();
  }

  setMode(m){ this.mode = (m==='notes'?'notes':'cents'); }
  setZoom(z){ this.yZoom = Math.max(1, Math.min(4, z)); }
  setLive(on){ this.live = !!on; }
  setCursor(on){ this.cursor = !!on; }

  reset(t0){ this.points.length=0; this.t0 = t0||0; }

  addPoint(timeSec, value, meta={}){
    // On accumule mais on limite le nombre (sliding window ~ 10 min à 60fps → suffisant)
    this.points.push({ t: timeSec, v: value });
    // purge lointaine pour éviter explosion mémoire (>10min)
    const limit = (this.t0||this.points[0]?.t || 0) + 600; // 10 minutes visibles
    while (this.points.length && this.points[0].t < limit-600) this.points.shift();
    this.cursorTime = timeSec;
  }

  // ——— mapping
  #yFromCents(c){
    const range = 300/this.yZoom;           // ±300 cents de base → zoom
    const min = -range, max = +range;
    const h = this.cv.height - 40;          // padding bas pour labels
    const y = (1 - (c - min)/(max-min)) * (h-20) + 10; // marge top/bot
    return Math.max(10, Math.min(h, y));
  }
  #xFromTime(t){
    const w = this.cv.width - 40; // padding gauche pour graduation Y
    const secondsSpan = 120;      // 2 minutes visibles par défaut
    const x = 30 + ((t - this.t0) % secondsSpan) / secondsSpan * (w-10);
    return Math.max(30, Math.min(this.cv.width-10, x));
  }

  // ——— dessin axes + grille
  #drawAxes(){
    const {cx, cv} = this;
    cx.clearRect(0,0,cv.width,cv.height);
    cx.lineWidth = 1; cx.strokeStyle = '#1d2740';
    // cadre
    cx.strokeRect(30, 10, cv.width-40, cv.height-50);

    // mediane 0c
    if (this.mode==='cents'){
      const y0 = this.#yFromCents(0);
      cx.strokeStyle = 'rgba(34,197,94,.9)'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(30, y0); cx.lineTo(cv.width-10, y0); cx.stroke();
      cx.fillStyle = '#a7f3d0'; cx.font = '12px system-ui'; cx.fillText('0 cent (référence)', 36, y0-6);

      // ticks verticaux (cents)
      cx.strokeStyle = '#152038'; cx.lineWidth = 1; cx.fillStyle='#8aa2c0';
      cx.font = '11px system-ui';
      for (let c=-300; c<=300; c+=100){
        const y = this.#yFromCents(c);
        cx.beginPath(); cx.moveTo(30, y); cx.lineTo(36, y); cx.stroke();
        cx.fillText((c>0?'+':'')+c+' c', 6, y+4);
      }
    }

    // axe temps
    cx.strokeStyle='#152038'; cx.fillStyle='#8aa2c0'; cx.font='11px system-ui';
    const w = cv.width-40, span=120; // 2min
    for (let s=0; s<=span; s+=10){
      const x = 30 + s/span*(w-10);
      cx.beginPath(); cx.moveTo(x, cv.height-40); cx.lineTo(x, cv.height-36); cx.stroke();
      cx.fillText((s/1).toString().padStart(2,'0'), x-6, cv.height-22);
    }
    cx.fillText('Échelle de temps (s)', 30, cv.height-8);
  }

  // ——— dessin courbe
  #drawCurve(){
    if (!this.live && !this.cursor) return; // rien à dessiner si pas live et pas en rec
    const {cx} = this;
    cx.lineWidth = 1.8; cx.strokeStyle = '#7dd3fc'; cx.beginPath();
    let started=false;
    for (let i=0;i<this.points.length;i++){
      const p = this.points[i];
      const x = this.#xFromTime(p.t);
      const y = this.mode==='cents' ? this.#yFromCents(p.v) : this.#yFromCents(0); // (notes → TODO mapping vertical)
      if (!started){ cx.moveTo(x,y); started=true; } else { cx.lineTo(x,y); }
    }
    cx.stroke();
  }

  #drawCursor(){
    if (!this.cursor) return;
    const x = this.#xFromTime(this.cursorTime);
    const {cx, cv} = this;
    cx.strokeStyle='rgba(245,158,11,.95)'; cx.lineWidth=2;
    cx.beginPath(); cx.moveTo(x,10); cx.lineTo(x,cv.height-40); cx.stroke();
  }

  // ——— render loop
  animate(){
    this.#drawAxes();
    this.#drawCurve();
    this.#drawCursor();
    requestAnimationFrame(()=>this.animate());
  }
}
