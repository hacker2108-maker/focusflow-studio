// Audio utility for playing alarm sounds
export class AlarmSound {
  private audioContext: AudioContext | null = null;
  
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  playAlarm(): void {
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

  playBreakEnd(): void {
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
}

export const alarmSound = new AlarmSound();