// Graba la salida procesada y exporta WAV (16-bit) + WebM.
import { audioBufferToWav } from './wav-encoder.js';

export function setupRecorder({ engine, onStatus, onDownloadReady }) {
  let mediaRecorder = null;
  let recChunks = [];
  let recStartTime = 0;
  let recTimerId = null;

  const recBtn = document.getElementById('recBtn');
  const recTime = document.getElementById('recTime');
  const downloadZone = document.getElementById('downloadZone');
  const downloadWav = document.getElementById('downloadWav');
  const downloadWebm = document.getElementById('downloadWebm');
  const audioPreview = document.getElementById('audioPreview');

  recBtn.addEventListener('click', async () => {
    if (!engine.ctx || !engine.recDest) {
      onStatus?.('Primero enciende el micrófono 🎤', 'error');
      return;
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }

    recChunks = [];
    const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', ''];
    const mimeType = mimeCandidates.find((m) => !m || MediaRecorder.isTypeSupported(m));

    try {
      mediaRecorder = new MediaRecorder(engine.recDest.stream, mimeType ? { mimeType } : undefined);
    } catch (err) {
      onStatus?.('Tu navegador no admite MediaRecorder 😢', 'error');
      return;
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      onStatus?.('Procesando saludo en WAV de estudio... ⏳');
      recBtn.textContent = '⏺ Grabar Saludo';
      recBtn.classList.remove('recording');
      clearInterval(recTimerId);

      // Restaurar monitor tras la grabación
      engine.restoreMonitor();

      const rawBlob = new Blob(recChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const webmUrl = URL.createObjectURL(rawBlob);

      downloadWebm.href = webmUrl;
      downloadWebm.download = `saludo-sonidero-${Date.now()}.webm`;

      try {
        const arrayBuf = await rawBlob.arrayBuffer();
        const decodedBuffer = await engine.ctx.decodeAudioData(arrayBuf);
        const wavBlob = audioBufferToWav(decodedBuffer);
        const wavUrl = URL.createObjectURL(wavBlob);

        downloadWav.href = wavUrl;
        downloadWav.download = `saludo-sonidero-${Date.now()}.wav`;
        audioPreview.src = wavUrl;
      } catch (err) {
        console.warn('Fallo decodificación a WAV, usando WebM:', err);
        downloadWav.href = webmUrl;
        downloadWav.download = `saludo-sonidero-${Date.now()}.webm`;
        audioPreview.src = webmUrl;
      }

      downloadZone.classList.add('show');
      onStatus?.('¡Grabación lista! Escúchala o descárgala en .WAV', 'active');
      onDownloadReady?.();
    };

    mediaRecorder.start(100);
    recStartTime = Date.now();
    recBtn.textContent = '⏹ Detener Grabación';
    recBtn.classList.add('recording');
    downloadZone.classList.remove('show');

    // Silenciar monitor durante grabación para evitar reinyección si hay bocinas
    engine.muteMonitorTemporarily();

    onStatus?.('Grabando saludo sonidero... ¡Manda el grito!', 'active');

    recTimerId = setInterval(() => {
      const diff = Math.floor((Date.now() - recStartTime) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      recTime.textContent = `${m}:${s}`;
    }, 250);
  });
}