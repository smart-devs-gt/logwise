/**
 * Clases de Error personalizadas para APIs
 * Errores tipados con HTTP status codes y mensajes estandarizados
 */

import { HttpStatusCode, SupportedLang } from '../types';
import { getMessage } from '../messages';
import { ERROR_CODES, ERROR_MESSAGE_KEYS, ErrorCode } from './error-codes';

// Idioma por defecto para mensajes de error
let defaultLang: SupportedLang = SupportedLang.ES;

/**
 * Configura el idioma por defecto para los mensajes de error
 */
export function setErrorLanguage(lang: SupportedLang): void {
  defaultLang = lang;
}

/**
 * Obtiene el idioma actual para mensajes de error
 */
export function getErrorLanguage(): SupportedLang {
  return defaultLang;
}

/**
 * Error base para APIs
 */
export class ApiError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly isOperational: boolean;
  public readonly errors: any;
  public readonly code: ErrorCode;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
    errors: any = null,
    code: ErrorCode = ERROR_CODES.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    this.code = code;

    // Captura el stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error de validación (400)
 */
export class ValidationError extends ApiError {
  constructor(message?: string, errors: any = null) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.VALIDATION_ERROR);
    super(msg, HttpStatusCode.BAD_REQUEST, errors, ERROR_CODES.VALIDATION_ERROR);
    this.name = 'ValidationError';
  }
}

/**
 * Error de recurso no encontrado (404)
 */
export class NotFoundError extends ApiError {
  constructor(message?: string, resource?: string) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.NOT_FOUND);
    super(
      msg,
      HttpStatusCode.NOT_FOUND,
      resource ? { resource } : null,
      ERROR_CODES.NOT_FOUND
    );
    this.name = 'NotFoundError';
  }
}

/**
 * Error de autenticación (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message?: string) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.UNAUTHORIZED);
    super(msg, HttpStatusCode.UNAUTHORIZED, null, ERROR_CODES.UNAUTHORIZED);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error de permisos (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message?: string) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.FORBIDDEN);
    super(msg, HttpStatusCode.FORBIDDEN, null, ERROR_CODES.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error de conflicto (409)
 */
export class ConflictError extends ApiError {
  constructor(message?: string, errors: any = null) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.CONFLICT);
    super(msg, HttpStatusCode.CONFLICT, errors, ERROR_CODES.CONFLICT);
    this.name = 'ConflictError';
  }
}

/**
 * Error de entidad no procesable (422)
 */
export class UnprocessableEntityError extends ApiError {
  constructor(message?: string, errors: any = null) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.UNPROCESSABLE);
    super(msg, HttpStatusCode.UNPROCESSABLE_ENTITY, errors, ERROR_CODES.UNPROCESSABLE_ENTITY);
    this.name = 'UnprocessableEntityError';
  }
}

/**
 * Error de rate limit (429)
 */
export class TooManyRequestsError extends ApiError {
  constructor(message?: string, retryAfter?: number) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.RATE_LIMIT);
    super(
      msg,
      HttpStatusCode.TOO_MANY_REQUESTS,
      retryAfter ? { retryAfter } : null,
      ERROR_CODES.TOO_MANY_REQUESTS
    );
    this.name = 'TooManyRequestsError';
  }
}

/**
 * Error interno del servidor (500)
 */
export class InternalServerError extends ApiError {
  constructor(message?: string) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.SERVER_ERROR);
    super(msg, HttpStatusCode.INTERNAL_SERVER_ERROR, null, ERROR_CODES.INTERNAL_SERVER_ERROR, false);
    this.name = 'InternalServerError';
  }
}

/**
 * Error de servicio no disponible (503)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message?: string) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.SERVICE_UNAVAILABLE);
    super(msg, HttpStatusCode.SERVICE_UNAVAILABLE, null, ERROR_CODES.SERVICE_UNAVAILABLE, false);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Error de base de datos
 */
export class DatabaseError extends ApiError {
  constructor(message?: string) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.DB_ERROR);
    super(msg, HttpStatusCode.INTERNAL_SERVER_ERROR, null, ERROR_CODES.DATABASE_ERROR, false);
    this.name = 'DatabaseError';
  }
}

/**
 * Error de servicio externo
 */
export class ExternalServiceError extends ApiError {
  constructor(message?: string, service?: string) {
    const msg = message || getMessage(defaultLang, ERROR_MESSAGE_KEYS.EXT_SERVICE_ERROR);
    super(
      msg,
      HttpStatusCode.BAD_GATEWAY,
      service ? { service } : null,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      false
    );
    this.name = 'ExternalServiceError';
  }
}
