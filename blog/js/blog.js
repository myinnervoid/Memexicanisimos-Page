/**
 * ==========================================================================
 * Memexicanisimos.com — Controlador del Periódico Digital y Blog (blog.js)
 * Maquetación Periodística con Modulación 3x2, Referencias Editoriales y Cero Videos Incrustados
 * ==========================================================================
 */

let allPosts = [];
let availableDates = [];
let currentDate = '';
let currentCategory = 'all';

const CATEGORY_MAP = {
  farandula: {
    label: '#Farándula',
    tagClass: 'tag-farandula',
    cardClass: 'card-cat-farandula',
    defaultChar: 'Dora el Axolote',
    defaultRole: 'Crónica de Espectáculos',
    defaultImg: 'assets/personajes/plantilla_farandula_dora.jpg'
  },
  tecnologia: {
    label: '#Tecnología',
    tagClass: 'tag-tecnologia',
    cardClass: 'card-cat-tecnologia',
    defaultChar: 'El Mashukita Hacker',
    defaultRole: 'Mesa de Tecnología y Sistemas',
    defaultImg: 'assets/personajes/plantilla_tecnologia_hacker.jpg'
  },
  gaming: {
    label: '#Gaming',
    tagClass: 'tag-gaming',
    cardClass: 'card-cat-gaming',
    defaultChar: 'El Mashukita Gaming',
    defaultRole: 'Mesa de Videojuegos',
    defaultImg: 'assets/personajes/plantilla_gaming_mashukita.jpg'
  },
  noticias: {
    label: '#Noticias',
    tagClass: 'tag-noticias',
    cardClass: 'card-cat-noticias',
    defaultChar: 'El Mashukita',
    defaultRole: 'Mesa Central de Noticias',
    defaultImg: 'assets/personajes/plantilla_noticias_mashukita.jpg'
  },
  cultura: {
    label: '#Cultura',
    tagClass: 'tag-cultura',
    cardClass: 'card-cat-cultura',
    defaultChar: 'Alex y Dora',
    defaultRole: 'Crónica Histórica y Cultural',
    defaultImg: 'assets/personajes/plantilla_cultura_axolotes.jpg'
  }
};

function normalizeText(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getCategoryMeta(categoria) {
  const norm = normalizeText(categoria);
  if (norm.includes('farandula')) return CATEGORY_MAP.farandula;
  if (norm.includes('tecnolog')) return CATEGORY_MAP.tecnologia;
  if (norm.includes('gaming')) return CATEGORY_MAP.gaming;
  if (norm.includes('cultura') || norm.includes('historia')) return CATEGORY_MAP.cultura;
  return CATEGORY_MAP.noticias;
}

function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mes = meses[parseInt(parts[1], 10) - 1] || 'Octubre';
  return `${parts[2]} de ${mes} de ${parts[0]}`;
}

function formatShortDate(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mes = meses[parseInt(parts[1], 10) - 1] || 'Oct';
  return `${parts[2]} ${mes} ${parts[0]}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderArchiveList() {
  const container = document.getElementById('hemeroteca-dates-grid');
  if (!container) return;

  const countsByDate = {};
  allPosts.forEach(p => {
    if (p.fecha && p.titulo) {
      countsByDate[p.fecha] = (countsByDate[p.fecha] || 0) + 1;
    }
  });

  container.innerHTML = availableDates.map(dateStr => {
    const isActive = (dateStr === currentDate);
    const count = countsByDate[dateStr] || 0;
    return `
      <button type="button" data-date="${escapeHtml(dateStr)}" class="hemeroteca-date-btn ${isActive ? 'active' : ''}">
        <span>📅 ${escapeHtml(formatShortDate(dateStr))}</span>
        <span class="hemeroteca-count-badge">${count} notas</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.hemeroteca-date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetDate = btn.getAttribute('data-date');
      if (targetDate) {
        selectDate(targetDate);
        const toolbar = document.querySelector('.press-toolbar');
        if (toolbar) toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function renderModularGrid() {
  const gridEl = document.getElementById('press-grid-3x2');
  const emptyEl = document.getElementById('press-empty-state');
  const datePill = document.getElementById('current-date-pill');
  const metaDate = document.getElementById('press-meta-date');

  if (datePill) {
    datePill.textContent = `📅 ${formatDateDisplay(currentDate)}`;
  }
  if (metaDate) {
    metaDate.textContent = `CANCÚN, Q. ROO · ${formatDateDisplay(currentDate).toUpperCase()}`;
  }

  const postsOfDay = allPosts.filter(p => p.fecha === currentDate && p.titulo);

  let filtered = postsOfDay;
  if (currentCategory !== 'all') {
    filtered = postsOfDay.filter(p => {
      const norm = normalizeText(p.categoria);
      return norm.includes(currentCategory);
    });
  }

  const currentIndex = availableDates.indexOf(currentDate);
  const btnPrev = document.getElementById('btn-prev-day');
  const btnNext = document.getElementById('btn-next-day');
  if (btnPrev) btnPrev.disabled = (currentIndex >= availableDates.length - 1);
  if (btnNext) btnNext.disabled = (currentIndex <= 0);

  if (filtered.length === 0) {
    gridEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  gridEl.innerHTML = filtered.map(post => {
    const meta = getCategoryMeta(post.categoria);
    const rawBody = post.narracion || post.descripcion || '';
    const cleanBody = rawBody.replace(/^Te lo resumo:\s*/i, '').trim();
    const shortSnippet = cleanBody.length > 220 ? cleanBody.slice(0, 217) + '...' : cleanBody;

    const edicionLabel = post.edicion || 'Edición Diaria';
    const charName = post.personaje || meta.defaultChar;
    const charRole = post.personaje_rol || meta.defaultRole;
    const charImg = post.imagen_plantilla || meta.defaultImg;

    const fuentesArr = Array.isArray(post.fuentes) && post.fuentes.length > 0
      ? post.fuentes.map(f => f.nombre).slice(0, 2)
      : ['Google News México · Hemeroteca Oficial'];

    return `
      <article class="press-article-card ${meta.cardClass}" data-id="${escapeHtml(post.id)}">
        <div class="article-header">
          <span class="article-category-tag ${meta.tagClass}">
            ${escapeHtml(meta.label)}
          </span>
          <span class="article-edition-label">
            ${escapeHtml(edicionLabel)}
          </span>
        </div>
        <div class="article-correspondent-row">
          <img src="${escapeHtml(charImg)}" alt="${escapeHtml(charName)}" class="article-correspondent-avatar" width="38" height="38" loading="lazy">
          <div class="article-correspondent-info">
            <span class="article-correspondent-name">${escapeHtml(charName)}</span>
            <span class="article-correspondent-role">${escapeHtml(charRole)}</span>
          </div>
        </div>
        <div class="article-body">
          <h3 class="article-headline" data-open-id="${escapeHtml(post.id)}">${escapeHtml(post.titulo)}</h3>
          <p class="article-teaser">${escapeHtml(shortSnippet)}</p>
          <div class="article-sources-strip">
            <i class="fas fa-book-open"></i> <strong>Referencias:</strong> ${escapeHtml(fuentesArr.join(' · '))}
          </div>
        </div>
        <div class="article-footer">
          <span>
            <i class="far fa-calendar-alt"></i> ${escapeHtml(formatShortDate(post.fecha))}
            ${post.youtube_url ? `<a href="${escapeHtml(post.youtube_url)}" target="_blank" rel="noopener noreferrer" class="card-yt-badge" title="Ver / Escuchar en YouTube" onclick="event.stopPropagation()"><i class="fab fa-youtube"></i></a>` : ''}
          </span>
          <button type="button" class="btn-open-note" data-id="${escapeHtml(post.id)}">
            <i class="fas fa-newspaper"></i> Leer Crónica
          </button>
        </div>
      </article>
    `;
  }).join('');

  gridEl.querySelectorAll('.btn-open-note, .article-headline').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id') || el.getAttribute('data-open-id');
      const post = allPosts.find(p => String(p.id) === String(id));
      if (post) openReaderModal(post);
    });
  });
}

function selectDate(dateStr) {
  if (!availableDates.includes(dateStr)) return;
  currentDate = dateStr;
  renderArchiveList();
  renderModularGrid();
  try {
    window.history.replaceState(null, '', `?date=${dateStr}&cat=${currentCategory}`);
  } catch (e) {}
}

function selectCategory(catSlug) {
  currentCategory = catSlug || 'all';
  const pills = document.querySelectorAll('.hashtag-filters .hashtag-pill');
  pills.forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-cat') === currentCategory);
  });
  renderModularGrid();
}

function formatChronicleParagraphs(rawText) {
  const clean = (rawText || '').trim();
  if (!clean) return '<p>Sin crónica extendida registrada.</p>';

  if (clean.includes('\n\n')) {
    return clean
      .split(/\n{2,}/)
      .map(p => `<p>${escapeHtml(p.trim())}</p>`)
      .join('');
  }

  // Dividir bloques largos en párrafos periodísticos de ~3 oraciones para lectura fluida
  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clean];
  const paragraphs = [];
  let bucket = [];

  sentences.forEach(s => {
    bucket.push(s.trim());
    if (bucket.join(' ').length >= 340) {
      paragraphs.push(bucket.join(' '));
      bucket = [];
    }
  });
  if (bucket.length > 0) {
    paragraphs.push(bucket.join(' '));
  }

  return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
}

function openReaderModal(post) {
  const modal = document.getElementById('press-reader-modal');
  const catEl = document.getElementById('modal-cat-pill');
  const editionEl = document.getElementById('modal-edition-pill');
  const titleEl = document.getElementById('modal-headline');
  const charImgEl = document.getElementById('modal-char-img');
  const charNameEl = document.getElementById('modal-char-name');
  const metaEl = document.getElementById('modal-byline');
  const leadEl = document.getElementById('modal-lead-summary');
  const narracionEl = document.getElementById('modal-content-text');
  const sourcesContainer = document.getElementById('modal-sources-container');

  if (!modal) return;

  const meta = getCategoryMeta(post.categoria);
  if (catEl) {
    catEl.className = `article-category-tag ${meta.tagClass}`;
    catEl.textContent = meta.label;
  }
  if (editionEl) {
    editionEl.textContent = post.edicion || 'Edición Diaria';
  }
  if (titleEl) {
    titleEl.textContent = post.titulo;
  }
  if (charImgEl) {
    charImgEl.src = post.imagen_plantilla || meta.defaultImg;
    charImgEl.alt = post.personaje || meta.defaultChar;
  }
  if (charNameEl) {
    charNameEl.textContent = `${post.personaje || meta.defaultChar} · ${post.personaje_rol || meta.defaultRole}`;
  }
  if (metaEl) {
    const ytModalBtn = post.youtube_url
      ? ` · <a href="${escapeHtml(post.youtube_url)}" target="_blank" rel="noopener noreferrer" class="modal-yt-btn" title="Ver / Escuchar video en YouTube"><i class="fab fa-youtube"></i></a>`
      : '';
    metaEl.innerHTML = `<i class="far fa-calendar-alt"></i> ${escapeHtml(formatDateDisplay(post.fecha))} · Cancún, Q. Roo${ytModalBtn}`;
  }
  if (leadEl) {
    const desc = (post.descripcion || '').replace(/#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g, '').trim();
    if (desc && desc !== post.titulo) {
      leadEl.textContent = desc;
      leadEl.classList.remove('hidden');
    } else {
      leadEl.classList.add('hidden');
    }
  }
  if (narracionEl) {
    narracionEl.innerHTML = formatChronicleParagraphs(post.narracion || post.descripcion);
  }

  if (sourcesContainer) {
    const fuentesList = Array.isArray(post.fuentes) && post.fuentes.length > 0
      ? post.fuentes
      : [{ nombre: 'Google News México · Cobertura Nacional', tipo: 'Agencia / RSS', medio: 'Prensa Nacional' }];

    const itemsHtml = fuentesList.map(f => {
      const url = f.url || (f.link || '');
      const medio = f.medio || f.nombre || 'Prensa Nacional';
      const titular = f.titular || (f.nombre && f.nombre !== medio ? f.nombre : '');
      const tipo = f.tipo || 'Referencia Editorial';

      if (url && url !== '#' && !url.includes('news.google.com/search?q=')) {
        return `
          <li class="reader-source-item">
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="source-link">
              <i class="fas fa-external-link-alt"></i> <strong>${escapeHtml(medio)}</strong>
            </a>
            ${titular ? `<div class="source-headline">“${escapeHtml(titular)}”</div>` : ''}
            <span class="source-type">(${escapeHtml(tipo)})</span>
          </li>
        `;
      }
      return `
        <li class="reader-source-item">
          <strong>${escapeHtml(medio)}</strong>
          ${titular ? `<div class="source-headline">“${escapeHtml(titular)}”</div>` : ''}
          <span class="source-type">(${escapeHtml(tipo)})</span>
        </li>
      `;
    }).join('');

    sourcesContainer.innerHTML = `
      <div class="reader-sources-title">
        <i class="fas fa-landmark"></i> Referencias Documentales y Fuentes Verificables
      </div>
      <ul class="reader-sources-list">
        ${itemsHtml}
      </ul>
    `;
  }

  modal.classList.remove('hidden');
}

function closeReaderModal() {
  const modal = document.getElementById('press-reader-modal');
  if (modal) modal.classList.add('hidden');
}

function initHashtagFilters() {
  const pills = document.querySelectorAll('.hashtag-filters .hashtag-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.getAttribute('data-cat') || 'all';
      selectCategory(cat);
    });
  });

  const medallions = document.querySelectorAll('.cast-medallion[data-cat-jump]');
  medallions.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat-jump') || 'all';
      selectCategory(cat);
      const toolbar = document.querySelector('.press-toolbar');
      if (toolbar) toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initToolbarEvents() {
  const btnPrev = document.getElementById('btn-prev-day');
  const btnNext = document.getElementById('btn-next-day');
  const modalClose = document.getElementById('press-modal-close');
  const modal = document.getElementById('press-reader-modal');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      const idx = availableDates.indexOf(currentDate);
      if (idx < availableDates.length - 1) selectDate(availableDates[idx + 1]);
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const idx = availableDates.indexOf(currentDate);
      if (idx > 0) selectDate(availableDates[idx - 1]);
    });
  }

  if (modalClose) modalClose.addEventListener('click', closeReaderModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeReaderModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeReaderModal();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initHashtagFilters();
  initToolbarEvents();

  if (window.MEMEX_NOTAS && Array.isArray(window.MEMEX_NOTAS) && window.MEMEX_NOTAS.length > 0) {
    allPosts = window.MEMEX_NOTAS;
  } else {
    try {
      const res = await fetch('data/notas.json');
      if (res.ok) allPosts = await res.json();
    } catch (err) {
      console.warn('[BLOG] Fetch local no disponible, usando notas-data.js:', err);
    }
  }

  // Filtro defensivo en cliente: solo notas completas desde 2026-10-01
  allPosts = (allPosts || []).filter(p =>
    p &&
    p.fecha >= '2026-10-01' &&
    p.titulo &&
    p.narracion &&
    String(p.narracion).length >= 200
  );

  if (allPosts.length === 0) {
    const gridEl = document.getElementById('press-grid-3x2');
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="fsm-empty-state" style="grid-column: 1 / -1;">
          <h3>📰 Gaceta en Edición</h3>
          <p>No se encontraron notas cargadas. Verifica que data/notas-data.js esté presente.</p>
        </div>
      `;
    }
    return;
  }

  const dateSet = new Set();
  allPosts.forEach(p => {
    if (p.fecha && p.titulo) dateSet.add(p.fecha);
  });
  availableDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  const urlParams = new URLSearchParams(window.location.search);
  const requestedDate = urlParams.get('date');
  const hashCat = (window.location.hash || '').replace('#', '').trim().toLowerCase();
  const requestedCat = (urlParams.get('cat') || hashCat || '').trim().toLowerCase();
  const requestedId = urlParams.get('id');

  const targetPost = requestedId
    ? allPosts.find(p => String(p.id) === String(requestedId))
    : null;

  if (targetPost && targetPost.fecha && availableDates.includes(targetPost.fecha)) {
    currentDate = targetPost.fecha;
  } else if (requestedDate && availableDates.includes(requestedDate)) {
    currentDate = requestedDate;
  } else {
    currentDate = availableDates[0] || '2026-10-18';
  }

  if (requestedCat && ['noticias', 'tecnologia', 'gaming', 'farandula', 'cultura', 'all'].includes(requestedCat)) {
    currentCategory = requestedCat;
    const matchingPill = document.querySelector(`.hashtag-filters .hashtag-pill[data-cat="${requestedCat}"]`);
    if (matchingPill) {
      document.querySelectorAll('.hashtag-filters .hashtag-pill').forEach(p => p.classList.remove('active'));
      matchingPill.classList.add('active');
    }
  }

  renderArchiveList();
  renderModularGrid();

  if (targetPost) {
    openReaderModal(targetPost);
  }
});
