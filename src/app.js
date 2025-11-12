// src/app.js – orchestrateur v2 FINAL
import { Logger } from './logging/Logger.js';
import { AudioEngine, audioEngine } from './audio/core/AudioEngine.js';
import MicrophoneManager from './audio/core/MicrophoneManager.js';
import { RecordingService } from './audio/services/RecordingService.js';
import { PitchAnalysisPanel } from './ui/components/PitchAnalysisPanel.js';

class App {
  #mic; #rec; #panelLive; #panelRef; #started=false;

  constructor(){
    Logger.setLevel('DEBUG');
    Logger.info('[App] 🚀 Initialisation de l\'application...');
    
    // Panneaux (le canvas sera passé plus tard via start())
    this.#panelLive = new PitchAnalysisPanel();
    this.#panelRef  = new PitchAnalysisPanel();
    
    // Services
    this.#mic = new MicrophoneManager();
    this.#rec = new RecordingService();
    
    Logger.info('[App] Constructor terminé');
  }

  // Méthode init() appelée par app.html au DOMContentLoaded
  async init() {
    Logger.info('[App] init() appelé - préparation de l\'application');
    
    // Pour l'instant, on ne fait rien ici
    // L'initialisation audio se fait dans start() après le clic utilisateur
    // (nécessaire pour contourner les restrictions autoplay des navigateurs)
    
    return Promise.resolve();
  }

  // Récupérer un panneau par son nom
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

  // Récupérer un service par son nom
  getService(name) {
    if (name === 'recording') {
      Logger.info('[App] getService("recording") appelé');
      return this.#rec;
    }
    if (name === 'microphone') {
      Logger.info('[App] getService("microphone") appelé');
      return this.#mic;
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
    
    try {
      // 1. Init contexte audio
      await audioEngine.init();
      
      // 2. Démarrer le microphone
      const { source } = await this.#mic.start();
      
      // 3. Enregistrer la source micro dans audioEngine
      audioEngine.setMicSource(source);
      
      // 4. Marquer comme démarré
      this.#started = true;
      
      Logger.info('[App] ✅ Application démarrée (micro actif)');
      
    } catch (e) {
      Logger.error('[App] Erreur lors du démarrage', e);
      throw e;
    }
  }

  stop(){
    if(!this.#started) {
      Logger.warn('[App] Pas démarré, ignoré');
      return;
    }
    
    Logger.info('[App] Arrêt...');
    
    try {
      // Arrêter les panneaux
      this.#panelLive.stop();
      this.#panelRef.stop();
      
      // Arrêter le microphone
      this.#mic.stop();
      
      // Retirer la référence à la source
      audioEngine.setMicSource(null);
      
      this.#started = false;
      
      Logger.info('[App] ✅ Application arrêtée');
      
    } catch (e) {
      Logger.error('[App] Erreur lors de l\'arrêt', e);
    }
  }

  clearPanels(){
    Logger.info('[App] Effacement des panneaux');
    try {
      this.#panelLive.clear();
      this.#panelRef.clear();
    } catch (e) {
      Logger.error('[App] Erreur effacement panneaux', e);
    }
  }

  async toggleRecord(){
    if(!this.#started) {
      const err = new Error('Démarre d\'abord le micro');
      Logger.error('[App]', err);
      throw err;
    }
    
    if(this.#rec.isRecording()){
      Logger.info('[App] Arrêt de l\'enregistrement...');
      
      try {
        const file = await this.#rec.stopAndEncode('live');
        
        // Geler le tracé du panneau live
        if (this.#panelLive.freeze) {
          this.#panelLive.freeze();
        }
        
        Logger.info('[App] Enregistrement arrêté', file);
        return false; // Retourne false = pas en train d'enregistrer
        
      } catch (e) {
        Logger.error('[App] Erreur arrêt enregistrement', e);
        throw e;
      }
      
    } else {
      Logger.info('[App] Démarrage de l\'enregistrement...');
      
      try {
        this.#rec.startFromSource(this.#mic.getSource());
        return true; // Retourne true = en train d'enregistrer
        
      } catch (e) {
        Logger.error('[App] Erreur démarrage enregistrement', e);
        throw e;
      }
    }
  }

  hasRecording() { 
    return this.#rec.hasRecording(); 
  }

  async getLastMp3(kind='live') { 
    return this.#rec.getLast(kind); 
  }

  /**
   * Obtenir l'état de l'application
   */
  getState() {
    return {
      started: this.#started,
      recording: this.#rec.isRecording(),
      hasRecording: this.#rec.hasRecording(),
      micActive: this.#mic.isActive(),
      panelLiveActive: this.#panelLive.isActive(),
      panelRefActive: this.#panelRef.isActive()
    };
  }

  /**
   * Vérifier si l'application est démarrée
   */
  isStarted() {
    return this.#started;
  }
}

const app = new App();
export default app;
