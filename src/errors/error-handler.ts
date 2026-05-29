/**
 * Error Handler Middleware Factory
 * Middleware global para manejo de errores en Express
 * 
 * - Siempre loggea el error real (para debugging)
 * - Devuelve mensaje estándar al usuario (nunca expone detalles internos)
 * - HTTP codes y mensajes estandarizados
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logger';
import { HttpStatusCode } from '../types';
import { getMessage } from '../messages';
import { SupportedLang } from '../types';
import { ApiError } from './api-errors';

/**
 * Opciones de configuración para el error handler
 */
export interface ErrorHandlerOptions {
  /** Logger personalizado */
  logger?: Logger;
  /** Idioma para mensajes de error (default: 'es') */
  lang?: SupportedLang;
  /** Incluir stack trace en desarrollo (default: true) */
  includeStackInDev?: boolean;
  /** Nombre del ambiente de desarrollo (default: 'development') */
  devEnvironment?: string;
  /** Callback opcional cuando ocurre un error */
  onError?: (error: Error, req: Request) => void;
}

/**
 * Respuesta de error estandarizada
 */
export interface ErrorResponse {
  success: false;
  message: string;
  errors: any;
  code?: string;
  stack?: string;
}

// Logger por defecto
const defaultLogger = new Logger({ service: 'error-handler' });

/**
 * Obtiene el mensaje estándar según el status code
 */
function getStandardMessage(statusCode: HttpStatusCode, lang: SupportedLang): string {
  const messageMap: Record<number, string> = {
    [HttpStatusCode.BAD_REQUEST]: getMessage(lang, 'BAD_REQUEST'),
    [HttpStatusCode.UNAUTHORIZED]: getMessage(lang, 'AUTH_UNAUTHORIZED'),
    [HttpStatusCode.FORBIDDEN]: getMessage(lang, 'AUTH_FORBIDDEN'),
    [HttpStatusCode.NOT_FOUND]: getMessage(lang, 'NOT_FOUND'),
    [HttpStatusCode.CONFLICT]: getMessage(lang, 'CONFLICT'),
    [HttpStatusCode.UNPROCESSABLE_ENTITY]: getMessage(lang, 'UNPROCESSABLE_ENTITY'),
    [HttpStatusCode.TOO_MANY_REQUESTS]: getMessage(lang, 'RATE_LIMIT_EXCEEDED'),
    [HttpStatusCode.INTERNAL_SERVER_ERROR]: getMessage(lang, 'SERVER_ERROR'),
    [HttpStatusCode.BAD_GATEWAY]: getMessage(lang, 'SERVICE_UNAVAILABLE'),
    [HttpStatusCode.SERVICE_UNAVAILABLE]: getMessage(lang, 'SERVICE_UNAVAILABLE'),
    [HttpStatusCode.GATEWAY_TIMEOUT]: getMessage(lang, 'TIMEOUT_ERROR'),
  };

  return messageMap[statusCode] || getMessage(lang, 'ERROR');
}

/**
 * Determina el status code según el tipo de error
 */
function getStatusCode(error: Error): HttpStatusCode {
  // Si es un ApiError, usar su statusCode
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  // Errores de MongoDB
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    // Duplicate key error
    if ((error as any).code === 11000) {
      return HttpStatusCode.CONFLICT;
    }
    return HttpStatusCode.INTERNAL_SERVER_ERROR;
  }

  // Errores de validación de Mongoose
  if (error.name === 'ValidationError') {
    return HttpStatusCode.BAD_REQUEST;
  }

  // Errores de Cast de Mongoose (ID inválido)
  if (error.name === 'CastError') {
    return HttpStatusCode.BAD_REQUEST;
  }

  // Errores de JWT
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return HttpStatusCode.UNAUTHORIZED;
  }

  // Error por defecto
  return HttpStatusCode.INTERNAL_SERVER_ERROR;
}

/**
 * Extrae errores de validación si existen
 */
function extractValidationErrors(error: Error): any {
  // ApiError con errors
  if (error instanceof ApiError && error.errors) {
    return error.errors;
  }

  // Errores de Mongoose ValidationError
  if (error.name === 'ValidationError' && (error as any).errors) {
    const mongooseErrors: Record<string, string[]> = {};
    for (const [field, err] of Object.entries((error as any).errors)) {
      mongooseErrors[field] = [(err as any).message];
    }
    return Object.keys(mongooseErrors).length > 0 ? mongooseErrors : null;
  }

  // Errores de MongoDB duplicate key
  if ((error as any).code === 11000 && (error as any).keyValue) {
    return { duplicateKey: Object.keys((error as any).keyValue) };
  }

  return null;
}

/**
 * Crea el middleware de manejo de errores
 * 
 * @example
 * import { createErrorHandler } from '@smdv/logwise';
 * 
 * // Uso básico
 * app.use(createErrorHandler());
 * 
 * // Con opciones
 * app.use(createErrorHandler({
 *   logger: customLogger,
 *   lang: SupportedLang.EN,
 *   onError: (err, req) => {
 *     // Enviar a sistema de monitoreo
 *   }
 * }));
 */
export function createErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    logger = defaultLogger,
    lang = SupportedLang.ES,
    includeStackInDev = true,
    devEnvironment = 'development',
    onError,
  } = options;

  const isDevelopment = process.env.NODE_ENV === devEnvironment;

  return (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ): Response => {
    // 1. SIEMPRE loggear el error real (para debugging)
    const logContext = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      errorName: error.name,
      errorCode: error instanceof ApiError ? error.code : undefined,
      stack: error.stack,
    };

    // Loggear según severidad
    const statusCode = getStatusCode(error);
    if (statusCode >= 500) {
      logger.error(`[${statusCode}] ${error.message}`, logContext);
    } else {
      logger.warn(`[${statusCode}] ${error.message}`, logContext);
    }

    // 2. Callback opcional (métricas, alertas, etc.)
    if (onError) {
      try {
        onError(error, req);
      } catch (callbackError) {
        logger.error('Error en callback onError', { error: callbackError });
      }
    }

    // 3. Construir respuesta estandarizada
    const isOperational = error instanceof ApiError ? error.isOperational : false;
    
    // Para errores operacionales (esperados), usar el mensaje del error
    // Para errores no operacionales (bugs), usar mensaje genérico
    const userMessage = isOperational
      ? error.message
      : getStandardMessage(statusCode, lang);

    const response: ErrorResponse = {
      success: false,
      message: userMessage,
      errors: extractValidationErrors(error),
      code: error instanceof ApiError ? error.code : undefined,
    };

    // Solo incluir stack en desarrollo si está habilitado
    if (isDevelopment && includeStackInDev) {
      response.stack = error.stack;
    }

    // 4. Devolver respuesta con HTTP code estándar
    return res.status(statusCode).json(response);
  };
}

/**
 * Wrapper para async handlers (evita try/catch en cada controller)
 * 
 * @example
 * import { asyncHandler } from '@smdv/logwise';
 * 
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.findAll();
 *   res.json(users);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware para rutas no encontradas
 * 
 * @example
 * import { notFoundHandler } from '@smdv/logwise';
 * 
 * // Al final de todas las rutas
 * app.use(notFoundHandler());
 */
export function notFoundHandler(options: { lang?: SupportedLang } = {}) {
  const { lang = SupportedLang.ES } = options;

  return (req: Request, _res: Response, next: NextFunction) => {
    const error = new ApiError(
      getMessage(lang, 'NOT_FOUND'),
      HttpStatusCode.NOT_FOUND,
      { path: req.originalUrl },
      'ROUTE_NOT_FOUND'
    );
    next(error);
  };
}
