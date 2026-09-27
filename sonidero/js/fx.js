// Botones de FX: sirena, láser y pitch drop.
export function setupFxButtons({ engine }) {
  document.getElementById('sirenBtn').addEventListener('click', () => engine.playSiren());
  document.getElementById('laserBtn').addEventListener('click', () => engine.playLaser());
  document.getElementById('dropBtn').addEventListener('click', () => engine.playPitchDrop());
}