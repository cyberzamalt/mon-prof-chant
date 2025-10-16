/*!
 * WAVExport – convertit une source WebM/Opus en WAV PCM 16 bits.
 * Stratégie : décoder via AudioContext, puis ré-encoder en WAV.
 */
(function(global){
  async function decodeToBuffer(blob){
    const array = await blob.arrayBuffer();
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const audioBuf = await ac.decodeAudioData(array);
      return audioBuf;
    } finally {
      // Safari garde parfois des contextes ouverts – on s’en fiche ici
    }
  }
  function encodeWAVFromAudioBuffer(abuf){
    const ch = Math.min(2, abuf.numberOfChannels);
    const len = abuf.length * ch * 2;
    const out = new DataView(new ArrayBuffer(44 + len));
    // RIFF header
    writeStr(out,0,'RIFF');
    out.setUint32(4, 36 + len, true);
    writeStr(out,8,'WAVE');
    // fmt
    writeStr(out,12,'fmt ');
    out.setUint32(16,16,true); // PCM
    out.setUint16(20,1,true);  // PCM
    out.setUint16(22,ch,true);
    out.setUint32(24,abuf.sampleRate,true);
    out.setUint32(28,abuf.sampleRate*ch*2,true);
    out.setUint16(32,ch*2,true);
    out.setUint16(34,16,true);
    // data
    writeStr(out,36,'data');
    out.setUint32(40,len,true);
    // samples
    let offset = 44;
    const interleaved = interleave(abuf, ch);
    for (let i=0;i<interleaved.length;i++){
      const s = Math.max(-1, Math.min(1, interleaved[i]));
      out.setInt16(offset, s<0?s*0x8000:s*0x7fff, true);
      offset+=2;
    }
    return new Blob([out], {type:'audio/wav'});
  }
  function interleave(abuf, ch){
    const o = abuf.getChannelData(0);
    if (ch===1) return o;
    const i1 = abuf.getChannelData(1);
    const L = abuf.length;
    const out = new Float32Array(L*2);
    let k=0;
    for(let i=0;i<L;i++){ out[k++]=o[i]; out[k++]=i1[i]; }
    return out;
  }
  function writeStr(dv,off,str){ for (let i=0;i<str.length;i++) dv.setUint8(off+i, str.charCodeAt(i)); }

  const WAVExport = {
    async fromWebM(webmBlob){
      try {
        const abuf = await decodeToBuffer(webmBlob);
        return encodeWAVFromAudioBuffer(abuf);
      } catch(e){ console.error(e); return null; }
    }
  };
  global.WAVExport = WAVExport;
})(window);
