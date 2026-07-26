document.addEventListener('DOMContentLoaded', () => {
  // Pestañas (Tabs) de navegación principal (The New Notbook - 5 Pestañas)
  const tabButtons = document.querySelectorAll('.tab-button');
  const productSections = document.querySelectorAll('.product-section');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-target');

      // Remover clase 'active' de todos los botones y secciones
      tabButtons.forEach(btn => btn.classList.remove('active'));
      productSections.forEach(section => section.classList.remove('active'));

      // Añadir clase 'active' al botón seleccionado y su sección
      button.classList.add('active');
      const activeSection = document.getElementById(target);
      if (activeSection) {
        activeSection.classList.add('active');
      }

      // Scroll suave a los contenidos del Hub
      const targetOffset = document.querySelector('.products-wrapper').offsetTop;
      window.scrollTo({
        top: targetOffset - 100,
        behavior: 'smooth'
      });
    });
  });

  // Listener dinámico para el botón "¡Invítame un Taco!" del Header
  const headerTacoBtn = document.getElementById('header-taco-btn');
  if (headerTacoBtn) {
    headerTacoBtn.addEventListener('click', () => {
      // Buscar el botón de la pestaña Nosotros & Apoyo y simular su clic
      const supportTabButton = document.querySelector('.tab-button[data-target="nosotros-apoyo"]');
      if (supportTabButton) {
        supportTabButton.click();
        
        // Esperar un breve instante para que la sección se active y hacer scroll suave al módulo de donaciones
        setTimeout(() => {
          const supportWrapper = document.querySelector('.support-wrapper');
          if (supportWrapper) {
            window.scrollTo({
              top: supportWrapper.offsetTop - 120,
              behavior: 'smooth'
            });
          }
        }, 150);
      }
    });
  }

  // Funcionalidad interactiva de Copiado de Correo Oficial
  const copyEmailBtn = document.getElementById('copy-email-btn');
  const emailText = document.querySelector('.email-text');

  // Contrato de respuestas asíncronas estándar: { success, data, error, error_code }
  function handleAsyncOperation(promise) {
    return promise
      .then(data => ({ success: true, data, error: null, error_code: null }))
      .catch(err => ({ success: false, data: null, error: err.message || err, error_code: 'CLIPBOARD_WRITE_FAILED' }));
  }

  if (copyEmailBtn && emailText) {
    copyEmailBtn.addEventListener('click', () => {
      const email = emailText.textContent;
      const originalContent = copyEmailBtn.innerHTML;

      // Estado de carga UX
      copyEmailBtn.innerHTML = '<span class="spinner"></span> Copiando...';
      copyEmailBtn.disabled = true;

      handleAsyncOperation(navigator.clipboard.writeText(email)).then(response => {
        copyEmailBtn.disabled = false;
        if (response.success) {
          copyEmailBtn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
          copyEmailBtn.style.backgroundColor = 'var(--green)';
          
          setTimeout(() => {
            copyEmailBtn.innerHTML = originalContent;
            copyEmailBtn.style.backgroundColor = 'var(--rose)';
          }, 2000);
        } else {
          // Estado de error UX
          copyEmailBtn.innerHTML = '<i class="fas fa-times"></i> Error';
          copyEmailBtn.style.backgroundColor = 'var(--red)';
          
          const errorToast = document.createElement('div');
          errorToast.className = 'toast-error';
          errorToast.textContent = `Error [${response.error_code}]: No se pudo escribir al portapapeles.`;
          copyEmailBtn.parentNode.appendChild(errorToast);

          setTimeout(() => {
            copyEmailBtn.innerHTML = originalContent;
            copyEmailBtn.style.backgroundColor = 'var(--rose)';
            errorToast.remove();
          }, 3000);
        }
      });
    });
  }

  // Efecto dinámico en la consola de flasheo de Burner
  const consoleBody = document.querySelector('.console-body');
  if (consoleBody) {
    const originalConsoleLines = [
      '<p class="console-line text-muted">[INFO] Analizando ISO de Windows 10/11...</p>',
      '<p class="console-line text-warning">[WARN] Archivo \'sources/install.wim\' excede los 4GB (Tamaño: 5.2 GB)</p>',
      '<p class="console-line text-success">[PROCESS] Dividiendo install.wim usando wimlib en install.swm...</p>',
      '<div class="console-progress"><div class="progress-bar orange" style="width: 0%;">0%</div></div>',
      '<p class="console-line text-muted">[INFO] Creando partición de arranque UEFI en USB /dev/sdb...</p>'
    ];

    let loopInterval;
    
    function runConsoleMockupLoop() {
      consoleBody.innerHTML = originalConsoleLines.join('');
      const bar = consoleBody.querySelector('.progress-bar');
      let progress = 0;
      
      if (loopInterval) clearInterval(loopInterval);
      
      loopInterval = setInterval(() => {
        progress += 4;
        if (bar) {
          bar.style.width = progress + '%';
          bar.textContent = progress + '%';
        }
        
        if (progress >= 100) {
          clearInterval(loopInterval);
          const doneLine = document.createElement('p');
          doneLine.className = 'console-line text-success';
          doneLine.innerHTML = '[OK] install.wim dividido y copiado en install.swm (Parte 1 y Parte 2). USB Listo.';
          consoleBody.appendChild(doneLine);
          
          setTimeout(() => {
            runConsoleMockupLoop();
          }, 5000);
        }
      }, 180);
    }

    // Inicializar simulación
    runConsoleMockupLoop();
  }

  // Interacción de descarga de archivos simulada en Files
  const fileRows = document.querySelectorAll('.file-row');
  fileRows.forEach(row => {
    const actionBtn = row.querySelector('.f-action');
    if (actionBtn) {
      actionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const originalText = actionBtn.textContent;
        if (originalText === '✔ Guardado' || originalText === 'Descargando...') return;

        // Estado de carga interactivo (Spinner en botón de fila de archivo)
        actionBtn.innerHTML = '<span class="spinner"></span> Descargando...';
        actionBtn.style.color = 'var(--gold)';
        actionBtn.style.textDecoration = 'none';
        
        // Simulación de descarga con contrato estructurado
        const downloadPromise = new Promise((resolve) => setTimeout(resolve, 1500));
        handleAsyncOperation(downloadPromise).then(() => {
          actionBtn.textContent = '✔ Guardado';
          actionBtn.style.color = 'var(--green)';
        });
      });
    }
  });
});
