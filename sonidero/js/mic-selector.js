// Enumeración y selección de micrófonos de entrada sin abrir streams redundantes si ya hay permiso.
let selectedMicId = null;
let hasPermission = false;

export function getSelectedMicId() {
  return selectedMicId;
}

export async function enumerateMics() {
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

export function setupMicSelector({ onMicChange }) {
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