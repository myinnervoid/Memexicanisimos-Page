// Helpers de UI: selección de elementos, badges de estado y readouts.
export const $ = (id) => document.getElementById(id);

export function setStatus(el, text, type = '') {
  el.textContent = text;
  el.className = 'status' + (type ? ' ' + type : '');
}

export function updateReadouts(pitch, time) {
  $('pitchVal').textContent = `${pitch.toFixed(1)} st`;
  $('timeVal').textContent = `${Math.round(time * 1000)} ms`;
  $('pitchRead').textContent = `${pitch.toFixed(1)} st`;
  $('timeRead').textContent = `${Math.round(time * 1000)} ms`;
}

export function updateSliderLabels(params) {
  $('feedbackVal').textContent = `${Math.round(params.feedback * 100)}%`;
  $('gateVal').textContent = `${params.gate} dB`;
  $('mixVal').textContent = `${Math.round(params.mix * 100)}%`;
}

export function movePuck(puckEl, pitch, time) {
  const x = (time - 0.05) / 0.85;
  const y = (4 - pitch) / 12;
  puckEl.style.left = `${Math.max(0, Math.min(1, x)) * 100}%`;
  puckEl.style.top = `${Math.max(0, Math.min(1, y)) * 100}%`;
}