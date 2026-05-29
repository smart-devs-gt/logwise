import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { RequestLogData, HttpStatusCode } from './types';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Capturar información básica del request
  const requestData: RequestLogData = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.socket.remoteAddress
  };

  // Log del request entrante
  logger.info('Incoming request', requestData);

  // Interceptar el final de la respuesta para loggear el resultado
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    const responseData: RequestLogData = {
      ...requestData,
      duration,
      statusCode: res.statusCode
    };

    // Log de la respuesta
    if (res.statusCode >= 400) {
      logger.logRequest(
        'Request completed with error', 
        req.method, 
        req.url, 
        res.statusCode, 
        duration,
        { userAgent: requestData.userAgent, ip: requestData.ip }
      );
    } else {
      logger.logRequest(
        'Request completed successfully', 
        req.method, 
        req.url, 
        res.statusCode, 
        duration,
        { userAgent: requestData.userAgent, ip: requestData.ip }
      );
    }

    return originalSend.call(this, body);
  };

  next();
}

// Middleware más avanzado con opciones configurables
export function createRequestLogger(options: {
  logBody?: boolean;
  logHeaders?: boolean;
  skipPaths?: string[];
  skipSuccessful?: boolean;
} = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Saltar paths específicos si están configurados
    if (options.skipPaths && options.skipPaths.includes(req.path)) {
      return next();
    }

    const startTime = Date.now();
    
    const requestData: any = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.socket.remoteAddress
    };

    // Incluir headers si está habilitado
    if (options.logHeaders) {
      requestData.headers = req.headers;
    }

    // Incluir body si está habilitado
    if (options.logBody && req.body) {
      requestData.body = req.body;
    }

    logger.info('Incoming request', requestData);

    const originalSend = res.send;
    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      const responseData: any = {
        ...requestData,
        duration,
        statusCode: res.statusCode
      };

      // Solo loggear si no se debe saltar requests exitosos
      if (options.skipSuccessful && res.statusCode < 400) {
        return originalSend.call(this, body);
      }

      if (res.statusCode >= 400) {
        logger.logRequest(
          'Request completed with error', 
          req.method, 
          req.url, 
          res.statusCode, 
          duration,
          responseData
        );
      } else {
        logger.logRequest(
          'Request completed successfully', 
          req.method, 
          req.url, 
          res.statusCode, 
          duration,
          responseData
        );
      }

      return originalSend.call(this, body);
    };

    next();
  };
}