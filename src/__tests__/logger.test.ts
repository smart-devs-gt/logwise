import { describe, it, expect, beforeEach } from '@jest/globals';
import { Logger } from '../logger';
import { LogLevel, SupportedLang, LogTransport } from '../types';
import { HttpStatusCode, ApplicationErrorCode } from '../types';

class TestTransport implements LogTransport {
  public logs: Record<string, any>[] = [];
  write(entry: Record<string, any>): void {
    this.logs.push(entry);
  }
}

describe('Logger', () => {
  const testTransport = new TestTransport();
  const logger = new Logger({ level: LogLevel.DEBUG, lang: SupportedLang.ES }, [testTransport]);

  beforeEach(() => {
    testTransport.logs = [];
  });

  it('should translate i18n keys for info', () => {
    logger.info('SERVICE_STARTED');
    expect(testTransport.logs.some(log => log.message === 'Servicio iniciado correctamente')).toBe(true);
  });

  it('should translate i18n keys for warn', () => {
    logger.warn('MEMORY_WARNING');
    expect(testTransport.logs.some(log => log.message === 'Advertencia de memoria')).toBe(true);
  });

  it('should translate i18n keys for error', () => {
    logger.error('DB_ERROR');
    expect(testTransport.logs.some(log => log.message === 'Error en base de datos')).toBe(true);
  });

  it('should translate i18n keys for debug', () => {
    logger.debug('CUSTOM_MESSAGE', { param: 'valor' });
    expect(testTransport.logs.some(log => log.message === 'Mensaje personalizado: valor')).toBe(true);
  });

  it('should log free messages without translation', () => {
    logger.info('Mensaje libre en español');
    expect(testTransport.logs.some(log => log.message === 'Mensaje libre en español')).toBe(true);
  });

  it('should translate i18n keys in English', () => {
    const t = new TestTransport();
    const loggerEn = new Logger({ level: LogLevel.INFO, lang: SupportedLang.EN }, [t]);
    loggerEn.info('SERVICE_STARTED');
    expect(t.logs.some(log => log.message === 'Service started successfully')).toBe(true);
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    expect(testTransport.logs.some(log => log.level === 'info' && log.message === 'Test info message')).toBe(true);
  });

  it('should log error messages', () => {
    logger.error('Test error message', { detail: 'something' });
    expect(testTransport.logs.some(log => log.level === 'error' && log.message === 'Test error message')).toBe(true);
  });

  it('should log warn messages', () => {
    logger.warn('Test warning message');
    expect(testTransport.logs.some(log => log.level === 'warn' && log.message === 'Test warning message')).toBe(true);
  });

  it('should log debug messages', () => {
    logger.debug('Test debug message');
    expect(testTransport.logs.some(log => log.level === 'debug' && log.message === 'Test debug message')).toBe(true);
  });

  it('should include service name in config', () => {
    const config = logger.getConfig();
    expect(config.service).toBeDefined();
  });

  it('should log with custom service name "app1"', () => {
    const t = new TestTransport();
    const l = new Logger({ level: LogLevel.DEBUG, service: 'app1' }, [t]);
    l.info('App1 info');
    expect(t.logs.some(log => log.service === 'app1' && log.message === 'App1 info')).toBe(true);
  });

  it('should log with custom service name "app2"', () => {
    const t = new TestTransport();
    const l = new Logger({ level: LogLevel.DEBUG, service: 'app2' }, [t]);
    l.error('App2 error');
    expect(t.logs.some(log => log.service === 'app2' && log.message === 'App2 error')).toBe(true);
  });

  it('should handle metadata objects', () => {
    logger.info('User action', undefined, { userId: 123, action: 'login' });
    expect(testTransport.logs.some(log =>
      log.level === 'info' &&
      log.message === 'User action' &&
      log.userId === 123 &&
      log.action === 'login'
    )).toBe(true);
  });

  it('should extract Error objects from meta into message + stack', () => {
    const err = new Error('DB down');
    logger.error('DB failed', undefined, { cause: err });
    const entry = testTransport.logs.find(log => log.message === 'DB failed')!;
    expect(entry).toBeDefined();
    expect(entry['cause']).toBe('DB down');
    expect(entry['stack']).toContain('DB down');
  });

  it('should log HTTP 4xx errors as warn', () => {
    logger.logHttpError('Bad request error', HttpStatusCode.BAD_REQUEST, { userId: 123 });
    expect(testTransport.logs.some(log =>
      log.level === 'warn' &&
      log.message === 'Bad request error' &&
      log.httpStatus === HttpStatusCode.BAD_REQUEST
    )).toBe(true);
  });

  it('should log HTTP 5xx errors as error', () => {
    logger.logHttpError('Internal error', HttpStatusCode.INTERNAL_SERVER_ERROR);
    expect(testTransport.logs.some(log => log.level === 'error')).toBe(true);
  });

  it('should log application DB errors as error', () => {
    logger.logApplicationError('Database connection failed', ApplicationErrorCode.DB_CONNECTION_ERROR, {
      component: 'user-service',
      operation: 'getUserById',
    });
    expect(testTransport.logs.some(log =>
      log.level === 'error' &&
      log.message === 'Database connection failed' &&
      log.errorCode === ApplicationErrorCode.DB_CONNECTION_ERROR
    )).toBe(true);
  });

  it('should log application VAL errors as warn', () => {
    logger.logApplicationError('Campo requerido', ApplicationErrorCode.VAL_REQUIRED_FIELD);
    expect(testTransport.logs.some(log =>
      log.level === 'warn' && log.message === 'Campo requerido'
    )).toBe(true);
  });

  it('should log requests with status codes', () => {
    logger.logRequest('API request', 'GET', '/api/users', 200, 150, { userId: 123 });
    expect(testTransport.logs.some(log =>
      log.level === 'info' &&
      log.message === 'API request' &&
      log.method === 'GET' &&
      log.url === '/api/users'
    )).toBe(true);
  });

  it('should filter out logs below configured level', () => {
    const t = new TestTransport();
    const warnLogger = new Logger({ level: LogLevel.WARN }, [t]);
    warnLogger.debug('should not appear');
    warnLogger.info('should not appear');
    warnLogger.warn('should appear');
    expect(t.logs).toHaveLength(1);
    expect(t.logs[0].level).toBe('warn');
  });

  it('should add transport via addTransport', () => {
    const extraTransport = new TestTransport();
    const l = new Logger({ level: LogLevel.INFO });
    l.addTransport(extraTransport);
    l.info('via addTransport');
    expect(extraTransport.logs.some(log => log.message === 'via addTransport')).toBe(true);
  });

  describe('setLevel', () => {
    it('should change level at runtime', () => {
      const t = new TestTransport();
      const l = new Logger({ level: LogLevel.WARN }, [t]);
      l.debug('should be filtered');
      expect(t.logs.filter(log => log.message === 'should be filtered')).toHaveLength(0);

      l.setLevel(LogLevel.DEBUG);
      l.debug('now visible');
      expect(t.logs.some(log => log.message === 'now visible')).toBe(true);
    });

    it('should emit a log entry when level changes', () => {
      const t = new TestTransport();
      const l = new Logger({ level: LogLevel.INFO }, [t]);
      l.setLevel(LogLevel.DEBUG);
      const changeLog = t.logs.find(log => log.message === 'Log level changed');
      expect(changeLog).toBeDefined();
      expect(changeLog!['from']).toBe(LogLevel.INFO);
      expect(changeLog!['to']).toBe(LogLevel.DEBUG);
    });

    it('should restore level after resetAfterMs', async () => {
      const t = new TestTransport();
      const l = new Logger({ level: LogLevel.WARN }, [t]);
      l.setLevel(LogLevel.DEBUG, 50);
      expect(l.getLevel()).toBe(LogLevel.DEBUG);
      await new Promise(resolve => setTimeout(resolve, 80));
      expect(l.getLevel()).toBe(LogLevel.WARN);
    });
  });
});
