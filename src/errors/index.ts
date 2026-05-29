/**
 * Módulo de Errores - Clases de error y middleware para Express
 * 
 * @example
 * import { 
 *   createErrorHandler, 
 *   ApiError, 
 *   ValidationError,
 *   NotFoundError,
 *   asyncHandler,
 *   notFoundHandler,
 *   ERROR_CODES,
 *   setErrorLanguage,
 * } from '@smdv/logwise';
 */

// Códigos de error
export { ERROR_CODES, ERROR_MESSAGE_KEYS, ErrorCode, ErrorMessageKey } from './error-codes';

// Clases de error
export {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnprocessableEntityError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
  setErrorLanguage,
  getErrorLanguage,
} from './api-errors';

// Error handler middleware
export {
  createErrorHandler,
  handleError,
  asyncHandler,
  notFoundHandler,
  ErrorHandlerOptions,
  ErrorResponse,
  HandledError,
} from './error-handler';
