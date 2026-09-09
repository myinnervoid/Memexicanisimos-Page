/**
 * @file app.test.js
 * @description Pruebas automatizadas de la lógica frontend de app.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appJsCode = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✖ FAIL: ${message}`);
  }
}

console.log('🧪 Ejecutando Pruebas de App:');

let elements = {};
let queries = {};
let listeners = {};
let windowListeners = {};
let documentListeners = {};

let mockDocument = {
  startViewTransition: (cb) => { cb(); },
  addEventListener: (event, callback) => {
    documentListeners[event] = documentListeners[event] || [];
    documentListeners[event].push(callback);
    if (event === 'DOMContentLoaded') {
      global.triggerDOMContentLoaded = callback;
    }
  },
  querySelectorAll: (selector) => {
    return queries[selector] || [];
  },
  querySelector: (selector) => {
    return queries[selector] ? queries[selector][0] : null;
  },
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = {
        id,
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); },
          toggle(c, condition) {
            if (condition !== undefined) {
              if (condition) this.add(c); else this.remove(c);
            } else {
              if (this.contains(c)) this.remove(c); else this.add(c);
            }
          }
        },
        addEventListener: (e, cb) => {
            listeners[id] = listeners[id] || {};
            listeners[id][e] = listeners[id][e] || [];
            listeners[id][e].push(cb);
        },
        style: {},
        children: [],
        appendChild(child) { this.children.push(child); },
        innerHTML: '',
        parentNode: { appendChild: () => {} },
        setAttribute: (k, v) => { elements[id].attrs = elements[id].attrs || {}; elements[id].attrs[k] = v; },
        getAttribute: (k) => { return (elements[id].attrs || {})[k] || null; },
        textContent: '',
        querySelector: () => null,
        getBoundingClientRect: () => ({ top: 100 }),
        disabled: false
      };
    }
    return elements[id];
  },
  createElement: (tag) => {
    return { tag, style: {}, setAttribute: () => {}, classList: { add:()=>{}, remove:()=>{} }, parentNode: { appendChild: ()=>{} }, onerror: null };
  },
  activeElement: null
};

let mockWindow = {
  location: { hash: '' },
  addEventListener: (e, cb) => {
    windowListeners[e] = windowListeners[e] || [];
    windowListeners[e].push(cb);
  },
  scrollTo: () => {},
  scrollY: 0
};

let mockLocalStorage = {
  getItem: () => null,
  setItem: () => {}
};

let mockNavigator = {
  clipboard: {}
};

global.document = mockDocument;
global.window = mockWindow;
global.localStorage = mockLocalStorage;
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

let timeoutCallbacks = [];
global.setTimeout = (cb, time) => { timeoutCallbacks.push(cb); };
let intervalCallbacks = [];
global.setInterval = (cb, time) => { intervalCallbacks.push(cb); return 1; }; // dummy interval id
global.clearInterval = () => {};

let consoleWarns = [];
console.warn = (...args) => { consoleWarns.push(args); };

// Ejecutar app.js en este contexto para capturar global.triggerDOMContentLoaded
// Transformar static imports a dynamic imports top-level (en una función async IIFE)
const modifiedCode = appJsCode.replace(
  /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"];?/g,
  "const { $1 } = await import('../' + '$2');"
);

(async () => {
  await eval(`(async () => { ${modifiedCode} })()`);

function resetState() {
  elements = {};
  queries = {};
  listeners = {};
  windowListeners = {};
  documentListeners = {};
  timeoutCallbacks = [];
  intervalCallbacks = [];
  consoleWarns = [];
  mockLocalStorage.getItem = () => null;
  mockWindow.location.hash = '';
}

function createElementMock(id, className) {
    const el = mockDocument.getElementById(id);
    el.className = className;
    el.classList.add(className);
    return el;
}

// ---------------------------------------------------------
// CheckCookieConsent tests
// ---------------------------------------------------------
console.log('\n--- initPrivacyConsent ---');
resetState();
mockLocalStorage.getItem = () => 'accepted';
global.triggerDOMContentLoaded();

let fbContainer = elements['fb-embed-container'];
let welcomeModal = elements['welcome-modal-overlay'];

assert(fbContainer && fbContainer.children.length > 0, 'Widget de Facebook se renderiza cuando el consentimiento es "accepted"');
assert(welcomeModal && welcomeModal.classList.contains('hidden'), 'Modal de bienvenida se oculta cuando el consentimiento es "accepted"');

resetState();
mockLocalStorage.getItem = () => 'rejected';
global.triggerDOMContentLoaded();

fbContainer = elements['fb-embed-container'];
welcomeModal = elements['welcome-modal-overlay'];
assert((!fbContainer || fbContainer.children.length === 0), 'Widget de Facebook no se renderiza cuando el consentimiento es "rejected"');
assert(welcomeModal && welcomeModal.classList.contains('hidden'), 'Modal de bienvenida se oculta cuando el consentimiento es "rejected"');

resetState();
mockLocalStorage.getItem = () => null;
global.triggerDOMContentLoaded();

fbContainer = elements['fb-embed-container'];
welcomeModal = elements['welcome-modal-overlay'];
assert((!fbContainer || fbContainer.children.length === 0), 'Widget de Facebook no se renderiza cuando no hay decisión');
assert(welcomeModal && !welcomeModal.classList.contains('hidden'), 'Modal de bienvenida NO se oculta inmediatamente cuando no hay decisión');
assert(timeoutCallbacks.length > 0, 'Se encola la apertura del modal con setTimeout cuando no hay decisión');

timeoutCallbacks[0]();
assert(welcomeModal && !welcomeModal.classList.contains('hidden'), 'Modal de bienvenida se muestra tras el timeout');


resetState();
mockLocalStorage.getItem = () => { throw new Error('Simulated exception'); };
global.triggerDOMContentLoaded();

assert(consoleWarns.length > 0, 'Captura excepción y advierte sobre LocalStorage no disponible');
assert(consoleWarns[0][0].includes('LocalStorage no disponible'), 'Mensaje de advertencia correcto emitido');

// ---------------------------------------------------------
// initTabsNavigation tests
// ---------------------------------------------------------
console.log('\n--- initTabsNavigation ---');
resetState();

let tab1 = createElementMock('tab1', 'tab-button');
tab1.setAttribute('data-target', 'section1');
let tab2 = createElementMock('tab2', 'tab-button');
tab2.setAttribute('data-target', 'section2');

let section1 = createElementMock('section1', 'product-section');
let section2 = createElementMock('section2', 'product-section');

let tabsContainer = createElementMock('tabsContainer', 'tabs-container');

queries['.tab-button'] = [tab1, tab2];
queries['.product-section'] = [section1, section2];
queries['.tabs-container'] = [tabsContainer];
queries['a[href^="#"]'] = [];

global.triggerDOMContentLoaded();

// Click tab2
if (listeners['tab2'] && listeners['tab2']['click']) {
  listeners['tab2']['click'][0]();
}

assert(tab2.classList.contains('active'), 'Tab 2 becomes active on click');
assert(!tab1.classList.contains('active'), 'Tab 1 is deactivated');
assert(section2.classList.contains('active'), 'Section 2 becomes active on click');
assert(!section1.classList.contains('active'), 'Section 1 is deactivated');

// Hash navigation
mockWindow.location.hash = '#section1';
if (windowListeners['hashchange']) {
  windowListeners['hashchange'][0]();
}

assert(tab1.classList.contains('active'), 'Tab 1 becomes active on hashchange');
assert(section1.classList.contains('active'), 'Section 1 becomes active on hashchange');


// ---------------------------------------------------------
// initBurnerConsoleFSM tests
// ---------------------------------------------------------
console.log('\n--- initBurnerConsoleFSM ---');
resetState();

let consoleBody = createElementMock('burner-console-body', '');
let btnRunConsole = createElementMock('btn-run-console', '');
let btnResetConsole = createElementMock('btn-reset-console', '');

let progressBarMock = {
    setAttribute: (k, v) => { progressBarMock[k] = v; },
    textContent: ''
};

consoleBody.querySelector = (selector) => {
    if (selector === '.progress-bar') return progressBarMock;
    return null;
};

global.triggerDOMContentLoaded();

assert(btnRunConsole.disabled === true, 'Run button should be disabled when processing');

// Simulate the interval
if (intervalCallbacks.length > 0) {
    for (let i = 0; i < 20; i++) {
        intervalCallbacks[0]();
    }
}
assert(progressBarMock['data-progress'] >= 100, 'Progress bar reached 100');
assert(btnRunConsole.disabled === false, 'Run button is enabled again after completion');


// ---------------------------------------------------------
// initFileExplorerFSM tests
// ---------------------------------------------------------
console.log('\n--- initFileExplorerFSM ---');
resetState();

let tag1 = createElementMock('tag1', 'filter-tag');
tag1.setAttribute('data-filter', 'docs');
let row1 = createElementMock('row1', 'file-row');
row1.setAttribute('data-type', 'docs');
let row2 = createElementMock('row2', 'file-row');
row2.setAttribute('data-type', 'images');

queries['.filter-tag'] = [tag1];
queries['.file-row'] = [row1, row2];
queries['.sidebar-item'] = [];

let explorerFilesList = createElementMock('explorer-files-list', '');

global.triggerDOMContentLoaded();

if (listeners['tag1'] && listeners['tag1']['click']) {
  listeners['tag1']['click'][0]();
}

assert(row1.style.display === 'flex', 'Matching row is visible');
assert(row2.style.display === 'none', 'Non-matching row is hidden');


// ---------------------------------------------------------
// initShortcutSearchFSM tests
// ---------------------------------------------------------
console.log('\n--- initShortcutSearchFSM ---');
resetState();

let shortcutSearch = createElementMock('shortcut-search', '');
let shortcutsGrid = createElementMock('shortcuts-grid', '');
let card1 = createElementMock('card1', 'short-card');
card1.textContent = 'Copiar';
card1.setAttribute('data-shortcut', 'ctrl c');
let card2 = createElementMock('card2', 'short-card');
card2.textContent = 'Pegar';
card2.setAttribute('data-shortcut', 'ctrl v');

queries['.short-card'] = [card1, card2];

global.triggerDOMContentLoaded();

if (listeners['shortcut-search'] && listeners['shortcut-search']['input']) {
  listeners['shortcut-search']['input'][0]({ target: { value: 'copi' } });
}

assert(card1.style.display === 'flex', 'Card 1 is visible on matching search');
assert(card2.style.display === 'none', 'Card 2 is hidden on non-matching search');


console.log(`\n📊 Resumen de pruebas (app.js): ${passed} pasadas, ${failed} falladas.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ Todas las pruebas de app.js pasaron exitosamente.');
}
})();
