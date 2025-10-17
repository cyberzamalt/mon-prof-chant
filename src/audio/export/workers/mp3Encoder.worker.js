/**
 * mp3Encoder.worker.js
 * TYPE: Web Worker - MP3 Encoding (Non-blocking)
 * 
 * Responsabilités:
 * - Encodage MP3 en arrière-plan
 * - Communication avec thread principal
 * - Gestion lamejs library
 * 
 * Dépendances: lamejs (CDN dans main thread)
 * Utilisé par: ExportService
 */

// Attendre lamejs depuis le CDN
let lamejs = null;

// Fonction appelée au démarrage du worker
self.onmessage = async function(e) {
  try {
    const { wavData, quality } = e.data;

    if (!wavData) {
      throw new Error('No WAV data provided');
    }

    // Charger lamejs si pas déjà fait
    if (!lamejs) {
      await loadLamejs();
    }

    // Convertir ArrayBuffer en PCM 16-bit
    const pcm16Data = new Int16Array(wavData);

    // Créer encoder
    const encoder = new lamejs.Mp3Encoder(1, 48000, 128);
    const mp3Data = [];

    // Encoder par chunks
    const sampleBlockSize = 1152;
    for (let i = 0; i < pcm16Data.length; i += sampleBlockSize) {
      const sampleBlock = pcm16Data.slice(i, Math.min(i + sampleBlockSize, pcm16Data.length));
      const mp3buf = encoder.encodeBuffer(sampleBlock);
      if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf));
      }

      // Envoyer progress
      const progress = Math.floor((i / pcm16Data.length) * 100);
      self.postMessage({ type: 'progress', progress: progress });
    }

    // Finir l'encodage
    const finalMp3buf = encoder.flush();
    if (finalMp3buf.length > 0) {
      mp3Data.push(new Int8Array(finalMp3buf));
    }

    // Envoyer résultat
    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
    self.postMessage({
      type: 'complete',
      mp3Data: mp3Blob,
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
    });
  }
};

/**
 * Charger lamejs depuis CDN
 */
async function loadLamejs() {
  return new Promise((resolve, reject) => {
    try {
      // Si lamejs est disponible globalement, l'utiliser
      if (typeof self.lamejs !== 'undefined') {
        lamejs = self.lamejs;
        resolve();
        return;
      }

      // Sinon, créer un script dynamique
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js';
      script.async = true;
      script.onload = () => {
        lamejs = self.lamejs;
        if (!lamejs) {
          reject(new Error('lamejs not loaded'));
        } else {
          resolve();
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load lamejs'));
      };

      // Dans un worker, on n'a pas d'accès au DOM, donc charger via importScripts
      try {
        self.importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js');
        lamejs = self.lamejs;
        resolve();
      } catch (err) {
        reject(err);
      }
    } catch (error) {
      reject(error);
    }
  });
}
