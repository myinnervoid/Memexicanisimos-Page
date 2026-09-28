// ======================================================================
// audio-engine.js v3.2 — Analog Preamp Emulation (Plan 3.2 Oficial)
//
// ARQUITECTURA:
//   1. Preamplificador Analógico con Zero-Click Drive:
//      - Curva maestra analógica fija (_generateMasterDistortionCurve)
//        basada en tanh(x * 2) y oversampling 4x.
//      - Modulación suave en preDriveGain: drive 0.0 (1x) a 1.0 (6x).
//   2. Espacio (Reverb de Salón): Feedback Delay Network filtrado a 950 Hz,
//      calibrado con retroalimentación controlada para evitar desbordes.
//   3. Grabación Directa: recDest conectado directamente a la salida del limitador.
//   4. FX Híbridos: archivos reales .ogg con fallback a síntesis analógica,
//      con reproducción independiente sin requerir micrófono activo.
// ======================================================================

export class SonideroEngine {
  constructor() {
    this.ctx            = null;
    this.micStream      = null;
    this.gateNode       = null;
    this.pitchNode      = null;

    // Saturación analógica Plan 3.2
    this.preDriveGain   = null; // Preamplificador interpolado (el "Drive")
    this.driveNode      = null; // Circuito analógico con curva fija

    // Delay de cinta y Reverb de salón
    this.delayNode      = null;
    this.feedbackGain   = null;
    this.dryGain        = null;
    this.wetGain        = null;

    this.reverbNode     = null;
    this.reverbFilter   = null;
    this.reverbFeedback = null;
    this.reverbGain     = null;

    // Limitador, medidor y salidas
    this.limiter        = null;
    this.analyser       = null;
    this.recDest        = null;
    this.monitorGain    = null;
    this.isMonitorOn    = true;

    // Parámetros oficiales Plan 3.2
    this.params = {
      pitch: -3,
      time: 0.32,
      feedback: 0.55,
      gate: -48,
      mix: 0.5,
      drive: 0.0,   // 0.0 (Limpio) a 1.0 (Saturación analógica musical)
      space: 0.20   // 0.0 a 1.0 (Reverb de salón)
    };

    // Motor autónomo de FX
    this._fxCtx      = null;
    this._fxOut      = null;
    this._soundCache = {};
    this._loading    = {};
  }

  // Curva de saturación maestra fija generada una sola vez (4096 muestras)
  _generateMasterDistortionCurve() {
    const n_samples = 4096;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; i++) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = Math.tanh(x * 2);
    }
    return curve;
  }

  // ════════════════════════════════════════════════════════════════════
  // HELPERS FX AUTÓNOMO (funciona sin mic)
  // ════════════════════════════════════════════════════════════════════

  async _ensureFx() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return { ctx: this.ctx, out: this.limiter };
    }

    if (!this._fxCtx || this._fxCtx.state === 'closed') {
      this._fxCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
      this._fxOut = this._fxCtx.createDynamicsCompressor();
      this._fxOut.threshold.value = -3.0;
      this._fxOut.knee.value      = 4;
      this._fxOut.ratio.value     = 12;
      this._fxOut.attack.value    = 0.001;
      this._fxOut.release.value   = 0.06;
      this._fxOut.connect(this._fxCtx.destination);

      this._preloadAll(this._fxCtx);
    }

    if (this._fxCtx.state === 'suspended') await this._fxCtx.resume();
    return { ctx: this._fxCtx, out: this._fxOut };
  }

  _preloadAll(ctx) {
    const names = ['airhorn', 'police', 'backup', 'emergency', 'scratch', 'siren_sonidera'];
    names.forEach(n => this._loadSound(ctx, n));
  }

  async _loadSound(ctx, name) {
    if (this._soundCache[name]) return this._soundCache[name];
    if (this._loading[name])    return this._loading[name];

    this._loading[name] = (async () => {
      try {
        const url = new URL(`../assets/sounds/${name}.ogg`, import.meta.url).href;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf);
        this._soundCache[name] = decoded;
        return decoded;
      } catch (e) {
        return null;
      } finally {
        delete this._loading[name];
      }
    })();

    return this._loading[name];
  }

  async _playFile(name, volume = 1.0) {
    const { ctx, out } = await this._ensureFx();
    const buffer = this._soundCache[name] ?? await this._loadSound(ctx, name);
    if (!buffer) return false;

    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    src.connect(gain);
    gain.connect(out);
    src.start(ctx.currentTime);
    return true;
  }

  _makeWaveshaper(ctx, amount = 30) {
    const ws    = ctx.createWaveShaper();
    const n     = 512;
    const curve = new Float32Array(n);
    const k     = amount / 10;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k || 1);
    }
    ws.curve      = curve;
    ws.oversample = '4x';
    return ws;
  }

  _makeReverb(ctx, duration = 0.25, decay = 0.6) {
    const rate   = ctx.sampleRate;
    const len    = Math.floor(rate * duration);
    const buf    = ctx.createBuffer(1, len, rate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay * 6);
    }
    const conv   = ctx.createConvolver();
    conv.buffer  = buf;
    return conv;
  }

  _makeNoiseBuffer(ctx, duration = 1.0) {
    const len  = Math.floor(ctx.sampleRate * duration);
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ════════════════════════════════════════════════════════════════════
  // MOTOR PRINCIPAL (requiere micrófono)
  // ════════════════════════════════════════════════════════════════════

  async init(deviceId) {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });

    await this.ctx.audioWorklet.addModule(new URL('../worklets/noise-gate.js',    import.meta.url));
    await this.ctx.audioWorklet.addModule(new URL('../worklets/pitch-shifter.js', import.meta.url));

    const constraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl:  false,
      channelCount: 1,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {})
    };

    this.micStream  = await navigator.mediaDevices.getUserMedia({ audio: constraints });
    const micSource = this.ctx.createMediaStreamSource(this.micStream);

    // 1. Gate de ruido
    this.gateNode = new AudioWorkletNode(this.ctx, 'noise-gate');

    // 2. Compresor de entrada
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value      = 8;
    comp.ratio.value     = 4.5;
    comp.attack.value    = 0.005;
    comp.release.value   = 0.10;

    // 3. Pitch shifter granular
    this.pitchNode = new AudioWorkletNode(this.ctx, 'granular-pitch-shifter');

    // 4. PRE-DRIVE GAIN + DRIVE (Curva Maestra Analógica Fija)
    this.preDriveGain = this.ctx.createGain();
    this.driveNode    = this.ctx.createWaveShaper();
    this.driveNode.curve      = this._generateMasterDistortionCurve();
    this.driveNode.oversample = '4x';

    // 5. Delay de Cinta (Tape Echo sonidero)
    this.delayNode    = this.ctx.createDelay(1.5);
    this.feedbackGain = this.ctx.createGain();
    this.dryGain      = this.ctx.createGain();
    this.wetGain      = this.ctx.createGain();

    const tapeLP = this.ctx.createBiquadFilter();
    tapeLP.type  = 'lowpass';
    tapeLP.frequency.value = 3400;
    tapeLP.Q.value = 0.72;

    const tapeHP = this.ctx.createBiquadFilter();
    tapeHP.type  = 'highpass';
    tapeHP.frequency.value = 130;

    // 6. Espacio (Reverb de Salón analógico)
    this.reverbNode     = this.ctx.createDelay(2.0);
    this.reverbFilter   = this.ctx.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.value = 950;
    this.reverbFeedback = this.ctx.createGain();
    this.reverbGain     = this.ctx.createGain();

    // 7. Salida y Limitador brickwall (-1.0 dBFS)
    this.monitorGain = this.ctx.createGain();
    this.monitorGain.gain.value = this.isMonitorOn ? 1.0 : 0.0;

    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.0;
    this.limiter.knee.value      = 0;
    this.limiter.ratio.value     = 20;
    this.limiter.attack.value    = 0.001;
    this.limiter.release.value   = 0.04;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.recDest = this.ctx.createMediaStreamDestination();

    // ── Ruteo (Signal Flow Plan 3.2) ──────────────────────────────────
    // Mic -> Gate -> Comp -> Pitch -> PRE-DRIVE -> DRIVE
    micSource.connect(this.gateNode);
    this.gateNode.connect(comp);
    comp.connect(this.pitchNode);
    this.pitchNode.connect(this.preDriveGain);
    this.preDriveGain.connect(this.driveNode);

    // Rama Dry: Drive -> DryGain -> Limiter
    this.driveNode.connect(this.dryGain);
    this.dryGain.connect(this.limiter);

    // Rama Wet: Drive -> Tape Delay Loop -> WetGain -> Limiter
    this.driveNode.connect(this.delayNode);
    this.delayNode.connect(tapeHP);
    tapeHP.connect(tapeLP);
    tapeLP.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.limiter);

    // Rama Espacio (Reverb Loop): Wet -> Reverb -> Filter -> Feedback
    this.wetGain.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbFilter);
    this.reverbFilter.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.reverbNode);
    this.reverbFilter.connect(this.reverbGain);
    this.reverbGain.connect(this.limiter);

    // Salidas finales
    this.limiter.connect(this.recDest);
    this.limiter.connect(this.analyser);
    this.analyser.connect(this.monitorGain);
    this.monitorGain.connect(this.ctx.destination);

    // Transferir caché al nuevo contexto
    if (this._fxCtx && this._fxCtx.state !== 'closed') {
      try { await this._fxCtx.close(); } catch {}
      this._fxCtx = null;
      this._fxOut = null;
    }
    this._soundCache = {};
    this._preloadAll(this.ctx);

    this.applyAll(this.params);
    return true;
  }

  async resume()  { if (this.ctx?.state === 'suspended') await this.ctx.resume(); }
  async suspend() { if (this.ctx) await this.ctx.suspend(); }
  async dispose() {
    this.micStream?.getTracks().forEach(t => t.stop());
    if (this.ctx) await this.ctx.close();
    this.ctx = this.micStream = null;
  }

  applyAll(params) {
    if (!this.ctx) return;
    this.params = { ...this.params, ...params };
    const t = this.ctx.currentTime;

    // Pitch & Gate
    if (this.pitchNode?.parameters) {
      this.pitchNode.parameters.get('pitch').setTargetAtTime(this.params.pitch, t, 0.02);
    }
    if (this.gateNode?.parameters) {
      this.gateNode.parameters.get('threshold').setTargetAtTime(this.params.gate, t, 0.02);
    }

    // Tape Delay
    this.delayNode.delayTime.cancelScheduledValues(t);
    this.delayNode.delayTime.setTargetAtTime(this.params.time, t, 0.045);
    this.feedbackGain.gain.setTargetAtTime(Math.min(0.85, this.params.feedback), t, 0.02);

    // DRIVE: Modulación en preDriveGain (1.0x a 6.0x)
    if (this.preDriveGain) {
      const driveMultiplier = 1 + (Math.max(0, Math.min(1, this.params.drive)) * 5);
      this.preDriveGain.gain.setTargetAtTime(driveMultiplier, t, 0.02);
    }

    // SPACE: Reverb de Salón calibrada
    if (this.reverbNode && this.reverbFeedback && this.reverbGain) {
      const sp = Math.max(0, Math.min(1, this.params.space));
      this.reverbNode.delayTime.setTargetAtTime(0.08 + (sp * 0.35), t, 0.05);
      this.reverbFeedback.gain.setTargetAtTime(sp * 0.60, t, 0.05);
      this.reverbGain.gain.setTargetAtTime(sp * 0.65, t, 0.05);
    }

    // Dry / Wet Mix
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.02);
    this.wetGain.gain.setTargetAtTime(this.params.mix,     t, 0.02);
  }

  setDrive(v)    { this.applyAll({ drive: v }); }
  setSpace(v)    { this.applyAll({ space: v }); }
  setPitch(v)    { this.applyAll({ pitch: v }); }
  setTime(v)     { this.applyAll({ time: v }); }
  setFeedback(v) { this.applyAll({ feedback: v }); }
  setGate(v)     { this.applyAll({ gate: v }); }
  setMix(v)      { this.applyAll({ mix: v }); }

  setMonitor(on) {
    this.isMonitorOn = on;
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setTargetAtTime(on ? 1.0 : 0.0, this.ctx.currentTime, 0.02);
    }
  }
  muteMonitorTemporarily() {
    this.monitorGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
  }
  restoreMonitor() {
    if (this.monitorGain && this.ctx && this.isMonitorOn) {
      this.monitorGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // FX CLÁSICOS & ALARMAS (Híbridos: archivo real o síntesis avanzada)
  // ════════════════════════════════════════════════════════════════════

  async playSiren() {
    if (await this._playFile('siren_sonidera', 0.85)) return;

    const { ctx, out } = await this._ensureFx();
    const now = ctx.currentTime;
    const ws  = this._makeWaveshaper(ctx, 35);
    const rev = this._makeReverb(ctx, 0.18, 0.55);
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.7, now + 0.05);
    masterGain.gain.setValueAtTime(0.7, now + 1.50);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.75);

    const freqSweeps = [
      [380, 650, 380, 700, 260],
      [760, 1300, 760, 1400, 520],
      [190, 325, 190, 350, 130],
    ];
    const times = [0, 0.40, 0.80, 1.20, 1.65];
    const vols  = [0.55, 0.22, 0.40];

    freqSweeps.forEach((sweepFreqs, idx) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'sawtooth';
      osc.frequency.setValueAtTime(sweepFreqs[0], now);
      times.forEach((t, i) => {
        if (sweepFreqs[i] !== undefined)
          osc.frequency.linearRampToValueAtTime(sweepFreqs[i], now + t);
      });
      gain.gain.setValueAtTime(vols[idx], now);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now); osc.stop(now + 1.8);
    });

    const lfo     = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type      = 'sine';
    lfo.frequency.setValueAtTime(7, now);
    lfoGain.gain.setValueAtTime(0.25, now);
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start(now); lfo.stop(now + 1.8);

    masterGain.connect(ws);
    ws.connect(rev);
    rev.connect(out);
    masterGain.connect(out);
  }

  async playLaser() {
    const { ctx, out } = await this._ensureFx();
    const now = ctx.currentTime;
    const ws  = this._makeWaveshaper(ctx, 60);

    const noiseBuf = this._makeNoiseBuffer(ctx, 0.06);
    const noiseSrc = ctx.createBufferSource();
    const noiseHP  = ctx.createBiquadFilter();
    const noiseG   = ctx.createGain();
    noiseSrc.buffer = noiseBuf;
    noiseHP.type  = 'highpass'; noiseHP.frequency.value = 4000;
    noiseG.gain.setValueAtTime(0.6, now);
    noiseG.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    noiseSrc.connect(noiseHP); noiseHP.connect(noiseG); noiseG.connect(out);
    noiseSrc.start(now); noiseSrc.stop(now + 0.07);

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type   = 'sawtooth';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);
    gain.gain.setValueAtTime(0.70, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(ws); ws.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + 0.38);
  }

  async playPitchDrop() {
    const { ctx, out } = await this._ensureFx();
    const now = ctx.currentTime;
    const ws  = this._makeWaveshaper(ctx, 20);

    const noiseBuf = this._makeNoiseBuffer(ctx, 1.5);
    const noiseSrc = ctx.createBufferSource();
    const noiseLP  = ctx.createBiquadFilter();
    const noiseG   = ctx.createGain();
    noiseSrc.buffer = noiseBuf;
    noiseLP.type  = 'bandpass'; noiseLP.frequency.value = 800; noiseLP.Q.value = 0.5;
    noiseG.gain.setValueAtTime(0.08, now);
    noiseG.gain.setValueAtTime(0.08, now + 1.0);
    noiseG.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    noiseSrc.connect(noiseLP); noiseLP.connect(noiseG); noiseG.connect(out);
    noiseSrc.start(now); noiseSrc.stop(now + 1.5);

    [440, 442.5, 437.5].forEach((startFreq) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'triangle';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(22, now + 1.25);

      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type      = 'sine';
      lfo.frequency.setValueAtTime(4, now);
      lfo.frequency.exponentialRampToValueAtTime(0.5, now + 1.2);
      lfoGain.gain.setValueAtTime(20, now);
      lfoGain.gain.exponentialRampToValueAtTime(0.1, now + 1.2);
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      lfo.start(now); lfo.stop(now + 1.3);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      osc.connect(ws); ws.connect(gain); gain.connect(out);
      osc.start(now); osc.stop(now + 1.28);
    });
  }

  async playAirHorn() {
    if (await this._playFile('airhorn', 0.9)) return;

    const { ctx, out } = await this._ensureFx();
    const now = ctx.currentTime;
    const ws  = this._makeWaveshaper(ctx, 45);
    const dur = 1.3;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.9, now + 0.03);
    masterGain.gain.setValueAtTime(0.9, now + dur - 0.25);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    const harmonics = [
      { freq: 175, detune: -3,  vol: 0.55 },
      { freq: 176.5, detune: 0, vol: 0.50 },
      { freq: 210, detune: 2,   vol: 0.35 },
      { freq: 245, detune: -2,  vol: 0.28 },
      { freq: 280, detune: 1,   vol: 0.20 },
      { freq: 350, detune: -1,  vol: 0.15 },
    ];

    harmonics.forEach(({ freq, detune, vol }) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);
      g.gain.setValueAtTime(vol, now);
      osc.connect(g); g.connect(masterGain);
      osc.start(now); osc.stop(now + dur + 0.05);
    });

    const bpf = ctx.createBiquadFilter();
    bpf.type  = 'peaking';
    bpf.frequency.value = 600; bpf.Q.value = 0.8; bpf.gain.value = 8;

    masterGain.connect(bpf);
    bpf.connect(ws);
    ws.connect(out);
  }

  async playPoliceSiren() {
    if (await this._playFile('police', 0.85)) return;

    const { ctx, out } = await this._ensureFx();
    const now = ctx.currentTime;
    const ws  = this._makeWaveshaper(ctx, 25);
    const rev = this._makeReverb(ctx, 0.20, 0.5);

    [0, 2].forEach(detuneCents => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'sawtooth';
      osc.detune.setValueAtTime(detuneCents, now);

      const cycle = 0.52;
      for (let i = 0; i < 4; i++) {
        const t0 = now + i * cycle;
        osc.frequency.setValueAtTime(980, t0);
        osc.frequency.linearRampToValueAtTime(760, t0 + cycle * 0.5);
        osc.frequency.linearRampToValueAtTime(980, t0 + cycle);
      }

      const total = cycle * 4;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.06);
      gain.gain.setValueAtTime(0.5, now + total - 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + total);

      osc.connect(gain); gain.connect(ws);
      osc.start(now); osc.stop(now + total + 0.08);
    });

    ws.connect(rev); rev.connect(out); ws.connect(out);
  }

  async playBackupAlarm() {
    if (await this._playFile('backup', 0.85)) return;

    const { ctx, out } = await this._ensureFx();
    const now    = ctx.currentTime;
    const ws     = this._makeWaveshaper(ctx, 15);
    const bipDur = 0.16, gap = 0.16;

    for (let i = 0; i < 7; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'square';
      osc.frequency.setValueAtTime(1080, now);

      const lp = ctx.createBiquadFilter();
      lp.type  = 'lowpass'; lp.frequency.value = 2200;

      const t0 = now + i * (bipDur + gap);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.55, t0 + 0.012);
      gain.gain.setValueAtTime(0.55, t0 + bipDur - 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + bipDur);

      osc.connect(lp); lp.connect(gain); gain.connect(ws); ws.connect(out);
      osc.start(t0); osc.stop(t0 + bipDur + 0.02);
    }
  }

  async playEmergencyAlarm() {
    if (await this._playFile('emergency', 0.88)) return;

    const { ctx, out } = await this._ensureFx();
    const now = ctx.currentTime;
    const ws  = this._makeWaveshaper(ctx, 30);
    const rev = this._makeReverb(ctx, 0.15, 0.5);

    for (let i = 0; i < 3; i++) {
      const osc   = ctx.createOscillator();
      const gain  = ctx.createGain();
      osc.type   = 'sawtooth';

      const osc2  = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type   = 'sawtooth';

      const t0 = now + i * 0.58;
      osc.frequency.setValueAtTime(1500, t0);
      osc.frequency.linearRampToValueAtTime(850, t0 + 0.48);
      osc2.frequency.setValueAtTime(750, t0);
      osc2.frequency.linearRampToValueAtTime(425, t0 + 0.48);

      [gain, gain2].forEach(g => {
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.5, t0 + 0.02);
        g.gain.setValueAtTime(0.5, t0 + 0.42);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      });

      osc.connect(gain);   gain.connect(ws);
      osc2.connect(gain2); gain2.connect(ws);
      ws.connect(rev); rev.connect(out); ws.connect(out);

      [osc, osc2].forEach(o => { o.start(t0); o.stop(t0 + 0.58); });
    }
  }

  async playScratch() {
    if (await this._playFile('scratch', 0.9)) return;

    const { ctx, out } = await this._ensureFx();
    const now = ctx.currentTime;
    const dur = 0.55;

    const noiseBuf = this._makeNoiseBuffer(ctx, dur + 0.1);
    const src      = ctx.createBufferSource();
    src.buffer     = noiseBuf;

    const bp = ctx.createBiquadFilter();
    bp.type  = 'bandpass';
    bp.frequency.setValueAtTime(8000, now);
    bp.frequency.linearRampToValueAtTime(300, now + 0.20);
    bp.frequency.linearRampToValueAtTime(6000, now + 0.40);
    bp.frequency.exponentialRampToValueAtTime(100, now + dur);
    bp.Q.setValueAtTime(1.5, now);

    const ws   = this._makeWaveshaper(ctx, 55);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.8, now);
    gain.gain.setValueAtTime(1.8, now + dur - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(bp); bp.connect(ws); ws.connect(gain); gain.connect(out);
    src.start(now); src.stop(now + dur + 0.05);
  }
}