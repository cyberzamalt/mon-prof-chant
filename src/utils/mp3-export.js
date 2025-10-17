/**
 * mp3-export.js
 * TYPE: Utility - WAV to MP3 Conversion via Worker
 * 
 * Responsabilités:
 * - Convertir WAV en MP3
 * - Orchestrer worker lamejs
 * - Gestion fallback
 */

class MP3Export {
  static workerReady = false;
  static worker = null;

  /**
   * Initialiser le worker MP3
   */
  static initWorker() {
    try {
      if (typeof Worker === 'undefined') {
        console.warn('[MP3Export] Web Workers not supported');
        return false;
      }

      // Créer un worker inline pour éviter les chemins externes
      const workerCode = `
        let lamejs = null;

        self.onmessage = async function(e) {
          try {
            if (!lamejs) {
              await loadLamejs();
            }

            const { wavData, quality } = e.data;
            const pcm16Data = new Int16Array(wavData);

            const encoder = new lamejs.Mp3Encoder(1, 48000, 128);
            const mp3Data = [];
            const sampleBlockSize = 1152;

            for (let i = 0; i < pcm16Data.length; i += sampleBlockSize) {
              const sampleBlock = pcm16Data.slice(i, Math.min(i + sampleBlockSize, pcm16Data.length));
              const mp3buf = encoder.encodeBuffer(sampleBlock);
              if (mp3buf.length > 0) {
                mp3Data.push(new Int8Array(mp3buf));
              }
            }

            const finalMp3buf = encoder.flush();
            if (finalMp3buf.length > 0) {
              mp3Data.push(new Int8Array(finalMp3buf));
            }

            const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
            self.postMessage({ type: 'complete', mp3Data: mp3Blob });
          } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
          }
        };

        async function loadLamejs() {
          return new Promise((resolve, reject) => {
            try {
              if (typeof self.lamejs !== 'undefined') {
                lamejs = self.lamejs;
                resolve();
                return;
              }

              self.importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js');
              lamejs = self.lamejs;
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      MP3Export.worker = new Worker(url);
      MP3Export.workerReady = true;

      console.log('[MP3Export] Worker initialized');
      return true;
    } catch (err) {
      console.error('[MP3Export] initWorker failed:', err);
      return false;
    }
  }

  /**
   * Vérifier si prêt
   */
  static isReady() {
    return MP3Export.workerReady;
  }

  /**
   * Convertir WAV en MP3
   */
  static async fromWav(wavBlob, quality = 2) {
    try {
      if (!wavBlob || wavBlob.size === 0) {
        throw new Error('Invalid WAV blob');
      }

      if (!MP3Export.workerReady) {
        MP3Export.initWorker();
      }

      if (!MP3Export.worker) {
        throw new Error('Worker not available');
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MP3 encoding timeout'));
        }, 120000);

        const messageHandler = (e) => {
          if (e.data.type === 'complete') {
            clearTimeout(timeout);
            MP3Export.worker.removeEventListener('message', messageHandler);
            resolve(e.data.mp3Data);
          } else if (e.data.type === 'error') {
            clearTimeout(timeout);
            MP3Export.worker.removeEventListener('message', messageHandler);
            reject(new Error(e.data.error));
          }
        };

        MP3Export.worker.addEventListener('message', messageHandler);

        wavBlob.arrayBuffer().then(arrayBuffer => {
          MP3Export.worker.postMessage({
            wavData: arrayBuffer,
            quality: quality,
          });
        }).catch(err => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    } catch (err) {
      console.error('[MP3Export] fromWav failed:', err);
      return null;
    }
  }

  /**
   * Télécharger MP3
   */
  static downloadMp3(mp3Blob, filename = 'audio.mp3') {
    try {
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[MP3Export] downloadMp3 failed:', err);
    }
  }
}

// Initialiser au chargement
window.MP3Export = MP3Export;
MP3Export.initWorker();
