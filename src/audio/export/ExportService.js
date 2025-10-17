// src/audio/export/ExportService.js
// WebM -> WAV (decode+encode) -> MP3 (worker lamejs)

import { Logger } from '../../logging/Logger.js';

export default class ExportService {
  constructor() {
    this._ctx = null;
    this._worker = null;
  }

  async toWav(webmBlob) {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuf = await this._ctx.decodeAudioData(arrayBuffer);
    const wav = encodeWav(audioBuf);
    return new Blob([wav], { type: 'audio/wav' });
  }

  async toMp3(wavBlob, { bitrate = 128 } = {}) {
    const arrayBuffer = await wavBlob.arrayBuffer();
    const dv = new DataView(arrayBuffer);
    const pcm = parseWavToPCM(dv); // { sampleRate, channels, samples(Float32Array[]) }

    if (!this._worker) {
      this._worker = new Worker('./src/audio/export/workers/mp3Encoder.worker.js', { type: 'module' });
    }

    return new Promise((resolve, reject) => {
      this._worker.onmessage = (e) => {
        const { type, data } = e.data || {};
        if (type === 'done') {
          resolve(new Blob([data], { type: 'audio/mpeg' }));
        } else if (type === 'error') {
          reject(new Error(data || 'MP3 encoding failed'));
        }
      };
      this._worker.postMessage({
        type: 'encode',
        sampleRate: pcm.sampleRate,
        channels: pcm.channels,
        left: pcm.samples[0],
        right: pcm.channels > 1 ? pcm.samples[1] : null,
        bitrate
      }, [pcm.samples[0].buffer, pcm.channels>1 ? pcm.samples[1].buffer : null].filter(Boolean));
    });
  }

  save(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
}

// ---- WAV ENCODE helpers ----
function encodeWav(audioBuffer) {
  const numCh = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = [];
  let length = 0;
  for (let ch = 0; ch < numCh; ch++) {
    const data = audioBuffer.getChannelData(ch);
    samples.push(data);
    length = Math.max(length, data.length);
  }
  // interleave
  const interleaved = new Float32Array(length * numCh);
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      interleaved[i * numCh + ch] = samples[ch][i] || 0;
    }
  }
  // PCM16
  const buffer = new ArrayBuffer(44 + interleaved.length * 2);
  const view = new DataView(buffer);
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + interleaved.length * 2, true);
  writeString(view, 8, 'WAVE');
  // fmt 
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  // data
  writeString(view, 36, 'data');
  view.setUint32(40, interleaved.length * 2, true);
  floatTo16BitPCM(view, 44, interleaved);
  return view;
}
function writeString(view, offset, str) { for (let i=0;i<str.length;i++) view.setUint8(offset+i, str.charCodeAt(i)); }
function floatTo16BitPCM(view, offset, input) {
  for (let i=0; i<input.length; i++, offset+=2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}
function parseWavToPCM(view) {
  const numCh = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataOffset = 44;
  const bytes = view.byteLength - dataOffset;
  const samples = bytes / (bitsPerSample/8) / numCh;
  const out = [];
  for (let ch=0; ch<numCh; ch++) out.push(new Float32Array(samples));
  let idx = dataOffset;
  for (let i=0; i<samples; i++) {
    for (let ch=0; ch<numCh; ch++) {
      const v = view.getInt16(idx, true); idx += 2;
      out[ch][i] = v / 0x8000;
    }
  }
  return { sampleRate, channels: numCh, samples: out };
}
