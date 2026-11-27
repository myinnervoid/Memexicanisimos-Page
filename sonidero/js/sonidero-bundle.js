// ======================================================================
// sonidero-bundle.js — Cabina Sonidera & DSP (Full Bundle: 10 modules)
// ======================================================================
(function () {
  "use strict";

  // --- MODULE: ui.js ---
  // Helpers de UI: selección de elementos, badges de estado y readouts.
  const $ = (id) => document.getElementById(id);

  function setStatus(el, text, type = '') {
    el.textContent = text;
    el.className = 'status' + (type ? ' ' + type : '');
  }

  function updateReadouts(pitch, time) {
    const pitchEl = $('pitchVal');
    const timeEl  = $('timeVal');
    const pitchR  = $('pitchRead');
    const timeR   = $('timeRead');

    if (pitchEl) pitchEl.textContent = `${pitch.toFixed(1)} st`;
    if (timeEl)  timeEl.textContent  = `${Math.round(time * 1000)} ms`;
    if (pitchR)  pitchR.textContent  = `${pitch.toFixed(1)} st`;
    if (timeR)   timeR.textContent   = `${Math.round(time * 1000)} ms`;
  }

  function updateSliderLabels(params) {
    if (params.trim !== undefined && $('trimVal')) {
      $('trimVal').textContent = `${params.trim.toFixed(1)}x`;
    }
    if (params.feedback !== undefined && $('feedbackVal')) {
      $('feedbackVal').textContent = `${Math.round(params.feedback * 100)}%`;
    }
    if (params.gate !== undefined && $('gateVal')) {
      $('gateVal').textContent = `${params.gate} dB`;
    }
    if (params.mix !== undefined && $('mixVal')) {
      $('mixVal').textContent = `${Math.round(params.mix * 100)}%`;
    }
    if (params.drive !== undefined && $('driveVal')) {
      $('driveVal').textContent = `${Math.round(params.drive * 100)}%`;
    }
    if (params.space !== undefined && $('spaceVal')) {
      $('spaceVal').textContent = `${Math.round(params.space * 100)}%`;
    }
  }

  function movePuck(puckEl, pitch, time) {
    if (!puckEl) return;
    const x = (time - 0.05) / 0.85;
    const y = (4 - pitch) / 12;
    puckEl.style.left = `${Math.max(0, Math.min(1, x)) * 100}%`;
    puckEl.style.top = `${Math.max(0, Math.min(1, y)) * 100}%`;
  }

  // --- MODULE: presets.js ---
  // Presets sonideros v3.2 — Ajustados para Máxima Inteligibilidad Vocal
  // Todos los presets calibrados para que cada palabra se entienda con claridad
  // manteniendo la vibra auténtica sonidera (eco, pitch, calor y espacio).

  const PRESETS = {
    // ── Clásicos barrio ──────────────────────────────
    changa: {
      pitch: -3.0, time: 0.30, feedback: 0.52, gate: -48, mix: 0.45,
      drive: 0.20, space: 0.20,
      label: 'La Changa', desc: 'Locutor clásico (-3 st)', emoji: '🎙️'
    },
    fantasma: {
      pitch: -4.5, time: 0.24, feedback: 0.42, gate: -46, mix: 0.44,
      drive: 0.05, space: 0.50,
      label: 'El Fantasma', desc: 'Eco fantasmal (-4.5 st)', emoji: '👻'
    },
    condor: {
      pitch: -5.0, time: 0.26, feedback: 0.50, gate: -48, mix: 0.48,
      drive: 0.22, space: 0.25,
      label: 'El Cóndor', desc: 'Grave profundo (-5 st)', emoji: '🦅'
    },
    saludo: {
      pitch: -2.5, time: 0.38, feedback: 0.60, gate: -50, mix: 0.50,
      drive: 0.20, space: 0.30,
      label: 'Saludo Largo', desc: 'Feedback 60% — eco limpio', emoji: '📢'
    },

    // ── Efectos creativos (recalibrados para inteligibilidad) ───────
    robot: {
      pitch: -1.0, time: 0.025, feedback: 0.35, gate: -46, mix: 0.45,
      drive: 0.20, space: 0.10,
      label: 'Robot Sonidero', desc: 'Voz robótica inteligible', emoji: '🤖'
    },
    cumbia: {
      pitch: 0.0, time: 0.22, feedback: 0.32, gate: -48, mix: 0.36,
      drive: 0.10, space: 0.18,
      label: 'Cumbia Seca', desc: 'Solo eco de cinta sutil', emoji: '🌴'
    },
    ardilla: {
      pitch: 3.0, time: 0.20, feedback: 0.35, gate: -48, mix: 0.38,
      drive: 0.00, space: 0.15,
      label: 'El Chamaco', desc: 'Voz aguda (+3 st)', emoji: '🐿️'
    },
    limpio: {
      pitch: 0.0, time: 0.10, feedback: 0.00, gate: -55, mix: 0.00,
      drive: 0.00, space: 0.00,
      label: 'Mic Limpio', desc: 'Bypass total de efectos', emoji: '🎤'
    },

    // ── Nuevos presets v3 ────────────────────────────
    chido: {
      pitch: -2.0, time: 0.18, feedback: 0.45, gate: -46, mix: 0.48,
      drive: 0.28, space: 0.22,
      label: 'El Chido', desc: 'Barrio con presencia y grit', emoji: '🔥'
    },
    salon2000: {
      pitch: -1.5, time: 0.50, feedback: 0.55, gate: -48, mix: 0.52,
      drive: 0.12, space: 0.60,
      label: 'Salón 2000', desc: 'Reverb & eco de salón', emoji: '🎪'
    },
    narrador: {
      pitch: -6.0, time: 0.16, feedback: 0.25, gate: -48, mix: 0.32,
      drive: 0.22, space: 0.12,
      label: 'El Narrador', desc: 'Voz grave anunciador AM', emoji: '📻'
    },
    trompeta: {
      pitch: 0.0, time: 0.14, feedback: 0.28, gate: -46, mix: 0.42,
      drive: 0.25, space: 0.15,
      label: 'La Trompa', desc: 'Slapback sonidero metálico', emoji: '🎺'
    }
  };

  function applyPreset(name, { onApply }) {
    const p = PRESETS[name];
    if (!p) return null;

    document.querySelectorAll('.preset').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.preset === name);
    });

    if (typeof onApply === 'function') onApply(p, name);
    return p;
  }

  // --- MODULE: wav-encoder.js ---
  // Codifica un AudioBuffer a WAV PCM 16-bit.
  function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    let samples;
    if (numChannels === 2) {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      samples = new Float32Array(left.length + right.length);
      for (let i = 0, idx = 0; i < left.length; i++) {
        samples[idx++] = left[i];
        samples[idx++] = right[i];
      }
    } else {
      samples = buffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const wavBuffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(wavBuffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * bytesPerSample, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  // --- MODULE: recorder.js ---
  // Graba la salida procesada y exporta WAV (16-bit) + WebM.

  function setupRecorder({ engine, onStatus, onDownloadReady }) {
    let mediaRecorder = null;
    let recChunks = [];
    let recStartTime = 0;
    let recTimerId = null;

    const recBtn       = document.getElementById('recBtn');
    const recTime      = document.getElementById('recTime');
    const downloadZone = document.getElementById('downloadZone');
    const downloadWav  = document.getElementById('downloadWav');
    const downloadWebm = document.getElementById('downloadWebm');
    const audioPreview = document.getElementById('audioPreview');

    if (!recBtn) return;

    recBtn.addEventListener('click', async () => {
      // Si ya está grabando, detener
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        return;
      }

      // Si el motor o micrófono no están encendidos, activarlos automáticamente
      if (!engine.ctx || !engine.recDest) {
        const powerBtn = document.getElementById('powerBtn');
        if (powerBtn) {
          onStatus?.('Encendiendo micrófono para iniciar grabación... 🎤');
          powerBtn.click();

          // Esperar hasta 3 segundos a que el contexto y recDest estén listos
          let waitCount = 0;
          while ((!engine.ctx || !engine.recDest) && waitCount < 30) {
            await new Promise((r) => setTimeout(r, 100));
            waitCount++;
          }
        }

        if (!engine.ctx || !engine.recDest) {
          onStatus?.('No se pudo acceder al micrófono para grabar. Conéctalo y pulsa Encender Micrófono.', 'error');
          return;
        }
      }

      // Asegurar que el contexto de audio esté corriendo
      if (engine.ctx.state === 'suspended') {
        await engine.ctx.resume();
      }

      recChunks = [];
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        ''
      ];
      const mimeType = mimeCandidates.find((m) => !m || MediaRecorder.isTypeSupported(m));

      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(engine.recDest.stream, { mimeType })
          : new MediaRecorder(engine.recDest.stream);
      } catch (err) {
        console.error('Error al inicializar MediaRecorder:', err);
        onStatus?.('Tu navegador no pudo iniciar la grabación: ' + err.message, 'error');
        return;
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        onStatus?.('Procesando saludo en WAV de estudio... ⏳');
        recBtn.textContent = '⏺ Grabar Saludo';
        recBtn.classList.remove('recording');
        clearInterval(recTimerId);

        if (recChunks.length === 0) {
          onStatus?.('La grabación no capturó audio. Intenta de nuevo.', 'error');
          return;
        }

        const activeMime = mediaRecorder.mimeType || 'audio/webm';
        const rawBlob    = new Blob(recChunks, { type: activeMime });
        const webmUrl    = URL.createObjectURL(rawBlob);

        downloadWebm.href = webmUrl;
        downloadWebm.download = `saludo-sonidero-${Date.now()}.webm`;

        // Intentar decodificar a WAV sin compresión (PCM 16-bit 44.1 kHz)
        try {
          const arrayBuf      = await rawBlob.arrayBuffer();
          const decodedBuffer = await engine.ctx.decodeAudioData(arrayBuf);
          const wavBlob       = audioBufferToWav(decodedBuffer);
          const wavUrl        = URL.createObjectURL(wavBlob);

          downloadWav.href     = wavUrl;
          downloadWav.download = `saludo-sonidero-${Date.now()}.wav`;
          audioPreview.src     = wavUrl;
        } catch (err) {
          console.warn('Fallo decodificación a WAV, usando WebM como preview:', err);
          downloadWav.href     = webmUrl;
          downloadWav.download = `saludo-sonidero-${Date.now()}.webm`;
          audioPreview.src     = webmUrl;
        }

        downloadZone.classList.add('show');
        audioPreview.load();
        onStatus?.('¡Grabación lista! Escúchala o descárgala en .WAV', 'active');
        onDownloadReady?.();
      };

      // Iniciar captura
      try {
        mediaRecorder.start(200); // Guardar trozos cada 200 ms
      } catch (err) {
        console.error('Fallo mediaRecorder.start():', err);
        onStatus?.('Error iniciando grabación: ' + err.message, 'error');
        return;
      }

      recStartTime = Date.now();
      recBtn.textContent = '⏹ Detener Grabación';
      recBtn.classList.add('recording');
      downloadZone.classList.remove('show');

      onStatus?.('Grabando saludo sonidero... ¡Manda el grito!', 'active');

      // Cronómetro en pantalla
      clearInterval(recTimerId);
      recTime.textContent = '00:00';
      recTimerId = setInterval(() => {
        const diff = Math.floor((Date.now() - recStartTime) / 1000);
        const m = String(Math.floor(diff / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        recTime.textContent = `${m}:${s}`;
      }, 250);
    });
  }

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

    function syncAria(pitch, time) {
      if (!padEl) return;
      padEl.setAttribute('aria-valuenow', String(pitch));
      padEl.setAttribute('aria-valuetext', `Tono ${pitch.toFixed(1)} semitonos, Eco ${Math.round(time * 1000)} milisegundos`);
    }

    function applyNormalized(x, y) {
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      puckEl.style.left = `${clampedX * 100}%`;
      puckEl.style.top  = `${clampedY * 100}%`;

      const targetTime  = +(0.05 + clampedX * 0.85).toFixed(2);
      const targetPitch = +(4 - clampedY * 12).toFixed(1);

      currentTime = targetTime;
      currentPitch = targetPitch;
      syncAria(targetPitch, targetTime);

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
        syncAria(pitch, time);
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

  // --- MODULE: main.js ---
  // Punto de entrada v6.0: orquesta UI, motor de audio DSP, presets, pad, grabadora, FX y PWA.

  const engine = new SonideroEngine();
  let isRunning = false;
  let currentVisAnalyser = null;

  const powerBtn       = $('powerBtn');
  const statusEl       = $('status');
  const monitorBtn     = $('monitorBtn');
  const modeHeadphonesBtn = $('modeHeadphonesBtn');
  const modeSpeakersBtn   = $('modeSpeakersBtn');
  const autoDuckBtn    = $('autoDuckBtn');
  const cumbiaLoopBtn  = $('cumbiaLoopBtn');
  const duckBadge      = $('duckBadge');
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
      if (!engine.ctx || !engine.micInputGain) {
        setStatus(statusEl, 'Conectando micrófono...');
        try {
          await enumerateMics();
        } catch (e) {
          console.warn('enumerateMics notice:', e);
        }
        try {
          const ok = await engine.init(getSelectedMicId());
          if (!ok || !engine.ctx || !engine.micInputGain) {
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
      const resumed = await engine.resume();
      if (!resumed) {
        setStatus(statusEl, 'Micrófono no disponible. Verifica permisos y conexión.', 'warn');
        return;
      }
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
      const applied = applyPreset(btn.dataset.preset, { onApply: handlePresetApplied });
      if (applied) {
        document.querySelectorAll('.preset').forEach((b) => {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        if (!isRunning) {
          setStatus(statusEl, `Preset cargado: ${applied.label} (${applied.desc})`, 'active');
        }
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

  // ── Monitor & Modo Tornamesa (Auto-Ducking 25% + Anti-Acople) ─────────────
  function syncMonitorButtonUI(isOn) {
    if (!monitorBtn) return;
    if (isOn) {
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
  }

  function syncDuckingUI({ isSpeaking = engine.isVoiceSpeaking, isAutoDuckOn = engine.isAutoDuckOn, outputMode = engine.outputMode } = {}) {
    const targetPct = outputMode === 'speakers' ? 18 : 25;
    if (autoDuckBtn) {
      autoDuckBtn.classList.toggle('active', isAutoDuckOn);
      autoDuckBtn.setAttribute('aria-pressed', isAutoDuckOn ? 'true' : 'false');
      autoDuckBtn.textContent = isAutoDuckOn
        ? `📉 Auto-Ducking ${targetPct}%: ON`
        : '📉 Auto-Ducking: OFF';
    }
    if (duckBadge) {
      if (!isAutoDuckOn) {
        duckBadge.textContent = 'DUCKING OFF';
        duckBadge.className = 'duck-badge';
      } else if (isSpeaking) {
        duckBadge.textContent = `VOZ ACTIVA · MÚSICA AL ${targetPct}%`;
        duckBadge.className = 'duck-badge duck-active';
      } else {
        duckBadge.textContent = `DUCKING ${targetPct}% LISTO`;
        duckBadge.className = 'duck-badge duck-ready';
      }
    }
  }

  function syncOutputModeUI(mode) {
    const isSpeakers = mode === 'speakers';
    if (modeHeadphonesBtn) {
      modeHeadphonesBtn.classList.toggle('active', !isSpeakers);
      modeHeadphonesBtn.setAttribute('aria-pressed', !isSpeakers ? 'true' : 'false');
    }
    if (modeSpeakersBtn) {
      modeSpeakersBtn.classList.toggle('active', isSpeakers);
      modeSpeakersBtn.setAttribute('aria-pressed', isSpeakers ? 'true' : 'false');
    }
    syncMonitorButtonUI(engine.isMonitorOn);
    syncDuckingUI({ outputMode: mode });
  }

  engine.onDuckStateChange = (state) => {
    syncDuckingUI(state);
  };

  monitorBtn.addEventListener('click', () => {
    const next = !engine.isMonitorOn;
    engine.setMonitor(next);
    syncMonitorButtonUI(next);
  });

  if (modeHeadphonesBtn) {
    modeHeadphonesBtn.addEventListener('click', async () => {
      await engine.setOutputMode('headphones', getSelectedMicId());
      syncOutputModeUI('headphones');
      setStatus(statusEl, '🎧 Modo Audífonos activo: Monitor de voz ON + Auto-Ducking al 25%', 'active');
    });
  }

  if (modeSpeakersBtn) {
    modeSpeakersBtn.addEventListener('click', async () => {
      await engine.setOutputMode('speakers', getSelectedMicId());
      syncOutputModeUI('speakers');
      setStatus(
        statusEl,
        '🔊 Modo Bocinas Anti-Acople: Retorno de voz en MUTE + Cancelación de eco + Ducking profundo (18%)',
        'active'
      );
    });
  }

  if (autoDuckBtn) {
    autoDuckBtn.addEventListener('click', () => {
      const next = !engine.isAutoDuckOn;
      engine.setAutoDuck(next);
      syncDuckingUI({ isAutoDuckOn: next });
      const pct = engine.outputMode === 'speakers' ? 18 : 25;
      setStatus(
        statusEl,
        next
          ? `📉 Auto-Ducking Sonidero ON: La música baja al ${pct}% automáticamente cuando hablas`
          : '📉 Auto-Ducking Sonidero desactivado (música al 100% fijo)',
        'active'
      );
    });
  }

  if (cumbiaLoopBtn) {
    cumbiaLoopBtn.addEventListener('click', async () => {
      const playing = await engine.toggleCumbiaLoop();
      ensureVisualizerRunning();
      cumbiaLoopBtn.classList.toggle('active', playing);
      cumbiaLoopBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      cumbiaLoopBtn.textContent = playing ? '🪘 Base Cumbia: ON' : '🪘 Base Cumbia: OFF';
      setStatus(
        statusEl,
        playing
          ? '🪘 Base Cumbia Sonidera en vivo (100% sintetizada local): ¡Habla al micro y escucha el Auto-Ducking!'
          : '🪘 Base Cumbia detenida',
        'active'
      );
    });
  }

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
