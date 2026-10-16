// Punto de entrada v6.0: orquesta UI, motor de audio DSP, presets, pad, grabadora, FX y PWA.
import { SonideroEngine } from './audio-engine.js';
import { enumerateMics, getSelectedMicId, setupMicSelector } from './mic-selector.js';
import { applyPreset } from './presets.js';
import { setupPad } from './pad.js';
import { setupRecorder } from './recorder.js';
import { setupFxButtons } from './fx.js';
import { startVisualizer } from './visualizer.js';
import { $, setStatus, updateReadouts, updateSliderLabels, movePuck } from './ui.js';

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