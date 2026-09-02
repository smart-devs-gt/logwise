import { Logger } from '../logger';
import { LogLevel } from '../types';

/**
 * El caso que dejó a dos microservicios sin un solo `info` en CloudWatch.
 *
 * `LOG_LEVEL` vive en un secreto y entra a `process.env` cuando el servicio
 * resuelve `getSecrets()`, dentro de `start()`. El logger, en cambio, se
 * construye al importar el módulo — antes. Si el nivel se congela ahí, el
 * logger nace con el default de producción (`warn`) y descarta los `info` para
 * el resto de la vida del proceso, sin que nada falle.
 */
describe('nivel de log resuelto dinámicamente', () => {
  const envPrevio = { ...process.env };
  let escrito: string[];
  let stdoutOriginal: typeof process.stdout.write;

  beforeEach(() => {
    escrito = [];
    stdoutOriginal = process.stdout.write.bind(process.stdout);
    (process.stdout.write as unknown) = (chunk: string) => { escrito.push(String(chunk)); return true; };
  });

  afterEach(() => {
    (process.stdout.write as unknown) = stdoutOriginal;
    process.env = { ...envPrevio };
  });

  it('toma el LOG_LEVEL que aparece DESPUÉS de construir el logger', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.LOG_LEVEL;

    const logger = new Logger({ service: 'test' });

    logger.info('antes de los secretos');
    expect(escrito.join('')).not.toContain('antes de los secretos');

    // Lo que hace el bootstrap del servicio al resolver Secrets Manager.
    process.env.LOG_LEVEL = 'info';

    logger.info('despues de los secretos');
    expect(escrito.join('')).toContain('despues de los secretos');
  });

  it('un nivel pasado por configuración NO lo pisa el entorno', () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_LEVEL = 'debug';

    const logger = new Logger({ service: 'test', level: LogLevel.ERROR });

    logger.info('no deberia salir');
    expect(escrito.join('')).not.toContain('no deberia salir');
    expect(logger.getLevel()).toBe(LogLevel.ERROR);
  });

  it('setLevel sigue mandando por encima del entorno', () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_LEVEL = 'error';

    const logger = new Logger({ service: 'test' });
    logger.setLevel(LogLevel.DEBUG);

    logger.info('encendido a mano');
    expect(escrito.join('')).toContain('encendido a mano');
    expect(logger.getLevel()).toBe(LogLevel.DEBUG);
  });

  it('sin LOG_LEVEL y en producción, el default sigue siendo warn', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.LOG_LEVEL;

    const logger = new Logger({ service: 'test' });

    expect(logger.getLevel()).toBe(LogLevel.WARN);
    logger.warn('esto si sale');
    expect(escrito.join('')).toContain('esto si sale');
  });
});
