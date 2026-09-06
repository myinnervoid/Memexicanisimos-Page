/**
 * @file errors.js
 * @description Catálogo canónico de errores para el ecosistema Memexicanisimos.
 * Estandarización obligatoria v3.1.
 */

export const ErrorCode = Object.freeze({
  // Errores de Portapapeles e Interacción
  CLIPBOARD_WRITE_FAILED: 'CLIPBOARD_WRITE_FAILED',
  CLIPBOARD_PERMISSION_DENIED: 'CLIPBOARD_PERMISSION_DENIED',

  // Errores de Almacenamiento Local y Preferencias
  STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
  INVALID_STORAGE_VERSION: 'INVALID_STORAGE_VERSION',

  // Errores de UI y Filtros
  FILTER_NO_MATCH: 'FILTER_NO_MATCH',
  COMPONENT_STATE_INVALID: 'COMPONENT_STATE_INVALID',

  // Errores de Red y Servicios Externos
  EXTERNAL_FEED_BLOCKED: 'EXTERNAL_FEED_BLOCKED',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE'
});

export const ErrorCatalog = Object.freeze({
  [ErrorCode.CLIPBOARD_WRITE_FAILED]: {
    code: ErrorCode.CLIPBOARD_WRITE_FAILED,
    userMessage: 'No fue posible copiar el texto al portapapeles. Intenta seleccionarlo manualmente.',
    severity: 'Menor'
  },
  [ErrorCode.CLIPBOARD_PERMISSION_DENIED]: {
    code: ErrorCode.CLIPBOARD_PERMISSION_DENIED,
    userMessage: 'El navegador bloqueó el permiso para acceder al portapapeles.',
    severity: 'Mayor'
  },
  [ErrorCode.STORAGE_WRITE_FAILED]: {
    code: ErrorCode.STORAGE_WRITE_FAILED,
    userMessage: 'No se pudieron guardar tus preferencias en el almacenamiento local.',
    severity: 'Menor'
  },
  [ErrorCode.FILTER_NO_MATCH]: {
    code: ErrorCode.FILTER_NO_MATCH,
    userMessage: 'No se encontraron elementos que coincidan con tu búsqueda.',
    severity: 'Menor'
  },
  [ErrorCode.EXTERNAL_FEED_BLOCKED]: {
    code: ErrorCode.EXTERNAL_FEED_BLOCKED,
    userMessage: 'El feed social fue bloqueado por tu navegador o extensión de privacidad.',
    severity: 'Menor'
  },
  [ErrorCode.CONSENT_REQUIRED]: {
    code: ErrorCode.CONSENT_REQUIRED,
    userMessage: 'Se requiere consentimiento de cookies para cargar el contenido de terceros.',
    severity: 'Menor'
  }
});

/**
 * Genera una respuesta estándar tipo ApiResponse<T>
 * @template T
 * @param {boolean} success
 * @param {T|null} data
 * @param {string|null} errorCode
 * @param {string} message
 * @returns {{ success: boolean, data: T|null, error_code: string|null, message: string }}
 */
export function createApiResponse(success, data = null, errorCode = null, message = '') {
  return {
    success: Boolean(success),
    data: data,
    error_code: errorCode,
    message: message || (errorCode && ErrorCatalog[errorCode] ? ErrorCatalog[errorCode].userMessage : (success ? 'Operación exitosa' : 'Error desconocido'))
  };
}
