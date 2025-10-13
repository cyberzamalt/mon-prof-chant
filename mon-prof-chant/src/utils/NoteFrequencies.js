/**
 * NoteFrequencies.js
 * TYPE: Data - Frequency Table
 * 
 * Responsabilités:
 * - Table complète des fréquences MIDI (0-127)
 * - Mapping notes → fréquences
 * - Recherche de la note la plus proche d'une fréquence
 * - Support noms français et anglais
 * 
 * Dépendances: Logger, AudioMath
 */

import { Logger } from '../logging/Logger.js';
import { AudioMath } from './AudioMath.js';

export class NoteFrequencies {
  
  // Table complète générée à l'initialisation
  static #frequencyTable = null;
  static #noteNameTable = null;

  /**
   * Initialise les tables (appelé automatiquement)
   */
  static #initialize() {
    if (NoteFrequencies.#frequencyTable) {
      return; // Déjà initialisé
    }

    try {
      Logger.debug('NoteFrequencies', 'Initializing frequency tables...');

      NoteFrequencies.#frequencyTable = {};
      NoteFrequencies.#noteNameTable = {};

      // Générer toutes les notes MIDI (0-127)
      for (let midi = 0; midi <= 127; midi++) {
        const frequency = AudioMath.midiToFrequency(midi);
        const noteName = AudioMath.midiToNoteName(midi);

        if (frequency && noteName) {
          NoteFrequencies.#frequencyTable[noteName] = frequency;
          NoteFrequencies.#noteNameTable[midi] = noteName;
        }
      }

      Logger.info('NoteFrequencies', 'Tables initialized', {
        notes: Object.keys(NoteFrequencies.#frequencyTable).length
      });

    } catch (error) {
      Logger.error('NoteFrequencies', 'Initialization failed', error);
    }
  }

  /**
   * Récupère la fréquence d'une note
   * @param {string} noteName - Nom de la note (ex: "A4", "C#5")
   * @returns {number|null} Fréquence en Hz, ou null si note invalide
   */
  static getFrequency(noteName) {
    NoteFrequencies.#initialize();

    try {
      if (!noteName || typeof noteName !== 'string') {
        Logger.warn('NoteFrequencies', 'Invalid note name', { noteName });
        return null;
      }

      // Normaliser (majuscule)
      const normalized = noteName.toUpperCase();

      const frequency = NoteFrequencies.#frequencyTable[normalized];

      if (!frequency) {
        Logger.debug('NoteFrequencies', 'Note not found', { noteName: normalized });
        return null;
      }

      return frequency;

    } catch (error) {
      Logger.error('NoteFrequencies', 'getFrequency failed', error);
      return null;
    }
  }

  /**
   * Récupère le nom de la note la plus proche d'une fréquence
   * @param {number} frequency - Fréquence en Hz
   * @returns {object|null} { note, frequency, cents } ou null
   */
  static getClosestNote(frequency) {
    NoteFrequencies.#initialize();

    try {
      if (!frequency || frequency <= 0) {
        Logger.warn('NoteFrequencies', 'Invalid frequency', { frequency });
        return null;
      }

      // Convertir en MIDI
      const midi = AudioMath.frequencyToMidi(frequency);
      if (midi === null) {
        Logger.debug('NoteFrequencies', 'Frequency out of MIDI range', { frequency });
        return null;
      }

      // Récupérer nom et fréquence cible
      const noteName = NoteFrequencies.#noteNameTable[midi];
      const targetFrequency = AudioMath.midiToFrequency(midi);

      if (!noteName || !targetFrequency) {
        return null;
      }

      // Calculer déviation en cents
      const cents = AudioMath.calculateCents(frequency, targetFrequency);

      return {
        note: noteName,
        frequency: targetFrequency,
        cents: cents,
        midi: midi,
      };

    } catch (error) {
      Logger.error('NoteFrequencies', 'getClosestNote failed', error);
      return null;
    }
  }

  /**
   * Récupère toutes les notes d'une octave
   * @param {number} octave - Numéro d'octave (0-10)
   * @returns {Array<object>} Tableau de { note, frequency }
   */
  static getOctave(octave) {
    NoteFrequencies.#initialize();

    try {
      if (typeof octave !== 'number' || octave < 0 || octave > 10) {
        Logger.warn('NoteFrequencies', 'Invalid octave', { octave });
        return [];
      }

      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const notes = [];

      for (const name of noteNames) {
        const fullName = `${name}${octave}`;
        const frequency = NoteFrequencies.getFrequency(fullName);
        
        if (frequency) {
          notes.push({
            note: fullName,
            frequency: frequency,
          });
        }
      }

      return notes;

    } catch (error) {
      Logger.error('NoteFrequencies', 'getOctave failed', error);
      return [];
    }
  }

  /**
   * Récupère une plage de notes
   * @param {string} startNote - Note de départ (ex: "C3")
   * @param {string} endNote - Note de fin (ex: "C5")
   * @returns {Array<object>} Tableau de { note, frequency }
   */
  static getRange(startNote, endNote) {
    NoteFrequencies.#initialize();

    try {
      const startFreq = NoteFrequencies.getFrequency(startNote);
      const endFreq = NoteFrequencies.getFrequency(endNote);

      if (!startFreq || !endFreq) {
        Logger.warn('NoteFrequencies', 'Invalid note range', { startNote, endNote });
        return [];
      }

      const startMidi = AudioMath.frequencyToMidi(startFreq);
      const endMidi = AudioMath.frequencyToMidi(endFreq);

      if (startMidi === null || endMidi === null) {
        return [];
      }

      const notes = [];
      const [minMidi, maxMidi] = startMidi <= endMidi 
        ? [startMidi, endMidi] 
        : [endMidi, startMidi];

      for (let midi = minMidi; midi <= maxMidi; midi++) {
        const noteName = NoteFrequencies.#noteNameTable[midi];
        const frequency = AudioMath.midiToFrequency(midi);

        if (noteName && frequency) {
          notes.push({
            note: noteName,
            frequency: frequency,
            midi: midi,
          });
        }
      }

      return notes;

    } catch (error) {
      Logger.error('NoteFrequencies', 'getRange failed', error);
      return [];
    }
  }

  /**
   * Vérifie si une note existe
   * @param {string} noteName - Nom de la note
   * @returns {boolean}
   */
  static exists(noteName) {
    return NoteFrequencies.getFrequency(noteName) !== null;
  }

  /**
   * Récupère toutes les notes disponibles
   * @returns {Array<string>} Liste des noms de notes
   */
  static getAllNotes() {
    NoteFrequencies.#initialize();
    return Object.keys(NoteFrequencies.#frequencyTable);
  }

  /**
   * Récupère la table complète (pour debug)
   * @returns {object} Table note → fréquence
   */
  static getTable() {
    NoteFrequencies.#initialize();
    return { ...NoteFrequencies.#frequencyTable };
  }

  /**
   * Conversion nom français → anglais
   * @param {string} frenchNote - Note en français (ex: "Do4", "Ré#5")
   * @returns {string|null} Note en anglais (ex: "C4", "D#5")
   */
  static frenchToEnglish(frenchNote) {
    try {
      const mapping = {
        'Do': 'C',
        'Ré': 'D',
        'Mi': 'E',
        'Fa': 'F',
        'Sol': 'G',
        'La': 'A',
        'Si': 'B',
      };

      let englishNote = frenchNote;

      for (const [fr, en] of Object.entries(mapping)) {
        englishNote = englishNote.replace(fr, en);
      }

      return englishNote;

    } catch (error) {
      Logger.error('NoteFrequencies', 'frenchToEnglish failed', error);
      return null;
    }
  }

  /**
   * Conversion nom anglais → français
   * @param {string} englishNote - Note en anglais (ex: "C4", "D#5")
   * @returns {string|null} Note en français (ex: "Do4", "Ré#5")
   */
  static englishToFrench(englishNote) {
    try {
      const mapping = {
        'C': 'Do',
        'D': 'Ré',
        'E': 'Mi',
        'F': 'Fa',
        'G': 'Sol',
        'A': 'La',
        'B': 'Si',
      };

      let frenchNote = englishNote;

      for (const [en, fr] of Object.entries(mapping)) {
        frenchNote = frenchNote.replace(new RegExp(`^${en}`), fr);
      }

      return frenchNote;

    } catch (error) {
      Logger.error('NoteFrequencies', 'englishToFrench failed', error);
      return null;
    }
  }

  /**
   * Récupère des notes de référence communes
   * @returns {object} Notes de référence
   */
  static getCommonReferences() {
    NoteFrequencies.#initialize();

    return {
      // Diapason standard
      a4: { note: 'A4', frequency: 440, description: 'La de référence (diapason)' },
      
      // Notes centrales piano
      middleC: { note: 'C4', frequency: NoteFrequencies.getFrequency('C4'), description: 'Do central du piano' },
      
      // Plages vocales
      bass: {
        low: { note: 'E2', frequency: NoteFrequencies.getFrequency('E2') },
        high: { note: 'D4', frequency: NoteFrequencies.getFrequency('D4') },
      },
      baritone: {
        low: { note: 'G2', frequency: NoteFrequencies.getFrequency('G2') },
        high: { note: 'G4', frequency: NoteFrequencies.getFrequency('G4') },
      },
      tenor: {
        low: { note: 'C3', frequency: NoteFrequencies.getFrequency('C3') },
        high: { note: 'C5', frequency: NoteFrequencies.getFrequency('C5') },
      },
      alto: {
        low: { note: 'F3', frequency: NoteFrequencies.getFrequency('F3') },
        high: { note: 'F5', frequency: NoteFrequencies.getFrequency('F5') },
      },
      mezzo: {
        low: { note: 'G3', frequency: NoteFrequencies.getFrequency('G3') },
        high: { note: 'G5', frequency: NoteFrequencies.getFrequency('G5') },
      },
      soprano: {
        low: { note: 'C4', frequency: NoteFrequencies.getFrequency('C4') },
        high: { note: 'C6', frequency: NoteFrequencies.getFrequency('C6') },
      },
    };
  }
}

// Initialiser automatiquement au chargement
NoteFrequencies.getAllNotes(); // Force l'initialisation

// Export par défaut
export default NoteFrequencies;