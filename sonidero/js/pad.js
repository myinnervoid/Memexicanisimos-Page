// Pad XY: mueve pitch y delay time con mouse o touch.
import { movePuck } from './ui.js';

export function setupPad({ padEl, puckEl, engine, onUpdate }) {
  let dragging = false;

  function handlePad(e) {
    if (!engine || !engine.ctx) return;
    const rect = padEl.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (cy - rect.top) / rect.height));

    puckEl.style.left = `${x * 100}%`;
    puckEl.style.top = `${y * 100}%`;

    const targetTime = 0.05 + x * 0.85;
    const targetPitch = 4 - y * 12;

    engine.setTime(targetTime);
    engine.setPitch(targetPitch);

    if (typeof onUpdate === 'function') onUpdate({ pitch: targetPitch, time: targetTime });
  }

  padEl.addEventListener('mousedown', (e) => { dragging = true; handlePad(e); });
  window.addEventListener('mousemove', (e) => { if (dragging) handlePad(e); });
  window.addEventListener('mouseup', () => { dragging = false; });

  padEl.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    dragging = true;
    handlePad(e);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (dragging) {
      if (e.cancelable) e.preventDefault();
      handlePad(e);
    }
  }, { passive: false });

  window.addEventListener('touchend', () => { dragging = false; });

  return { movePuck: (pitch, time) => movePuck(puckEl, pitch, time) };
}