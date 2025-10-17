// PitchService.js — mesure de pitch + enregistrement + exports
import { Logger } from '../../logging/Logger.js';

export default class PitchService {
  constructor(engine, { onReadyNote } = {}) {
    this.engine = engine;
    this.onReadyNote = onReadyNote;
    this.stream = null;
    this.srcNode = null;
    this.analyser = null;
    this.workBuf = new Float32Array(2048);
    this._lastHz = 0;
    this._refNote = null;

    // MediaRecorder
    this.recorder = null;
    this.chunks = [];
    this.recWebm = null;
  }

  async attachStream(stream){
    const ctx = this.engine.getContext();
    if(!ctx) throw new Error('AudioContext indisponible');
    this.stream = stream;
    this.srcNode = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.srcNode.connect(this.analyser);
    Logger.info('PitchService', 'Stream attached');

    // Fixe une note de ref dès la première note stable
    this._refNote = null; // sera déterminée à la 1re mesure fiable
  }

  // --- Détection de pitch (YIN simplifié) ---
  measure(){
    if(!this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this.workBuf);
    const hz = autoCorrelate(this.workBuf, this.engine.getContext().sampleRate);
    if(hz>0){
      this._lastHz = hz;
      if(!this._refNote){
        this._refNote = hzToNoteName(hz);
        this.onReadyNote?.(this._refNote.name);
      }
      const name = hzToNoteName(hz).name;
      const cents = centsFromRef(hz, this._refNote?.hz ?? hz);
      return { hz, noteName: name, cents };
    }
    return null;
  }

  async startRecord(){
    if(!this.stream) throw new Error('Aucun flux micro');
    if(this.recorder && this.recorder.state==='recording') return;
    this.chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    this.recorder = new MediaRecorder(this.stream, { mimeType: mime });
    this.recorder.ondataavailable = e=> e.data.size && this.chunks.push(e.data);
    this.recorder.onstop = ()=>{
      this.recWebm = new Blob(this.chunks, { type: this.recorder.mimeType });
    };
    this.recorder.start();
    Logger.info('PitchService', 'MediaRecorder started');
  }

  async stopRecord(){
    if(this.recorder && this.recorder.state!=='inactive'){
      await new Promise(res=>{ this.recorder.onstop = ()=>{ 
        this.recWebm = new Blob(this.chunks, { type: this.recorder.mimeType });
        res(); 
      }; this.recorder.stop(); });
      Logger.info('PitchService', 'MediaRecorder stopped');
    }
  }

  async getExports(){
    const out = {};
    if(this.recWebm) out.webm = { blob:this.recWebm, name: autoName('recording','.webm') };

    // WAV (PCM) depuis WebAudio (simple downmix)
    if(this.recWebm){
      const wav = await webmToWav(this.recWebm);
      if(wav) out.wav = { blob:wav, name: autoName('recording','.wav') };
      const mp3 = await wavToMp3(wav);
      if(mp3) out.mp3 = { blob:mp3, name: autoName('recording','.mp3') };
    }
    return out;
  }
}

/* ---------- Utils pitch ---------- */
function autoCorrelate(buf, sampleRate){
  // YIN-like autocorrelation (rapide & robuste voix)
  let SIZE = buf.length;
  let rms=0;
  for(let i=0;i<SIZE;i++){ const v=buf[i]; rms+=v*v; }
  rms = Math.sqrt(rms/SIZE);
  if(rms<0.01) return -1;

  let r1=0, r2=SIZE-1, th=0.2;
  for(let i=0;i<SIZE/2;i++){ if(Math.abs(buf[i])<th){ r1=i; break; } }
  for(let i=1;i<SIZE/2;i++){ if(Math.abs(buf[SIZE-i])<th){ r2=SIZE-i; break; } }
  buf = buf.slice(r1, r2); SIZE = buf.length;

  const c = new Array(SIZE).fill(0);
  for(let i=0;i<SIZE;i++){
    for(let j=0;j<SIZE-i;j++) c[i]+=buf[j]*buf[j+i];
  }
  let d=0; while(d<SIZE && c[d]>c[d+1]) d++;
  let maxval=-1, maxpos=-1;
  for(let i=d;i<SIZE;i++){ if(c[i]>maxval){ maxval=c[i]; maxpos=i; } }
  let T0 = maxpos;
  const x1=c[T0-1], x2=c[T0], x3=c[T0+1];
  const a=(x1+x3-2*x2)/2, b=(x3-x1)/2;
  if(a) T0 = T0 - b/(2*a);
  return sampleRate/T0;
}

function hzToNoteName(hz){
  // A4 = 440Hz
  const A4=440, A4_MIDI=69;
  const midi = Math.round(12*Math.log2(hz/A4))+A4_MIDI;
  const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const name = names[(midi+1200)%12] + Math.floor((midi-12)/12);
  return { name, hzFromMidi: midiToHz(midi), hz };
}
function midiToHz(m){ return 440*Math.pow(2,(m-69)/12); }

function centsFromRef(hz, refHz){
  // distance en cents entre hz et refHz
  return 1200*Math.log2(hz/refHz);
}

function autoName(base, ext){ const d=new Date(); const t=d.toISOString().replace(/[:.]/g,'-'); return `${base}-${t}${ext}`; }

/* ---------- Conversions audio (simples) ---------- */
async function webmToWav(webmBlob){
  try{
    const ab = await webmBlob.arrayBuffer();
    const ctx = new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1, 48000*10, 48000); // buffer dummy
    const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const audioBuf = await audioCtx.decodeAudioData(ab);
    // encode PCM WAV
    const wav = encodeWav(audioBuf);
    audioCtx.close();
    return new Blob([wav], { type:'audio/wav' });
  }catch{ return null; }
}
function encodeWav(audioBuffer){
  const numCh = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length*2);
  const view = new DataView(buffer);

  function writeString(o,s){ for (let i=0;i<s.length;i++) view.setUint8(o+i, s.charCodeAt(i)); }
  function write16(o,v){ view.setUint16(o,v,true); }
  function write32(o,v){ view.setUint32(o,v,true); }

  writeString(0,'RIFF'); write32(4,36+samples.length*2); writeString(8,'WAVE');
  writeString(12,'fmt '); write32(16,16); write16(20,1); write16(22,numCh);
  write32(24,sampleRate); write32(28,sampleRate*numCh*2); write16(32,numCh*2); write16(34,16);
  writeString(36,'data'); write32(40,samples.length*2);
  // PCM16
  let offset=44;
  for(let i=0;i<samples.length;i++){ 
    let s = Math.max(-1, Math.min(1, samples[i])); 
    view.setInt16(offset, s<0 ? s*0x8000 : s*0x7FFF, true); 
    offset+=2; 
  }
  return view;
}

async function wavToMp3(wavBlob){
  // Sans dépendance lourde : on garde cette étape optionnelle (peut renvoyer null si indispo)
  // Tu as déjà WebM/WAV fiables. MP3 restera best-effort.
  try{
    // Si tu ajoutes lamejs plus tard, on branchera ici.
    return null;
  }catch{ return null; }
}
