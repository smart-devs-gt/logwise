/**
 * Decoradores HTTP para Express
 * Patrón estilo NestJS - Declarativo y limpio
 * 
 * @example
 * import { 
 *   Controller, Get, Post, Put, Delete, Patch,
 *   ValidateBody, ValidateParams, ValidateQuery, Validate,
 *   registerControllers 
 * } from '@smdv/logwise';
 */

// Route decorators
export { 
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
} from './route.decorator';

// Validation decorators
export { 
  ValidateBody, 
  ValidateParams, 
  ValidateQuery, 
  Validate,
  configureValidation,
  ValidationDecoratorOptions,
} from './validate.decorator';
