// Centralización de constantes y enums para toda la librería

// Los enums globales se movieron a types.ts

export const ENV_KEYS = {
  LOG_LEVEL: 'LOG_LEVEL',
  SERVICE_NAME: 'SERVICE_NAME',
  NODE_ENV: 'NODE_ENV',
  LOG_LANG: 'LOG_LANG',
  LOG_FORMAT: 'LOG_FORMAT'
};

export const DEFAULTS = {
  LOG_LEVEL: 'info',
  SERVICE_NAME: 'unknown-service',
  NODE_ENV: 'develop',
  LOG_LANG: 'en',
  LOG_FORMAT: 'json'
};
