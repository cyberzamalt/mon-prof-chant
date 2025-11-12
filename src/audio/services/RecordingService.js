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
  #startTime = 0;

  isRecording() { 
    return this.#recording; 
  }

  hasRecording() { 
    return !!this.#last.live; 
  }

  /**
   * AJOUT : Démarrer l'enregistrement (version simple)
   * Récupère automatiquement la source micro depuis audioEngine
   */
  async start() {
    if (this.#recording) {
      Logger.warn('[RecordingService] Déjà en cours d\'enregistrement');
      return true;
    }

    // Récupérer la source micro depuis audioEngine
    const sourceNode = audioEngine.micSource;
    
    if (!sourceNode) {
      const err = new Error('Pas de source micro disponible - démarrer le micro d\'abord');
      Logger.error('[RecordingService]', err);
      throw err;
    }

    Logger.info('[RecordingService] Démarrage enregistrement via start()...');
    
    // Déléguer à startFromSource()
    return this.startFromSource(sourceNode);
  }

  startFromSource(sourceNode) {
    if (this.#recording) {
      Logger.warn('[RecordingService] Déjà en cours d\'enregistrement');
      return true;
    }

    if (!sourceNode) {
      const err = new Error('Source node manquant');
      Logger.error('[RecordingService]', err);
      throw err;
    }

    // Utiliser audioEngine.context au lieu de audioEngine.ready()
    const context = audioEngine.context;
    if (!context) {
      const err = new Error('AudioEngine non initialisé - appelez audioEngine.init() d\'abord');
      Logger.error('[RecordingService]', err);
      throw err;
    }

    Logger.info('[RecordingService] Démarrage enregistrement...', {
      sampleRate: context.sampleRate,
      contextState: context.state
    });

    this.#gain = context.createGain();
    sourceNode.connect(this.#gain);

    const bs = 4096;
    const sp = context.createScriptProcessor(bs, 2, 2);
    this.#processor = sp;
    this.#collectL = [];
    this.#collectR = [];
    this.#startTime = Date.now();

    sp.onaudioprocess = (e) => {
      const L = e.inputBuffer.getChannelData(0);
      const R = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : L;
      this.#collectL.push(new Float32Array(L));
      this.#collectR.push(new Float32Array(R));
    };

    this.#gain.connect(sp);
    sp.connect(context.destination); // Nécessaire pour certains browsers
    this.#recording = true;
    
    Logger.info('[RecordingService] ✅ Enregistrement démarré', {
      bufferSize: bs,
      channels: 2
    });
    return true;
  }

  /**
   * AJOUT : Arrêter l'enregistrement (version simple)
   * Alias pour stopAndEncode() avec kind='live'
   */
  async stop() {
    Logger.info('[RecordingService] Arrêt via stop()...');
    return this.stopAndEncode('live');
  }

  async stopAndEncode(kind='live') {
    if (!this.#recording) {
      Logger.warn('[RecordingService] Pas d\'enregistrement en cours');
      return null;
    }

    const duration = Date.now() - this.#startTime;
    Logger.info('[RecordingService] Arrêt enregistrement...', { 
      duration: `${(duration/1000).toFixed(2)}s`,
      chunksL: this.#collectL.length,
      chunksR: this.#collectR.length
    });

    // Utiliser audioEngine.context au lieu de audioEngine.ready()
    const context = audioEngine.context;
    if (!context) {
      const err = new Error('AudioEngine non initialisé');
      Logger.error('[RecordingService]', err);
      throw err;
    }

    // Teardown graph
    try {
      this.#processor.disconnect(); 
      this.#gain.disconnect();
      Logger.info('[RecordingService] Audio graph déconnecté');
    } catch (e) {
      Logger.error('[RecordingService] Erreur déconnexion audio graph', e);
    }
    
    this.#processor = null; 
    this.#gain = null;
    this.#recording = false;

    // Merge chunks
    const merge = (chunks) => {
      const len = chunks.reduce((a, b) => a + b.length, 0);
      const out = new Float32Array(len);
      let off = 0; 
      for (const c of chunks) { 
        out.set(c, off); 
        off += c.length; 
      }
      return out;
    };

    const l = merge(this.#collectL);
    const r = merge(this.#collectR);
    this.#collectL = []; 
    this.#collectR = [];

    Logger.info('[RecordingService] Samples fusionnés', {
      totalSamples: l.length,
      durationCalc: `${(l.length / context.sampleRate).toFixed(2)}s`
    });

    // Encode MP3 with lamejs
    const sr = context.sampleRate;
    const ch = 2;
    const interleaved = interleave(l, r);
    
    Logger.info('[RecordingService] Encodage MP3...', {
      sampleRate: sr,
      channels: ch,
      kbps: 192
    });

    const mp3 = encodeMp3(interleaved, sr, ch, 192);

    const blob = new Blob([new Uint8Array(mp3)], {type:'audio/mpeg'});
    const name = `${kind==='ref'?'reference':'prise-live'}_${ts()}.mp3`;
    const file = { 
      blob, 
      name, 
      duration: (interleaved.length / sr * 1000).toFixed(0),  // en ms
      mp3Blob: blob  // Ajout pour compatibilité avec app.html ligne 118
    };
    
    this.#last[kind] = file;
    
    Logger.info('[RecordingService] ✅ Enregistrement terminé', { 
      filename: name,
      duration: `${(file.duration/1000).toFixed(2)}s`, 
      size: `${(blob.size/1024).toFixed(1)} KB`
    });
    
    return file;

    function interleave(L, R) {
      const len = Math.min(L.length, R.length);
      const out = new Float32Array(len * 2);
      let i = 0, j = 0;
      while (i < len) {
        out[j++] = L[i];
        out[j++] = R[i];
        i++;
      }
      return out;
    }

    function encodeMp3(float32, sampleRate, channels, kbps) {
      const samples = floatTo16BitPCM(float32);
      const mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
      const mp3 = [];
      const block = 1152 * channels;
      
      for (let i = 0; i < samples.length; i += block) {
        const left = samples.subarray(i, i + block).filter((_, idx) => idx % 2 === 0);
        const right = samples.subarray(i, i + block).filter((_, idx) => idx % 2 === 1);
        const chunk = mp3enc.encodeBuffer(left, right);
        if (chunk.length) mp3.push(chunk);
      }
      
      const end = mp3enc.flush();
      if (end.length) mp3.push(end);
      
      return new Uint8Array(concat(mp3));
    }

    function floatTo16BitPCM(input) {
      const out = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        let s = Math.max(-1, Math.min(1, input[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return out;
    }

    function concat(chunks) {
      let len = 0; 
      chunks.forEach(c => len += c.length);
      const out = new Uint8Array(len);
      let o = 0; 
      for (const c of chunks) { 
        out.set(c, o); 
        o += c.length; 
      }
      return out;
    }

    function ts() {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    }
  }

  getLast(kind='live') { 
    return this.#last[kind]; 
  }
}
