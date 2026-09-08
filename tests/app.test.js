/**
 * @file app.test.js
 * @description Pruebas automatizadas de la lógica frontend de app.js, específicamente checkCookieConsent.
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

console.log('🧪 Ejecutando Pruebas de App (checkCookieConsent):');

let elements = {};
let mockDocument = {
  addEventListener: (event, callback) => {
    if (event === 'DOMContentLoaded') {
      global.triggerDOMContentLoaded = callback;
    }
  },
  querySelectorAll: () => [],
  querySelector: () => null,
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = {
        id,
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        },
        addEventListener: () => {},
        style: {},
        children: [],
        appendChild(child) { this.children.push(child); },
        innerHTML: '',
        parentNode: { appendChild: () => {} },
        setAttribute: () => {},
        textContent: '',
        querySelector: () => null // Added for progress-bar
      };
    }
    return elements[id];
  },
  createElement: (tag) => {
    return { tag, style: {}, setAttribute: () => {}, classList: { add:()=>{} }, parentNode: { appendChild: ()=>{} }, onerror: null };
  }
};

let mockWindow = {
  location: { hash: '' },
  addEventListener: () => {},
  scrollTo: () => {}
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
global.setInterval = (cb, time) => { return 1; }; // dummy interval id
global.clearInterval = () => {};

let consoleWarns = [];
console.warn = (...args) => { consoleWarns.push(args); };

// Ejecutar app.js en este contexto para capturar global.triggerDOMContentLoaded
eval(appJsCode);

function resetState() {
  elements = {};
  timeoutCallbacks = [];
  consoleWarns = [];
  mockLocalStorage.getItem = () => null;
}

// Scenario 1: consent = 'accepted'
resetState();
mockLocalStorage.getItem = () => 'accepted';
global.triggerDOMContentLoaded();

let fbContainer = elements['fb-embed-container'];
let welcomeModal = elements['welcome-modal-overlay'];

assert(fbContainer && fbContainer.children.length > 0, 'Widget de Facebook se renderiza cuando el consentimiento es "accepted"');
assert(welcomeModal && welcomeModal.classList.contains('hidden'), 'Modal de bienvenida se oculta cuando el consentimiento es "accepted"');

// Scenario 2: consent = 'rejected'
resetState();
mockLocalStorage.getItem = () => 'rejected';
global.triggerDOMContentLoaded();

fbContainer = elements['fb-embed-container'];
welcomeModal = elements['welcome-modal-overlay'];
assert((!fbContainer || fbContainer.children.length === 0), 'Widget de Facebook no se renderiza cuando el consentimiento es "rejected"');
assert(welcomeModal && welcomeModal.classList.contains('hidden'), 'Modal de bienvenida se oculta cuando el consentimiento es "rejected"');


// Scenario 3: consent = null (pending)
resetState();
mockLocalStorage.getItem = () => null;
global.triggerDOMContentLoaded();

fbContainer = elements['fb-embed-container'];
welcomeModal = elements['welcome-modal-overlay'];
assert((!fbContainer || fbContainer.children.length === 0), 'Widget de Facebook no se renderiza cuando no hay decisión');
assert(welcomeModal && !welcomeModal.classList.contains('hidden'), 'Modal de bienvenida NO se oculta inmediatamente cuando no hay decisión');
assert(timeoutCallbacks.length > 0, 'Se encola la apertura del modal con setTimeout cuando no hay decisión');

// Simular el paso del tiempo para setTimeout
timeoutCallbacks[0]();
assert(welcomeModal && !welcomeModal.classList.contains('hidden'), 'Modal de bienvenida se muestra tras el timeout');


// Scenario 4: localStorage throws exception
resetState();
mockLocalStorage.getItem = () => { throw new Error('Simulated exception'); };
global.triggerDOMContentLoaded();

assert(consoleWarns.length > 0, 'Captura excepción y advierte sobre LocalStorage no disponible');
assert(consoleWarns[0][0].includes('LocalStorage no disponible'), 'Mensaje de advertencia correcto emitido');


console.log(`\n📊 Resumen de pruebas (app.js): ${passed} pasadas, ${failed} falladas.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ Todas las pruebas de app.js pasaron exitosamente.');
}
