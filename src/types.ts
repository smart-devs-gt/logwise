export enum Environment {
  LOCAL = 'local',
  DEVELOP = 'develop',
  TESTING = 'testing',
  PRODUCTION = 'production'
}

export enum OutputFormat {
  JSON = 'json',
  XML = 'xml'
}

export enum SupportedLang {
  EN = 'en',
  ES = 'es'
}
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  timestamp: string;
  service: string;
  level: string;
  message: string;
  stack?: string;
  [key: string]: any;
}

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  isDevelopment: boolean;
  logPretty?: boolean;
  transports?: Transport[];
}

export interface Transport {
  type: 'console' | 'file' | 'cloudwatch' | 'elk' | 'loki' | 'datadog';
  options?: any;
}

export interface LogTransport {
  write(entry: Record<string, any>): void;
}

export interface RequestLogData {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  httpStatus?: HttpStatusCode;
}

export enum HttpStatusCode {
  // 2xx Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,

  // 3xx Redirection
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  NOT_MODIFIED = 304,

  // 4xx Client Error
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,

  // 5xx Server Error
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}

export enum ApplicationErrorCode {
  // Authentication & Authorization
  AUTH_TOKEN_EXPIRED = 'AUTH_001',
  AUTH_TOKEN_INVALID = 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_003',
  AUTH_USER_NOT_FOUND = 'AUTH_004',
  AUTH_INVALID_CREDENTIALS = 'AUTH_005',

  // Database
  DB_CONNECTION_ERROR = 'DB_001',
  DB_QUERY_ERROR = 'DB_002',
  DB_TRANSACTION_ERROR = 'DB_003',
  DB_CONSTRAINT_VIOLATION = 'DB_004',
  DB_RECORD_NOT_FOUND = 'DB_005',

  // External Services
  EXT_SERVICE_UNAVAILABLE = 'EXT_001',
  EXT_SERVICE_TIMEOUT = 'EXT_002',
  EXT_SERVICE_INVALID_RESPONSE = 'EXT_003',
  EXT_API_RATE_LIMIT = 'EXT_004',

  // Business Logic
  BIZ_INVALID_INPUT = 'BIZ_001',
  BIZ_RESOURCE_NOT_FOUND = 'BIZ_002',
  BIZ_OPERATION_NOT_ALLOWED = 'BIZ_003',
  BIZ_DUPLICATE_RESOURCE = 'BIZ_004',
  BIZ_INSUFFICIENT_BALANCE = 'BIZ_005',

  // System
  SYS_MEMORY_LIMIT = 'SYS_001',
  SYS_DISK_FULL = 'SYS_002',
  SYS_CPU_OVERLOAD = 'SYS_003',
  SYS_NETWORK_ERROR = 'SYS_004',
  SYS_CONFIG_ERROR = 'SYS_005',

  // Validation
  VAL_REQUIRED_FIELD = 'VAL_001',
  VAL_INVALID_FORMAT = 'VAL_002',
  VAL_OUT_OF_RANGE = 'VAL_003',
  VAL_INVALID_TYPE = 'VAL_004',

  // Generic
  UNKNOWN_ERROR = 'GEN_001'
}

export interface ErrorContext {
  errorCode?: ApplicationErrorCode;
  httpStatus?: HttpStatusCode;
  userId?: string | number;
  requestId?: string;
  correlationId?: string;
  component?: string;
  operation?: string;
  [key: string]: any;
}