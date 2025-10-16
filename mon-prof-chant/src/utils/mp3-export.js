<script>
/*!
 * MP3Export – WAV -> MP3 via lame.js
 * Requiert: window.lamejs (inclus par /src/vendor/lame.min.js)
 * Expose:
 *   - window.MP3Export.isReady() -> bool
 *   - window.MP3Export.fromWAV(wavBlob) -> Promise<Blob 'audio/mpeg'>
 */
(function () {
  const MP3Export = {
    isReady() {
      return !!(window.lamejs && window.lamejs.Mp3Encoder);
    },

    /**
     * Convertit un Blob WAV (PCM 16-bit LE) en MP3 (128 kbps).
     * @param {Blob} wavBlob
     * @returns {Promise<Blob>} MP3 blob
     */
    async fromWAV(wavBlob) {
      if (!this.isReady()) throw new Error('Encodeur MP3 (lamejs) indisponible');
      if (!(wavBlob instanceof Blob)) throw new Error('fromWAV: blob WAV requis');

      const arrayBuf = await wavBlob.arrayBuffer();
      const wav = parseWav(arrayBuf); // {sampleRate, channels, samples(Int16Array|Int16Array[]), isStereo}

      const lame = window.lamejs;
      const kbps = 128;
      const encoder = new lame.Mp3Encoder(wav.channels, wav.sampleRate, kbps);

      const samplesPerFrame = 1152;
      const mp3Data = [];

      if (wav.isStereo) {
        const left  = wav.samples[0];
        const right = wav.samples[1];
        let i = 0;
        while (i < left.length) {
          const leftChunk  = left.subarray(i, i + samplesPerFrame);
          const rightChunk = right.subarray(i, i + samplesPerFrame);
          const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
          i += samplesPerFrame;
        }
      } else {
        const mono = wav.samples;
        let i = 0;
        while (i < mono.length) {
          const monoChunk = mono.subarray(i, i + samplesPerFrame);
          const mp3buf = encoder.encodeBuffer(monoChunk);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
          i += samplesPerFrame;
        }
      }

      const end = encoder.flush();
      if (end.length > 0) mp3Data.push(end);

      return new Blob(mp3Data, { type: 'audio/mpeg' });
    }
  };

  // ---- Helpers ----

  /**
   * Parse un WAV PCM 16-bit LE.
   * Retourne:
   *  {
   *    sampleRate: number,
   *    channels: number,
   *    isStereo: boolean,
   *    samples: Int16Array | [Int16Array, Int16Array]
   *  }
   */
  function parseWav(arrayBuffer) {
    const view = new DataView(arrayBuffer);

    // RIFF header
    if (readString(view, 0, 4) !== 'RIFF') throw new Error('WAV invalide: RIFF manquant');
    if (readString(view, 8, 4) !== 'WAVE') throw new Error('WAV invalide: WAVE manquant');

    // fmt  subchunk
    let offset = 12;
    let fmtFound = false, dataFound = false;
    let audioFormat, channels, sampleRate, bitsPerSample;
    let dataOffset = 0, dataSize = 0;

    while (offset < view.byteLength) {
      const chunkId = readString(view, offset, 4);
      const chunkSize = view.getUint32(offset + 4, true);
      const chunkStart = offset + 8;

      if (chunkId === 'fmt ') {
        fmtFound = true;
        audioFormat   = view.getUint16(chunkStart + 0, true);
        channels      = view.getUint16(chunkStart + 2, true);
        sampleRate    = view.getUint32(chunkStart + 4, true);
        // byteRate   = view.getUint32(chunkStart + 8, true);
        // blockAlign = view.getUint16(chunkStart + 12, true);
        bitsPerSample = view.getUint16(chunkStart + 14, true);
      } else if (chunkId === 'data') {
        dataFound  = true;
        dataOffset = chunkStart;
        dataSize   = chunkSize;
        break; // data à la fin, on peut sortir
      }

      offset = chunkStart + chunkSize + (chunkSize % 2); // alignement
    }

    if (!fmtFound || !dataFound) throw new Error('WAV invalide: fmt/data manquant');
    if (audioFormat !== 1) throw new Error('WAV non PCM');
    if (bitsPerSample !== 16) throw new Error('WAV non 16-bit');

    const bytes = new Uint8Array(arrayBuffer, dataOffset, dataSize);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);

    // stéréo: interleaved L R L R ...
    if (channels === 2) {
      const total = samples.length / 2;
      const left  = new Int16Array(total);
      const right = new Int16Array(total);
      for (let i = 0, j = 0; i < samples.length; i += 2, j++) {
        left[j]  = samples[i];
        right[j] = samples[i + 1];
      }
      return { sampleRate, channels, isStereo: true, samples: [left, right] };
    } else if (channels === 1) {
      return { sampleRate, channels, isStereo: false, samples };
    } else {
      // plus de 2 canaux: on compresse en mono par moyenne
      const totalFrames = samples.length / channels;
      const mono = new Int16Array(totalFrames);
      for (let f = 0; f < totalFrames; f++) {
        let acc = 0;
        for (let c = 0; c < channels; c++) {
          acc += samples[f * channels + c];
        }
        mono[f] = (acc / channels) | 0;
      }
      return { sampleRate, channels: 1, isStereo: false, samples: mono };
    }
  }

  function readString(view, offset, len) {
    let s = '';
    for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
    return s;
  }

  // Expose
  window.MP3Export = MP3Export;
})();
</script>
