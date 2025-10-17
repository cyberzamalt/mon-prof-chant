// WAVExport — convertit un Blob WebM/Opus en WAV PCM 16-bit
// Usage: const wavBlob = await WAVExport.fromWebM(webmBlob);

const WAVExport = (() => {
  async function decodeBlobToBuffer(blob) {
    const array = await blob.arrayBuffer();
    const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 48000);
    // On ne peut pas utiliser OfflineAudioContext directement pour decodeAudioData sur tous les navigateurs,
    // on crée un AudioContext classique quand c'est nécessaire :
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const buf = await ac.decodeAudioData(array.slice(0));
    ac.close();
    return buf;
  }

  function encodeWAVPCM16(interleaved, sampleRate) {
    const bytesPerSample = 2;
    const blockAlign = 1 * bytesPerSample;
    const buffer = new ArrayBuffer(44 + interleaved.length * bytesPerSample);
    const view = new DataView(buffer);

    function writeString(off, s) { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); }

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + interleaved.length * bytesPerSample, true);
    writeString(8, 'WAVE');

    // fmt  subchunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);           // Subchunk1Size
    view.setUint16(20, 1, true);            // PCM
    view.setUint16(22, 1, true);            // channels
    view.setUint32(24, sampleRate, true);   // sample rate
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);   // block align
    view.setUint16(34, 16, true);           // bits per sample

    // data subchunk
    writeString(36, 'data');
    view.setUint32(40, interleaved.length * bytesPerSample, true);

    // samples
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, interleaved[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  async function fromWebM(webmBlob) {
    try {
      const buf = await decodeBlobToBuffer(webmBlob);
      const ch = buf.numberOfChannels > 1 ? mixToMono(buf) : buf.getChannelData(0);
      return encodeWAVPCM16(ch, buf.sampleRate);
    } catch (e) {
      console.error('[WAVExport] fromWebM error', e);
      return null;
    }
  }

  function mixToMono(audioBuffer) {
    const out = new Float32Array(audioBuffer.length);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) out[i] += data[i] / audioBuffer.numberOfChannels;
    }
    return out;
  }

  return { fromWebM };
})();
