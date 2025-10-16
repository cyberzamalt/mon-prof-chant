/*!
 * MP3Export – wrapper facultatif autour de lame.min.js (local).
 * Place le fichier /src/vendor/lame.min.js (lamejs) pour activer.
 */
(function(global){
  const MP3Export = {
    isReady(){ return !!global.lamejs; },
    async fromWAV(wavBlob){
      if (!global.lamejs) return null;
      const array = new Uint8Array(await wavBlob.arrayBuffer());
      // Parse WAV header minimal
      function read16(i){ return array[i] | (array[i+1]<<8); }
      function read32(i){ return (array[i]) | (array[i+1]<<8) | (array[i+2]<<16) | (array[i+3]<<24); }
      const numChannels = read16(22);
      const sampleRate  = read32(24);
      const bitsPerSample = read16(34);
      const dataOffset = 44;
      // Convert to Int16
      const samples = new Int16Array((array.length - dataOffset)/2);
      let j=0;
      for(let i=dataOffset;i<array.length;i+=2){
        samples[j++] = (array[i] | (array[i+1]<<8));
      }
      const Lame = global.lamejs;
      const mp3enc = new Lame.Mp3Encoder(numChannels, sampleRate, 128);
      const mp3data = mp3enc.encodeBuffer(samples);
      const end = mp3enc.flush();
      const blob = new Blob([new Uint8Array(mp3data), new Uint8Array(end)], {type:'audio/mpeg'});
      return blob;
    }
  };
  global.MP3Export = MP3Export;
})(window);
