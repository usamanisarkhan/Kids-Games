
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private scheduleAheadTime: number = 0.1;
  private lookahead: number = 25;
  private timerID: number | null = null;
  private current16thNote: number = 0;
  private tempo: number = 105;

  constructor() {}

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.error("Audio resume failed", e));
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public playPop() {
    this.init();
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // 1. Tonal "Zap" (Square wave sweep)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);

    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.start(t);
    osc.stop(t + 0.15);

    // 2. Noise Burst for "Crack"
    const duration = 0.1;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5; // White noise
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Simple Highpass filter to make it crisp
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    
    const noiseGain = this.ctx.createGain();
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    noise.start(t);
  }

  public startBGM() {
    if (this.isBgmPlaying) return;
    this.init();
    this.isBgmPlaying = true;
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx?.currentTime || 0;
    
    // Push start time slightly forward if just starting to avoid scheduling in past
    if (this.ctx && this.nextNoteTime < this.ctx.currentTime) {
        this.nextNoteTime = this.ctx.currentTime + 0.1;
    }
    this.scheduler();
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.timerID) {
        window.clearTimeout(this.timerID);
        this.timerID = null;
    }
  }

  private scheduler() {
    if (!this.isBgmPlaying || !this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note subdivision
    this.current16thNote++;
    if (this.current16thNote === 16) {
        this.current16thNote = 0;
    }
  }

  private scheduleNote(beatIndex: number, time: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // -- Bass Line (Offbeat driving feel) --
    // Pattern: 16th notes
    // Play on: 0, 2, 4, 6, 8, 10, 12, 14 (8th notes basically)
    if (beatIndex % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.type = 'sawtooth';

        // Note Logic: F - F - G - G (Simple loop)
        // beat 0-7: F2 (87.31), beat 8-15: G2 (98.00)
        let freq = beatIndex < 8 ? 87.31 : 98.00; 
        
        // Add octave jump on last beat of phrase
        if (beatIndex === 14) freq *= 2; 

        osc.frequency.setValueAtTime(freq, time);

        // Short snappy envelope
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        
        osc.start(time);
        osc.stop(time + 0.15);
    }

    // -- Lead Arp (Plucky) --
    // Play on random 16ths for sparkle: 0, 3, 6, 9, 12, 15
    if (beatIndex % 3 === 0) {
         const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.type = 'square';
        
        // Pentatonic C Minor ish: C, Eb, F, G, Bb
        // base notes
        const notes = [523.25, 622.25, 698.46, 783.99, 466.16]; // C5...
        const note = notes[beatIndex % notes.length];
        
        osc.frequency.setValueAtTime(note, time);
        
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        
        osc.start(time);
        osc.stop(time + 0.1);
    }

    // -- Kick Drum (Simulated) --
    // Beats 0, 4, 8, 12 (Four on the floor)
    if (beatIndex % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        
        osc.start(time);
        osc.stop(time + 0.5);
    }
  }
}

export const soundManager = new SoundManager();
