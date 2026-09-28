// Presets sonideros v3.2 — Ajustados para Máxima Inteligibilidad Vocal
// Todos los presets calibrados para que cada palabra se entienda con claridad
// manteniendo la vibra auténtica sonidera (eco, pitch, calor y espacio).

export const PRESETS = {
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

export function applyPreset(name, { onApply }) {
  const p = PRESETS[name];
  if (!p) return null;

  document.querySelectorAll('.preset').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.preset === name);
  });

  if (typeof onApply === 'function') onApply(p, name);
  return p;
}