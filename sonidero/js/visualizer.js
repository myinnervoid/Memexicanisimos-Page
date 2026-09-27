// VU meter dibujado en canvas con gradiente neón.
let rafId = null;

export function startVisualizer({ analyser, canvas }) {
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
      grad.addColorStop(0, '#00ff88');
      grad.addColorStop(0.65, '#ffe600');
      grad.addColorStop(1, '#ff007f');

      ctx2d.fillStyle = grad;
      ctx2d.fillRect(x, h - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
  }

  draw();

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}