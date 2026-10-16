// Botones de FX v5.1 / v6.0 — todos async, suenan con o sin micrófono encendido y activan el vúmetro.
export function setupFxButtons({ engine, onFxPlay }) {
  async function trigger(fn, label) {
    await fn();
    if (typeof onFxPlay === 'function') {
      onFxPlay(label);
    }
  }

  // ── Barra clásica superior ──────────────────────────────
  document.getElementById('sirenBtn')?.addEventListener('click', () => {
    trigger(() => engine.playSiren(), '🚨 Sirena Sonidera');
  });

  document.getElementById('laserBtn')?.addEventListener('click', () => {
    trigger(() => engine.playLaser(), '💥 Rayo Láser');
  });

  document.getElementById('dropBtn')?.addEventListener('click', () => {
    trigger(() => engine.playPitchDrop(), '🎛️ Disco Drop');
  });

  // ── Barra de alarmas reales (.ogg + síntesis) ───────────
  document.getElementById('hornBtn')?.addEventListener('click', () => {
    trigger(() => engine.playAirHorn(), '📯 Cuerno de Aire');
  });

  document.getElementById('policeBtn')?.addEventListener('click', () => {
    trigger(() => engine.playPoliceSiren(), '🚓 Sirena Patrulla');
  });

  document.getElementById('backupBtn')?.addEventListener('click', () => {
    trigger(() => engine.playBackupAlarm(), '🚧 Alarma Reversa');
  });

  document.getElementById('emergencyBtn')?.addEventListener('click', () => {
    trigger(() => engine.playEmergencyAlarm(), '🔴 Alarma Emergencia');
  });

  document.getElementById('scratchBtn')?.addEventListener('click', () => {
    trigger(() => engine.playScratch(), '💿 Scratch de Vinilo');
  });
}