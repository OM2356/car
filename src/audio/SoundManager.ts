/**
 * Procedural Web Audio API sound synthesizer for TURBO RUSH 3D
 * Generates all engine tones, turbo whooshes, tire screeches, near-miss chimes,
 * collision explosions, and UI feedback without external audio files.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Engine synthesizer nodes
  private engineMasterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineDistortion: WaveShaperNode | null = null;

  // Boost / Spool nodes
  private turboGain: GainNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  private turboNoiseNode: AudioNode | null = null;

  // Tire screech nodes
  private screechGain: GainNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;

  constructor() {
    // AudioContext will be initialized on the first user interaction
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch {
      console.warn('Web Audio API not supported');
    }
  }

  public async resume(): Promise<void> {
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.isInitialized) {
      this.setupEngineLoop();
      this.isInitialized = true;
    }
  }

  private makeDistortionCurve(amount = 20): Float32Array<ArrayBuffer> {
    const k = typeof amount === 'number' ? amount : 50;
    const nSamples = 44100;
    const buffer = new ArrayBuffer(nSamples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private setupEngineLoop() {
    if (!this.ctx) return;

    // Master engine gain
    this.engineMasterGain = this.ctx.createGain();
    this.engineMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // Distortion for aggressive exhaust grit
    this.engineDistortion = this.ctx.createWaveShaper();
    this.engineDistortion.curve = this.makeDistortionCurve(15);
    this.engineDistortion.oversample = '2x';

    // Lowpass filter for exhaust tone
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    // Primary engine cylinder firing oscillator (sawtooth)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    // Secondary cylinder harmonics (triangle)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    // Deep sub-bass growl
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'sine';
    this.engineSubOsc.frequency.setValueAtTime(28, this.ctx.currentTime);

    // Connect engine nodes
    this.engineOsc1.connect(this.engineDistortion);
    this.engineOsc2.connect(this.engineDistortion);
    this.engineSubOsc.connect(this.engineDistortion);

    this.engineDistortion.connect(this.engineFilter);
    this.engineFilter.connect(this.engineMasterGain);
    this.engineMasterGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSubOsc.start();

    // Turbo whistle setup
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.ctx.destination);
    this.turboOsc.start();

    // Tire screech setup (filtered white noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.ctx.destination);
    whiteNoise.start();
    this.turboNoiseNode = whiteNoise;
  }

  public updateEngineSound(speedKmh: number, isAccelerating: boolean, isBraking: boolean, isBoosting: boolean) {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const t = this.ctx.currentTime;
    const normalizedSpeed = Math.min(speedKmh / 260, 1.4);

    // Target volume
    const baseVolume = 0.22;
    const targetGain = 0.12 + normalizedSpeed * 0.15 + (isAccelerating ? 0.08 : 0);
    this.engineMasterGain?.gain.setTargetAtTime(targetGain, t, 0.08);

    // Fundamental frequency based on speed and RPM
    const baseFreq = 48 + normalizedSpeed * 125 + (isAccelerating ? 15 : 0) + (isBoosting ? 25 : 0);
    this.engineOsc1?.frequency.setTargetAtTime(baseFreq, t, 0.06);
    this.engineOsc2?.frequency.setTargetAtTime(baseFreq * 2.01, t, 0.06);
    this.engineSubOsc?.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.06);

    // Filter opening with speed
    const cutoff = 380 + normalizedSpeed * 1100 + (isAccelerating ? 250 : 0);
    this.engineFilter?.frequency.setTargetAtTime(cutoff, t, 0.08);

    // Turbo spool whistle
    if (isBoosting) {
      this.turboGain?.gain.setTargetAtTime(0.18, t, 0.05);
      this.turboOsc?.frequency.setTargetAtTime(2200 + normalizedSpeed * 800, t, 0.1);
    } else if (isAccelerating && normalizedSpeed > 0.4) {
      this.turboGain?.gain.setTargetAtTime(0.06, t, 0.1);
      this.turboOsc?.frequency.setTargetAtTime(1600 + normalizedSpeed * 400, t, 0.15);
    } else {
      this.turboGain?.gain.setTargetAtTime(0, t, 0.12);
    }

    // Tire screech on hard braking or high-speed sharp turns
    if (isBraking && speedKmh > 50) {
      this.screechGain?.gain.setTargetAtTime(0.2, t, 0.04);
      this.screechFilter?.frequency.setTargetAtTime(1400 + Math.random() * 400, t, 0.05);
    } else {
      this.screechGain?.gain.setTargetAtTime(0, t, 0.08);
    }
  }

  public stopEngine() {
    if (!this.ctx || !this.engineMasterGain) return;
    const t = this.ctx.currentTime;
    this.engineMasterGain.gain.setTargetAtTime(0, t, 0.1);
    this.turboGain?.gain.setTargetAtTime(0, t, 0.1);
    this.screechGain?.gain.setTargetAtTime(0, t, 0.05);
  }

  public playNearMiss() {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;

    // Whoosh air sound
    const whooshOsc = this.ctx.createOscillator();
    const whooshGain = this.ctx.createGain();
    const whooshFilter = this.ctx.createBiquadFilter();

    whooshOsc.type = 'sine';
    whooshOsc.frequency.setValueAtTime(320, t);
    whooshOsc.frequency.exponentialRampToValueAtTime(80, t + 0.25);

    whooshGain.gain.setValueAtTime(0.25, t);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    whooshFilter.type = 'lowpass';
    whooshFilter.frequency.setValueAtTime(800, t);

    whooshOsc.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(this.ctx.destination);

    whooshOsc.start(t);
    whooshOsc.stop(t + 0.35);

    // High energetic chime
    const chimeOsc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();

    chimeOsc.type = 'triangle';
    chimeOsc.frequency.setValueAtTime(880, t + 0.04);
    chimeOsc.frequency.setValueAtTime(1320, t + 0.12);

    chimeGain.gain.setValueAtTime(0.2, t + 0.04);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);

    chimeOsc.start(t + 0.04);
    chimeOsc.stop(t + 0.45);
  }

  public playCrash() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    this.stopEngine();

    const t = this.ctx.currentTime;

    // 1. Heavy noise blast (crunching metal)
    const bufferSize = this.ctx.sampleRate * 0.8;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2200, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(250, t + 0.6);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseSrc.start(t);

    // 2. Sub-bass shockwave impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.5);

    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.65);
  }

  public playButtonClick() {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.06);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playCountdownBeep(high = false) {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(high ? 1046.5 : 523.25, t); // C6 or C5

    gain.gain.setValueAtTime(high ? 0.25 : 0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (high ? 0.35 : 0.15));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + (high ? 0.4 : 0.2));
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopEngine();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
