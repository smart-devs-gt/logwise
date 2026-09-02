export { Logger, logger } from './logger';
export { XmlProcessor, XmlConfig } from './xml';
export { requestLogger, createRequestLogger } from './middleware';
export { LogLevel, OutputFormat, Environment, SupportedLang, LoggerConfig, Transport, LogTransport, HttpStatusCode, ApplicationErrorCode, ErrorContext } from './types';
export { ENV_KEYS, DEFAULTS } from './constants';
export { createCustomLogger } from './factory';

// Contexto de log por request (AsyncLocalStorage). Poblado por @smdv/middleware.
export { runWithLogContext, getLogContext, setLogContext, LogContext } from './context-store';

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
