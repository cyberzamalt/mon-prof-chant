<script>
/*!
 * WAVExport – WebM → WAV (PCM 16-bit LE)
 * Expose: window.WAVExport.fromWebM(blob) -> Promise<Blob 'audio/wav'>
 */
(function () {
  const WAVExport = {
    /**
     * Convertit un Blob WebM Opus en WAV PCM 16-bit LE.
     * @param {Blob} webmBlob
     * @returns {Promise<Blob>} WAV blob
     */
    async fromWebM(webmBlob) {
      if (!(webmBlob instanceof Blob)) throw new Error('fromWebM: blob requis');

      // 1) Lire en ArrayBuffer
      const arrayBuf = await webmBlob.arrayBuffer();

      // 2) Décoder en AudioBuffer via AudioContext (pas d’Offline nécessaire ici)
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('AudioContext non disponible');
      const ac = new AC({ sampleRate: 48000 });
      let audioBuffer;
      try {
        audioBuffer = await ac.decodeAudioData(arrayBuf.slice(0)); // slice() pour certains UA
      } catch (err) {
        ac.close?.();
        throw new Error('Échec decodeAudioData: ' + (err?.message || err));
      }
      ac.close?.();

      // 3) Encoder en WAV PCM 16-bit
      const wavBuf = encodeWavFromAudioBuffer(audioBuffer);

      return new Blob([wavBuf], { type: 'audio/wav' });
    }
  };

  // ---- Helpers ----

  function encodeWavFromAudioBuffer(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numFrames  = audioBuffer.length;

    // Récupérer données par canal en Float32 [-1..+1]
    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch));
    }

    // Interleave (si stéréo) ou direct (mono)
    let interleaved;
    if (numChannels === 2) {
      interleaved = interleave(channels[0], channels[1]);
    } else {
      interleaved = channels[0];
    }

    // Float32 -> PCM16
    const pcm16 = floatTo16BitPCM(interleaved);

    // Construire header WAV (RIFF)
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate   = sampleRate * blockAlign;
    const dataSize   = pcm16.byteLength;
    const buffer     = new ArrayBuffer(44 + dataSize);
    const view       = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);        // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);         // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);        // BitsPerSample

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM data
    new Uint8Array(buffer, 44).set(new Uint8Array(pcm16.buffer));

    return buffer;
  }

  function interleave(left, right) {
    const len = left.length + right.length;
    const out = new Float32Array(len);
    let i = 0, j = 0;
    while (i < len) {
      out[i++] = left[j];
      out[i++] = right[j];
      j++;
    }
    return out;
  }

  function floatTo16BitPCM(float32) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF) | 0;
    }
    return out;
  }

  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // Expose
  window.WAVExport = WAVExport;
})();
</script>
