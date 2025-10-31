// src/visualization/renderers/SinusoidalRenderer.js
import { Logger } from '../../logging/Logger.js';

export class SinusoidalRenderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.analyser = null;
    this.running = false;
    this.persistent = !!opts.persistent; // si true : scrolling, on conserve l’historique
    this._timeLastTick = 0;
    this._gridEvery = 1000; // ms entre graduations temps en x
    this._scrollSpeed = 2;  // px/frame
    this._bg = '#0a1224';
    this._grid = '#1d2b4a';
    this._axis = '#2a3b63';
    this._wave = '#2ee59d';

    this._drawBackdrop();
  }

  attachAnalyser(analyser){ this.analyser = analyser; }

  start(){
    if (this.running) return;
    this.running = true;
    this._loop = (t)=>{ if(!this.running) return; this._tick(t); requestAnimationFrame(this._loop); };
    requestAnimationFrame(this._loop);
    Logger.info('[SinusoidalRenderer] Rendu démarré');
  }

  stop(){ this.running = false; }
  clear(){ this._drawBackdrop(); }

  _tick(now){
    const {ctx,canvas} = this;
    const W = canvas.width, H = canvas.height;

    if (!this.analyser){
      // clignote doucement pour indiquer “inactif”
      if (now - this._timeLastTick > 500) { this._drawBackdrop(); this._timeLastTick = now; }
      return;
    }

    // Scroll si persistant
    if (this.persistent){
      const img = ctx.getImageData(this._scrollSpeed, 0, W - this._scrollSpeed, H);
      ctx.putImageData(img, 0, 0);
      // colonne droite effacée
      ctx.fillStyle = this._bg;
      ctx.fillRect(W - this._scrollSpeed, 0, this._scrollSpeed, H);
      // grille verticale légère toutes les ~1s (visuel)
      if (now - this._timeLastGridTime > this._gridEvery) {
        ctx.fillStyle = this._grid;
        ctx.fillRect(W - this._scrollSpeed, 0, 1, H);
        this._timeLastGridTime = now;
      }
      // axes Y (garde-visuel discret)
      ctx.fillStyle = this._axis;
      ctx.fillRect(0, Math.round(H/2), 8, 1);
    } else {
      this._drawBackdrop();
    }

    // Récupère la forme d’onde
    const buffer = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(buffer);

    // Trace la colonne à droite (mode scroll) OU la courbe entière (mode non persistant)
    ctx.strokeStyle = this._wave;
    ctx.lineWidth = 2;

    if (this.persistent) {
      // On trace seulement la colonne la plus récente sur la bande droite
      // en la mappant verticalement
      const x0 = this.canvas.width - Math.ceil(this._scrollSpeed/2) - 1;
      for (let y = 0; y < this.canvas.height; y++){
        // correspondance inverse: on échantillonne la donnée selon la hauteur
        const idx = Math.floor((y / this.canvas.height) * buffer.length);
        const val = buffer[idx]; // 0..255
        const centered = (val - 128) / 128; // -1..1
        const amp = Math.abs(centered);
        if (amp > 0.02) { // petit seuil pour éviter le bruit de fond
          this.ctx.fillStyle = this._wave;
          this.ctx.fillRect(x0, this.canvas.height - 1 - y, 1, 1);
        }
      }
    } else {
      ctx.beginPath();
      const slice = this.canvas.width / buffer.length;
      for (let i=0;i<buffer.length;i++){
        const v = (buffer[i] - 128) / 128; // -1..1
        const x = i * slice;
        const y = (1 - (v+1)/2) * this.canvas.height;
        i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
      }
      ctx.stroke();
    }
  }

  _drawBackdrop(){
    const {ctx,canvas} = this;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = this._bg; ctx.fillRect(0,0,W,H);

    // grille
    ctx.strokeStyle = this._grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x=0; x<=W; x+= Math.round(W/12)) { ctx.moveTo(x,0); ctx.lineTo(x,H); }
    for (let y=0; y<=H; y+= Math.round(H/10)) { ctx.moveTo(0,y); ctx.lineTo(W,y); }
    ctx.stroke();

    // axes + labels d’échelle (y: registre vocal — très grave → très aigu)
    ctx.fillStyle = this._axis; ctx.fillRect(0, Math.round(H/2), W, 1);
    ctx.fillStyle = '#9fb7ff'; ctx.font = '12px system-ui,Arial';
    const labels = ['Très très grave','Très grave','Grave','Moyen','Aigu','Très aigu','Très très aigu'];
    const pos = [H-4, H*0.8, H*0.65, H*0.5, H*0.35, H*0.2, 14];
    labels.forEach((txt,i)=>{ ctx.fillText(txt, 6, pos[i]); });

    // temps (x)
    ctx.fillStyle = '#cbd5e1';
    for (let i=0;i<=12;i++){
      const x = Math.round(i*(W/12));
      ctx.fillRect(x, H-10, 1, 10);
      ctx.fillText(String(i), x+4, H-2);
    }
  }
}
