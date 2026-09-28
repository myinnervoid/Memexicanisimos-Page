// Graba la salida procesada y exporta WAV (16-bit) + WebM.
import { audioBufferToWav } from './wav-encoder.js';

export function setupRecorder({ engine, onStatus, onDownloadReady }) {
  let mediaRecorder = null;
  let recChunks = [];
  let recStartTime = 0;
  let recTimerId = null;

  const recBtn       = document.getElementById('recBtn');
  const recTime      = document.getElementById('recTime');
  const downloadZone = document.getElementById('downloadZone');
  const downloadWav  = document.getElementById('downloadWav');
  const downloadWebm = document.getElementById('downloadWebm');
  const audioPreview = document.getElementById('audioPreview');

  if (!recBtn) return;

  recBtn.addEventListener('click', async () => {
    // Si ya está grabando, detener
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }

    // Si el motor o micrófono no están encendidos, activarlos automáticamente
    if (!engine.ctx || !engine.recDest) {
      const powerBtn = document.getElementById('powerBtn');
      if (powerBtn) {
        onStatus?.('Encendiendo micrófono para iniciar grabación... 🎤');
        powerBtn.click();

        // Esperar hasta 3 segundos a que el contexto y recDest estén listos
        let waitCount = 0;
        while ((!engine.ctx || !engine.recDest) && waitCount < 30) {
          await new Promise((r) => setTimeout(r, 100));
          waitCount++;
        }
      }

      if (!engine.ctx || !engine.recDest) {
        onStatus?.('No se pudo acceder al micrófono para grabar. Conéctalo y pulsa Encender Micrófono.', 'error');
        return;
      }
    }

    // Asegurar que el contexto de audio esté corriendo
    if (engine.ctx.state === 'suspended') {
      await engine.ctx.resume();
    }

    recChunks = [];
    const mimeCandidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      ''
    ];
    const mimeType = mimeCandidates.find((m) => !m || MediaRecorder.isTypeSupported(m));

    try {
      mediaRecorder = mimeType
        ? new MediaRecorder(engine.recDest.stream, { mimeType })
        : new MediaRecorder(engine.recDest.stream);
    } catch (err) {
      console.error('Error al inicializar MediaRecorder:', err);
      onStatus?.('Tu navegador no pudo iniciar la grabación: ' + err.message, 'error');
      return;
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      onStatus?.('Procesando saludo en WAV de estudio... ⏳');
      recBtn.textContent = '⏺ Grabar Saludo';
      recBtn.classList.remove('recording');
      clearInterval(recTimerId);

      if (recChunks.length === 0) {
        onStatus?.('La grabación no capturó audio. Intenta de nuevo.', 'error');
        return;
      }

      const activeMime = mediaRecorder.mimeType || 'audio/webm';
      const rawBlob    = new Blob(recChunks, { type: activeMime });
      const webmUrl    = URL.createObjectURL(rawBlob);

      downloadWebm.href = webmUrl;
      downloadWebm.download = `saludo-sonidero-${Date.now()}.webm`;

      // Intentar decodificar a WAV sin compresión (PCM 16-bit 44.1 kHz)
      try {
        const arrayBuf      = await rawBlob.arrayBuffer();
        const decodedBuffer = await engine.ctx.decodeAudioData(arrayBuf);
        const wavBlob       = audioBufferToWav(decodedBuffer);
        const wavUrl        = URL.createObjectURL(wavBlob);

        downloadWav.href     = wavUrl;
        downloadWav.download = `saludo-sonidero-${Date.now()}.wav`;
        audioPreview.src     = wavUrl;
      } catch (err) {
        console.warn('Fallo decodificación a WAV, usando WebM como preview:', err);
        downloadWav.href     = webmUrl;
        downloadWav.download = `saludo-sonidero-${Date.now()}.webm`;
        audioPreview.src     = webmUrl;
      }

      downloadZone.classList.add('show');
      audioPreview.load();
      onStatus?.('¡Grabación lista! Escúchala o descárgala en .WAV', 'active');
      onDownloadReady?.();
    };

    // Iniciar captura
    try {
      mediaRecorder.start(200); // Guardar trozos cada 200 ms
    } catch (err) {
      console.error('Fallo mediaRecorder.start():', err);
      onStatus?.('Error iniciando grabación: ' + err.message, 'error');
      return;
    }

    recStartTime = Date.now();
    recBtn.textContent = '⏹ Detener Grabación';
    recBtn.classList.add('recording');
    downloadZone.classList.remove('show');

    onStatus?.('Grabando saludo sonidero... ¡Manda el grito!', 'active');

    // Cronómetro en pantalla
    clearInterval(recTimerId);
    recTime.textContent = '00:00';
    recTimerId = setInterval(() => {
      const diff = Math.floor((Date.now() - recStartTime) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      recTime.textContent = `${m}:${s}`;
    }, 250);
  });
}