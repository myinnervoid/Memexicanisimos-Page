// Punto de entrada v3: orquesta UI, motor de audio DSP, presets, pad, grabadora, FX y PWA.
import { SonideroEngine }    from './audio-engine.js';
import { enumerateMics, getSelectedMicId, setupMicSelector } from './mic-selector.js';
import { applyPreset }       from './presets.js';
import { setupPad }          from './pad.js';
import { setupRecorder }     from './recorder.js';
import { setupFxButtons }    from './fx.js';
import { startVisualizer }   from './visualizer.js';
import { $, setStatus, updateReadouts, updateSliderLabels, movePuck } from './ui.js';

const engine = new SonideroEngine();
let isRunning = false;

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

// ── PWA: Registro de Service Worker ────────────────────────────────────────
if ('serviceWorker' in navigator) {
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
      setStatus(statusEl, 'Pidiendo permiso pal micrófono...');
      await enumerateMics();
      try {
        const ok = await engine.init(getSelectedMicId());
        if (!ok) throw new Error('initAudio falló');
      } catch (err) {
        console.error(err);
        setStatus(statusEl, `Error: ${err.message || 'No se pudo acceder al micrófono'}`, 'error');
        return;
      }
      // Aplicar el preset seleccionado visualmente al iniciar
      const current = document.querySelector('.preset.selected');
      if (current) applyPreset(current.dataset.preset, { onApply: handlePresetApplied });

      startVisualizer({ analyser: engine.analyser, canvas: vuCanvas });
    }
    await engine.resume();
    powerBtn.textContent = '⏹ Apagar Micrófono';
    powerBtn.classList.add('on');
    setStatus(statusEl, '¡En vivo! Échate un saludo con estilo 🎙️🔥', 'active');
    isRunning = true;
  } else {
    await engine.suspend();
    powerBtn.textContent = '🎤 Encender Micrófono';
    powerBtn.classList.remove('on');
    setStatus(statusEl, 'En pausa — presiona para reanudar');
    isRunning = false;
  }
});

// ── Presets ────────────────────────────────────────────────────────────────
function handlePresetApplied(p) {
  pitchSlider.value    = p.pitch;
  timeSlider.value     = p.time;
  feedbackSlider.value = p.feedback;
  gateSlider.value     = p.gate;
  mixSlider.value      = p.mix;
  if (driveSlider && p.drive !== undefined) driveSlider.value = p.drive;
  if (spaceSlider && p.space !== undefined) spaceSlider.value = p.space;

  updateReadouts(p.pitch, p.time);
  updateSliderLabels(p);
  movePuck(puck, p.pitch, p.time);

  if (engine.ctx) engine.applyAll(p);
}

document.querySelectorAll('.preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');

    applyPreset(btn.dataset.preset, { onApply: handlePresetApplied });
  });
});

// ── Sliders ────────────────────────────────────────────────────────────────
const allSliders = [pitchSlider, timeSlider, feedbackSlider, gateSlider, mixSlider];
if (driveSlider) allSliders.push(driveSlider);
if (spaceSlider) allSliders.push(spaceSlider);

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
    movePuck(puck, p, t);

    if (engine.ctx) {
      engine.applyAll({ pitch: p, time: t, feedback: f, gate: g, mix: m, drive: d, space: s });
    }
  });
});

// ── Pad XY ────────────────────────────────────────────────────────────────
setupPad({
  padEl: pad,
  puckEl: puck,
  engine,
  onUpdate: ({ pitch, time }) => {
    pitchSlider.value = pitch;
    timeSlider.value  = time;
    updateReadouts(pitch, time);
  }
});

// ── Monitor ───────────────────────────────────────────────────────────────
monitorBtn.addEventListener('click', () => {
  const next = !engine.isMonitorOn;
  engine.setMonitor(next);
  if (next) {
    monitorBtn.textContent = '🔊 Monitor: ON';
    monitorBtn.style.borderColor = 'var(--verde)';
    monitorBtn.style.color       = 'var(--verde)';
    monitorBtn.setAttribute('aria-label', 'Monitor activo — pulsa para silenciar');
  } else {
    monitorBtn.textContent = '🔇 Monitor: MUTE';
    monitorBtn.style.borderColor = 'var(--rosa)';
    monitorBtn.style.color       = 'var(--rosa)';
    monitorBtn.setAttribute('aria-label', 'Monitor silenciado — pulsa para activar');
  }
});

// ── FX ────────────────────────────────────────────────────────────────────
setupFxButtons({ engine });

// ── Grabación ─────────────────────────────────────────────────────────────
setupRecorder({
  engine,
  onStatus: (text, type) => setStatus(statusEl, text, type || '')
});

// ── Selector de micrófono ─────────────────────────────────────────────────
setupMicSelector({
  onMicChange: async () => {
    if (isRunning && engine.ctx) {
      await engine.suspend();
      await engine.dispose();
      isRunning = false;
      powerBtn.textContent = '🎤 Encender Micrófono';
      powerBtn.classList.remove('on');
      setStatus(statusEl, 'Cambiando micrófono...');
    }
  }
});

// ── Estado inicial de la UI ───────────────────────────────────────────────
(function initUI() {
  const p = parseFloat(pitchSlider.value);
  const t = parseFloat(timeSlider.value);
  const d = driveSlider ? parseFloat(driveSlider.value) : 0;
  const s = spaceSlider ? parseFloat(spaceSlider.value) : 0.2;

  updateReadouts(p, t);
  updateSliderLabels({
    feedback: parseFloat(feedbackSlider.value),
    gate:     parseFloat(gateSlider.value),
    mix:      parseFloat(mixSlider.value),
    drive:    d,
    space:    s
  });
  movePuck(puck, p, t);
})();