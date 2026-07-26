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

  // Funcionalidad interactiva de Copiado de Correo Oficial
  const copyEmailBtn = document.getElementById('copy-email-btn');
  const emailText = document.querySelector('.email-text');

  if (copyEmailBtn && emailText) {
    copyEmailBtn.addEventListener('click', () => {
      const email = emailText.textContent;
      navigator.clipboard.writeText(email).then(() => {
        const originalContent = copyEmailBtn.innerHTML;
        copyEmailBtn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
        copyEmailBtn.style.backgroundColor = 'var(--green)';
        
        setTimeout(() => {
          copyEmailBtn.innerHTML = originalContent;
          copyEmailBtn.style.backgroundColor = 'var(--blue)';
        }, 2000);
      }).catch(err => {
        console.error('Error al copiar el texto: ', err);
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

        actionBtn.textContent = 'Descargando...';
        actionBtn.style.color = 'var(--purple)';
        
        setTimeout(() => {
          actionBtn.textContent = '✔ Guardado';
          actionBtn.style.color = 'var(--green)';
          actionBtn.style.textDecoration = 'none';
        }, 1500);
      });
    }
  });
});
