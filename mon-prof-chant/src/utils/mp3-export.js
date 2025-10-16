// MP3Export — convertit un Blob WAV en MP3 via lamejs (local)
// Nécessite que /src/vendor/lame.min.js soit présent et charge la lib dans window.lamejs
// Usage: const mp3Blob = await MP3Export.fromWAV(wavBlob);

const MP3Export = (() => {
  function isReady() {
    return !!(window.lamejs && window.lamejs.Mp3Encoder);
  }

  async function fromWAV(wavBlob) {
    if (!isReady()) {
      console.warn('[MP3Export] lamejs indisponible');
      return null;
    }
    const arrayBuffer = await wavBlob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // simple WAV reader
    const channels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitsPerSample = view.getUint16(34, true);
    let dataOffset = 12;
    while (dataOffset < view.byteLength) {
      const id = String.fromCharCode(view.getUint8(dataOffset)) +
                 String.fromCharCode(view.getUint8(dataOffset + 1)) +
                 String.fromCharCode(view.getUint8(dataOffset + 2)) +
                 String.fromCharCode(view.getUint8(dataOffset + 3));
      const size = view.getUint32(dataOffset + 4, true);
      if (id === 'data') { dataOffset += 8; break; }
      dataOffset += 8 + size;
    }

    const samples = (bitsPerSample === 16)
      ? new Int16Array(arrayBuffer, dataOffset)
      : pcm8To16(new Uint8Array(arrayBuffer, dataOffset));

    // Encodage MP3 mono
    const lame = window.lamejs;
    const encoder = new lame.Mp3Encoder(1, sampleRate, 128);
    const CHUNK = 1152;
    let mp3Data = [];
    for (let i = 0; i < samples.length; i += CHUNK) {
      const chunk = samples.subarray(i, i + CHUNK);
      const mp3buf = encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
    const end = encoder.flush();
    if (end.length > 0) mp3Data.push(end);
    return new Blob(mp3Data, { type: 'audio/mpeg' });
  }

  function pcm8To16(u8) {
    const out = new Int16Array(u8.length);
    for (let i = 0; i < u8.length; i++) out[i] = (u8[i] - 128) << 8;
    return out;
  }

  return { isReady, fromWAV };
})();
