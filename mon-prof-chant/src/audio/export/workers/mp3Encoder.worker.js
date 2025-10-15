// src/audio/export/workers/mp3Encoder.worker.js
// Simple worker lamejs-like API (runtime via CDN n'est pas garanti, donc code inline minimal)

importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js');

self.onmessage = (e) => {
  const { type, sampleRate, channels, left, right, bitrate } = e.data || {};
  if (type !== 'encode') return;
  try {
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
    const blockSize = 1152;
    const leftSamples = new Int16Array(left.length);
    for (let i=0;i<left.length;i++) leftSamples[i] = Math.max(-32768, Math.min(32767, left[i]*32767));

    let rightSamples = null;
    if (channels > 1 && right) {
      rightSamples = new Int16Array(right.length);
      for (let i=0;i<right.length;i++) rightSamples[i] = Math.max(-32768, Math.min(32767, right[i]*32767));
    }

    const buffers = [];
    for (let i=0; i<leftSamples.length; i+=blockSize) {
      const leftChunk = leftSamples.subarray(i, i+blockSize);
      let buf;
      if (channels === 2 && rightSamples) {
        const rightChunk = rightSamples.subarray(i, i+blockSize);
        buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      } else {
        buf = mp3encoder.encodeBuffer(leftChunk);
      }
      if (buf.length) buffers.push(buf);
    }
    const end = mp3encoder.flush();
    if (end.length) buffers.push(end);

    const mp3Blob = new Blob(buffers, { type: 'audio/mpeg' });
    self.postMessage({ type: 'done', data: mp3Blob }, []);
  } catch (err) {
    self.postMessage({ type: 'error', data: String(err?.message || err) });
  }
};
