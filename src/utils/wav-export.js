/**
 * wav-export.js
 * TYPE: Utility - WebM to WAV Conversion
 * 
 * Responsabilités:
 * - Convertir WebM blob en WAV
 * - Gestion AudioContext
 * - Encoding PCM 16-bit
 */

class WAVExport {
  static async fromWebM(webmBlob) {
    try {
      if (!webmBlob || webmBlob.size === 0) {
        console.error('[WAVExport] Invalid blob');
        return null;
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000,
      });

      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      return WAVExport.audioBufferToWav(audioBuffer);
    } catch (err) {
      console.error('[WAVExport] fromWebM failed:', err);
      return null;
    }
  }

  /**
   * Convertir AudioBuffer en WAV blob
   */
  static audioBufferToWav(audioBuffer) {
    try {
      const channels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const format = 1;
      const bitDepth = 16;

      const bytesPerSample = bitDepth / 8;
      const blockAlign = channels * bytesPerSample;

      let samples = [];
      for (let i = 0; i < channels; i++) {
        samples.push(audioBuffer.getChannelData(i));
      }

      const interleaved = WAVExport.interleave(samples);
      const dataLength = interleaved.length * bytesPerSample;
      const buffer = new ArrayBuffer(44 + dataLength);
      const view = new DataView(buffer);

      WAVExport.writeWavHeader(
        view,
        format,
        channels,
        sampleRate,
        bitDepth,
        dataLength
      );

      WAVExport.floatTo16BitPCM(view, 44, interleaved);

      return new Blob([buffer], { type: 'audio/wav' });
    } catch (err) {
      console.error('[WAVExport] audioBufferToWav failed:', err);
      return null;
    }
  }

  /**
   * Entrelace les channels
   */
  static interleave(samples) {
    try {
      const length = samples[0].length * samples.length;
      const result = new Float32Array(length);
      let index = 0;
      const channelLength = samples[0].length;

      for (let i = 0; i < channelLength; i++) {
        for (let ch = 0; ch < samples.length; ch++) {
          result[index++] = samples[ch][i];
        }
      }

      return result;
    } catch (err) {
      console.error('[WAVExport] interleave failed:', err);
      return new Float32Array();
    }
  }

  /**
   * Écrire l'en-tête WAV
   */
  static writeWavHeader(view, format, channels, sampleRate, bitDepth, dataLength) {
    try {
      const byteRate = sampleRate * channels * (bitDepth / 8);
      const blockAlign = channels * (bitDepth / 8);

      view.setUint8(0, 0x52);
      view.setUint8(1, 0x49);
      view.setUint8(2, 0x46);
      view.setUint8(3, 0x46);
      view.setUint32(4, 36 + dataLength, true);
      view.setUint8(8, 0x57);
      view.setUint8(9, 0x41);
      view.setUint8(10, 0x56);
      view.setUint8(11, 0x45);
      view.setUint8(12, 0x66);
      view.setUint8(13, 0x6D);
      view.setUint8(14, 0x74);
      view.setUint8(15, 0x20);
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, channels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitDepth, true);
      view.setUint8(36, 0x64);
      view.setUint8(37, 0x61);
      view.setUint8(38, 0x74);
      view.setUint8(39, 0x61);
      view.setUint32(40, dataLength, true);
    } catch (err) {
      console.error('[WAVExport] writeWavHeader failed:', err);
    }
  }

  /**
   * Convertir Float32 en PCM 16-bit
   */
  static floatTo16BitPCM(view, offset, input) {
    try {
      for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    } catch (err) {
      console.error('[WAVExport] floatTo16BitPCM failed:', err);
    }
  }

  /**
   * Télécharger WAV
   */
  static downloadWav(wavBlob, filename = 'audio.wav') {
    try {
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[WAVExport] downloadWav failed:', err);
    }
  }
}

window.WAVExport = WAVExport;
