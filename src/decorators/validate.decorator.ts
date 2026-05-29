/**
 * Decoradores de Validación para Controllers
 * Usa class-validator y class-transformer
 * 
 * @example
 * import { ValidateBody, ValidateParams, Validate } from '@smdv/logwise';
 * 
 * @Post('/')
 * @ValidateBody(CreateUserDTO)
 * async store(req, res) { ... }
 * 
 * @Put('/:id')
 * @Validate({ params: IdParamDTO, body: UpdateUserDTO })
 * async update(req, res) { ... }
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logger';
import { HttpStatusCode } from '../types';
import { getMessage } from '../messages';
import { SupportedLang } from '../types';

// Peer dependencies opcionales — cargados en runtime para no
// crashear en servicios que importan logwise sin usar estos decoradores
let _validate: Function;
let _plainToClass: Function;
try {
  _validate      = require('class-validator').validate;
  _plainToClass  = require('class-transformer').plainToClass;
} catch {
  // no-op: error descriptivo al intentar usar @ValidateBody etc.
}

// Logger interno para decoradores
const validatorLogger = new Logger({ service: 'logwise-validator' });

/**
 * Opciones de configuración para decoradores de validación
 */
export interface ValidationDecoratorOptions {
  /** Logger personalizado */
  logger?: Logger;
  /** Idioma para mensajes de error */
  lang?: SupportedLang;
  /** Mensaje de error de validación personalizado */
  validationErrorMessage?: string;
  /** Mensaje de error interno personalizado */
  internalErrorMessage?: string;
}

// Configuración global de validación
let globalValidationOptions: ValidationDecoratorOptions = {};

/**
 * Configura las opciones globales de validación
 */
export function configureValidation(options: ValidationDecoratorOptions): void {
  globalValidationOptions = { ...globalValidationOptions, ...options };
}

/**
 * Obtiene el logger configurado
 */
function getLogger(): Logger {
  return globalValidationOptions.logger || validatorLogger;
}

/**
 * Obtiene el mensaje de error de validación
 */
function getValidationErrorMessage(): string {
  if (globalValidationOptions.validationErrorMessage) {
    return globalValidationOptions.validationErrorMessage;
  }
  const lang = globalValidationOptions.lang || SupportedLang.ES;
  return getMessage(lang, 'BAD_REQUEST');
}

/**
 * Obtiene el mensaje de error interno
 */
function getInternalErrorMessage(): string {
  if (globalValidationOptions.internalErrorMessage) {
    return globalValidationOptions.internalErrorMessage;
  }
  const lang = globalValidationOptions.lang || SupportedLang.ES;
  return getMessage(lang, 'SERVER_ERROR');
}

/**
 * Formatea los errores de class-validator
 */
function formatValidationErrors(errors: any[]): Array<Record<string, string[]>> {
  return errors.map((error) => {
    if (error.children && error.children.length > 0) {
      return formatValidationErrors(error.children)[0];
    }
    return {
      [error.property]: error.constraints
        ? Object.values(error.constraints)
        : ['Valor inválido'],
    };
  });
}

/**
 * Crea un decorador de validación genérico
 */
function createValidationDecorator(
  source: 'body' | 'params' | 'query',
  dtoClass: any
): MethodDecorator {
  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const log = getLogger();

    descriptor.value = async function (req: Request, res: Response, next?: NextFunction) {
      try {
        const data = req[source];
        const dtoInstance = _plainToClass(dtoClass, data, {
          enableImplicitConversion: true,
          excludeExtraneousValues: false,
        });

        const errors = await _validate(dtoInstance as object, {
          whitelist: true,
          forbidNonWhitelisted: false,
          validationError: { target: false, value: false },
        });

        if (errors.length > 0) {
          const formattedErrors = formatValidationErrors(errors);

          log.warn('Validation error', {
            dto: dtoClass.name,
            source,
            errors: formattedErrors,
            method: String(propertyKey),
          });

          return res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: getValidationErrorMessage(),
            errors: formattedErrors,
          });
        }

        // Reemplazar source con DTO validado
        (req as any)[source] = dtoInstance;

        return originalMethod.call(this, req, res, next);
      } catch (error: any) {
        log.error('Validation middleware error', {
          dto: dtoClass.name,
          error: error.message,
          method: String(propertyKey),
        });

        return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: getInternalErrorMessage(),
          errors: [{ general: ['Error en la validación'] }],
        });
      }
    };

    return descriptor;
  };
}

/**
 * Decorador para validar Body
 *
 * @example
 * @Post('/')
 * @ValidateBody(CreateConfigDTO)
 * async store(req: Request, res: Response) { ... }
 */
export function ValidateBody(dtoClass: any): MethodDecorator {
  return createValidationDecorator('body', dtoClass);
}

/**
 * Decorador para validar Params (parámetros de ruta)
 *
 * @example
 * @Get('/:Id')
 * @ValidateParams(IdParamDTO)
 * async show(req: Request, res: Response) { ... }
 */
export function ValidateParams(dtoClass: any): MethodDecorator {
  return createValidationDecorator('params', dtoClass);
}

/**
 * Decorador para validar Query
 *
 * @example
 * @Get('/')
 * @ValidateQuery(PaginationDTO)
 * async index(req: Request, res: Response) { ... }
 */
export function ValidateQuery(dtoClass: any): MethodDecorator {
  return createValidationDecorator('query', dtoClass);
}

/**
 * Decorador para validar múltiples fuentes
 *
 * @example
 * @Put('/:Id')
 * @Validate({ body: UpdateConfigDTO, params: IdParamDTO })
 * async update(req: Request, res: Response) { ... }
 */
export function Validate(config: {
  body?: any;
  query?: any;
  params?: any;
}): MethodDecorator {
  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const log = getLogger();

    descriptor.value = async function (req: Request, res: Response, next?: NextFunction) {
      try {
        const allErrors: Array<Record<string, string[]>> = [];

        // Validar cada fuente configurada
        for (const [source, dtoClass] of Object.entries(config)) {
          if (!dtoClass) continue;

          const data = req[source as keyof Request];
          const dtoInstance = _plainToClass(dtoClass, data, {
            enableImplicitConversion: true,
          });

          const errors = await _validate(dtoInstance as object, {
            whitelist: true,
            forbidNonWhitelisted: false,
            validationError: { target: false, value: false },
          });

          if (errors.length > 0) {
            allErrors.push(...formatValidationErrors(errors));
          } else {
            (req as any)[source] = dtoInstance;
          }
        }

        if (allErrors.length > 0) {
          log.warn('Multi-validation error', {
            errors: allErrors,
            config: Object.keys(config),
            method: String(propertyKey),
          });

          return res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: getValidationErrorMessage(),
            errors: allErrors,
          });
        }

        return originalMethod.call(this, req, res, next);
      } catch (error: any) {
        log.error('Multi-validation middleware error', {
          error: error.message,
          method: String(propertyKey),
        });

        return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: getInternalErrorMessage(),
          errors: [{ general: ['Error en la validación'] }],
        });
      }
    };

    return descriptor;
  };
}
