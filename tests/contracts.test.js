/**
 * @file contracts.test.js
 * @description Pruebas automatizadas de validación de contratos canónicos de Memexicanisimos.
 */

import { ErrorCode, ErrorCatalog, createApiResponse } from '../contracts/errors.js';

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

console.log('🧪 Ejecutando Suite de Pruebas de Contratos de Memexicanisimos Hub:');

// Test 1: Catálogo de errores inmutable y con estructura canónica
assert(Object.isFrozen(ErrorCode), 'ErrorCode enum debe ser inmutable (Object.isFrozen)');
assert(ErrorCode.CLIPBOARD_WRITE_FAILED === 'CLIPBOARD_WRITE_FAILED', 'Código CLIPBOARD_WRITE_FAILED definido');

// Test 2: Validación de la estructura ApiResponse<T>
const successResp = createApiResponse(true, { item: 'test' });
assert(successResp.success === true, 'ApiResponse éxito retorna success === true');
assert(successResp.data && successResp.data.item === 'test', 'ApiResponse éxito transporta data');
assert(successResp.error_code === null, 'ApiResponse éxito tiene error_code null');
assert(typeof successResp.message === 'string' && successResp.message.length > 0, 'ApiResponse éxito tiene mensaje descriptivo');

// Test 3: Validación de error mapeado con catálogo
const errorResp = createApiResponse(false, null, ErrorCode.CLIPBOARD_WRITE_FAILED);
assert(errorResp.success === false, 'ApiResponse error retorna success === false');
assert(errorResp.error_code === 'CLIPBOARD_WRITE_FAILED', 'ApiResponse error mapea error_code correcto');
assert(errorResp.message.includes('portapapeles'), 'ApiResponse error obtiene mensaje de usuario del catálogo');

console.log(`\n📊 Resumen de pruebas: ${passed} pasadas, ${failed} falladas.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ Todos los contratos pasaron exitosamente.');
}
