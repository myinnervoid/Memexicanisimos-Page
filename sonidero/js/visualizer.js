// VU meter dibujado en canvas con gradiente estilo mexicano (Verde Patrio, Oro Charro y Rojo Patrio).
let rafId = null;

export function startVisualizer({ analyser, canvas }) {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  const ctx2d = canvas.getContext('2d');

  function draw() {
    rafId = requestAnimationFrame(draw);
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const w = canvas.width;
    const h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);

    const barWidth = (w / bufferLength) * 1.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * h;
      const grad = ctx2d.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, '#437742');
      grad.addColorStop(0.55, '#f99d1b');
      grad.addColorStop(0.80, '#f37420');
      grad.addColorStop(1.0, '#cc1236');

      ctx2d.fillStyle = grad;
      ctx2d.fillRect(x, h - barHeight, Math.max(1, barWidth - 1), barHeight);
      x += barWidth;
    }
  }

  draw();

  return () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}