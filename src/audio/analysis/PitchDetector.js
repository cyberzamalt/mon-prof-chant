// PitchDetector.js — wrapper Pitchy, renvoie soit 'cents' (±) soit 'notes' (Hz→note)
export default class PitchDetector {
  #engine; #analyser; #buf; #det; #running=false; #mode='cents';
  #clarity=0; #refHz=null; #t0=0; #onPitch=null;
  constructor(engine, {onPitch, bufferSize=2048, clarity=0.85} = {}){
    this.#engine = engine;
    this.#onPitch = onPitch || (()=>{});
    const ctx = engine.ctx();
    this.#analyser = ctx.createAnalyser();
    this.#analyser.fftSize = bufferSize;
    this.#buf = new Float32Array(bufferSize);
    this.#det = Pitchy.PitchDetector.forFloat32Array(bufferSize);
    this.#t0 = ctx.currentTime;
    this.#clarity = clarity;
  }
  connect(source){ source.connect(this.#analyser); }
  setMode(m){ this.#mode = (m==='notes'?'notes':'cents'); }
  start(){ if (this.#running) return; this.#running=true; this.#loop(); }
  stop(){ this.#running=false; }
  destroy(){ this.stop(); try{ this.#analyser.disconnect(); }catch{} }

  #loop(){
    if (!this.#running) return;
    this.#analyser.getFloatTimeDomainData(this.#buf);
    const [hz, cl] = this.#det.findPitch(this.#buf, this.#engine.sampleRate());
    if (cl >= this.#clarity && hz>0){
      if (this.#refHz===null) this.#refHz = hz; // première note stable = ligne médiane
      const timeSec = this.#engine.currentTime();
      const out = (this.#mode==='cents')
        ? { value: 1200*Math.log2(hz/this.#refHz), meta: { hz, clarity: cl, refHz:this.#refHz } }
        : { value: hz, meta: { hz, clarity: cl } };
      this.#onPitch({ timeSec, ...out });
    }
    requestAnimationFrame(()=>this.#loop());
  }
}
