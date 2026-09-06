/**
 * @file server.test.js
 * @description Pruebas automatizadas de validación de contratos, resiliencia, suite de 6 fases y motores de diagnóstico & capturas HD (v3.2).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../');
const EDITOR_DIR = path.join(WORKSPACE_DIR, 'Rotulos Web/editor');
const BACKUPS_DIR = path.resolve(__dirname, '../backups');

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

console.log('🧪 Ejecutando Suite de Pruebas Maestro v3.2 (6 Fases + Diagnóstico & Captura HD):');

// ── FASE 1: Producción y Minificación ──
const serverJsPath = path.join(EDITOR_DIR, 'server.js');
const styleMinPath = path.join(EDITOR_DIR, 'public/style.min.css');
const appMinPath = path.join(EDITOR_DIR, 'public/app.min.js');
const envExamplePath = path.join(EDITOR_DIR, '.env.example');

assert(fs.existsSync(serverJsPath), 'server.js existe');
assert(fs.existsSync(styleMinPath) && fs.statSync(styleMinPath).size > 1000, 'style.min.css generado y no vacío');
assert(fs.existsSync(appMinPath) && fs.statSync(appMinPath).size > 1000, 'app.min.js generado y no vacío');
assert(fs.existsSync(envExamplePath), '.env.example presente');

const serverContent = fs.readFileSync(serverJsPath, 'utf-8');
assert(serverContent.includes("require('dotenv').config()"), 'server.js carga dotenv');
assert(serverContent.includes('https.createServer'), 'server.js implementa soporte HTTPS dual');

// ── FASE 2: Resiliencia Offline (Fuentes & SW) ──
const swPath = path.join(EDITOR_DIR, 'public/sw.js');
const fontPath = path.join(EDITOR_DIR, 'public/fonts/SpaceGrotesk.ttf');
assert(fs.existsSync(swPath), 'Service Worker sw.js creado en public/');
assert(fs.existsSync(fontPath), 'Fuente local SpaceGrotesk.ttf descargada en public/fonts/');

// ── FASE 3: Dashboard Ligero de Estadísticas ──
assert(serverContent.includes('/api/stats'), 'Endpoint GET /api/stats implementado en server.js');
const indexHtmlContent = fs.readFileSync(path.join(EDITOR_DIR, 'public/index.html'), 'utf-8');
assert(indexHtmlContent.includes('id="btn-stats"'), 'Botón #btn-stats presente en barra superior');
assert(indexHtmlContent.includes('id="stats-modal"'), 'Modal de estadísticas #stats-modal presente');

// ── FASE 4: Publicación a GitHub ──
assert(serverContent.includes('/api/publish'), 'Endpoint POST /api/publish implementado en server.js');
assert(serverContent.includes('simpleGit'), 'simple-git integrado en server.js');
assert(indexHtmlContent.includes('id="btn-publish"'), 'Botón #btn-publish presente en barra superior');

// ── FASE 5: Sistema Multi-Tema ──
const styleContent = fs.readFileSync(path.join(EDITOR_DIR, 'public/style.css'), 'utf-8');
assert(styleContent.includes('[data-theme="patria"]'), 'Tema Patria definido en style.css');
assert(styleContent.includes('[data-theme="oscuro"]'), 'Tema Oscuro definido en style.css');
assert(styleContent.includes('[data-theme="claro"]'), 'Tema Claro definido en style.css');
assert(indexHtmlContent.includes('id="theme-selector"'), 'Selector de tema #theme-selector presente');

// ── FASE 6: Internacionalización (i18n) ──
const esJsonPath = path.join(EDITOR_DIR, 'locales/es.json');
const enJsonPath = path.join(EDITOR_DIR, 'locales/en.json');
assert(fs.existsSync(esJsonPath), 'Diccionario locales/es.json presente');
assert(fs.existsSync(enJsonPath), 'Diccionario locales/en.json presente');
assert(indexHtmlContent.includes('id="lang-selector"'), 'Selector de idioma #lang-selector presente');
assert(indexHtmlContent.includes('data-i18n'), 'Atributos data-i18n configurados en interfaz');

// ── FASES A & B: Autodiagnóstico E2E, SEO & axe-core ──
const diagPath = path.join(EDITOR_DIR, 'public/diagnostics.js');
const axePath = path.join(EDITOR_DIR, 'public/vendor/axe.min.js');
assert(fs.existsSync(diagPath), 'Módulo frontend diagnostics.js presente');
assert(fs.existsSync(axePath), 'Bundle local de axe-core axe.min.js presente');
assert(indexHtmlContent.includes('id="btn-diagnostics"'), 'Botón #btn-diagnostics presente en interfaz');
assert(indexHtmlContent.includes('id="diag-modal"'), 'Modal #diag-modal presente con pestañas de salud');

// ── FASE C: Render & Captura HD con Chrome Local (puppeteer-core) ──
assert(serverContent.includes('/api/screenshot'), 'Endpoint POST /api/screenshot implementado en server.js');
assert(serverContent.includes('findSystemChrome'), 'Función de detección automática de Chrome local implementada');
assert(serverContent.includes('puppeteer-core'), 'puppeteer-core integrado en backend');
assert(indexHtmlContent.includes('id="btn-screenshot"'), 'Botón #btn-screenshot presente en barra superior');
assert(indexHtmlContent.includes('id="screenshot-modal"'), 'Modal #screenshot-modal presente');

// ── CONTRATOS Y RESPALDOS ──
assert(serverContent.includes('createApiResponse'), 'Contrato canónico ApiResponse presente');
assert(fs.existsSync(BACKUPS_DIR), 'Directorio de respaldos accesible');

// ── SCRIPT UNIFICADO DE CONTROL (editor.sh) ──
const editorShPath = path.join(WORKSPACE_DIR, 'Rotulos Web/editor.sh');
assert(fs.existsSync(editorShPath), 'Script unificado editor.sh existe en Rotulos Web/');
const editorShContent = fs.readFileSync(editorShPath, 'utf-8');
assert(editorShContent.includes('restart)'), 'editor.sh implementa comando restart');
assert(editorShContent.includes('status)'), 'editor.sh implementa comando status');

console.log(`\n📊 Resumen de pruebas: ${passed} pasadas, ${failed} falladas.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ Todas las pruebas de las 6 fases y motores A/B/C pasaron exitosamente al 100%.');
}
