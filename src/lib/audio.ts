// Audio utility for playing alarm sounds
export type AlarmSoundType = "chime" | "bell" | "gentle" | "none";

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
