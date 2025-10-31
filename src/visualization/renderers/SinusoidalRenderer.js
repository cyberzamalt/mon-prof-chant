// src/visualization/renderers/SinusoidalRenderer.js
import { Logger } from '../../logging/Logger.js';

export class SinusoidalRenderer {
  #ctx; #canvas; #analyser; #buf; #raf=null;
  #persistent = []; // tracés figés

  constructor(canvas){
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#buf = new Float32Array(2048);
  }

  attachAnalyser(analyser){ this.#analyser = analyser; }

  start(){
    if(!this.#analyser) return;
    if(this.#raf) return;
    const loop = ()=>{
      this.#draw();
      this.#raf = requestAnimationFrame(loop);
    };
    loop();
    Logger.info('[SinusoidalRenderer] Rendu démarré');
  }

  stop(){ if(this.#raf){ cancelAnimationFrame(this.#raf); this.#raf=null; } }

  clear(){ this.#persistent = []; this.#drawBase(); }

  freeze(){
    // Capture l’onde affichée (persistance)
    const snap = this.#snapshot();
    this.#persistent.push(snap);
  }

  #snapshot(){
    const w = this.#canvas.width, h = this.#canvas.height;
    const img = this.#ctx.getImageData(0,0,w,h);
    return img;
  }

  #restore(img){ this.#ctx.putImageData(img, 0, 0); }

  #draw(){
    const c=this.#canvas, g=this.#ctx, w=c.width, h=c.height;
    // fond + grilles + axes
    g.fillStyle='#05080f'; g.fillRect(0,0,w,h);
    this.#drawAxes(g,w,h);

    // traces persistants
    for(const img of this.#persistent){ this.#restore(img); }

    // live wave
    this.#analyser.getFloatTimeDomainData(this.#buf);
    g.lineWidth = 2; g.strokeStyle = '#2bdc7b';
    g.beginPath();
    const step = this.#buf.length / w;
    for(let x=0; x<w; x++){
      const v = this.#buf[Math.floor(x*step)];
      const y = h/2 + v * (h*0.40);
      if(x===0) g.moveTo(0,y); else g.lineTo(x,y);
    }
    g.stroke();
  }

  #drawAxes(g,w,h){
    // Grille verticale (temps ~ pixels) et horizontale
    g.strokeStyle='#1a2742'; g.lineWidth=1;
    g.beginPath();
    for(let x=0;x<w;x+=50){ g.moveTo(x,0); g.lineTo(x,h); }
    for(let y=0;y<h;y+=45){ g.moveTo(0,y); g.lineTo(w,y); }
    g.stroke();

    // Axe central
    g.strokeStyle='#2a3c5f'; g.beginPath();
    g.moveTo(0,h/2); g.lineTo(w,h/2); g.stroke();

    // Légendes temps (x)
    g.fillStyle='#8ba0bf'; g.font='11px ui-sans-serif';
    for(let x=0;x<w;x+=100){ g.fillText(String(Math.round(x/50))+'s', x+4, h-6); }

    // Bandeau "hauteur" subjectif (y)
    const bands = ['Très très grave','Très grave','Grave','Moyen-grave','Moyen',
                   'Moyen-aigu','Aigu','Très aigu','Très très aigu'];
    const step = h/(bands.length);
    for(let i=0;i<bands.length;i++){
      const y = Math.round(step*(i+0.5));
      g.fillText(bands[bands.length-1-i], 8, y);
    }
  }
}
