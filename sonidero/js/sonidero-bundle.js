// ======================================================================
// sonidero-bundle.js — Cabina Sonidera & DSP
// ======================================================================
(function () {
  "use strict";

  // --- MODULE: fx.js ---
  // Botones de FX v5.1 / v6.0 — todos async, suenan con o sin micrófono encendido y activan el vúmetro.
  function setupFxButtons({ engine, onFxPlay }) {
    async function trigger(fn, label) {
      await fn();
      if (typeof onFxPlay === 'function') {
        onFxPlay(label);
      }
    }

    // ── Barra clásica superior ──────────────────────────────
    document.getElementById('sirenBtn')?.addEventListener('click', () => {
      trigger(() => engine.playSiren(), '🚨 Sirena Sonidera');
    });

    document.getElementById('laserBtn')?.addEventListener('click', () => {
      trigger(() => engine.playLaser(), '💥 Rayo Láser');
    });

    document.getElementById('dropBtn')?.addEventListener('click', () => {
      trigger(() => engine.playPitchDrop(), '🎛️ Disco Drop');
    });

    // ── Barra de alarmas reales (.ogg + síntesis) ───────────
    document.getElementById('hornBtn')?.addEventListener('click', () => {
      trigger(() => engine.playAirHorn(), '📯 Cuerno de Aire');
    });

    document.getElementById('policeBtn')?.addEventListener('click', () => {
      trigger(() => engine.playPoliceSiren(), '🚓 Sirena Patrulla');
    });

    document.getElementById('backupBtn')?.addEventListener('click', () => {
      trigger(() => engine.playBackupAlarm(), '🚧 Alarma Reversa');
    });

    document.getElementById('emergencyBtn')?.addEventListener('click', () => {
      trigger(() => engine.playEmergencyAlarm(), '🔴 Alarma Emergencia');
    });

    document.getElementById('scratchBtn')?.addEventListener('click', () => {
      trigger(() => engine.playScratch(), '💿 Scratch de Vinilo');
    });
  }

  // --- MODULE: visualizer.js ---
  // VU meter dibujado en canvas con gradiente estilo mexicano (Verde Patrio, Oro Charro y Rojo Patrio).
  let rafId = null;
  function startVisualizer({ analyser, canvas }) {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    const ctx2d = canvas.getContext('2d');

    function draw() {
      rafId = requestAnimationFrame(draw);
      if (!analyser) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const barWidth = (w / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h;
        const grad = ctx2d.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#437742');
        grad.addColorStop(0.55, '#f99d1b');
        grad.addColorStop(0.80, '#f37420');
        grad.addColorStop(1.0, '#cc1236');

        ctx2d.fillStyle = grad;
        ctx2d.fillRect(x, h - barHeight, Math.max(1, barWidth - 1), barHeight);
        x += barWidth;
      }
    }

    draw();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }

  // --- MODULE: pad.js ---
  // Pad XY: mueve pitch y delay time con mouse, touch o teclado (incluso antes de encender el mic).
  function setupPad({ padEl, puckEl, engine, onUpdate }) {
    let dragging = false;
    let currentPitch = -3.0;
    let currentTime = 0.30;

    function applyNormalized(x, y) {
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      puckEl.style.left = `${clampedX * 100}%`;
      puckEl.style.top  = `${clampedY * 100}%`;

      const targetTime  = +(0.05 + clampedX * 0.85).toFixed(2);
      const targetPitch = +(4 - clampedY * 12).toFixed(1);

      currentTime = targetTime;
      currentPitch = targetPitch;

      if (engine?.ctx) {
        engine.setTime(targetTime);
        engine.setPitch(targetPitch);
      }

      if (typeof onUpdate === 'function') {
        onUpdate({ pitch: targetPitch, time: targetTime });
      }
    }

    function handlePad(e) {
      const rect = padEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const x = (cx - rect.left) / rect.width;
      const y = (cy - rect.top) / rect.height;
      applyNormalized(x, y);
    }

    padEl.addEventListener('mousedown', (e) => {
      dragging = true;
      handlePad(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (dragging) {
        handlePad(e);
      }
    });

    window.addEventListener('mouseup', () => {
      dragging = false;
    });

    padEl.addEventListener('touchstart', (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      dragging = true;
      handlePad(e);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (dragging) {
        if (e.cancelable) {
          e.preventDefault();
        }
        handlePad(e);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      dragging = false;
    });

    padEl.addEventListener('keydown', (e) => {
      const stepTime = 0.02;
      const stepPitch = 0.5;
      let handled = false;

      if (e.key === 'ArrowRight') {
        currentTime = Math.min(0.90, +(currentTime + stepTime).toFixed(2));
        handled = true;
      } else if (e.key === 'ArrowLeft') {
        currentTime = Math.max(0.05, +(currentTime - stepTime).toFixed(2));
        handled = true;
      } else if (e.key === 'ArrowUp') {
        currentPitch = Math.min(4.0, +(currentPitch + stepPitch).toFixed(1));
        handled = true;
      } else if (e.key === 'ArrowDown') {
        currentPitch = Math.max(-8.0, +(currentPitch - stepPitch).toFixed(1));
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        const normX = (currentTime - 0.05) / 0.85;
        const normY = (4 - currentPitch) / 12;
        applyNormalized(normX, normY);
      }
    });

    return {
      movePuck: (pitch, time) => {
        currentPitch = pitch;
        currentTime = time;
        movePuck(puckEl, pitch, time);
      }
    };
  }

  // --- MODULE: mic-selector.js ---
  // Enumeración y selección de micrófonos de entrada sin abrir streams redundantes si ya hay permiso.
  let selectedMicId = null;
  let hasPermission = false;
  function getSelectedMicId() {
    return selectedMicId;
  }
  async function enumerateMics() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('mediaDevices.getUserMedia no disponible en este contexto');
      return false;
    }

    if (!hasPermission) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());
        hasPermission = true;
      } catch (e) {
        console.warn('Sin permiso de micrófono:', e);
        return false;
      }
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((d) => d.kind === 'audioinput');
    const select = document.getElementById('micSelect');
    const wrap = document.getElementById('micSelectorWrap');

    if (!select || !wrap) {
      return true;
    }

    select.innerHTML = '';
    mics.forEach((mic, i) => {
      const opt = document.createElement('option');
      opt.value = mic.deviceId;
      opt.textContent = mic.label || `Micrófono ${i + 1}`;
      if (mic.deviceId === selectedMicId) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    wrap.style.display = mics.length > 1 ? 'block' : 'none';

    const stillExists = mics.some((m) => m.deviceId === selectedMicId);
    if ((!selectedMicId || !stillExists) && mics.length > 0) {
      selectedMicId = mics[0].deviceId;
      select.value = selectedMicId;
    }

    return true;
  }
  function setupMicSelector({ onMicChange }) {
    const select = document.getElementById('micSelect');
    if (!select) return;

    select.addEventListener('change', (e) => {
      selectedMicId = e.target.value;
      if (typeof onMicChange === 'function') {
        onMicChange();
      }
    });

    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        if (!hasPermission) return;
        const prevId = selectedMicId;
        await enumerateMics();
        if (selectedMicId !== prevId && typeof onMicChange === 'function') {
          onMicChange();
        }
      });
    }
  }

  // --- MODULE: audio-engine.js ---
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
      this.attackCoeff = 0.15;
      this.releaseCoeff = 0.003;
    }
    process(inputs, outputs, parameters) {
      const input = inputs[0][0];
      const output = outputs[0][0];
      if (!input) return true;
      const threshLin = Math.pow(10, parameters.threshold[0] / 20);
      for (let i = 0; i < input.length; i++) {
        const env = Math.abs(input[i]);
        const targetGain = env > threshLin ? 1.0 : 0.0;
        const coeff = targetGain > this.gain ? this.attackCoeff : this.releaseCoeff;
        this.gain += (targetGain - this.gain) * coeff;
        output[i] = input[i] * this.gain;
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
  class SonideroEngine {
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
      this.limiter        = null;
      this.speakerLimiter = null;
      this.analyser       = null;
      this.recDest        = null;
      this.monitorGain    = null;
      this.isMonitorOn    = true;

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
      if (this.ctx && this.ctx.state !== 'closed') {
        if (this.ctx.state === 'suspended') {
          await this.ctx.resume();
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
        await this._fxCtx.resume();
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
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      let hasGate = false;
      let hasPitch = false;

      if (this.ctx.audioWorklet) {
        try {
          const gateBlob = new Blob([NOISE_GATE_WORKLET_CODE], { type: 'application/javascript' });
          const gateUrl = URL.createObjectURL(gateBlob);
          await this.ctx.audioWorklet.addModule(gateUrl);
          hasGate = true;
        } catch (workletErr) {
          console.warn('AudioWorklet noise-gate no disponible, aplicando bypass:', workletErr);
        }

        try {
          const pitchBlob = new Blob([PITCH_SHIFTER_WORKLET_CODE], { type: 'application/javascript' });
          const pitchUrl = URL.createObjectURL(pitchBlob);
          await this.ctx.audioWorklet.addModule(pitchUrl);
          hasPitch = true;
        } catch (workletErr) {
          console.warn('AudioWorklet pitch-shifter no disponible, aplicando bypass:', workletErr);
        }
      }

      const constraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl:  false,
        channelCount: 1,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sin soporte de getUserMedia en este entorno');
      }

      this.micStream  = await navigator.mediaDevices.getUserMedia({ audio: constraints });
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

      // 7. Buses separados (Voz vs FX) y Limitadores brickwall (-1.0 dBFS)
      this.voiceBus = this.ctx.createGain();
      this.fxBus    = this.ctx.createGain();

      this.monitorGain = this.ctx.createGain();
      this.monitorGain.gain.value = this.isMonitorOn ? 1.0 : 0.0;

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
      let signalHead = this.micInputGain;

      if (this.gateNode) {
        try {
          signalHead.connect(this.gateNode);
          signalHead = this.gateNode;
        } catch (e) {
          this.gateNode = null;
        }
      }

      signalHead.connect(comp);
      signalHead = comp;

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

      // Salida de Grabación y Vúmetro (recibe tanto Voz como FX siempre)
      this.voiceBus.connect(this.limiter);
      this.fxBus.connect(this.limiter);
      this.limiter.connect(this.recDest);
      this.limiter.connect(this.analyser);

      // Salida de Altavoces / Audífonos (Monitor controla Voz; FX siempre suenan)
      this.voiceBus.connect(this.monitorGain);
      this.monitorGain.connect(this.speakerLimiter);
      this.fxBus.connect(this.speakerLimiter);
      this.speakerLimiter.connect(this.ctx.destination);

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
      return true;
    }

    async resume() {
      if (this.ctx?.state === 'suspended') {
        await this.ctx.resume();
      }
      if (this.micInputGain && this.ctx) {
        this.micInputGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.015);
      }
      this.isMicActive = true;
    }

    async suspend() {
      if (this.micInputGain && this.ctx) {
        this.micInputGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.015);
      }
      this.isMicActive = false;
    }

    async dispose() {
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
      this.ctx = null;
      this.micStream = null;
      this.isMicActive = false;
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

  // --- MODULE: main.js ---
  // Punto de entrada v6.0: orquesta UI, motor de audio DSP, presets, pad, grabadora, FX y PWA.








  const engine = new SonideroEngine();
  let isRunning = false;
  let currentVisAnalyser = null;

  const powerBtn       = $('powerBtn');
  const statusEl       = $('status');
  const monitorBtn     = $('monitorBtn');
  const pitchSlider    = $('pitchSlider');
  const timeSlider     = $('timeSlider');
  const feedbackSlider = $('feedbackSlider');
  const gateSlider     = $('gateSlider');
  const mixSlider      = $('mixSlider');
  const driveSlider    = $('driveSlider');
  const spaceSlider    = $('spaceSlider');
  const pad            = $('pad');
  const puck           = $('puck');
  const vuCanvas       = $('vuCanvas');

  function ensureVisualizerRunning() {
    const activeAnalyser = engine.getActiveAnalyser();
    if (activeAnalyser && vuCanvas && activeAnalyser !== currentVisAnalyser) {
      currentVisAnalyser = activeAnalyser;
      startVisualizer({ analyser: activeAnalyser, canvas: vuCanvas });
    }
  }

  // ── PWA: Registro de Service Worker (solo en HTTP/HTTPS) ───────────────────
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('[PWA] Service Worker activo:', reg.scope))
        .catch((err) => console.warn('[PWA] Service Worker falló:', err));
    });
  }

  // ── Encendido ──────────────────────────────────────────────────────────────
  powerBtn.addEventListener('click', async () => {
    if (!isRunning) {
      if (!engine.ctx) {
        setStatus(statusEl, 'Conectando micrófono...');
        try {
          await enumerateMics();
        } catch (e) {
          console.warn('enumerateMics notice:', e);
        }
        try {
          const ok = await engine.init(getSelectedMicId());
          if (!ok && !engine.ctx) {
            throw new Error('No se pudo conectar el micrófono');
          }
        } catch (err) {
          console.error(err);
          setStatus(
            statusEl,
            `Micrófono: ${err.message || 'Sin permiso o no detectado'}. ¡Presets, sliders y efectos sí funcionan!`,
            'warn'
          );
          return;
        }
        const current = document.querySelector('.preset.selected');
        if (current) {
          applyPreset(current.dataset.preset, { onApply: handlePresetApplied });
        }
        ensureVisualizerRunning();
      }
      await engine.resume();
      powerBtn.textContent = '⏹ Apagar Micrófono';
      powerBtn.classList.add('on');
      setStatus(statusEl, '¡En vivo! Manda tu saludo desde la cabina 🎙️🔥', 'active');
      isRunning = true;
    } else {
      await engine.suspend();
      powerBtn.textContent = '🎤 Encender Micrófono';
      powerBtn.classList.remove('on');
      setStatus(statusEl, 'Micrófono en pausa — presiona para reanudar');
      isRunning = false;
    }
  });

  // ── Presets ────────────────────────────────────────────────────────────────
  const padController = setupPad({
    padEl: pad,
    puckEl: puck,
    engine,
    onUpdate: ({ pitch, time }) => {
      pitchSlider.value = pitch;
      timeSlider.value  = time;
      updateReadouts(pitch, time);
    }
  });

  function handlePresetApplied(p) {
    pitchSlider.value    = p.pitch;
    timeSlider.value     = p.time;
    feedbackSlider.value = p.feedback;
    gateSlider.value     = p.gate;
    mixSlider.value      = p.mix;

    if (driveSlider && p.drive !== undefined) {
      driveSlider.value = p.drive;
    }
    if (spaceSlider && p.space !== undefined) {
      spaceSlider.value = p.space;
    }

    updateReadouts(p.pitch, p.time);
    updateSliderLabels(p);

    if (padController) {
      padController.movePuck(p.pitch, p.time);
    } else {
      movePuck(puck, p.pitch, p.time);
    }

    if (engine.ctx) {
      engine.applyAll(p);
    }
  }

  document.querySelectorAll('.preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset').forEach((b) => {
        b.setAttribute('aria-pressed', 'false');
      });
      btn.setAttribute('aria-pressed', 'true');

      const applied = applyPreset(btn.dataset.preset, { onApply: handlePresetApplied });
      if (applied && !isRunning) {
        setStatus(statusEl, `Preset cargado: ${applied.label} (${applied.desc})`, 'active');
      }
    });
  });

  // ── Sliders ────────────────────────────────────────────────────────────────
  const allSliders = [pitchSlider, timeSlider, feedbackSlider, gateSlider, mixSlider];
  if (driveSlider) {
    allSliders.push(driveSlider);
  }
  if (spaceSlider) {
    allSliders.push(spaceSlider);
  }

  allSliders.forEach((sl) => {
    sl.addEventListener('input', () => {
      const p = parseFloat(pitchSlider.value);
      const t = parseFloat(timeSlider.value);
      const f = parseFloat(feedbackSlider.value);
      const g = parseFloat(gateSlider.value);
      const m = parseFloat(mixSlider.value);
      const d = driveSlider ? parseFloat(driveSlider.value) : 0;
      const s = spaceSlider ? parseFloat(spaceSlider.value) : 0;

      updateReadouts(p, t);
      updateSliderLabels({ feedback: f, gate: g, mix: m, drive: d, space: s });

      if (padController) {
        padController.movePuck(p, t);
      } else {
        movePuck(puck, p, t);
      }

      if (engine.ctx) {
        engine.applyAll({ pitch: p, time: t, feedback: f, gate: g, mix: m, drive: d, space: s });
      }
    });
  });

  // ── Monitor ───────────────────────────────────────────────────────────────
  monitorBtn.addEventListener('click', () => {
    const next = !engine.isMonitorOn;
    engine.setMonitor(next);
    if (next) {
      monitorBtn.textContent = '🔊 Monitor: ON';
      monitorBtn.classList.add('btn-patrio-green-outline');
      monitorBtn.classList.remove('btn-monitor-muted');
      monitorBtn.style.borderColor = 'var(--color-benzol-green)';
      monitorBtn.style.color       = 'var(--color-benzol-green)';
      monitorBtn.setAttribute('aria-label', 'Monitor activo — pulsa para silenciar');
    } else {
      monitorBtn.textContent = '🔇 Monitor: MUTE';
      monitorBtn.classList.remove('btn-patrio-green-outline');
      monitorBtn.classList.add('btn-monitor-muted');
      monitorBtn.style.borderColor = 'var(--color-carmine)';
      monitorBtn.style.color       = 'var(--color-carmine)';
      monitorBtn.setAttribute('aria-label', 'Monitor silenciado — pulsa para activar');
    }
  });

  // ── FX ────────────────────────────────────────────────────────────────────
  setupFxButtons({
    engine,
    onFxPlay: (label) => {
      ensureVisualizerRunning();
      if (!isRunning) {
        setStatus(statusEl, `Disparo en cabina: ${label}`, 'active');
      }
    }
  });

  // ── Grabación ─────────────────────────────────────────────────────────────
  setupRecorder({
    engine,
    onStatus: (text, type) => setStatus(statusEl, text, type || '')
  });

  // ── Selector de micrófono ─────────────────────────────────────────────────
  setupMicSelector({
    onMicChange: async () => {
      const wasRunning = isRunning;
      if (engine.ctx) {
        await engine.suspend();
        await engine.dispose();
        isRunning = false;
        currentVisAnalyser = null;
      }

      if (wasRunning) {
        setStatus(statusEl, 'Cambiando micrófono...');
        try {
          const ok = await engine.init(getSelectedMicId());
          if (!ok) {
            throw new Error('No se pudo inicializar el nuevo micrófono');
          }

          const current = document.querySelector('.preset.selected');
          if (current) {
            applyPreset(current.dataset.preset, { onApply: handlePresetApplied });
          }
          ensureVisualizerRunning();
          await engine.resume();
          isRunning = true;
          powerBtn.textContent = '⏹ Apagar Micrófono';
          powerBtn.classList.add('on');
          setStatus(statusEl, '¡Micrófono actualizado en vivo! 🎙️', 'active');
        } catch (err) {
          console.error(err);
          powerBtn.textContent = '🎤 Encender Micrófono';
          powerBtn.classList.remove('on');
          setStatus(statusEl, `Error al cambiar micrófono: ${err.message}`, 'error');
        }
      }
    }
  });

  // ── Estado inicial de la UI ───────────────────────────────────────────────
  (function initUI() {
    const defaultPreset = document.querySelector('.preset.selected')?.dataset.preset || 'changa';
    applyPreset(defaultPreset, { onApply: handlePresetApplied });
  })();
})();
