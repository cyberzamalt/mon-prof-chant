// src/audio/services/RecordingService.js
// MP3 only via lamejs (vendor/lame.min.js)
import { Logger } from '../../logging/Logger.js';
import { audioEngine } from '../core/AudioEngine.js';

export class RecordingService {
  #processor = null;
  #gain = null;
  #collectL = [];
  #collectR = [];
  #recording = false;
  #last = { live:null, ref:null };

  isRecording(){ return this.#recording; }
  hasRecording(){ return !!this.#last.live; }

  startFromSource(sourceNode){
    if(this.#recording) return true;
    const { context } = audioEngine.ready();

    this.#gain = context.createGain();
    sourceNode.connect(this.#gain);

    const bs = 4096;
    const sp = context.createScriptProcessor(bs, 2, 2);
    this.#processor = sp;
    this.#collectL = [];
    this.#collectR = [];

    sp.onaudioprocess = (e)=>{
      const L = e.inputBuffer.getChannelData(0);
      const R = e.inputBuffer.numberOfChannels>1 ? e.inputBuffer.getChannelData(1) : L;
      this.#collectL.push(new Float32Array(L));
      this.#collectR.push(new Float32Array(R));
    };

    this.#gain.connect(sp);
    sp.connect(context.destination); // nécessaire pour certains browsers
    this.#recording = true;
    Logger.info('[RecordingService] Enregistrement démarré');
    return true;
  }

  async stopAndEncode(kind='live'){
    if(!this.#recording) return null;
    const { context } = audioEngine.ready();

    // teardown graph
    try{
      this.#processor.disconnect(); this.#gain.disconnect();
    }catch(_){}
    this.#processor = null; this.#gain = null;
    this.#recording = false;

    // merge
    const merge = (chunks)=>{
      const len = chunks.reduce((a,b)=>a+b.length,0);
      const out = new Float32Array(len);
      let off=0; for(const c of chunks){ out.set(c, off); off+=c.length; }
      return out;
    };
    const l = merge(this.#collectL);
    const r = merge(this.#collectR);
    this.#collectL = []; this.#collectR = [];

    // encode MP3 with lamejs
    const sr = context.sampleRate;
    const ch = 2;
    // downmix if mono
    const interleaved = interleave(l, r);
    const mp3 = encodeMp3(interleaved, sr, ch, 192);

    const blob = new Blob([new Uint8Array(mp3)], {type:'audio/mpeg'});
    const name = `${kind==='ref'?'reference':'prise-live'}_${ts()}.mp3`;
    const file = { blob, name, duration: (interleaved.length/sr).toFixed(2) };
    this.#last[kind] = file;
    Logger.info('[RecordingService] Enregistrement arrêté ', { duration:file.duration, size:(blob.size/1024).toFixed(1)+'KB' });
    return file;

    function interleave(L,R){
      const len = Math.min(L.length, R.length);
      const out = new Float32Array(len*2);
      let i=0,j=0;
      while(i<len){
        out[j++] = L[i];
        out[j++] = R[i];
        i++;
      }
      return out;
    }
    function encodeMp3(float32, sampleRate, channels, kbps){
      const samples = floatTo16BitPCM(float32);
      const mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
      const mp3 = [];
      const block = 1152*channels;
      for(let i=0;i<samples.length;i+=block){
        const left = samples.subarray(i, i+block).filter((_,idx)=>idx%2===0);
        const right= samples.subarray(i, i+block).filter((_,idx)=>idx%2===1);
        const chunk = mp3enc.encodeBuffer(left, right);
        if(chunk.length) mp3.push(chunk);
      }
      const end = mp3enc.flush();
      if(end.length) mp3.push(end);
      return new Uint8Array(concat(mp3));
    }
    function floatTo16BitPCM(input){
      const out = new Int16Array(input.length);
      for(let i=0;i<input.length;i++){
        let s = Math.max(-1, Math.min(1, input[i]));
        out[i] = s<0 ? s*0x8000 : s*0x7FFF;
      }
      return out;
    }
    function concat(chunks){
      let len=0; chunks.forEach(c=>len+=c.length);
      const out = new Uint8Array(len);
      let o=0; for(const c of chunks){ out.set(c,o); o+=c.length; }
      return out;
    }
    function ts(){
      const d=new Date();
      const p=n=>String(n).padStart(2,'0');
      return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    }
  }

  getLast(kind='live'){ return this.#last[kind]; }
}
