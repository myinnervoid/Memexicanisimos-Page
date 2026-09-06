document.addEventListener('DOMContentLoaded', () => {
  // Pestañas (Tabs) de navegación principal (5 Pestañas Mexicanas con WAI-ARIA)
  const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
  const productSections = document.querySelectorAll('.product-section');
  const tabsContainer = document.querySelector('.tabs-container');

  function activateTab(selectedBtn) {
    if (!selectedBtn) return;
    const target = selectedBtn.getAttribute('data-target');

    const updateDOM = () => {
      tabButtons.forEach(btn => {
        const isSelected = (btn === selectedBtn);
        btn.classList.toggle('active', isSelected);
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.setAttribute('tabindex', isSelected ? '0' : '-1');
      });

      productSections.forEach(section => {
        const isTarget = (section.id === target);
        section.classList.toggle('active', isTarget);
      });
    };

    // Soporte para View Transitions API si el navegador lo admite
    if (document.startViewTransition) {
      document.startViewTransition(() => updateDOM());
    } else {
      updateDOM();
    }

    // Scroll suave a los contenidos del Hub
    const targetOffset = document.querySelector('.products-wrapper').offsetTop;
    window.scrollTo({
      top: targetOffset - 100,
      behavior: 'smooth'
    });
  }

  tabButtons.forEach(button => {
    button.addEventListener('click', () => activateTab(button));
  });

  // Navegación por teclado WAI-ARIA para las pestañas (ArrowLeft, ArrowRight, Home, End)
  if (tabsContainer) {
    tabsContainer.addEventListener('keydown', (e) => {
      const currentIndex = tabButtons.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        newIndex = (currentIndex + 1) % tabButtons.length;
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        newIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
        e.preventDefault();
      } else if (e.key === 'Home') {
        newIndex = 0;
        e.preventDefault();
      } else if (e.key === 'End') {
        newIndex = tabButtons.length - 1;
        e.preventDefault();
      }

      if (newIndex !== currentIndex) {
        tabButtons[newIndex].focus();
        activateTab(tabButtons[newIndex]);
      }
    });
  }

  // Listener dinámico para el botón "¡Invítame un Taco!" del Header
  const headerTacoBtn = document.getElementById('header-taco-btn');
  if (headerTacoBtn) {
    headerTacoBtn.addEventListener('click', () => {
      const supportTabButton = document.querySelector('.tab-button[data-target="nosotros-apoyo"]');
      if (supportTabButton) {
        supportTabButton.click();
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

  function handleAsyncOperation(promise) {
    return promise
      .then(data => ({ success: true, data, error: null, error_code: null }))
      .catch(err => ({ success: false, data: null, error: err.message || err, error_code: 'CLIPBOARD_WRITE_FAILED' }));
  }

  if (copyEmailBtn && emailText) {
    copyEmailBtn.addEventListener('click', () => {
      const email = emailText.textContent;
      const originalContent = copyEmailBtn.innerHTML;

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

  // 🔍 Buscador interactivo de atajos de teclado para MASV
  const shortcutSearch = document.getElementById('shortcut-search');
  const shortcutCards = document.querySelectorAll('.short-card');
  if (shortcutSearch) {
    shortcutSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      shortcutCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const tags = card.getAttribute('data-shortcut') || '';
        const match = text.includes(query) || tags.includes(query);
        card.style.display = match ? 'flex' : 'none';
      });
    });
  }

  // 🔥 Efecto dinámico y controles interactivos en la consola de flasheo de Burner
  const consoleBody = document.getElementById('burner-console-body');
  const btnRunConsole = document.getElementById('btn-run-console');
  const btnResetConsole = document.getElementById('btn-reset-console');

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
        progress += 5;
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
        }
      }, 150);
    }

    if (btnRunConsole) {
      btnRunConsole.addEventListener('click', runConsoleMockupLoop);
    }

    if (btnResetConsole) {
      btnResetConsole.addEventListener('click', () => {
        if (loopInterval) clearInterval(loopInterval);
        consoleBody.innerHTML = originalConsoleLines.join('');
      });
    }

    // Inicializar simulación al cargar
    runConsoleMockupLoop();
  }

  // 📂 Filtro por categorías interactivo en el explorador de Files
  const filterTags = document.querySelectorAll('.filter-tag');
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  const fileRows = document.querySelectorAll('.file-row');

  function filterFiles(category) {
    fileRows.forEach(row => {
      const rowType = row.getAttribute('data-type');
      if (category === 'all' || rowType === category) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });
  }

  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      const filter = tag.getAttribute('data-filter');
      filterFiles(filter);
    });
  });

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      const category = item.getAttribute('data-category');
      if (category) {
        // Sincronizar también los botones superiores
        filterTags.forEach(t => {
          t.classList.toggle('active', t.getAttribute('data-filter') === category);
        });
        filterFiles(category);
      }
    });
  });

  // Interacción de descarga de archivos simulada en Files
  fileRows.forEach(row => {
    const actionBtn = row.querySelector('.f-action');
    if (actionBtn) {
      actionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const originalText = actionBtn.textContent;
        if (originalText === '✔ Guardado' || originalText === 'Descargando...') return;

        actionBtn.innerHTML = '<span class="spinner"></span> Descargando...';
        actionBtn.style.color = 'var(--gold)';
        actionBtn.style.textDecoration = 'none';
        
        const downloadPromise = new Promise((resolve) => setTimeout(resolve, 1200));
        handleAsyncOperation(downloadPromise).then(() => {
          actionBtn.textContent = '✔ Guardado';
          actionBtn.style.color = 'var(--green)';
        });
      });
    }
  });

  // 🍪 LÓGICA DE CONSENTIMIENTO DE COOKIES & BANNER (LFPDPPP MÉXICO)
  const cookieBanner = document.getElementById('cookie-consent-banner');
  const btnAccept = document.getElementById('cookie-btn-accept');
  const btnReject = document.getElementById('cookie-btn-reject');
  const fbContainer = document.getElementById('fb-embed-container');

  const FB_IFRAME_HTML = `<iframe src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Fphoto.php%3Ffbid%3D418773897038938%26set%3Da.418773850372276%26type%3D3&show_text=true&width=500" width="100%" height="564" style="border:none;overflow:hidden;border-radius:16px;box-shadow: 0 8px 24px rgba(0,0,0,0.4);" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;

  function loadFacebookWidget() {
    if (fbContainer) {
      fbContainer.innerHTML = FB_IFRAME_HTML;
    }
  }

  function checkCookieConsent() {
    const consent = localStorage.getItem('cookie-consent');
    if (consent === 'accepted') {
      loadFacebookWidget();
    } else if (consent === 'rejected') {
      // No cargar y mantener placeholder
      if (cookieBanner) cookieBanner.classList.add('hidden');
    } else {
      // Mostrar banner si no hay decisión tomada
      if (cookieBanner) {
        setTimeout(() => {
          cookieBanner.classList.remove('hidden');
        }, 1000);
      }
    }
  }

  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      localStorage.setItem('cookie-consent', 'accepted');
      if (cookieBanner) cookieBanner.classList.add('hidden');
      loadFacebookWidget();
    });
  }

  if (btnReject) {
    btnReject.addEventListener('click', () => {
      localStorage.setItem('cookie-consent', 'rejected');
      if (cookieBanner) cookieBanner.classList.add('hidden');
    });
  }

  // Inicializar verificación
  checkCookieConsent();
});
