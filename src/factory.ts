import { Logger } from './logger';
import { LoggerConfig, LogTransport } from './types';

export function createCustomLogger(config: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

export class TransportFactory {
  static createCloudWatchTransport(_options: any): LogTransport {
    throw new Error('CloudWatch transport not implemented yet');
  }

  static createELKTransport(_options: any): LogTransport {
    throw new Error('ELK transport not implemented yet');
  }

  static createLokiTransport(_options: any): LogTransport {
    throw new Error('Loki transport not implemented yet');
  }

  static createDatadogTransport(_options: any): LogTransport {
    throw new Error('Datadog transport not implemented yet');
  }
}
