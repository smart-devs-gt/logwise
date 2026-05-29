/**
 * HTTP Module - Códigos de estado HTTP estándar
 * 
 * Provee códigos HTTP como constantes y enums para todos los microservicios
 */

import { HttpStatusCode } from '../types';

/**
 * Constantes HTTP para compatibilidad con código existente
 * Uso: import { HTTP_OK, HTTP_CREATED } from '@smdv/logwise';
 */

// 2xx Success
export const HTTP_OK = HttpStatusCode.OK;
export const HTTP_CREATED = HttpStatusCode.CREATED;
export const HTTP_ACCEPTED = HttpStatusCode.ACCEPTED;
export const HTTP_NO_CONTENT = HttpStatusCode.NO_CONTENT;

// 3xx Redirection
export const HTTP_MOVED_PERMANENTLY = HttpStatusCode.MOVED_PERMANENTLY;
export const HTTP_FOUND = HttpStatusCode.FOUND;
export const HTTP_NOT_MODIFIED = HttpStatusCode.NOT_MODIFIED;

// 4xx Client Error
export const HTTP_BAD_REQUEST = HttpStatusCode.BAD_REQUEST;
export const HTTP_UNAUTHORIZED = HttpStatusCode.UNAUTHORIZED;
export const HTTP_FORBIDDEN = HttpStatusCode.FORBIDDEN;
export const HTTP_NOT_FOUND = HttpStatusCode.NOT_FOUND;
export const HTTP_METHOD_NOT_ALLOWED = HttpStatusCode.METHOD_NOT_ALLOWED;
export const HTTP_CONFLICT = HttpStatusCode.CONFLICT;
export const HTTP_UNPROCESSABLE = HttpStatusCode.UNPROCESSABLE_ENTITY;
export const HTTP_UNPROCESSABLE_ENTITY = HttpStatusCode.UNPROCESSABLE_ENTITY;
export const HTTP_TOO_MANY_REQUESTS = HttpStatusCode.TOO_MANY_REQUESTS;

// 5xx Server Error
export const HTTP_INTERNAL_ERROR = HttpStatusCode.INTERNAL_SERVER_ERROR;
export const HTTP_INTERNAL_SERVER_ERROR = HttpStatusCode.INTERNAL_SERVER_ERROR;
export const HTTP_NOT_IMPLEMENTED = HttpStatusCode.NOT_IMPLEMENTED;
export const HTTP_BAD_GATEWAY = HttpStatusCode.BAD_GATEWAY;
export const HTTP_SERVICE_UNAVAILABLE = HttpStatusCode.SERVICE_UNAVAILABLE;
export const HTTP_GATEWAY_TIMEOUT = HttpStatusCode.GATEWAY_TIMEOUT;

/**
 * Helper para verificar si un código es exitoso (2xx)
 */
export const isSuccessCode = (code: number): boolean => code >= 200 && code < 300;

/**
 * Helper para verificar si un código es error del cliente (4xx)
 */
export const isClientError = (code: number): boolean => code >= 400 && code < 500;

/**
 * Helper para verificar si un código es error del servidor (5xx)
 */
export const isServerError = (code: number): boolean => code >= 500 && code < 600;

/**
 * Helper para verificar si un código es error (4xx o 5xx)
 */
export const isErrorCode = (code: number): boolean => code >= 400;
