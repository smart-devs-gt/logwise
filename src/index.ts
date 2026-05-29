export { Logger, logger } from './logger';
export { XmlProcessor, XmlConfig } from './xml';
export { requestLogger, createRequestLogger } from './middleware';
export { LogLevel, OutputFormat, Environment, SupportedLang, LoggerConfig, Transport, LogTransport, HttpStatusCode, ApplicationErrorCode, ErrorContext } from './types';
export { ENV_KEYS, DEFAULTS } from './constants';
export { createCustomLogger } from './factory';

// Messages - Mensajes estándar de respuesta API
export { Messages, getMessage, createMessageHelper, MessageKey, MessagesType } from './messages';
export { translate } from './i18n';

// HTTP - Códigos de estado HTTP
export {
  HTTP_OK,
  HTTP_CREATED,
  HTTP_ACCEPTED,
  HTTP_NO_CONTENT,
  HTTP_MOVED_PERMANENTLY,
  HTTP_FOUND,
  HTTP_NOT_MODIFIED,
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_METHOD_NOT_ALLOWED,
  HTTP_CONFLICT,
  HTTP_UNPROCESSABLE,
  HTTP_UNPROCESSABLE_ENTITY,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_INTERNAL_ERROR,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_IMPLEMENTED,
  HTTP_BAD_GATEWAY,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_GATEWAY_TIMEOUT,
  isSuccessCode,
  isClientError,
  isServerError,
  isErrorCode
} from './http';

// Decorators - Decoradores HTTP estilo NestJS para Express
export {
  // Route decorators
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  registerRoutes,
  registerControllers,
  getControllerPrefix,
  getControllerRoutes,
  RouteMetadata,
  RegisterControllersOptions,
  // Validation decorators
  ValidateBody,
  ValidateParams,
  ValidateQuery,
  Validate,
  configureValidation,
  ValidationDecoratorOptions,
} from './decorators';

// Errors - Clases de error y middleware para Express
export {
  // Error codes
  ERROR_CODES,
  ERROR_MESSAGE_KEYS,
  ErrorCode,
  ErrorMessageKey,
  // Error classes
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
  // Error language config
  setErrorLanguage,
  getErrorLanguage,
  // Error handler middleware
  createErrorHandler,
  handleError,
  asyncHandler,
  notFoundHandler,
  ErrorHandlerOptions,
  ErrorResponse,
  HandledError,
} from './errors';