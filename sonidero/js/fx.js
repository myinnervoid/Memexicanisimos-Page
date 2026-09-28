// Botones de FX v2.1 — todos async, suenan sin micrófono encendido
export function setupFxButtons({ engine }) {
  // ── Barra clásica superior ──────────────────────────────
  document.getElementById('sirenBtn').addEventListener('click',  () => engine.playSiren());
  document.getElementById('laserBtn').addEventListener('click',  () => engine.playLaser());
  document.getElementById('dropBtn').addEventListener('click',   () => engine.playPitchDrop());

  // ── Barra de alarmas reales ─────────────────────────────
  document.getElementById('hornBtn')?.addEventListener('click',      () => engine.playAirHorn());
  document.getElementById('policeBtn')?.addEventListener('click',    () => engine.playPoliceSiren());
  document.getElementById('backupBtn')?.addEventListener('click',    () => engine.playBackupAlarm());
  document.getElementById('emergencyBtn')?.addEventListener('click', () => engine.playEmergencyAlarm());
  document.getElementById('scratchBtn')?.addEventListener('click',   () => engine.playScratch());
}