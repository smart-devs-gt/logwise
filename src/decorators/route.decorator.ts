/**
 * Decoradores de Rutas HTTP
 * Patrón estilo NestJS - Declarativo y limpio
 * 
 * @example
 * import { Controller, Get, Post, registerControllers } from '@smdv/logwise';
 * 
 * @Controller('/users')
 * class UserController {
 *   @Get('/')
 *   async index(req, res) { ... }
 * 
 *   @Post('/')
 *   @ValidateBody(CreateUserDTO)
 *   async store(req, res) { ... }
 * }
 */

import 'reflect-metadata';
import { Request, Response, Router, Application } from 'express';
import { Logger } from '../logger';

// Logger interno para decoradores
const decoratorLogger = new Logger({ service: 'logwise-decorators' });

/**
 * Metadata keys para almacenar información de rutas
 */
const ROUTE_METADATA_KEY = Symbol('route');
const CONTROLLER_PREFIX_KEY = Symbol('controller_prefix');

/**
 * Interface para metadata de rutas
 */
export interface RouteMetadata {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  methodName: string;
}

/**
 * Opciones de configuración para registerControllers
 */
export interface RegisterControllersOptions {
  /** Logger personalizado (opcional) */
  logger?: Logger;
  /** Mostrar logs de registro de rutas (default: true) */
  verbose?: boolean;
}

/**
 * Obtiene o crea el array de metadatos de rutas
 */
function getRouteMetadata(target: any): RouteMetadata[] {
  if (!Reflect.hasMetadata(ROUTE_METADATA_KEY, target)) {
    Reflect.defineMetadata(ROUTE_METADATA_KEY, [], target);
  }
  return Reflect.getMetadata(ROUTE_METADATA_KEY, target);
}

/**
 * Decorador de clase para definir el prefijo del controller
 * 
 * @example
 * @Controller('/config')
 * class ConfigController { ... }
 */
export function Controller(prefix: string = ''): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata(CONTROLLER_PREFIX_KEY, prefix, target);
  };
}

/**
 * Factory para crear decoradores de método HTTP
 */
function createMethodDecorator(method: RouteMetadata['method']) {
  return function (path: string = ''): MethodDecorator {
    return function (
      target: any,
      propertyKey: string | symbol,
      _descriptor: PropertyDescriptor
    ) {
      const routes = getRouteMetadata(target.constructor.prototype);
      routes.push({
        method,
        path,
        methodName: String(propertyKey),
      });
      Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, target.constructor.prototype);
    };
  };
}

/**
 * Decorador GET
 * 
 * @example
 * @Get('/:id')
 * async show(req: Request, res: Response) { ... }
 */
export const Get = createMethodDecorator('get');

/**
 * Decorador POST
 * 
 * @example
 * @Post('/')
 * @ValidateBody(CreateConfigDTO)
 * async store(req: Request, res: Response) { ... }
 */
export const Post = createMethodDecorator('post');

/**
 * Decorador PUT
 * 
 * @example
 * @Put('/:id')
 * @ValidateBody(UpdateConfigDTO)
 * async update(req: Request, res: Response) { ... }
 */
export const Put = createMethodDecorator('put');

/**
 * Decorador PATCH
 * 
 * @example
 * @Patch('/:id/status')
 * async updateStatus(req: Request, res: Response) { ... }
 */
export const Patch = createMethodDecorator('patch');

/**
 * Decorador DELETE
 * 
 * @example
 * @Delete('/:id')
 * async destroy(req: Request, res: Response) { ... }
 */
export const Delete = createMethodDecorator('delete');

/**
 * Registra automáticamente todas las rutas de un controller en un router
 */
export function registerRoutes(
  router: Router, 
  controller: any,
  options?: RegisterControllersOptions
): void {
  const log = options?.logger || decoratorLogger;
  const verbose = options?.verbose ?? true;
  
  const prototype = Object.getPrototypeOf(controller);
  const routes: RouteMetadata[] = Reflect.getMetadata(ROUTE_METADATA_KEY, prototype) || [];
  const prefix: string = Reflect.getMetadata(CONTROLLER_PREFIX_KEY, controller.constructor) || '';

  routes.forEach((route) => {
    const handler = (req: Request, res: Response) => {
      return controller[route.methodName](req, res);
    };

    const fullPath = route.path;

    switch (route.method) {
      case 'get':
        router.get(fullPath, handler);
        break;
      case 'post':
        router.post(fullPath, handler);
        break;
      case 'put':
        router.put(fullPath, handler);
        break;
      case 'patch':
        router.patch(fullPath, handler);
        break;
      case 'delete':
        router.delete(fullPath, handler);
        break;
    }

    if (verbose) {
      log.info(`  ✅ ${route.method.toUpperCase().padEnd(6)} ${prefix}${fullPath} -> ${route.methodName}`);
    }
  });
}

/**
 * Helper para registrar múltiples controllers en Express
 * Acepta clases de controller (con decorador @Controller)
 * 
 * @example
 * import { registerControllers } from '@smdv/logwise';
 * 
 * registerControllers(app, [
 *   ConfigController,
 *   UserController,
 * ]);
 * 
 * // Con opciones
 * registerControllers(app, [ConfigController], { 
 *   logger: customLogger,
 *   verbose: false 
 * });
 */
export function registerControllers(
  app: Application,
  controllerClasses: any[],
  options?: RegisterControllersOptions
): void {
  const log = options?.logger || decoratorLogger;
  const verbose = options?.verbose ?? true;
  
  if (verbose) {
    log.info('🚀 Registrando rutas...');
  }
  
  controllerClasses.forEach((ControllerClass) => {
    // Instanciar el controller
    const controllerInstance = new ControllerClass();
    
    // Obtener el prefix del decorador @Controller
    const prefix: string = Reflect.getMetadata(CONTROLLER_PREFIX_KEY, ControllerClass) || '';
    
    // Crear router y registrar rutas
    const router = Router();
    registerRoutes(router, controllerInstance, options);
    
    // Montar router en la app
    app.use(prefix, router);
    
    if (verbose) {
      log.info(`📦 Controller: ${ControllerClass.name} -> ${prefix || '/'}`);
    }
  });
  
  if (verbose) {
    log.info('✅ Rutas registradas correctamente');
  }
}

/**
 * Obtiene el prefijo de un controller
 */
export function getControllerPrefix(controllerClass: any): string {
  return Reflect.getMetadata(CONTROLLER_PREFIX_KEY, controllerClass) || '';
}

/**
 * Obtiene las rutas registradas de un controller
 */
export function getControllerRoutes(controllerClass: any): RouteMetadata[] {
  return Reflect.getMetadata(ROUTE_METADATA_KEY, controllerClass.prototype) || [];
}
