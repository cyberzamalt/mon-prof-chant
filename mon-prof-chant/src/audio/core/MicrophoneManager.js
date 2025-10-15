// MicrophoneManager.js — permissions, source, MediaRecorder + exports WAV/MP3
export default class MicrophoneManager {
  #engine; #stream=null; #source=null; #rec=null; #chunks=[];
  constructor(engine){ this.#engine = engine; }

  async open(){
    if (this.#stream) return;
    const constraints = { audio: {
      channelCount: 1, noiseSuppression: true, echoCancellation: true, autoGainControl: true,
      sampleRate: this.#engine.sampleRate()
    }};
    this.#stream = await navigator.mediaDevices.getUserMedia(constraints);
  }
  isOpen(){ return !!this.#stream; }

  createSource(){
    if (!this.#stream) throw new Error('Micro non ouvert');
    const src = this.#engine.ctx().createMediaStreamSource(this.#stream);
    this.#source = src; return src;
  }
  getSource(){ return this.#source; }

  async startRecording(){
    if (!this.#stream) throw new Error('Micro non ouvert');
    this.#chunks = [];
    const mime = this.#pickMimeType();
    this.#rec = new MediaRecorder(this.#stream, { mimeType: mime, audioBitsPerSecond: 128000 });
    this.#rec.ondataavailable = (e)=>{ if (e.data && e.data.size) this.#chunks.push(e.data); };
    this.#rec.start();
  }
  async stopRecording(){
    if (!this.#rec) return null;
    const done = new Promise(res=>{
      this.#rec.onstop = ()=>res(new Blob(this.#chunks, { type: this.#rec.mimeType }));
    });
    this.#rec.stop();
    return await done;
  }

  // ——— Exports
  async exportWav(){
    // Décodage → ré-encodage PCM WAV
    const webm = await this.stopRecordingIfRunning();
    const buf = await webm.arrayBuffer();
    const audio = await new AudioContext().decodeAudioData(buf);
    const wav = this.#encodeWav(audio);
    return new Blob([wav], { type: 'audio/wav' });
  }

  async exportMp3(){
    // Simple transcoding client (lamejs). CDN light si présent, fallback WAV -> MP3 minimal.
    if (!window.lamejs) {
      // charger à la volée
      await this.#loadScript('https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js');
    }
    const webm = await this.stopRecordingIfRunning();
    const buf = await webm.arrayBuffer();
    const ac  = new AudioContext();
    const audio = await ac.decodeAudioData(buf);
    // stéréo attendu par lame -> dupliquer mono
    const ch = audio.numberOfChannels>0 ? audio.getChannelData(0) : new Float32Array();
    const pcm16 = this.#floatTo16BitPCM(ch);
    const wavBlob = new Blob([this.#wavFromPCM16(pcm16, audio.sampleRate)], {type:'audio/wav'});
    // lamejs depuis wav (simple & robuste)
    const reader = new FileReader();
    const arrayBuffer = await new Promise(r=>{ reader.onload = ()=>r(reader.result); reader.readAsArrayBuffer(wavBlob); });
    const wavView = new DataView(arrayBuffer);
    const pcmData = new Int16Array(arrayBuffer, 44); // après header WAV
    const mp3enc = new lamejs.Mp3Encoder(1, audio.sampleRate, 128);
    const mp3Data = [];
    for (let i=0; i<pcmData.length; i+=1152){
      const mono = pcmData.subarray(i, i+1152);
      const mp3buf = mp3enc.encodeBuffer(mono);
      if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));
    }
    const end = mp3enc.flush(); if (end.length>0) mp3Data.push(new Int8Array(end));
    return new Blob(mp3Data, {type:'audio/mpeg'});
  }

  async stopRecordingIfRunning(){
    if (this.#rec && this.#rec.state==='recording'){
      return await this.stopRecording();
    }
    // reconstruire blob courant si déjà stoppé
    return new Blob(this.#chunks, { type: this.#rec?.mimeType || 'audio/webm' });
  }

  // ——— helpers encodage
  #floatTo16BitPCM(float32){
    const out = new Int16Array(float32.length);
    for (let i=0;i<float32.length;i++){
      const s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  }
  #wavFromPCM16(pcm16, sampleRate){
    // header WAV minimal mono
    const blockAlign = 2, byteRate = sampleRate*blockAlign;
    const buffer = new ArrayBuffer(44 + pcm16.length*2);
    const view = new DataView(buffer);
    let p = 0;
    const w = (s)=>{ view.setUint8(p++, s.charCodeAt(0)); };
    "RIFF".split('').forEach(w);
    view.setUint32(p, 36 + pcm16.length*2, true); p+=4;
    "WAVEfmt ".split('').forEach(w);
    view.setUint32(p,16,true); p+=4; view.setUint16(p,1,true); p+=2; view.setUint16(p,1,true); p+=2;
    view.setUint32(p,sampleRate,true); p+=4; view.setUint32(p,byteRate,true); p+=4; view.setUint16(p,blockAlign,true); p+=2; view.setUint16(p,16,true); p+=2;
    "data".split('').forEach(w);
    view.setUint32(p, pcm16.length*2, true); p+=4;
    for (let i=0;i<pcm16.length;i++,p+=2) view.setInt16(p, pcm16[i], true);
    return view;
  }
  #encodeWav(audio){
    const ch = audio.getChannelData(0);
    const pcm16 = this.#floatTo16BitPCM(ch);
    return this.#wavFromPCM16(pcm16, audio.sampleRate).buffer;
  }
  #pickMimeType(){
    const opts = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'];
    return opts.find(t=>MediaRecorder.isTypeSupported(t)) || '';
  }
  async #loadScript(src){ await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('CDN MP3')); document.head.appendChild(s); }); }
}
