// Enumeración y selección de micrófonos de entrada.
// Los labels solo aparecen después de conceder permiso, así que se pide un stream temporal.

let selectedMicId = null;

export function getSelectedMicId() {
  return selectedMicId;
}

export async function enumerateMics() {
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    tempStream.getTracks().forEach((t) => t.stop());
  } catch (e) {
    console.warn('Sin permiso de micrófono:', e);
    return false;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const mics = devices.filter((d) => d.kind === 'audioinput');
  const select = document.getElementById('micSelect');
  const wrap = document.getElementById('micSelectorWrap');

  select.innerHTML = '';
  mics.forEach((mic, i) => {
    const opt = document.createElement('option');
    opt.value = mic.deviceId;
    opt.textContent = mic.label || `Micrófono ${i + 1}`;
    if (mic.deviceId === selectedMicId) opt.selected = true;
    select.appendChild(opt);
  });

  if (mics.length > 1) wrap.style.display = 'block';

  if (!selectedMicId && mics.length > 0) {
    selectedMicId = mics[0].deviceId;
  }

  return true;
}

// Conectar el change del select y el devicechange del sistema.
export function setupMicSelector({ onMicChange }) {
  document.getElementById('micSelect').addEventListener('change', (e) => {
    selectedMicId = e.target.value;
    if (typeof onMicChange === 'function') onMicChange();
  });

  if (navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => {
      if (typeof onMicChange === 'function') onMicChange();
    });
  }
}