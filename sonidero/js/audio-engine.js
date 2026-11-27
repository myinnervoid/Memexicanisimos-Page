// ======================================================================
// audio-engine.js — Analog Preamp Emulation & Hybrid FX
//
// ARQUITECTURA:
//   1. Preamplificador Analógico con Zero-Click Drive:
//      - Curva maestra analógica fija (_generateMasterDistortionCurve)
//        basada en tanh(x * 2) y oversampling 4x.
//      - Modulación suave en preDriveGain: drive 0.0 (1x) a 1.0 (6x).
//   2. Espacio (Reverb de Salón): Feedback Delay Network filtrado a 950 Hz,
//      calibrado con retroalimentación controlada para evitar desbordes.
//   3. Buses Independientes (Voz vs FX):
//      - Monitor: MUTE silencia únicamente el retorno local de voz para
//        evitar acoples (feedback) en bocinas, permitiendo que los FX y
//        alarmas sigan sonando y que tanto voz como FX se graben en recDest.
//   4. FX Híbridos:
//      - Decodifica los 6 sonidos desde respaldo de audio integrado
//        (window.SONIDERO_SOUNDS_B64) o fetch HTTP, con fallback a síntesis
//        analógica avanzada en Web Audio API.
// ======================================================================

const NOISE_GATE_WORKLET_CODE = `
class NoiseGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'threshold', defaultValue: -48, minValue: -80, maxValue: -10 }];
  }
  constructor() {
    super();
    this.gain = 0.0;
    this.env = 0.0;
    this.isOpen = false;
    this.envAttack = 1 - Math.exp(-1 / (sampleRate * 0.005));
    this.envRelease = 1 - Math.exp(-1 / (sampleRate * 0.080));
    this.gainAttack = 1 - Math.exp(-1 / (sampleRate * 0.004));
    this.gainRelease = 1 - Math.exp(-1 / (sampleRate * 0.090));
    this._frameCount = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (!input) return true;
    const threshOpen = Math.pow(10, parameters.threshold[0] / 20);
    const threshClose = threshOpen * 0.5;
    for (let i = 0; i < input.length; i++) {
      const absSample = Math.abs(input[i]);
      const envCoeff = absSample > this.env ? this.envAttack : this.envRelease;
      this.env += (absSample - this.env) * envCoeff;
      if (!this.isOpen && this.env > threshOpen) {
        this.isOpen = true;
      } else if (this.isOpen && this.env < threshClose) {
        this.isOpen = false;
      }
      const targetGain = this.isOpen ? 1.0 : 0.0;
      const gainCoeff = targetGain > this.gain ? this.gainAttack : this.gainRelease;
      this.gain += (targetGain - this.gain) * gainCoeff;
      output[i] = input[i] * this.gain;
    }
    this._frameCount++;
    if (this._frameCount % 6 === 0) {
      this.port.postMessage({ isOpen: this.isOpen, env: this.env });
    }
    return true;
  }
}
registerProcessor('noise-gate', NoiseGateProcessor);
`;

const PITCH_SHIFTER_WORKLET_CODE = `
class GranularPitchShifter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'pitch', defaultValue: -3, minValue: -12, maxValue: 12 }];
  }
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.windowSize = 2048;
    this.phase = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (!input) return true;
    const pitchParam = parameters.pitch;
    const isARate = pitchParam.length > 1;
    const staticPitchFactor = !isARate ? Math.pow(2, pitchParam[0] / 12) : 1;
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writeIndex] = input[i];
      const semitones = isARate ? pitchParam[i] : pitchParam[0];
      const pitchFactor = isARate ? Math.pow(2, semitones / 12) : staticPitchFactor;
      const phase1 = this.phase;
      const phase2 = (this.phase + 0.5) % 1.0;
      const readPos1 = (this.writeIndex - phase1 * this.windowSize + this.bufferSize) % this.bufferSize;
      const readPos2 = (this.writeIndex - phase2 * this.windowSize + this.bufferSize) % this.bufferSize;
      const idx1 = Math.floor(readPos1);
      const frac1 = readPos1 - idx1;
      const s1 = this.buffer[idx1] * (1 - frac1) + this.buffer[(idx1 + 1) % this.bufferSize] * frac1;
      const idx2 = Math.floor(readPos2);
      const frac2 = readPos2 - idx2;
      const s2 = this.buffer[idx2] * (1 - frac2) + this.buffer[(idx2 + 1) % this.bufferSize] * frac2;
      const w1 = 0.5 * (1 - Math.cos(2 * Math.PI * phase1));
      const w2 = 0.5 * (1 - Math.cos(2 * Math.PI * phase2));
      output[i] = s1 * w1 + s2 * w2;
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      const delta = (1.0 - pitchFactor) / this.windowSize;
      this.phase = (this.phase + delta + 1.0) % 1.0;
    }
    return true;
  }
}
registerProcessor('granular-pitch-shifter', GranularPitchShifter);
`;

function base64ToArrayBuffer(b64) {
  const clean = b64.replace(/\s+/g, '');
  const binary = atob(clean);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class SonideroEngine {
  constructor() {
    this.ctx            = null;
    this.micStream      = null;
    this.micInputGain   = null;
    this.isMicActive    = false;
    this.gateNode       = null;
    this.pitchNode      = null;

    // Saturación analógica
    this.preDriveGain   = null;
    this.driveNode      = null;

    // Delay de cinta y Reverb de salón
    this.delayNode      = null;
    this.feedbackGain   = null;
    this.dryGain        = null;
    this.wetGain        = null;

    this.reverbNode     = null;
    this.reverbFilter   = null;
    this.reverbFeedback = null;
    this.reverbGain     = null;

    // Buses, limitadores, medidor y salidas
    this.voiceBus       = null;
    this.fxBus          = null;
    this.musicBus       = null;
    this.musicDuckGain  = null;
    this.presenceFilter = null;
    this.limiter        = null;
    this.speakerLimiter = null;
    this.analyser       = null;
    this.recDest        = null;
    this.monitorGain    = null;
    this.isMonitorOn    = true;

    // Modo Tornamesa: Auto-Ducking Sonidero (25%) & Anti-Acople (Audífonos vs Bocinas)
    this.isAutoDuckOn   = true;
    this.outputMode     = 'headphones'; // 'headphones' | 'speakers'
    this.isVoiceSpeaking = false;
    this.onDuckStateChange = null;
    this.isCumbiaPlaying = false;
    this._cumbiaTimer    = null;
    this._cumbiaStep     = 0;
    this._vadTimer       = null;
    this._voiceAnalyser  = null;

    // Parámetros iniciales calibrados (La Changa)
    this.params = {
      pitch: -3.0,
      time: 0.30,
      feedback: 0.52,
      gate: -48,
      mix: 0.45,
      drive: 0.20,
      space: 0.20
    };

    // Motor autónomo de FX (cuando el micrófono aún no se ha encendido)
    this._fxCtx      = null;
    this._fxOut      = null;
    this._fxAnalyser = null;
    this._soundCache = {};
    this._loading    = {};
  }

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
  // HELPERS FX AUTÓNOMO (funciona con o sin micrófono)
  // ════════════════════════════════════════════════════════════════════

  async _ensureFx() {
    if (this.ctx && this.ctx.state !== 'closed' && (this.fxBus || this.limiter)) {
      if (this.ctx.state === 'suspended') {
        try {
          await Promise.race([
            this.ctx.resume(),
            new Promise((r) => setTimeout(r, 400))
          ]);
        } catch (e) {
          // continue
        }
      }
      return {
        ctx: this.ctx,
        out: this.fxBus || this.limiter,
        analyser: this.analyser
      };
    }

    if (!this._fxCtx || this._fxCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this._fxCtx = new AudioCtx({ latencyHint: 'interactive' });
      this._fxOut = this._fxCtx.createDynamicsCompressor();
      this._fxOut.threshold.value = -3.0;
      this._fxOut.knee.value      = 4;
      this._fxOut.ratio.value     = 12;
      this._fxOut.attack.value    = 0.001;
      this._fxOut.release.value   = 0.06;

      this._fxAnalyser = this._fxCtx.createAnalyser();
      this._fxAnalyser.fftSize = 64;

      this._fxOut.connect(this._fxAnalyser);
      this._fxAnalyser.connect(this._fxCtx.destination);

      this._preloadAll(this._fxCtx);
    }

    if (this._fxCtx.state === 'suspended') {
      try {
        await Promise.race([
          this._fxCtx.resume(),
          new Promise((r) => setTimeout(r, 400))
        ]);
      } catch (e) {
        // continue
      }
    }

    return {
      ctx: this._fxCtx,
      out: this._fxOut,
      analyser: this._fxAnalyser
    };
  }

  getActiveAnalyser() {
    return this.analyser || this._fxAnalyser || null;
  }

  _preloadAll(ctx) {
    const names = [
      'airhorn',
      'police',
      'backup',
      'emergency',
      'scratch',
      'siren_sonidera'
    ];
    names.forEach((n) => {
      this._loadSound(ctx, n);
    });
  }

  async _loadSound(ctx, name) {
    if (this._soundCache[name]) {
      return this._soundCache[name];
    }
    if (this._loading[name]) {
      return this._loading[name];
    }

    this._loading[name] = (async () => {
      try {
        let arrayBuf = null;

        // 1. Priorizar respaldo binario integrado
        if (
          typeof window !== 'undefined' &&
          window.SONIDERO_SOUNDS_B64 &&
          window.SONIDERO_SOUNDS_B64[name]
        ) {
          arrayBuf = base64ToArrayBuffer(window.SONIDERO_SOUNDS_B64[name]);
        } else if (typeof location !== 'undefined' && location.protocol !== 'file:') {
          const url = `assets/sounds/${name}.ogg`;
          const res = await fetch(url);
          if (res.ok) {
            arrayBuf = await res.arrayBuffer();
          }
        }

        if (!arrayBuf) {
          return null;
        }

        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
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
    const buffer = this._soundCache[name] ?? (await this._loadSound(ctx, name));
    if (!buffer) {
      return false;
    }

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
    const rate = ctx.sampleRate;
    const len  = Math.floor(rate * duration);
    const buf  = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay * 6);
    }
    const conv  = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  _makeNoiseBuffer(ctx, duration = 1.0) {
    const len  = Math.floor(ctx.sampleRate * duration);
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // ════════════════════════════════════════════════════════════════════
  // MOTOR PRINCIPAL (requiere micrófono)
  // ════════════════════════════════════════════════════════════════════

  async init(deviceId) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx({ latencyHint: 'interactive' });

    try {
      const useEchoCancel = this.outputMode === 'speakers';
      const constraints = {
        echoCancellation: useEchoCancel,
        noiseSuppression: useEchoCancel,
        autoGainControl:  false,
        channelCount: 1,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sin soporte de getUserMedia en este entorno');
      }

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });

      let hasGate = false;
      let hasPitch = false;

      if (ctx.audioWorklet) {
        let gateUrl = null;
        try {
          const gateBlob = new Blob([NOISE_GATE_WORKLET_CODE], { type: 'application/javascript' });
          gateUrl = URL.createObjectURL(gateBlob);
          await ctx.audioWorklet.addModule(gateUrl);
          hasGate = true;
        } catch (workletErr) {
          console.warn('AudioWorklet noise-gate no disponible, aplicando bypass:', workletErr);
        } finally {
          if (gateUrl) URL.revokeObjectURL(gateUrl);
        }

        let pitchUrl = null;
        try {
          const pitchBlob = new Blob([PITCH_SHIFTER_WORKLET_CODE], { type: 'application/javascript' });
          pitchUrl = URL.createObjectURL(pitchBlob);
          await ctx.audioWorklet.addModule(pitchUrl);
          hasPitch = true;
        } catch (workletErr) {
          console.warn('AudioWorklet pitch-shifter no disponible, aplicando bypass:', workletErr);
        } finally {
          if (pitchUrl) URL.revokeObjectURL(pitchUrl);
        }
      }

      this.ctx       = ctx;
      this.micStream = micStream;
      const micSource = this.ctx.createMediaStreamSource(this.micStream);

    // Control de corte de entrada del micrófono (permite pausar el mic sin congelar los FX)
    this.micInputGain = this.ctx.createGain();
    this.micInputGain.gain.value = 1.0;
    this.isMicActive = true;

    // 1. Gate de ruido (resiliente)
    if (hasGate) {
      try {
        this.gateNode = new AudioWorkletNode(this.ctx, 'noise-gate');
      } catch (e) {
        this.gateNode = null;
      }
    } else {
      this.gateNode = null;
    }

    // 2. Compresor de entrada
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value      = 8;
    comp.ratio.value     = 4.5;
    comp.attack.value    = 0.005;
    comp.release.value   = 0.10;

    // 3. Pitch shifter granular (resiliente)
    if (hasPitch) {
      try {
        this.pitchNode = new AudioWorkletNode(this.ctx, 'granular-pitch-shifter');
      } catch (e) {
        this.pitchNode = null;
      }
    } else {
      this.pitchNode = null;
    }

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

    // 7. Buses separados (Voz vs FX vs Música) y Limitadores brickwall (-1.0 dBFS)
    this.voiceBus      = this.ctx.createGain();
    this.fxBus         = this.ctx.createGain();
    this.musicBus      = this.ctx.createGain();
    this.musicDuckGain = this.ctx.createGain();
    this.musicDuckGain.gain.value = 1.0;

    // Filtro de presencia vocal (+4.5 dB en 2.4 kHz para cortar sobre música externa/interna)
    this.presenceFilter = this.ctx.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.value = 2400;
    this.presenceFilter.Q.value = 1.1;
    this.presenceFilter.gain.value = this.isAutoDuckOn ? 4.5 : 0.0;

    this.monitorGain = this.ctx.createGain();
    this.monitorGain.gain.value = this.isMonitorOn ? 1.0 : 0.0;

    // Analizador dedicado a la entrada de voz (respaldo de Auto-Ducking si AudioWorklet no está activo)
    this._voiceAnalyser = this.ctx.createAnalyser();
    this._voiceAnalyser.fftSize = 256;

    // Limitador de grabación y análisis (recDest + analyser)
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.0;
    this.limiter.knee.value      = 0;
    this.limiter.ratio.value     = 20;
    this.limiter.attack.value    = 0.001;
    this.limiter.release.value   = 0.04;

    // Limitador de monitoreo hacia bocinas/audífonos (destination)
    this.speakerLimiter = this.ctx.createDynamicsCompressor();
    this.speakerLimiter.threshold.value = -1.0;
    this.speakerLimiter.knee.value      = 0;
    this.speakerLimiter.ratio.value     = 20;
    this.speakerLimiter.attack.value    = 0.001;
    this.speakerLimiter.release.value   = 0.04;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.recDest = this.ctx.createMediaStreamDestination();

    // ── Ruteo Resistente a Fallos en Cadena ───────────────────────────
    micSource.connect(this.micInputGain);
    this.micInputGain.connect(this._voiceAnalyser);
    let signalHead = this.micInputGain;

    if (this.gateNode) {
      try {
        signalHead.connect(this.gateNode);
        signalHead = this.gateNode;
        this.gateNode.port.onmessage = (e) => {
          if (e.data && typeof e.data.isOpen === 'boolean') {
            this._handleVoiceActivity(e.data.isOpen);
          }
        };
      } catch (e) {
        this.gateNode = null;
      }
    }

    if (!this.gateNode) {
      this._startFallbackVad();
    }

    signalHead.connect(comp);
    signalHead = comp;

    signalHead.connect(this.presenceFilter);
    signalHead = this.presenceFilter;

    if (this.pitchNode) {
      try {
        signalHead.connect(this.pitchNode);
        signalHead = this.pitchNode;
      } catch (e) {
        this.pitchNode = null;
      }
    }

    signalHead.connect(this.preDriveGain);
    this.preDriveGain.connect(this.driveNode);

    // Rama Dry: Drive -> DryGain -> VoiceBus
    this.driveNode.connect(this.dryGain);
    this.dryGain.connect(this.voiceBus);

    // Rama Wet: Drive -> Tape Delay Loop -> WetGain -> VoiceBus
    this.driveNode.connect(this.delayNode);
    this.delayNode.connect(tapeHP);
    tapeHP.connect(tapeLP);
    tapeLP.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.voiceBus);

    // Rama Espacio (Reverb Loop): Wet -> Reverb -> Filter -> Feedback -> VoiceBus
    this.wetGain.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbFilter);
    this.reverbFilter.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.reverbNode);
    this.reverbFilter.connect(this.reverbGain);
    this.reverbGain.connect(this.voiceBus);

    // Salida de Grabación y Vúmetro (recibe Voz, FX y Música con Auto-Ducking)
    this.voiceBus.connect(this.limiter);
    this.fxBus.connect(this.limiter);
    this.musicBus.connect(this.musicDuckGain);
    this.musicDuckGain.connect(this.limiter);
    this.limiter.connect(this.recDest);
    this.limiter.connect(this.analyser);

    // Salida de Altavoces / Audífonos (Monitor controla únicamente Voz; FX y Música suenan sin eco de voz)
    this.voiceBus.connect(this.monitorGain);
    this.monitorGain.connect(this.speakerLimiter);
    this.fxBus.connect(this.speakerLimiter);
    this.musicDuckGain.connect(this.speakerLimiter);
    this.speakerLimiter.connect(this.ctx.destination);

    const wasCumbiaPlaying = this.isCumbiaPlaying;
    // Transferir caché al nuevo contexto
    if (this._fxCtx && this._fxCtx.state !== 'closed') {
      try {
        await this._fxCtx.close();
      } catch (err) {
        // Ignorar si ya cerró
      }
      this._fxCtx = null;
      this._fxOut = null;
      this._fxAnalyser = null;
    }
    this._soundCache = {};
    this._preloadAll(this.ctx);

    this.applyAll(this.params);
    if (wasCumbiaPlaying) {
      this.isCumbiaPlaying = false;
      await this.startCumbiaLoop();
    }
    return true;
    } catch (err) {
      try {
        await ctx.close();
      } catch (closeErr) {
        // ignore
      }
      this.ctx          = null;
      this.micStream    = null;
      this.micInputGain = null;
      this.delayNode    = null;
      this.fxBus        = null;
      this.limiter      = null;
      this.isMicActive  = false;
      throw err;
    }
  }

  async resume() {
    if (!this.ctx || !this.micInputGain) return false;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.micInputGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.015);
    this.isMicActive = true;
    return true;
  }

  async suspend() {
    if (this.micInputGain && this.ctx) {
      this.micInputGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.015);
    }
    this.isMicActive = false;
    this._handleVoiceActivity(false);
  }

  async dispose() {
    this.stopCumbiaLoop();
    this._stopFallbackVad();
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => {
        t.stop();
      });
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        await this.ctx.close();
      } catch (err) {
        // Ignorar posibles errores si el contexto ya cerró por otras vías
      }
    }
    this.ctx            = null;
    this.micStream      = null;
    this.micInputGain   = null;
    this.delayNode      = null;
    this.feedbackGain   = null;
    this.dryGain        = null;
    this.wetGain        = null;
    this.preDriveGain   = null;
    this.driveNode      = null;
    this.reverbNode     = null;
    this.reverbFilter   = null;
    this.reverbFeedback = null;
    this.reverbGain     = null;
    this.voiceBus       = null;
    this.fxBus          = null;
    this.musicBus       = null;
    this.musicDuckGain  = null;
    this.presenceFilter = null;
    this._voiceAnalyser = null;
    this.limiter        = null;
    this.speakerLimiter = null;
    this.analyser       = null;
    this.recDest        = null;
    this.monitorGain    = null;
    this.isMicActive    = false;
    this.isVoiceSpeaking = false;
  }

  applyAll(params) {
    this.params = { ...this.params, ...params };
    if (!this.ctx || !this.delayNode || !this.feedbackGain || !this.dryGain || !this.wetGain) return;
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

  setDrive(v) {
    this.applyAll({ drive: v });
  }

  setSpace(v) {
    this.applyAll({ space: v });
  }

  setPitch(v) {
    this.applyAll({ pitch: v });
  }

  setTime(v) {
    this.applyAll({ time: v });
  }

  setFeedback(v) {
    this.applyAll({ feedback: v });
  }

  setGate(v) {
    this.applyAll({ gate: v });
  }

  setMix(v) {
    this.applyAll({ mix: v });
  }

  setMonitor(on) {
    this.isMonitorOn = on;
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setTargetAtTime(on ? 1.0 : 0.0, this.ctx.currentTime, 0.02);
    }
  }

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

  // ════════════════════════════════════════════════════════════════════
  // MODO TORNAMESA: AUTO-DUCKING SONIDERO (25%) & ANTI-ACOPLE
  // ════════════════════════════════════════════════════════════════════

  _getDuckTargetGain() {
    if (!this.isAutoDuckOn || !this.isVoiceSpeaking || !this.isMicActive) {
      return 1.0;
    }
    // Con Audífonos: 25% canónico. Con Bocinas (Anti-Acople): ducking profundo al 18%.
    return this.outputMode === 'speakers' ? 0.18 : 0.25;
  }

  _applyDuckingGain(isSpeaking) {
    const target = this._getDuckTargetGain();
    const timeConst = isSpeaking ? 0.030 : 0.240;
    if (this.musicDuckGain && this.ctx) {
      this.musicDuckGain.gain.setTargetAtTime(target, this.ctx.currentTime, timeConst);
    }
    if (this._fxMusicDuckGain && this._fxCtx) {
      this._fxMusicDuckGain.gain.setTargetAtTime(target, this._fxCtx.currentTime, timeConst);
    }
  }

  _handleVoiceActivity(isOpen) {
    const active = Boolean(isOpen && this.isMicActive);
    if (this.isVoiceSpeaking === active) return;
    this.isVoiceSpeaking = active;
    this._applyDuckingGain(active);
    if (typeof this.onDuckStateChange === 'function') {
      this.onDuckStateChange({
        isSpeaking: active,
        isAutoDuckOn: this.isAutoDuckOn,
        duckPercent: Math.round(this._getDuckTargetGain() * 100),
        outputMode: this.outputMode
      });
    }
  }

  _startFallbackVad() {
    this._stopFallbackVad();
    this._vadTimer = setInterval(() => {
      if (!this._voiceAnalyser || !this.isMicActive) {
        this._handleVoiceActivity(false);
        return;
      }
      const buf = new Float32Array(this._voiceAnalyser.fftSize);
      this._voiceAnalyser.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const a = Math.abs(buf[i]);
        if (a > peak) peak = a;
      }
      const threshLin = Math.pow(10, (this.params.gate || -48) / 20);
      const closeLin  = threshLin * 0.5;
      if (!this.isVoiceSpeaking && peak > threshLin) {
        this._handleVoiceActivity(true);
      } else if (this.isVoiceSpeaking && peak < closeLin) {
        this._handleVoiceActivity(false);
      }
    }, 45);
  }

  _stopFallbackVad() {
    if (this._vadTimer) {
      clearInterval(this._vadTimer);
      this._vadTimer = null;
    }
  }

  setAutoDuck(on) {
    this.isAutoDuckOn = Boolean(on);
    if (this.presenceFilter && this.ctx) {
      this.presenceFilter.gain.setTargetAtTime(this.isAutoDuckOn ? 4.5 : 0.0, this.ctx.currentTime, 0.03);
    }
    this._applyDuckingGain(this.isVoiceSpeaking);
    if (typeof this.onDuckStateChange === 'function') {
      this.onDuckStateChange({
        isSpeaking: this.isVoiceSpeaking,
        isAutoDuckOn: this.isAutoDuckOn,
        duckPercent: Math.round(this._getDuckTargetGain() * 100),
        outputMode: this.outputMode
      });
    }
  }

  async setOutputMode(mode, deviceId = null) {
    const nextMode = mode === 'speakers' ? 'speakers' : 'headphones';
    const changed = this.outputMode !== nextMode;
    this.outputMode = nextMode;

    if (nextMode === 'speakers') {
      // Con Bocinas: silencia automáticamente el retorno de voz (Monitor: MUTE) y activa ducking profundo
      this.setMonitor(false);
      this.setAutoDuck(true);
    } else {
      // Con Audífonos: Monitor de voz encendido (ON) + música en audífonos
      this.setMonitor(true);
    }

    // Si el micrófono ya está activo y cambió el modo, aplicar echoCancellation en vivo o reinicializar stream
    if (changed && this.micStream) {
      const useEchoCancel = nextMode === 'speakers';
      const track = this.micStream.getAudioTracks()[0];
      let applied = false;
      if (track && typeof track.applyConstraints === 'function') {
        try {
          await track.applyConstraints({
            echoCancellation: useEchoCancel,
            noiseSuppression: useEchoCancel,
            autoGainControl: false
          });
          applied = true;
        } catch (e) {
          applied = false;
        }
      }
      if (!applied && this.ctx && this.isMicActive) {
        const wasCumbia = this.isCumbiaPlaying;
        await this.suspend();
        await this.dispose();
        await this.init(deviceId);
        await this.resume();
        if (wasCumbia && !this.isCumbiaPlaying) {
          await this.startCumbiaLoop();
        }
      }
    }

    this._applyDuckingGain(this.isVoiceSpeaking);
    return this.outputMode;
  }

  async _getMusicTarget() {
    if (this.ctx && this.ctx.state !== 'closed' && this.musicBus) {
      if (this.ctx.state === 'suspended') {
        try {
          await Promise.race([this.ctx.resume(), new Promise((r) => setTimeout(r, 400))]);
        } catch (e) {
          // continue
        }
      }
      return { ctx: this.ctx, bus: this.musicBus };
    }
    const { ctx, out } = await this._ensureFx();
    if (!this._fxMusicDuckGain || this._fxMusicDuckGain.context !== ctx) {
      this._fxMusicDuckGain = ctx.createGain();
      this._fxMusicDuckGain.gain.value = this._getDuckTargetGain();
      this._fxMusicDuckGain.connect(out);
    }
    return { ctx, bus: this._fxMusicDuckGain };
  }

  _triggerCumbiaStep(ctx, bus, step) {
    const now = ctx.currentTime;
    // Compás de 8 semicorcheas (94 BPM -> ~160 ms por paso)
    // 1. Bombo y Tumbao de Bajo Cumbiero (Am -> G)
    const bar = Math.floor(step / 8) % 2;
    const bassNotes = bar === 0
      ? [110.0, null, null, 130.81, 164.81, null, 130.81, null] // Am (A2 - C3 - E3)
      : [98.0,  null, null, 123.47, 146.83, null, 123.47, null]; // G  (G2 - B2 - D3)

    const s = step % 8;

    // Bombo en tiempo 0 y 4
    if (s === 0 || s === 4) {
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(125, now);
      kickOsc.frequency.exponentialRampToValueAtTime(46, now + 0.11);
      kickGain.gain.setValueAtTime(0.38, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      kickOsc.connect(kickGain);
      kickGain.connect(bus);
      kickOsc.start(now);
      kickOsc.stop(now + 0.15);
    }

    // Bajo tumbao
    const bassFreq = bassNotes[s];
    if (bassFreq) {
      const bassOsc = ctx.createOscillator();
      const bassLP  = ctx.createBiquadFilter();
      const bassGain = ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, now);
      bassLP.type = 'lowpass';
      bassLP.frequency.value = 340;
      bassGain.gain.setValueAtTime(0.30, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      bassOsc.connect(bassLP);
      bassLP.connect(bassGain);
      bassGain.connect(bus);
      bassOsc.start(now);
      bassOsc.stop(now + 0.15);
    }

    // Güiro y Conga cumbiera ("chucu-chucu")
    if (s % 2 === 1 || s === 2 || s === 6) {
      const accent = (s === 2 || s === 6);
      const dur = accent ? 0.085 : 0.045;
      const noiseBuf = this._makeNoiseBuffer(ctx, dur);
      const noiseSrc = ctx.createBufferSource();
      const hp = ctx.createBiquadFilter();
      const g  = ctx.createGain();
      noiseSrc.buffer = noiseBuf;
      hp.type = 'bandpass';
      hp.frequency.value = accent ? 5800 : 7200;
      hp.Q.value = 1.6;
      g.gain.setValueAtTime(accent ? 0.15 : 0.07, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      noiseSrc.connect(hp);
      hp.connect(g);
      g.connect(bus);
      noiseSrc.start(now);
      noiseSrc.stop(now + dur + 0.01);
    }

    // Acordeón / Órgano Sonidero en contratiempo (pasos 2 y 6)
    if (s === 2 || s === 6) {
      const chord = bar === 0 ? [440, 523.25, 659.25] : [392, 493.88, 587.33];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const bp  = ctx.createBiquadFilter();
        const g   = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        bp.Q.value = 0.9;
        g.gain.setValueAtTime(0.055, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(bp);
        bp.connect(g);
        g.connect(bus);
        osc.start(now);
        osc.stop(now + 0.12);
      });
    }
  }

  async startCumbiaLoop() {
    if (this.isCumbiaPlaying) return true;
    const { ctx, bus } = await this._getMusicTarget();
    this.isCumbiaPlaying = true;
    this._cumbiaStep = 0;
    this._applyDuckingGain(this.isVoiceSpeaking);

    const stepMs = 160; // ~94 BPM
    this._triggerCumbiaStep(ctx, bus, this._cumbiaStep++);
    this._cumbiaTimer = setInterval(async () => {
      if (!this.isCumbiaPlaying) return;
      const target = await this._getMusicTarget();
      this._triggerCumbiaStep(target.ctx, target.bus, this._cumbiaStep++);
    }, stepMs);
    return true;
  }

  stopCumbiaLoop() {
    this.isCumbiaPlaying = false;
    if (this._cumbiaTimer) {
      clearInterval(this._cumbiaTimer);
      this._cumbiaTimer = null;
    }
    return false;
  }

  async toggleCumbiaLoop() {
    if (this.isCumbiaPlaying) {
      this.stopCumbiaLoop();
      return false;
    }
    await this.startCumbiaLoop();
    return true;
  }

  // ════════════════════════════════════════════════════════════════════
  // FX CLÁSICOS & ALARMAS (Híbridos: archivo real .ogg o síntesis avanzada)
  // ════════════════════════════════════════════════════════════════════

  async playSiren() {
    if (await this._playFile('siren_sonidera', 0.85)) {
      return;
    }

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
      [190, 325, 190, 350, 130]
    ];
    const times = [0, 0.40, 0.80, 1.20, 1.65];
    const vols  = [0.55, 0.22, 0.40];

    freqSweeps.forEach((sweepFreqs, idx) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'sawtooth';
      osc.frequency.setValueAtTime(sweepFreqs[0], now);
      times.forEach((t, i) => {
        if (sweepFreqs[i] !== undefined) {
          osc.frequency.linearRampToValueAtTime(sweepFreqs[i], now + t);
        }
      });
      gain.gain.setValueAtTime(vols[idx], now);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.8);
    });

    const lfo     = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type      = 'sine';
    lfo.frequency.setValueAtTime(7, now);
    lfoGain.gain.setValueAtTime(0.25, now);
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start(now);
    lfo.stop(now + 1.8);

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
    noiseHP.type = 'highpass';
    noiseHP.frequency.value = 4000;
    noiseG.gain.setValueAtTime(0.6, now);
    noiseG.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    noiseSrc.connect(noiseHP);
    noiseHP.connect(noiseG);
    noiseG.connect(out);
    noiseSrc.start(now);
    noiseSrc.stop(now + 0.07);

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type   = 'sawtooth';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);
    gain.gain.setValueAtTime(0.70, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(ws);
    ws.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.38);
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
    noiseLP.type = 'bandpass';
    noiseLP.frequency.value = 800;
    noiseLP.Q.value = 0.5;
    noiseG.gain.setValueAtTime(0.08, now);
    noiseG.gain.setValueAtTime(0.08, now + 1.0);
    noiseG.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    noiseSrc.connect(noiseLP);
    noiseLP.connect(noiseG);
    noiseG.connect(out);
    noiseSrc.start(now);
    noiseSrc.stop(now + 1.5);

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
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + 1.3);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      osc.connect(ws);
      ws.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 1.28);
    });
  }

  async playAirHorn() {
    if (await this._playFile('airhorn', 0.9)) {
      return;
    }

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
      { freq: 350, detune: -1,  vol: 0.15 }
    ];

    harmonics.forEach(({ freq, detune, vol }) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);
      g.gain.setValueAtTime(vol, now);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });

    const bpf = ctx.createBiquadFilter();
    bpf.type  = 'peaking';
    bpf.frequency.value = 600;
    bpf.Q.value = 0.8;
    bpf.gain.value = 8;

    masterGain.connect(bpf);
    bpf.connect(ws);
    ws.connect(out);
  }

  async playPoliceSiren() {
    if (await this._playFile('police', 0.85)) {
      return;
    }

    const { ctx, out } = await this._ensureFx();
    const now = ctx.currentTime;
    const ws  = this._makeWaveshaper(ctx, 25);
    const rev = this._makeReverb(ctx, 0.20, 0.5);

    [0, 2].forEach((detuneCents) => {
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

      osc.connect(gain);
      gain.connect(ws);
      osc.start(now);
      osc.stop(now + total + 0.08);
    });

    ws.connect(rev);
    rev.connect(out);
    ws.connect(out);
  }

  async playBackupAlarm() {
    if (await this._playFile('backup', 0.85)) {
      return;
    }

    const { ctx, out } = await this._ensureFx();
    const now    = ctx.currentTime;
    const ws     = this._makeWaveshaper(ctx, 15);
    const bipDur = 0.16;
    const gap    = 0.16;

    for (let i = 0; i < 7; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'square';
      osc.frequency.setValueAtTime(1080, now);

      const lp = ctx.createBiquadFilter();
      lp.type  = 'lowpass';
      lp.frequency.value = 2200;

      const t0 = now + i * (bipDur + gap);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.55, t0 + 0.012);
      gain.gain.setValueAtTime(0.55, t0 + bipDur - 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + bipDur);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(ws);
      ws.connect(out);
      osc.start(t0);
      osc.stop(t0 + bipDur + 0.02);
    }
  }

  async playEmergencyAlarm() {
    if (await this._playFile('emergency', 0.88)) {
      return;
    }

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

      [gain, gain2].forEach((g) => {
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.5, t0 + 0.02);
        g.gain.setValueAtTime(0.5, t0 + 0.42);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      });

      osc.connect(gain);
      gain.connect(ws);
      osc2.connect(gain2);
      gain2.connect(ws);
      ws.connect(rev);
      rev.connect(out);
      ws.connect(out);

      [osc, osc2].forEach((o) => {
        o.start(t0);
        o.stop(t0 + 0.58);
      });
    }
  }

  async playScratch() {
    if (await this._playFile('scratch', 0.9)) {
      return;
    }

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

    src.connect(bp);
    bp.connect(ws);
    ws.connect(gain);
    gain.connect(out);
    src.start(now);
    src.stop(now + dur + 0.05);
  }
}