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
    
    // Panneaux (le canvas sera passé plus tard via start())
    this.#panelLive = new PitchAnalysisPanel();
    this.#panelRef  = new PitchAnalysisPanel();
    
    // Services
    this.#mic = new MicrophoneManager();
    this.#rec = new RecordingService();
    
    Logger.info('[App] Constructor terminé');
  }

  // AJOUT : Méthode init() appelée par app.html au DOMContentLoaded
  async init() {
    Logger.info('[App] init() appelé - rien à faire pour l\'instant');
    // Pour l'instant vide, mais existe pour que app.html ne plante pas
    // On pourrait initialiser des choses ici si besoin futur
  }

  // AJOUT : Récupérer un panneau par son nom
  getPanel(name) {
    if (name === 'recording') {
      Logger.info('[App] getPanel("recording") appelé');
      return this.#panelLive;
    }
    if (name === 'reference') {
      Logger.info('[App] getPanel("reference") appelé');
      return this.#panelRef;
    }
    Logger.warn('[App] getPanel() - panneau inconnu:', name);
    return null;
  }

  // AJOUT : Récupérer un service par son nom
  getService(name) {
    if (name === 'recording') {
      Logger.info('[App] getService("recording") appelé');
      return this.#rec;
    }
    Logger.warn('[App] getService() - service inconnu:', name);
    return null;
  }

  async start(){
    if(this.#started) {
      Logger.warn('[App] Déjà démarré, ignoré');
      return;
    }
    
    Logger.info('[App] Démarrage...');
    
    // 1. Init contexte audio
    await audioEngine.init();
    
    // 2. Démarrer le microphone
    const { source } = await this.#mic.start();
    
    // 3. IMPORTANT : Enregistrer la source micro dans audioEngine
    //    pour que PitchAnalysisPanel puisse y accéder
    audioEngine.setMicSource(source);
    
    // 4. NE PAS appeler panel.start() ici - c'est app.html qui le fait
    //    avec les références aux canvas
    
    this.#started = true;
    Logger.info('[App] ✅ Application démarrée (micro actif)');
  }

  stop(){
    if(!this.#started) {
      Logger.warn('[App] Pas démarré, ignoré');
      return;
    }
    
    Logger.info('[App] Arrêt...');
    
    // Arrêter les panneaux
    this.#panelLive.stop();
    this.#panelRef.stop();
    
    // Arrêter le microphone
    this.#mic.stop();
    
    // Retirer la référence à la source
    audioEngine.setMicSource(null);
    
    this.#started = false;
    Logger.info('[App] ✅ Application arrêtée');
  }

  clearPanels(){
    Logger.info('[App] Effacement des panneaux');
    this.#panelLive.clear();
    this.#panelRef.clear();
  }

  async toggleRecord(){
    if(!this.#started) {
      const err = new Error('Démarre d\'abord le micro');
      Logger.error('[App]', err);
      throw err;
    }
    
    if(this.#rec.isRecording()){
      Logger.info('[App] Arrêt de l\'enregistrement...');
      const file = await this.#rec.stopAndEncode('live');
      this.#panelLive.freeze?.(); // garde le tracé (si la méthode existe)
      Logger.info('[App] Enregistrement arrêté', file);
      return false;
    } else {
      Logger.info('[App] Démarrage de l\'enregistrement...');
      this.#rec.startFromSource(this.#mic.getSource());
      return true;
    }
  }

  hasRecording(){ 
    return this.#rec.hasRecording(); 
  }

  async getLastMp3(kind='live'){ 
    return this.#rec.getLast(kind); 
  }
}

const app = new App();
export default app;
