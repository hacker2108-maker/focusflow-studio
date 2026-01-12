// Audio utility for playing alarm sounds
export type AlarmSoundType = "chime" | "bell" | "gentle" | "melody" | "none";

export class AlarmSound {
  private audioContext: AudioContext | null = null;
  
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  playAlarm(type: AlarmSoundType = "chime"): void {
    if (type === "none") return;
    
    switch (type) {
      case "chime":
        this.playChime();
        break;
      case "bell":
        this.playBell();
        break;
      case "gentle":
        this.playGentle();
        break;
      case "melody":
        this.playMelody();
        break;
    }
  }

  private playChime(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Play a pleasant chime sequence
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + index * 0.15);
      
      // Envelope
      gainNode.gain.setValueAtTime(0, now + index * 0.15);
      gainNode.gain.linearRampToValueAtTime(0.3, now + index * 0.15 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.5);
      
      oscillator.start(now + index * 0.15);
      oscillator.stop(now + index * 0.15 + 0.5);
    });

    // Second sequence for emphasis
    setTimeout(() => {
      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + index * 0.15);
        gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + index * 0.15 + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.15 + 0.5);
        
        oscillator.start(ctx.currentTime + index * 0.15);
        oscillator.stop(ctx.currentTime + index * 0.15 + 0.5);
      });
    }, 800);
  }

  private playBell(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Bell-like sound with harmonics
    const fundamentalFreq = 440; // A4
    const harmonics = [1, 2.4, 3, 4.2, 5.4];
    
    harmonics.forEach((harmonic, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(fundamentalFreq * harmonic, now);
      
      const volume = 0.3 / (index + 1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2);
      
      oscillator.start(now);
      oscillator.stop(now + 2);
    });

    // Second strike
    setTimeout(() => {
      harmonics.forEach((harmonic, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(fundamentalFreq * harmonic, ctx.currentTime);
        
        const volume = 0.25 / (index + 1);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 2);
      });
    }, 1000);
  }

  private playGentle(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Soft, gentle tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(392, now); // G4
    oscillator.frequency.linearRampToValueAtTime(523.25, now + 1); // Glide to C5
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gainNode.gain.setValueAtTime(0.15, now + 1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2);
    
    oscillator.start(now);
    oscillator.stop(now + 2);
  }

  private playMelody(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Apple-style uplifting melody - similar to "Radial" or "Constellation"
    // Notes: C5, E5, G5, C6, B5, G5, E5, G5 with rhythmic timing
    const notes = [
      { freq: 523.25, time: 0, duration: 0.2 },      // C5
      { freq: 659.25, time: 0.2, duration: 0.2 },    // E5
      { freq: 783.99, time: 0.4, duration: 0.2 },    // G5
      { freq: 1046.50, time: 0.6, duration: 0.4 },   // C6 (longer)
      { freq: 987.77, time: 1.1, duration: 0.2 },    // B5
      { freq: 783.99, time: 1.3, duration: 0.2 },    // G5
      { freq: 659.25, time: 1.5, duration: 0.2 },    // E5
      { freq: 783.99, time: 1.7, duration: 0.5 },    // G5 (resolve)
    ];

    notes.forEach(({ freq, time, duration }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Use triangle wave for a softer, more musical tone
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(freq, now + time);
      
      // Smooth envelope
      gainNode.gain.setValueAtTime(0, now + time);
      gainNode.gain.linearRampToValueAtTime(0.25, now + time + 0.03);
      gainNode.gain.setValueAtTime(0.25, now + time + duration * 0.7);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + time + duration);
      
      oscillator.start(now + time);
      oscillator.stop(now + time + duration + 0.1);
    });

    // Add a subtle harmonic layer for richness
    notes.forEach(({ freq, time, duration }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Octave higher, quieter
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq * 2, now + time);
      
      gainNode.gain.setValueAtTime(0, now + time);
      gainNode.gain.linearRampToValueAtTime(0.08, now + time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + time + duration);
      
      oscillator.start(now + time);
      oscillator.stop(now + time + duration + 0.1);
    });

    // Repeat the melody after a pause
    setTimeout(() => {
      this.playMelody();
    }, 3000);
  }

  playBreakEnd(type: AlarmSoundType = "chime"): void {
    if (type === "none") return;
    
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Softer, shorter sound for break end
    const frequencies = [392, 523.25]; // G4, C5
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + index * 0.2);
      
      gainNode.gain.setValueAtTime(0, now + index * 0.2);
      gainNode.gain.linearRampToValueAtTime(0.2, now + index * 0.2 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.2 + 0.3);
      
      oscillator.start(now + index * 0.2);
      oscillator.stop(now + index * 0.2 + 0.3);
    });
  }

  // Test sound preview
  playPreview(type: AlarmSoundType): void {
    if (type === "none") return;
    
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    
    let freq = 440;
    switch (type) {
      case "chime":
        freq = 523.25;
        break;
      case "bell":
        freq = 440;
        break;
      case "gentle":
        freq = 392;
        break;
      case "melody":
        // Play a short melody preview
        const previewNotes = [
          { freq: 523.25, time: 0 },
          { freq: 659.25, time: 0.15 },
          { freq: 783.99, time: 0.3 },
        ];
        previewNotes.forEach(({ freq, time }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + time);
          gain.gain.setValueAtTime(0, now + time);
          gain.gain.linearRampToValueAtTime(0.2, now + time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.2);
          osc.start(now + time);
          osc.stop(now + time + 0.25);
        });
        return;
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }
}

export const alarmSound = new AlarmSound();
