import { ENV_KEYS, DEFAULTS } from './constants';
import { LogLevel, Environment, OutputFormat, SupportedLang, LogTransport } from './types';
import { LoggerConfig, HttpStatusCode, ApplicationErrorCode, ErrorContext } from './types';
import { XmlProcessor } from './xml';
import { translate } from './i18n';
import en from './i18n/en.json';
import es from './i18n/es.json';

const i18nMessages: Record<SupportedLang, Record<string, string>> = { en, es };

const LEVEL_ORDER: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const LEVEL_COLORS: Record<string, string> = {
  error: '\x1b[31m',
  warn:  '\x1b[33m',
  info:  '\x1b[32m',
  debug: '\x1b[36m',
};

export class Logger {
  private config: LoggerConfig & {
    environment: string;
    outputFormat: OutputFormat;
    lang: SupportedLang;
    logPretty: boolean;
  };
  private transports: LogTransport[];
  private xmlProcessor: XmlProcessor;

  constructor(
    config?: Partial<LoggerConfig> & {
      lang?: SupportedLang;
      environment?: string;
      outputFormat?: OutputFormat;
      logPretty?: boolean;
    },
    transports?: LogTransport[]
  ) {
    const envEnvironment = process.env[ENV_KEYS.NODE_ENV] || DEFAULTS.NODE_ENV;
    const envLang = (process.env[ENV_KEYS.LOG_LANG] as SupportedLang | undefined)
      || SupportedLang[DEFAULTS.LOG_LANG.toUpperCase() as keyof typeof SupportedLang];
    const envOutputFormat = (process.env[ENV_KEYS.LOG_FORMAT] as OutputFormat)
      || OutputFormat[DEFAULTS.LOG_FORMAT.toUpperCase() as keyof typeof OutputFormat];
    const envLogPretty = process.env[ENV_KEYS.LOG_PRETTY] === 'true';

    this.config = {
      level: this.getLogLevel(),
      service: this.getServiceName(),
      isDevelopment: this.isDevelopment(),
      environment: config?.environment || envEnvironment,
      lang: config?.lang || envLang,
      outputFormat: config?.outputFormat || envOutputFormat,
      ...config,
      // logPretty después del spread para que envLogPretty sea el fallback correcto
      logPretty: config?.logPretty ?? envLogPretty,
    };

    this.transports = transports ?? [];
    this.xmlProcessor = new XmlProcessor();
  }

  // ─── Config helpers ────────────────────────────────────────────────────────

  private getLogLevel(): LogLevel {
    const envLevel = process.env[ENV_KEYS.LOG_LEVEL]?.toLowerCase();
    switch (envLevel) {
      case LogLevel.ERROR: return LogLevel.ERROR;
      case LogLevel.WARN:  return LogLevel.WARN;
      case LogLevel.INFO:  return LogLevel.INFO;
      case LogLevel.DEBUG: return LogLevel.DEBUG;
    }
    // Sin LOG_LEVEL explícito, el nivel se elige según el entorno
    switch (process.env[ENV_KEYS.NODE_ENV]) {
      case Environment.PRODUCTION:
      case Environment.TESTING:
        return LogLevel.WARN;
      case Environment.LOCAL:
      case Environment.DEVELOP:
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private getServiceName(): string {
    return process.env[ENV_KEYS.SERVICE_NAME] || DEFAULTS.SERVICE_NAME;
  }

  private isDevelopment(): boolean {
    return process.env[ENV_KEYS.NODE_ENV] !== Environment.PRODUCTION;
  }

  // ─── Emisión de log ────────────────────────────────────────────────────────

  private shouldLog(level: string): boolean {
    return (LEVEL_ORDER[level] ?? 0) >= (LEVEL_ORDER[this.config.level] ?? 0);
  }

  private timestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  /**
   * Separa instancias Error del meta plano y extrae el stack.
   * Evita que JSON.stringify serialice objetos Error como {}.
   */
  private extractMeta(meta: Record<string, any>): { clean: Record<string, any>; stack?: string } {
    const clean: Record<string, any> = {};
    let stack: string | undefined;
    for (const [k, v] of Object.entries(meta)) {
      if (v instanceof Error) {
        if (!stack) stack = v.stack;
        clean[k] = v.message;
      } else {
        clean[k] = v;
      }
    }
    return { clean, stack };
  }

  private emit(level: string, message: string, meta: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const { clean, stack } = this.extractMeta(meta);
    const entry: Record<string, any> = {
      level,
      message,
      service: this.config.service,
      timestamp: this.timestamp(),
      ...clean,
      ...(stack ? { stack } : {}),
    };

    if (this.transports.length > 0) {
      for (const t of this.transports) t.write(entry);
      return;
    }

    this.config.logPretty ? this.writePretty(level, message, clean, stack) : this.writeJson(entry, level);
  }

  private writeJson(entry: Record<string, any>, level: string): void {
    const line = JSON.stringify(entry) + '\n';
    (level === 'error' ? process.stderr : process.stdout).write(line);
  }

  private writePretty(level: string, message: string, meta: Record<string, any>, stack?: string): void {
    const color = LEVEL_COLORS[level] || '';
    const reset = '\x1b[0m';
    const env = this.config.environment || process.env[ENV_KEYS.NODE_ENV] || DEFAULTS.NODE_ENV;
    let line = `${color}[${level.toUpperCase()}]${reset} [${env}] ${this.timestamp()} [${this.config.service}]: ${color}${message}${reset}`;
    if (Object.keys(meta).length > 0) {
      line += `\n\x1b[90m${JSON.stringify(meta, null, 2)}${reset}`;
    }
    if (stack) {
      line += `\n\x1b[35m${stack}${reset}`;
    }
    process.stdout.write(line + '\n');
  }

  // ─── Métodos públicos de logging ───────────────────────────────────────────

  private isI18nKey(key: string): boolean {
    const messages = i18nMessages[this.config.lang];
    return messages ? Object.prototype.hasOwnProperty.call(messages, key) : false;
  }

  private resolve(message: string, params?: Record<string, any>): string {
    return this.isI18nKey(message) ? translate(this.config.lang, message, params) : message;
  }

  error(message: string, params?: Record<string, any>, meta?: any): void {
    const mergedMeta = { ...(params || {}), ...(meta || {}) };
    this.emit('error', this.resolve(message, params), mergedMeta);
  }

  warn(message: string, params?: Record<string, any>, meta?: any): void {
    const mergedMeta = { ...(params || {}), ...(meta || {}) };
    this.emit('warn', this.resolve(message, params), mergedMeta);
  }

  info(message: string, params?: Record<string, any>, meta?: any): void {
    const mergedMeta = { ...(params || {}), ...(meta || {}) };
    this.emit('info', this.resolve(message, params), mergedMeta);
  }

  debug(message: string, params?: Record<string, any>, meta?: any): void {
    const mergedMeta = { ...(params || {}), ...(meta || {}) };
    this.emit('debug', this.resolve(message, params), mergedMeta);
  }

  logI18n(level: LogLevel, key: string, params?: Record<string, any>, meta?: any): void {
    const message = translate(this.config.lang, key, params);
    switch (level) {
      case LogLevel.ERROR: this.error(message, undefined, meta); break;
      case LogLevel.WARN:  this.warn(message, meta); break;
      case LogLevel.DEBUG: this.debug(message, meta); break;
      default:             this.info(message, meta);
    }
  }

  logXml(xmlString: string, level: LogLevel = LogLevel.INFO, meta?: any): void {
    try {
      const valid = this.xmlProcessor.validate(xmlString);
      if (!valid) {
        this.error('XML inválido', undefined, { xml: xmlString, ...meta });
        return;
      }
      const parsed = this.xmlProcessor.parse(xmlString);
      const output = this.config.outputFormat === OutputFormat.XML
        ? this.xmlProcessor.build(parsed)
        : parsed;

      switch (level) {
        case LogLevel.ERROR: this.error('XML procesado correctamente', undefined, { xml: output, ...meta }); break;
        case LogLevel.WARN:  this.warn('XML procesado correctamente', { xml: output, ...meta }); break;
        case LogLevel.DEBUG: this.debug('XML procesado correctamente', { xml: output, ...meta }); break;
        default:             this.info('XML procesado correctamente', { xml: output, ...meta });
      }
    } catch (err) {
      this.error('Error procesando XML', undefined, { error: err, xml: xmlString, ...meta });
    }
  }

  // ─── Métodos de logging tipado ─────────────────────────────────────────────

  logHttpError(message: string, httpStatus: HttpStatusCode, meta?: any): void {
    const logMeta = { httpStatus, statusCode: httpStatus, ...meta };
    if (httpStatus >= 500)      this.error(message, undefined, logMeta);
    else if (httpStatus >= 400) this.warn(message, undefined, logMeta);
    else                        this.info(message, undefined, logMeta);
  }

  logApplicationError(message: string, errorCode: ApplicationErrorCode, context?: ErrorContext): void {
    const logMeta = { errorCode, ...context };
    // SYS/DB/EXT = errores de infraestructura → error
    // AUTH/BIZ/VAL = errores operacionales esperados → warn
    if (errorCode.startsWith('SYS_') || errorCode.startsWith('DB_') || errorCode.startsWith('EXT_')) {
      this.error(message, undefined, logMeta);
    } else if (errorCode.startsWith('AUTH_') || errorCode.startsWith('BIZ_') || errorCode.startsWith('VAL_')) {
      this.warn(message, undefined, logMeta);
    } else {
      this.info(message, undefined, logMeta);
    }
  }

  logRequest(message: string, method: string, url: string, statusCode: number, duration?: number, meta?: any): void {
    const logMeta = { method, url, statusCode, duration, ...meta };
    if (statusCode >= 500)      this.error(message, undefined, logMeta);
    else if (statusCode >= 400) this.warn(message, undefined, logMeta);
    else                        this.info(message, undefined, logMeta);
  }

  // ─── Control de nivel en runtime ──────────────────────────────────────────

  /**
   * Cambia el nivel de log en caliente, sin reiniciar el proceso.
   * Útil para activar debug en producción durante una investigación.
   *
   * @param level   Nuevo nivel de log
   * @param resetAfterMs  Si se indica, restaura el nivel original pasado ese tiempo (ms).
   *                      Evita olvidar debug encendido en producción.
   */
  setLevel(level: LogLevel, resetAfterMs?: number): void {
    const previous = this.config.level;
    this.config.level = level;
    this.info('Log level changed', undefined, { from: previous, to: level, resetAfterMs });

    if (resetAfterMs && resetAfterMs > 0) {
      setTimeout(() => {
        this.config.level = previous;
        this.info('Log level restored', undefined, { to: previous });
      }, resetAfterMs).unref(); // unref: no bloquea el cierre del proceso
    }
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  // ─── Extensibilidad ────────────────────────────────────────────────────────

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

export const logger = new Logger();
