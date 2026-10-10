/**
 * Procedural Web Audio Engine for ARYA GM
 * No external mp3 files required; generates real-time audio synthesis.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicInterval: number | null = null;
  private isMusicPlaying: boolean = false;
  private beatStep: number = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isMusicPlaying) {
      this.stopMusic();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Kite cut: sharp line snap + high swoosh
  public playKiteCut() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);

    // Noise burst for snap
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
  }

  // Turbo boost: pitch sweep up
  public playTurbo() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  // Shield activate: resonant protective chime
  public playShield() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Gift fanfare: triumphant major chords
  public playGiftFanfare(coins: number = 100) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = coins > 500 ? [523, 659, 783, 1046, 1318] : [523, 659, 783, 1046];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    });
  }

  // Dance music procedural loop (Club/Festival vibe for Avatar Dance)
  public startDanceMusic() {
    if (this.isMuted || this.isMusicPlaying) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isMusicPlaying = true;
    this.beatStep = 0;

    const stepDuration = 135; // ~111 BPM 16th notes
    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const step = this.beatStep % 16;

      // Kick drum on 0, 4, 8, 12
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
        kickGain.gain.setValueAtTime(0.25, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        kickOsc.connect(kickGain);
        kickGain.connect(this.ctx.destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.14);
      }

      // Hi-hat on offbeats (2, 6, 10, 14)
      if (step % 4 === 2) {
        const hhBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
        const hhData = hhBuffer.getChannelData(0);
        for (let i = 0; i < hhData.length; i++) hhData[i] = Math.random() * 2 - 1;
        const hh = this.ctx.createBufferSource();
        hh.buffer = hhBuffer;
        const hhGain = this.ctx.createGain();
        hhGain.gain.setValueAtTime(0.08, now);
        hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        hh.connect(hhGain);
        hhGain.connect(this.ctx.destination);
        hh.start(now);
      }

      // Bass synth note
      if (step % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        const pitches = [110, 110, 130, 146, 110, 110, 164, 146];
        const pitch = pitches[Math.floor(step / 2) % pitches.length];
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(pitch, now);
        bassGain.gain.setValueAtTime(0.07, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.12);
      }

      this.beatStep++;
    }, stepDuration);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
  }

  public isMusicActive(): boolean {
    return this.isMusicPlaying;
  }
}

export const soundEngine = new SoundEngine();
