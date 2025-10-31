// src/audio/core/MicrophoneManager.js
import { Logger } from '../../logging/Logger.js';
import { audioEngine } from './AudioEngine.js';

export default class MicrophoneManager {
  #stream = null;
  #source = null;

  isActive(){ return !!this.#stream; }
  get source(){ return this.#source; }

  async start(){
    const { context, analyser } = audioEngine.ready();

    const constraints = {
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
        // sampleRate: 44100 // on laisse le navigateur décider
      }
    };

    Logger.info('[MicrophoneManager] Demande accès microphone...', constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    Logger.info('[MicrophoneManager] Accès microphone accordé');

    this.#stream = stream;
    this.#source = new MediaStreamAudioSourceNode(context, { mediaStream: stream });

    // routing: mic -> analyser
    this.#source.connect(analyser);
    Logger.info('[MicrophoneManager] Source créée', { sr: context.sampleRate });
  }

  stop(){
    try{
      if(this.#source){ this.#source.disconnect(); }
      if(this.#stream){
        this.#stream.getTracks().forEach(t=>t.stop());
      }
    }finally{
      this.#source = null;
      this.#stream = null;
      Logger.info('[MicrophoneManager] Micro arrêté');
    }
  }
}
