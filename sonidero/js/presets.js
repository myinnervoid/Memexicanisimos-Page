// Presets sonideros listos pa'l barrio.
// Cada preset fija pitch, time, feedback, gate y mix.

export const PRESETS = {
  changa:   { pitch: -3.0, time: 0.32, feedback: 0.55, gate: -48, mix: 0.50 },
  fantasma: { pitch: -5.0, time: 0.22, feedback: 0.45, gate: -45, mix: 0.45 },
  condor:   { pitch: -6.0, time: 0.28, feedback: 0.60, gate: -48, mix: 0.55 },
  saludo:   { pitch: -2.5, time: 0.42, feedback: 0.75, gate: -50, mix: 0.60 },
  robot:    { pitch:  0.0, time: 0.05, feedback: 0.80, gate: -45, mix: 0.65 },
  cumbia:   { pitch:  0.0, time: 0.24, feedback: 0.35, gate: -48, mix: 0.40 },
  ardilla:  { pitch:  3.5, time: 0.28, feedback: 0.50, gate: -48, mix: 0.40 },
  limpio:   { pitch:  0.0, time: 0.10, feedback: 0.10, gate: -55, mix: 0.00 }
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