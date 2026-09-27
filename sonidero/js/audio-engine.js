// Motor de audio: construye el grafo, maneja parámetros y sintetiza FX.

export class SonideroEngine {
  constructor() {
    this.ctx = null;
    this.micStream = null;
    this.gateNode = null;
    this.pitchNode = null;
    this.delayNode = null;
    this.feedbackGain = null;
    this.dryGain = null;
    this.wetGain = null;
    this.limiter = null;
    this.analyser = null;
    this.recDest = null;
    this.monitorGain = null;
    this.isMonitorOn = true;
    this.params = { pitch: -3, time: 0.32, feedback: 0.55, gate: -48, mix: 0.5 };
  }

  async init(deviceId) {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });

    // Cargar worklets desde archivos reales (resueltos relativos a este módulo)
    await this.ctx.audioWorklet.addModule(new URL('../worklets/noise-gate.js', import.meta.url));
    await this.ctx.audioWorklet.addModule(new URL('../worklets/pitch-shifter.js', import.meta.url));

    const audioConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1
    };
    if (deviceId) audioConstraints.deviceId = { exact: deviceId };

    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    const micSource = this.ctx.createMediaStreamSource(this.micStream);

    // 1. Gate
    this.gateNode = new AudioWorkletNode(this.ctx, 'noise-gate');

    // 2. Compresor broadcast
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 8;
    compressor.ratio.value = 4.5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.1;

    // 3. Pitch shifter
    this.pitchNode = new AudioWorkletNode(this.ctx, 'granular-pitch-shifter');

    // 4. Delay con damping loop de cinta
    this.delayNode = this.ctx.createDelay(1.5);
    this.feedbackGain = this.ctx.createGain();
    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();

    const tapeFilter = this.ctx.createBiquadFilter();
    tapeFilter.type = 'lowpass';
    tapeFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    tapeFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    const hipassFilter = this.ctx.createBiquadFilter();
    hipassFilter.type = 'highpass';
    hipassFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

    // 5. Monitor local (bocinas / audífonos)
    this.monitorGain = this.ctx.createGain();
    this.monitorGain.gain.setValueAtTime(this.isMonitorOn ? 1.0 : 0.0, this.ctx.currentTime);

    // 6. Limitador brickwall
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.0;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.04;

    // 7. Analizador VU
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;

    // 8. Destino de grabación
    this.recDest = this.ctx.createMediaStreamDestination();

    // Enrutamiento
    micSource.connect(this.gateNode);
    this.gateNode.connect(compressor);
    compressor.connect(this.pitchNode);

    // Rama Dry
    this.pitchNode.connect(this.dryGain);
    this.dryGain.connect(this.limiter);

    // Rama Wet
    this.pitchNode.connect(this.delayNode);
    this.delayNode.connect(hipassFilter);
    hipassFilter.connect(tapeFilter);
    tapeFilter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.limiter);

    // Grabación + VU
    this.limiter.connect(this.recDest);
    this.limiter.connect(this.analyser);

    // Salida con interruptor de monitoreo
    this.analyser.connect(this.monitorGain);
    this.monitorGain.connect(this.ctx.destination);

    this.applyAll(this.params);
    return true;
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  async suspend() {
    if (this.ctx) await this.ctx.suspend();
  }

  async dispose() {
    if (this.micStream) this.micStream.getTracks().forEach((t) => t.stop());
    if (this.ctx) await this.ctx.close();
    this.ctx = null;
    this.micStream = null;
  }

  applyAll(params) {
    if (!this.ctx) return;
    this.params = { ...this.params, ...params };
    const t = this.ctx.currentTime;

    this.pitchNode.parameters.get('pitch').setTargetAtTime(this.params.pitch, t, 0.02);
    this.delayNode.delayTime.cancelScheduledValues(t);
    this.delayNode.delayTime.setTargetAtTime(this.params.time, t, 0.045);
    this.feedbackGain.gain.setTargetAtTime(this.params.feedback, t, 0.02);
    this.gateNode.parameters.get('threshold').setTargetAtTime(this.params.gate, t, 0.02);

    const mix = this.params.mix;
    this.dryGain.gain.setTargetAtTime(1 - mix, t, 0.02);
    this.wetGain.gain.setTargetAtTime(mix, t, 0.02);
  }

  setPitch(v) { this.applyAll({ pitch: v }); }
  setTime(v) { this.applyAll({ time: v }); }
  setFeedback(v) { this.applyAll({ feedback: v }); }
  setGate(v) { this.applyAll({ gate: v }); }
  setMix(v) { this.applyAll({ mix: v }); }

  setMonitor(on) {
    this.isMonitorOn = on;
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setTargetAtTime(on ? 1.0 : 0.0, this.ctx.currentTime, 0.02);
    }
  }

  // Silenciar temporalmente el monitor (por ejemplo, durante grabación con bocinas)
  muteMonitorTemporarily() {
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    }
  }

  restoreMonitor() {
    if (this.monitorGain && this.ctx && this.isMonitorOn) {
      this.monitorGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
    }
  }

  playSiren() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.linearRampToValueAtTime(850, now + 0.35);
    osc.frequency.linearRampToValueAtTime(450, now + 0.7);
    osc.frequency.linearRampToValueAtTime(850, now + 1.05);
    osc.frequency.linearRampToValueAtTime(300, now + 1.4);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    osc.connect(gain);
    gain.connect(this.limiter);
    osc.start(now);
    osc.stop(now + 1.4);
  }

  playLaser() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.28);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.limiter);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  playPitchDrop() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.85);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc.connect(gain);
    gain.connect(this.limiter);
    osc.start(now);
    osc.stop(now + 0.85);
  }
}