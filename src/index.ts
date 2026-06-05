export { Logger, logger } from './logger';
export { XmlProcessor, XmlConfig } from './xml';
export { requestLogger, createRequestLogger } from './middleware';
export { LogLevel, OutputFormat, Environment, SupportedLang, LoggerConfig, Transport, LogTransport, HttpStatusCode, ApplicationErrorCode, ErrorContext } from './types';
export { ENV_KEYS, DEFAULTS } from './constants';
export { createCustomLogger } from './factory';

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
