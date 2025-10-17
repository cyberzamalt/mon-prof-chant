/**
 * ExportService.js
 * TYPE: Service - Audio Export and Format Conversion
 * 
 * Responsabilités:
 * - Conversion WebM → WAV → MP3
 * - Gestion workers pour encodage
 * - Gestion blobs et downloads
 * - Fallback formats
 * 
 * Dépendances: Logger
 * Utilisé par: app.js
 */

import { Logger } from '../logging/Logger.js';

class ExportService {
  #worker = null;
  #listeners = new Map();
  #state = 'idle';

  constructor() {
    try {
      Logger.info('ExportService', 'Initialized');
    } catch (err) {
      Logger.error('ExportService', 'Constructor failed', err);
    }
  }

  /**
   * Convertir WebM blob en WAV
   */
  async blobToWav(webmBlob) {
    try {
      Logger.info('ExportService', 'Converting to WAV', { size: webmBlob.size });

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const wavBlob = await this.#audioBufferToWav(audioBuffer);
      Logger.info('ExportService', 'WAV conversion complete', { size: wavBlob.size });

      return wavBlob;
    } catch (err) {
      Logger.error('ExportService', 'blobToWav failed', err);
      return webmBlob;
    }
  }

  /**
   * Convertir AudioBuffer en WAV blob
   */
  async #audioBufferToWav(audioBuffer) {
    try {
      const numberOfChannels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;

      const bytesPerSample = bitDepth / 8;
      const blockAlign = numberOfChannels * bytesPerSample;

      let samples = [];
      for (let i = 0; i < numberOfChannels; i++) {
        samples.push(audioBuffer.getChannelData(i));
      }

      const interleaved = this.#interleave(samples);
      const dataLength = interleaved.length * bytesPerSample;
      const buffer = new ArrayBuffer(44 + dataLength);
      const view = new DataView(buffer);

      this.#writeWavHeader(
        view,
        format,
        numberOfChannels,
        sampleRate,
        bitDepth,
        dataLength
      );

      this.#floatTo16BitPCM(view, 44, interleaved);

      return new Blob([buffer], { type: 'audio/wav' });
    } catch (err) {
      Logger.error('ExportService', 'audioBufferToWav failed', err);
      return new Blob([], { type: 'audio/wav' });
    }
  }

  /**
   * Entrelace les channels
   */
  #interleave(samples) {
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
      Logger.error('ExportService', 'interleave failed', err);
      return new Float32Array();
    }
  }

  /**
   * Écrire l'en-tête WAV
   */
  #writeWavHeader(view, format, channels, sampleRate, bitDepth, dataLength) {
    try {
      const byteRate = sampleRate * channels * (bitDepth / 8);
      const blockAlign = channels * (bitDepth / 8);

      view.setUint8(0, 0x52); // 'R'
      view.setUint8(1, 0x49); // 'I'
      view.setUint8(2, 0x46); // 'F'
      view.setUint8(3, 0x46); // 'F'
      view.setUint32(4, 36 + dataLength, true);
      view.setUint8(8, 0x57); // 'W'
      view.setUint8(9, 0x41); // 'A'
      view.setUint8(10, 0x56); // 'V'
      view.setUint8(11, 0x45); // 'E'
      view.setUint8(12, 0x66); // 'f'
      view.setUint8(13, 0x6D); // 'm'
      view.setUint8(14, 0x74); // 't'
      view.setUint8(15, 0x20); // ' '
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, channels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitDepth, true);
      view.setUint8(36, 0x64); // 'd'
      view.setUint8(37, 0x61); // 'a'
      view.setUint8(38, 0x74); // 't'
      view.setUint8(39, 0x61); // 'a'
      view.setUint32(40, dataLength, true);
    } catch (err) {
      Logger.error('ExportService', 'writeWavHeader failed', err);
    }
  }

  /**
   * Convertir Float32 en PCM 16-bit
   */
  #floatTo16BitPCM(view, offset, input) {
    try {
      for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    } catch (err) {
      Logger.error('ExportService', 'floatTo16BitPCM failed', err);
    }
  }

  /**
   * Convertir WAV en MP3 via worker
   */
  async wavToMp3(wavBlob, quality = 2) {
    try {
      Logger.info('ExportService', 'Starting MP3 encoding', { size: wavBlob.size, quality });

      if (!this.#worker) {
        throw new Error('Worker not initialized');
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MP3 encoding timeout'));
        }, 60000);

        const messageHandler = (e) => {
          if (e.data.type === 'complete') {
            clearTimeout(timeout);
            this.#worker.removeEventListener('message', messageHandler);
            const mp3Blob = new Blob([e.data.mp3Data], { type: 'audio/mpeg' });
            Logger.info('ExportService', 'MP3 encoding complete', { size: mp3Blob.size });
            resolve(mp3Blob);
          } else if (e.data.type === 'progress') {
            this.#emit('encodingProgress', { progress: e.data.progress });
          } else if (e.data.type === 'error') {
            clearTimeout(timeout);
            this.#worker.removeEventListener('message', messageHandler);
            Logger.error('ExportService', 'Worker error', e.data.error);
            reject(new Error(e.data.error));
          }
        };

        this.#worker.addEventListener('message', messageHandler);
        this.#worker.postMessage({
          wavData: await wavBlob.arrayBuffer(),
          quality: quality,
        });
      });
    } catch (err) {
      Logger.error('ExportService', 'wavToMp3 failed', err);
      throw err;
    }
  }

  /**
   * Convertir directement WebM → MP3
   */
  async blobToMp3(webmBlob, quality = 2) {
    try {
      Logger.info('ExportService', 'Direct WebM to MP3 conversion');
      const wavBlob = await this.blobToWav(webmBlob);
      return await this.wavToMp3(wavBlob, quality);
    } catch (err) {
      Logger.error('ExportService', 'blobToMp3 failed', err);
      throw err;
    }
  }

  /**
   * Initialiser le worker
   */
  initWorker(workerPath) {
    try {
      if (typeof Worker === 'undefined') {
        throw new Error('Web Workers not supported');
      }

      this.#worker = new Worker(workerPath);
      Logger.info('ExportService', 'Worker initialized', { path: workerPath });
      return true;
    } catch (err) {
      Logger.error('ExportService', 'initWorker failed', err);
      return false;
    }
  }

  /**
   * Télécharger un blob
   */
  download(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Logger.info('ExportService', 'Download initiated', { filename, size: blob.size });
      this.#emit('downloaded', { filename, size: blob.size });
    } catch (err) {
      Logger.error('ExportService', 'download failed', err);
    }
  }

  /**
   * S'abonner aux événements
   */
  on(event, callback) {
    try {
      if (!this.#listeners.has(event)) {
        this.#listeners.set(event, new Set());
      }
      this.#listeners.get(event).add(callback);
      return () => this.#listeners.get(event).delete(callback);
    } catch (err) {
      Logger.error('ExportService', 'on failed', err);
      return () => {};
    }
  }

  /**
   * Émettre un événement
   */
  #emit(event, data) {
    try {
      const listeners = this.#listeners.get(event);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            Logger.error('ExportService', `Listener failed for ${event}`, err);
          }
        });
      }
    } catch (err) {
      Logger.error('ExportService', `emit ${event} failed`, err);
    }
  }

  /**
   * Obtenir l'état
   */
  getState() {
    return {
      state: this.#state,
      workerReady: this.#worker !== null,
    };
  }
}

export { ExportService };
export default ExportService;
