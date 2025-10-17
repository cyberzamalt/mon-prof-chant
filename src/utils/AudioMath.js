/**
 * AudioMath.js
 * TYPE: Utility - Audio Mathematical Conversions
 * 
 * Responsabilités:
 * - Conversions Hz ↔ Cents ↔ Notes ↔ Semitones
 * - Calculs acoustiques
 * - Formules scientifiques
 * 
 * Dépendances: AUCUNE
 * Utilisé par: CentsCalculator, PitchDetector, Visualization
 */

class AudioMath {
  // Constantes
  static A4_FREQUENCY = 440; // Hz
  static A4_SEMITONE = 69; // MIDI note number
  static SEMITONES_PER_OCTAVE = 12;
  static CENTS_PER_SEMITONE = 100;

  /**
   * Convertir Hz en cents relatif à une fréquence de référence
   */
  static hzToCents(frequencyHz, referenceHz = AudioMath.A4_FREQUENCY) {
    try {
      if (frequencyHz <= 0 || referenceHz <= 0) {
        return 0;
      }
      return 1200 * Math.log2(frequencyHz / referenceHz);
    } catch (err) {
      return 0;
    }
  }

  /**
   * Convertir cents en Hz relatif à une fréquence de référence
   */
  static centsToHz(cents, referenceHz = AudioMath.A4_FREQUENCY) {
    try {
      return referenceHz * Math.pow(2, cents / 1200);
    } catch (err) {
      return referenceHz;
    }
  }

  /**
   * Convertir Hz en numéro de note MIDI
   */
  static hzToMidiNote(frequencyHz) {
    try {
      if (frequencyHz <= 0) return 0;
      return AudioMath.A4_SEMITONE + 12 * Math.log2(frequencyHz / AudioMath.A4_FREQUENCY);
    } catch (err) {
      return AudioMath.A4_SEMITONE;
    }
  }

  /**
   * Convertir numéro de note MIDI en Hz
   */
  static midiNoteToHz(midiNote) {
    try {
      return AudioMath.A4_FREQUENCY * Math.pow(2, (midiNote - AudioMath.A4_SEMITONE) / 12);
    } catch (err) {
      return AudioMath.A4_FREQUENCY;
    }
  }

  /**
   * Convertir Hz en nom de note (C4, D#5, etc.)
   */
  static hzToNoteName(frequencyHz) {
    try {
      const midiNote = Math.round(AudioMath.hzToMidiNote(frequencyHz));
      return AudioMath.midiNoteToNoteName(midiNote);
    } catch (err) {
      return 'A4';
    }
  }

  /**
   * Convertir numéro MIDI en nom de note
   */
  static midiNoteToNoteName(midiNote) {
    try {
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const noteName = notes[midiNote % 12];
      const octave = Math.floor(midiNote / 12) - 1;
      return `${noteName}${octave}`;
    } catch (err) {
      return 'A4';
    }
  }

  /**
   * Convertir nom de note en Hz
   */
  static noteNameToHz(noteName) {
    try {
      const notes = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
      const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
      if (!match) return AudioMath.A4_FREQUENCY;
      
      const note = match[1];
      const octave = parseInt(match[2]);
      const semitone = (octave + 1) * 12 + notes[note];
      return AudioMath.midiNoteToHz(semitone);
    } catch (err) {
      return AudioMath.A4_FREQUENCY;
    }
  }

  /**
   * Obtenir la note la plus proche
   */
  static getNearestNote(frequencyHz) {
    try {
      const midiNote = Math.round(AudioMath.hzToMidiNote(frequencyHz));
      const nearestHz = AudioMath.midiNoteToHz(midiNote);
      const cents = AudioMath.hzToCents(frequencyHz, nearestHz);
      return {
        note: AudioMath.midiNoteToNoteName(midiNote),
        hz: nearestHz,
        cents: cents,
        midiNote: midiNote,
      };
    } catch (err) {
      return { note: 'A4', hz: AudioMath.A4_FREQUENCY, cents: 0, midiNote: 69 };
    }
  }

  /**
   * Vérifier si frequency est dans une gamme acceptable
   */
  static isInRange(frequencyHz, minHz = 20, maxHz = 20000) {
    try {
      return frequencyHz >= minHz && frequencyHz <= maxHz;
    } catch (err) {
      return false;
    }
  }

  /**
   * Centrer une fréquence à la note la plus proche
   */
  static snapToNote(frequencyHz) {
    try {
      const midiNote = Math.round(AudioMath.hzToMidiNote(frequencyHz));
      return AudioMath.midiNoteToHz(midiNote);
    } catch (err) {
      return frequencyHz;
    }
  }

  /**
   * Calculer la bande passante critique (pour visualisation)
   */
  static criticalBandwidth(frequencyHz) {
    try {
      // Formule Zwicker
      const z = 13 * Math.atan(0.76 * frequencyHz / 1000);
      return z;
    } catch (err) {
      return 1;
    }
  }

  /**
   * Vérifier si deux fréquences sont en harmonie (intervalle connu)
   */
  static isHarmonic(freq1, freq2, tolerance = 50) {
    try {
      const ratio = Math.max(freq1, freq2) / Math.min(freq1, freq2);
      const cents = 1200 * Math.log2(ratio);
      return Math.abs(cents) <= tolerance;
    } catch (err) {
      return false;
    }
  }
}

export { AudioMath };
export default AudioMath;
