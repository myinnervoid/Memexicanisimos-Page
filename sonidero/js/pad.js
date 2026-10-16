// Pad XY: mueve pitch y delay time con mouse, touch o teclado (incluso antes de encender el mic).
import { movePuck } from './ui.js';

export function setupPad({ padEl, puckEl, engine, onUpdate }) {
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