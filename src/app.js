// src/app.js – orchestrateur v2
import { Logger } from './logging/Logger.js';
import { AudioEngine, audioEngine } from './audio/core/AudioEngine.js';
import MicrophoneManager from './audio/core/MicrophoneManager.js';
import { RecordingService } from './audio/services/RecordingService.js';
import { PitchAnalysisPanel } from './ui/components/PitchAnalysisPanel.js';

class App {
  #mic; #rec; #panelLive; #panelRef; #started=false;

  constructor(){
    Logger.setLevel('INFO');
    Logger.info('[App] 🚀 Initialisation de l\'application...');
    // panneaux
    this.#panelLive = new PitchAnalysisPanel({ canvasId:'canvas-recording' });
    this.#panelRef  = new PitchAnalysisPanel({ canvasId:'canvas-reference' });
    // services
    this.#mic = new MicrophoneManager();
    this.#rec = new RecordingService();
  }

  async start(){
    if(this.#started) return;
    await audioEngine.init();
    await this.#mic.start();
    const { analyser } = audioEngine.ready();
    this.#panelLive.start(analyser);
    // (référence non branchée pour l’instant)
    this.#started = true;
    Logger.info('[App] ✅ Application démarrée');
  }

  stop(){
    if(!this.#started) return;
    this.#panelLive.stop();
    this.#mic.stop();
    this.#started = false;
  }

  clearPanels(){
    this.#panelLive.clear();
    this.#panelRef.clear();
  }

  async toggleRecord(){
    if(!this.#started) throw new Error('Démarre d’abord le micro');
    if(this.#rec.isRecording()){
      const file = await this.#rec.stopAndEncode('live');
      this.#panelLive.freeze(); // garde le tracé
      return false;
    }else{
      this.#rec.startFromSource(this.#mic.source);
      return true;
    }
  }

  hasRecording(){ return this.#rec.hasRecording(); }

  async getLastMp3(kind='live'){ return this.#rec.getLast(kind); }
}
const app = new App();
export default app;
