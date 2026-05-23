let audioCtx: AudioContext | null = null;

export function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    // Play a beautiful soft chime (pentatonic rise)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const duration = 0.15;
    
    notes.forEach((freq, idx) => {
      const time = audioCtx!.currentTime + idx * 0.08;
      
      const osc = audioCtx!.createOscillator();
      const gainNode = audioCtx!.createGain();
      
      // Use sine for standard pure tones
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      
      // Add very subtle warm vibrato
      const fmOsc = audioCtx!.createOscillator();
      const fmGain = audioCtx!.createGain();
      fmOsc.frequency.value = 5; // Hertz
      fmGain.gain.value = 3; // Depth
      fmOsc.connect(fmGain);
      fmGain.connect(osc.frequency);
      
      // Envelope
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.15, time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx!.destination);
      
      fmOsc.start(time);
      osc.start(time);
      
      fmOsc.stop(time + duration);
      osc.stop(time + duration);
    });
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
  }
}

export function playAlert() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    // Play a dual-tone warm gong alert
    const freqs = [330.00, 440.00]; // E4 and A4 harmonic chord
    const time = audioCtx.currentTime;
    
    freqs.forEach((freq) => {
      const osc = audioCtx!.createOscillator();
      const gainNode = audioCtx!.createGain();
      
      osc.type = 'triangle'; // Mellower woodwind sound
      osc.frequency.setValueAtTime(freq, time);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.2, time + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.82);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx!.destination);
      
      osc.start(time);
      osc.stop(time + 0.85);
    });
  } catch (err) {
    console.warn('Audio alert playback failed:', err);
  }
}
