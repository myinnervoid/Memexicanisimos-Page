import { ErrorCode, createApiResponse } from '../contracts/errors.js';

describe('Contracts', () => {
  test('should pass all contract tests', () => {
    function assert(condition, message) { expect(condition).toBeTruthy(); if (!condition) console.error(message); }

    assert(Object.isFrozen(ErrorCode), 'ErrorCode enum debe ser inmutable (Object.isFrozen)');
    assert(ErrorCode.CLIPBOARD_WRITE_FAILED === 'CLIPBOARD_WRITE_FAILED', 'Código CLIPBOARD_WRITE_FAILED definido');

    const successResp = createApiResponse(true, { item: 'test' });
    assert(successResp.success === true, 'ApiResponse éxito retorna success === true');
    assert(successResp.data && successResp.data.item === 'test', 'ApiResponse éxito transporta data');
    assert(successResp.error_code === null, 'ApiResponse éxito tiene error_code null');
    assert(typeof successResp.message === 'string' && successResp.message.length > 0, 'ApiResponse éxito tiene mensaje descriptivo');

    const errorResp = createApiResponse(false, null, ErrorCode.CLIPBOARD_WRITE_FAILED);
    assert(errorResp.success === false, 'ApiResponse error retorna success === false');
    assert(errorResp.error_code === 'CLIPBOARD_WRITE_FAILED', 'ApiResponse error mapea error_code correcto');
    assert(errorResp.message.includes('portapapeles'), 'ApiResponse error obtiene mensaje de usuario del catálogo');
  });
});
