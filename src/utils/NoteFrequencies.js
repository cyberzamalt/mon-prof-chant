/**
 * NoteFrequencies.js
 * TYPE: Data - Frequency Lookup Tables
 * 
 * Responsabilités:
 * - Mappages notes ↔ fréquences
 * - Tables de référence complètes
 * - Support A0 à C8 (88 touches piano)
 * 
 * Dépendances: AUCUNE
 * Utilisé par: AudioMath, CentsCalculator, PitchDetector
 */

class NoteFrequencies {
  /**
   * Tableau complet des fréquences (A0 à C8)
   */
  static FREQUENCIES = {
    'A0': 27.5,
    'A#0': 29.13,
    'B0': 30.87,
    'C1': 32.7,
    'C#1': 34.65,
    'D1': 36.71,
    'D#1': 38.89,
    'E1': 41.2,
    'F1': 43.65,
    'F#1': 46.25,
    'G1': 49.0,
    'G#1': 51.96,
    'A1': 55.0,
    'A#1': 58.27,
    'B1': 61.74,
    'C2': 65.41,
    'C#2': 69.3,
    'D2': 73.42,
    'D#2': 77.78,
    'E2': 82.41,
    'F2': 87.31,
    'F#2': 92.5,
    'G2': 98.0,
    'G#2': 103.83,
    'A2': 110.0,
    'A#2': 116.54,
    'B2': 123.47,
    'C3': 130.81,
    'C#3': 138.59,
    'D3': 146.83,
    'D#3': 155.56,
    'E3': 164.81,
    'F3': 174.61,
    'F#3': 185.0,
    'G3': 196.0,
    'G#3': 207.65,
    'A3': 220.0,
    'A#3': 233.08,
    'B3': 246.94,
    'C4': 261.63,
    'C#4': 277.18,
    'D4': 293.66,
    'D#4': 311.13,
    'E4': 329.63,
    'F4': 349.23,
    'F#4': 369.99,
    'G4': 392.0,
    'G#4': 415.3,
    'A4': 440.0,
    'A#4': 466.16,
    'B4': 493.88,
    'C5': 523.25,
    'C#5': 554.37,
    'D5': 587.33,
    'D#5': 622.25,
    'E5': 659.25,
    'F5': 698.46,
    'F#5': 739.99,
    'G5': 783.99,
    'G#5': 830.61,
    'A5': 880.0,
    'A#5': 932.33,
    'B5': 987.77,
    'C6': 1046.5,
    'C#6': 1108.73,
    'D6': 1174.66,
    'D#6': 1244.51,
    'E6': 1318.51,
    'F6': 1396.91,
    'F#6': 1479.98,
    'G6': 1567.98,
    'G#6': 1661.22,
    'A6': 1760.0,
    'A#6': 1864.66,
    'B6': 1975.53,
    'C7': 2093.0,
    'C#7': 2217.46,
    'D7': 2349.32,
    'D#7': 2489.02,
    'E7': 2637.02,
    'F7': 2793.83,
    'F#7': 2959.96,
    'G7': 3135.96,
    'G#7': 3322.44,
    'A7': 3520.0,
    'A#7': 3729.31,
    'B7': 3951.07,
    'C8': 4186.01,
  };

  /**
   * Inverse: fréquence → note (arrondi)
   */
  static FREQUENCY_MAP = null;

  /**
   * Initialiser la map inverse
   */
  static initFrequencyMap() {
    if (!NoteFrequencies.FREQUENCY_MAP) {
      NoteFrequencies.FREQUENCY_MAP = new Map();
      Object.entries(NoteFrequencies.FREQUENCIES).forEach(([note, freq]) => {
        NoteFrequencies.FREQUENCY_MAP.set(Math.round(freq * 100), note);
      });
    }
  }

  /**
   * Obtenir la fréquence d'une note
   */
  static getFrequency(noteName) {
    try {
      return NoteFrequencies.FREQUENCIES[noteName] || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Obtenir toutes les notes
   */
  static getAllNotes() {
    try {
      return Object.keys(NoteFrequencies.FREQUENCIES);
    } catch (err) {
      return [];
    }
  }

  /**
   * Obtenir les notes d'une octave
   */
  static getNotesInOctave(octave) {
    try {
      const regex = new RegExp(`[A-G]#?${octave}$`);
      return Object.keys(NoteFrequencies.FREQUENCIES).filter(note => regex.test(note));
    } catch (err) {
      return [];
    }
  }

  /**
   * Trouver la note la plus proche d'une fréquence
   */
  static findNearestNote(frequencyHz) {
    try {
      let nearest = null;
      let minDiff = Infinity;

      Object.entries(NoteFrequencies.FREQUENCIES).forEach(([note, freq]) => {
        const diff = Math.abs(freq - frequencyHz);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = note;
        }
      });

      return nearest;
    } catch (err) {
      return 'A4';
    }
  }

  /**
   * Vérifier si une note existe
   */
  static noteExists(noteName) {
    try {
      return noteName in NoteFrequencies.FREQUENCIES;
    } catch (err) {
      return false;
    }
  }

  /**
   * Obtenir les notes vocales communes (C4 à C6)
   */
  static getVocalRange() {
    try {
      const range = {};
      for (let octave = 4; octave <= 6; octave++) {
        const notes = NoteFrequencies.getNotesInOctave(octave);
        notes.forEach(note => {
          range[note] = NoteFrequencies.FREQUENCIES[note];
        });
      }
      return range;
    } catch (err) {
      return {};
    }
  }

  /**
   * Obtenir l'intervalle entre deux notes
   */
  static getInterval(noteA, noteB) {
    try {
      const freqA = NoteFrequencies.getFrequency(noteA);
      const freqB = NoteFrequencies.getFrequency(noteB);
      if (!freqA || !freqB) return null;
      
      const semitones = 12 * Math.log2(freqB / freqA);
      return {
        semitones: semitones,
        cents: semitones * 100,
        ratio: freqB / freqA,
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Transposer une note
   */
  static transpose(noteName, semitones) {
    try {
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
      if (!match) return null;

      const note = match[1];
      const octave = parseInt(match[2]);
      const noteIndex = notes.indexOf(note);
      if (noteIndex === -1) return null;

      let newIndex = noteIndex + semitones;
      let newOctave = octave;

      while (newIndex < 0) {
        newIndex += 12;
        newOctave--;
      }
      while (newIndex >= 12) {
        newIndex -= 12;
        newOctave++;
      }

      return `${notes[newIndex]}${newOctave}`;
    } catch (err) {
      return null;
    }
  }

  /**
   * Obtenir les gammes communes
   */
  static getScale(rootNote, scaleType = 'major') {
    try {
      const scales = {
        major: [0, 2, 4, 5, 7, 9, 11],
        minor: [0, 2, 3, 5, 7, 8, 10],
        pentatonic: [0, 2, 4, 7, 9],
      };

      const intervals = scales[scaleType] || scales.major;
      const scale = [];

      intervals.forEach(semitone => {
        const transposed = NoteFrequencies.transpose(rootNote, semitone);
        if (transposed) {
          scale.push(transposed);
        }
      });

      return scale;
    } catch (err) {
      return [];
    }
  }
}

// Initialiser au chargement
NoteFrequencies.initFrequencyMap();

export { NoteFrequencies };
export default NoteFrequencies;
