import { describe, it, expect, beforeEach } from '@jest/globals';
import { Logger } from '../logger';
import { LogLevel, SupportedLang, LogTransport } from '../types';
import { runWithLogContext, getLogContext, setLogContext } from '../context-store';

class TestTransport implements LogTransport {
  public logs: Record<string, any>[] = [];
  write(entry: Record<string, any>): void {
    this.logs.push(entry);
  }
}

describe('log context (AsyncLocalStorage)', () => {
  const transport = new TestTransport();
  const logger = new Logger({ level: LogLevel.DEBUG, lang: SupportedLang.ES }, [transport]);

  beforeEach(() => {
    transport.logs = [];
  });

  it('injects context fields into every log line emitted within the scope', () => {
    runWithLogContext({ ownerId: 'tenant-123', userId: 'user-9' }, () => {
      logger.info('Algo paso');
    });
    const entry = transport.logs[0];
    expect(entry.ownerId).toBe('tenant-123');
    expect(entry.userId).toBe('user-9');
  });

  it('omits context fields outside any scope', () => {
    logger.info('Sin contexto');
    expect(transport.logs[0].ownerId).toBeUndefined();
  });

  it('lets explicit meta override the context', () => {
    runWithLogContext({ ownerId: 'tenant-123' }, () => {
      logger.info('Override', undefined, { ownerId: 'tenant-override' });
    });
    expect(transport.logs[0].ownerId).toBe('tenant-override');
  });

  it('inherits parent context when nested', () => {
    runWithLogContext({ ownerId: 'tenant-123' }, () => {
      runWithLogContext({ requestId: 'req-1' }, () => {
        logger.info('Anidado');
      });
    });
    const entry = transport.logs[0];
    expect(entry.ownerId).toBe('tenant-123');
    expect(entry.requestId).toBe('req-1');
  });

  it('setLogContext updates the active scope', () => {
    runWithLogContext({ ownerId: 'tenant-123' }, () => {
      setLogContext({ enterpriseId: 'ent-7' });
      logger.info('Actualizado');
      expect(getLogContext()?.enterpriseId).toBe('ent-7');
    });
  });

  it('isolates context between concurrent async scopes', async () => {
    const results: Record<string, string | undefined> = {};
    await Promise.all([
      new Promise<void>((resolve) =>
        runWithLogContext({ ownerId: 'A' }, async () => {
          await new Promise((r) => setTimeout(r, 10));
          results.a = getLogContext()?.ownerId as string;
          resolve();
        }),
      ),
      new Promise<void>((resolve) =>
        runWithLogContext({ ownerId: 'B' }, async () => {
          results.b = getLogContext()?.ownerId as string;
          resolve();
        }),
      ),
    ]);
    expect(results.a).toBe('A');
    expect(results.b).toBe('B');
  });
});
