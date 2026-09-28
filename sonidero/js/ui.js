// Helpers de UI: selección de elementos, badges de estado y readouts.
export const $ = (id) => document.getElementById(id);

export function setStatus(el, text, type = '') {
  el.textContent = text;
  el.className = 'status' + (type ? ' ' + type : '');
}

export function updateReadouts(pitch, time) {
  const pitchEl = $('pitchVal');
  const timeEl  = $('timeVal');
  const pitchR  = $('pitchRead');
  const timeR   = $('timeRead');

  if (pitchEl) pitchEl.textContent = `${pitch.toFixed(1)} st`;
  if (timeEl)  timeEl.textContent  = `${Math.round(time * 1000)} ms`;
  if (pitchR)  pitchR.textContent  = `${pitch.toFixed(1)} st`;
  if (timeR)   timeR.textContent   = `${Math.round(time * 1000)} ms`;
}

export function updateSliderLabels(params) {
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

export function movePuck(puckEl, pitch, time) {
  if (!puckEl) return;
  const x = (time - 0.05) / 0.85;
  const y = (4 - pitch) / 12;
  puckEl.style.left = `${Math.max(0, Math.min(1, x)) * 100}%`;
  puckEl.style.top = `${Math.max(0, Math.min(1, y)) * 100}%`;
}