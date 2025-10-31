// src/visualization/renderers/SinusoidalRenderer.js
import { Logger } from '../../logging/Logger.js';

export class SinusoidalRenderer {
  #canvas; #ctx; #analyser; #buf; #raf = null;
  #persistent = [];

  constructor(canvas){
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#buf = new Float32Array(2048);
    this.#drawBase(); // base au chargement
  }

  attachAnalyser(analyser){ this.#analyser = analyser; }

  start(){
    if(!this.#analyser || this.#raf) return;
    const loop = ()=>{
      this.#draw();
      this.#raf = requestAnimationFrame(loop);
    };
    loop();
    Logger.info('[SinusoidalRenderer] Rendu démarré');
  }

  stop(){ if(this.#raf){ cancelAnimationFrame(this.#raf); this.#raf = null; } }

  clear(){
    this.#persistent = [];
    this.#drawBase();
  }

  freeze(){
    const img = this.#ctx.getImageData(0, 0, this.#canvas.width, this.#canvas.height);
    this.#persistent.push(img);
  }

  #draw(){
    const g = this.#ctx, w = this.#canvas.width, h = this.#canvas.height;

    // fond + axes
    this.#drawBase();

    // couches persistantes
    for(const img of this.#persistent){ g.putImageData(img, 0, 0); }

    // onde live
    if(!this.#analyser) return;
    this.#analyser.getFloatTimeDomainData(this.#buf);

    g.lineWidth = 2;
    g.strokeStyle = '#2bdc7b';
    g.beginPath();

    const step = this.#buf.length / w;
    for(let x=0; x<w; x++){
      const v = this.#buf[Math.floor(x*step)] || 0;
      const y = h/2 + v * (h*0.40);
      if(x === 0) g.moveTo(0,y); else g.lineTo(x,y);
    }
    g.stroke();
  }

  // === base: fond, grille, légendes ===
  #drawBase(){
    const g = this.#ctx, w = this.#canvas.width, h = this.#canvas.height;

    // fond
    g.fillStyle = '#05080f';
    g.fillRect(0,0,w,h);

    // grille
    g.strokeStyle = '#1a2742';
    g.lineWidth = 1;
    g.beginPath();
    for(let x=0; x<w; x+=50){ g.moveTo(x,0); g.lineTo(x,h); }
    for(let y=0; y<h; y+=45){ g.moveTo(0,y); g.lineTo(w,y); }
    g.stroke();

    // axe central
    g.strokeStyle = '#2a3c5f';
    g.beginPath();
    g.moveTo(0, h/2); g.lineTo(w, h/2);
    g.stroke();

    // légendes temps (x)
    g.fillStyle = '#8ba0bf';
    g.font = '11px ui-sans-serif';
    for(let x=0; x<w; x+=100){
      g.fillText(String(Math.round(x/50))+'s', x+4, h-6);
    }

    // bandes hauteur (y)
    const bands = ['Très très grave','Très grave','Grave','Moyen-grave','Moyen','Moyen-aigu','Aigu','Très aigu','Très très aigu'];
    const stepY = h / bands.length;
    for(let i=0;i<bands.length;i++){
      const y = Math.round(stepY*(i+0.5));
      g.fillText(bands[bands.length-1-i], 8, y);
    }
  }
}
