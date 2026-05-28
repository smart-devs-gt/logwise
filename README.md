# @smdv/logwise

Professional logging library for Node.js microservices. Designed for CloudWatch + Grafana: every log entry is a single-line JSON by default, structured and queryable. Includes i18n support, Express middleware, HTTP error classes, route decorators, and validation decorators.

## Features

- **JSON de una línea por evento** — compatible con CloudWatch Logs y Grafana Loki sin configuración extra
- **Niveles automáticos por entorno** — debug en local/develop, warn en testing/production (override con `LOG_LEVEL`)
- **`LOG_PRETTY=true`** — formato coloreado con sangría para desarrollo local sin stack de observabilidad
- **i18n** — mensajes en español e inglés; cambio solo con variable de entorno
- **Middleware Express** — logging automático de requests/responses
- **Clases de error HTTP** — `NotFoundError`, `ValidationError`, `UnauthorizedError`, etc.
- **Decoradores estilo NestJS** — `@Controller`, `@Get`, `@Post`, `@ValidateBody`, etc.
- **TypeScript** — completamente tipado

## Instalación

```bash
npm install @smdv/logwise
```

## Variables de entorno

| Variable | Valores | Default | Descripción |
|---|---|---|---|
| `SERVICE_NAME` | string | `unknown-service` | Nombre del microservicio (aparece en cada log) |
| `NODE_ENV` | `local` `develop` `testing` `production` | `develop` | Controla el nivel automático de log |
| `LOG_LEVEL` | `debug` `info` `warn` `error` | — | Fuerza el nivel, ignora `NODE_ENV` |
| `LOG_LANG` | `es` `en` | `en` | Idioma de los mensajes i18n |
| `LOG_PRETTY` | `true` `false` | `false` | Activa formato coloreado con sangría |

### Niveles automáticos según `NODE_ENV`

| Entorno | Nivel | Logs emitidos |
|---|---|---|
| `local` | debug | debug · info · warn · error |
| `develop` | debug | debug · info · warn · error |
| `testing` | warn | warn · error |
| `production` | warn | warn · error |

> `LOG_LEVEL` toma precedencia sobre `NODE_ENV` si está definido.

## Formato de salida

### Por defecto — JSON compacto (CloudWatch / Grafana)

Cada llamada al logger emite exactamente **una línea JSON**, sin importar cuántos campos tenga el meta.

```json
{"level":"info","message":"Servicio iniciado correctamente","service":"ms-sale-warehouse","timestamp":"2026-05-28 19:43:00"}
{"level":"warn","message":"Usuario no encontrado","service":"ms-sale-warehouse","timestamp":"2026-05-28 19:43:01","httpStatus":404,"userId":123}
{"level":"error","message":"Error en base de datos","service":"ms-sale-warehouse","timestamp":"2026-05-28 19:43:02","errorCode":"DB_001","stack":"Error: ..."}
```

### `LOG_PRETTY=true` — coloreado para desarrollo local

Solo para entornos sin CloudWatch/Grafana (máquina local sin stack de observabilidad).

```
[INFO]  [develop] 2026-05-28 19:43:00 [ms-sale-warehouse]: Servicio iniciado correctamente
[WARN]  [develop] 2026-05-28 19:43:01 [ms-sale-warehouse]: Usuario no encontrado
{
  "httpStatus": 404,
  "userId": 123
}
[ERROR] [develop] 2026-05-28 19:43:02 [ms-sale-warehouse]: Error en base de datos
Error: DB Down
    at Object.<anonymous> (/app/index.js:10:23)
```

## Uso básico

```typescript
import { logger } from '@smdv/logwise';

// Mensaje libre
logger.info('Servidor listo en puerto 3000');
logger.warn('Conexión lenta detectada', undefined, { latencyMs: 1200 });
logger.error('Fallo al conectar a Redis', undefined, { host: 'redis:6379' });
logger.debug('Payload recibido', undefined, { body: req.body });
```

### Logger personalizado

```typescript
import { Logger, LogLevel, SupportedLang } from '@smdv/logwise';

const log = new Logger({
  service: 'ms-sale-orders',
  level: LogLevel.DEBUG,
  lang: SupportedLang.ES,
  logPretty: false,   // true solo si no tienes CloudWatch/Grafana
});
```

### Factory helper

```typescript
import { createCustomLogger } from '@smdv/logwise';

const log = createCustomLogger({ service: 'ms-sale-orders' });
```

## Mensajes i18n

El logger detecta automáticamente si el primer argumento es una clave i18n registrada. Si existe, la traduce según `LOG_LANG`; si no, la usa tal cual.

```typescript
logger.info('SERVICE_STARTED');           // → "Servicio iniciado correctamente" (es)
logger.warn('MEMORY_WARNING');            // → "Advertencia de memoria"
logger.error('DB_ERROR');                 // → "Error en base de datos"
logger.debug('CUSTOM_MESSAGE', { param: 'valor' }); // → "Mensaje personalizado: valor"

// Mensaje libre (no es clave i18n):
logger.info('Mensaje ad-hoc sin traducción');
```

## Logging especializado

### `logHttpError` — errores HTTP con status code

El nivel se elige automáticamente: `>= 500 → error`, `4xx → warn`, resto `→ info`.

```typescript
import { logger, HttpStatusCode } from '@smdv/logwise';

logger.logHttpError('Recurso no encontrado', HttpStatusCode.NOT_FOUND, {
  userId: 123,
  endpoint: '/api/users/123',
});

logger.logHttpError('Error interno', HttpStatusCode.INTERNAL_SERVER_ERROR, {
  component: 'database',
  operation: 'getUserById',
});
```

### `logApplicationError` — errores de dominio con código tipado

El nivel se elige según el prefijo del código:

| Prefijo | Nivel | Significado |
|---|---|---|
| `SYS_` `DB_` `EXT_` | error | Infraestructura — requiere atención inmediata |
| `AUTH_` `BIZ_` `VAL_` | warn | Operacional — flujo esperado |
| resto | info | Informativo |

```typescript
import { logger, ApplicationErrorCode } from '@smdv/logwise';

// Infraestructura → error
logger.logApplicationError('Error de conexión', ApplicationErrorCode.DB_CONNECTION_ERROR, {
  component: 'user-service',
  operation: 'createUser',
  correlationId: 'corr-789',
});

// Negocio → warn
logger.logApplicationError('Saldo insuficiente', ApplicationErrorCode.BIZ_INSUFFICIENT_BALANCE, {
  userId: 123,
  requestedAmount: 1000,
  availableBalance: 500,
});

// Validación → warn
logger.logApplicationError('Campo requerido faltante', ApplicationErrorCode.VAL_REQUIRED_FIELD, {
  field: 'email',
  requestId: 'req-456',
});
```

### Códigos disponibles

**`ApplicationErrorCode`**
- `AUTH_xxx` — token expirado, inválido, sin permisos
- `DB_xxx` — conexión, query, transacción, duplicado
- `EXT_xxx` — servicio externo no disponible, timeout, respuesta inválida
- `BIZ_xxx` — lógica de negocio, recurso no encontrado, saldo insuficiente
- `SYS_xxx` — memoria, disco, CPU, red, configuración
- `VAL_xxx` — campos requeridos, formato inválido, fuera de rango
- `GEN_xxx` — error genérico

**`HttpStatusCode`**
- `2xx`: `OK` `CREATED` `ACCEPTED` `NO_CONTENT`
- `3xx`: `MOVED_PERMANENTLY` `FOUND` `NOT_MODIFIED`
- `4xx`: `BAD_REQUEST` `UNAUTHORIZED` `FORBIDDEN` `NOT_FOUND` `METHOD_NOT_ALLOWED` `CONFLICT` `UNPROCESSABLE_ENTITY` `TOO_MANY_REQUESTS`
- `5xx`: `INTERNAL_SERVER_ERROR` `NOT_IMPLEMENTED` `BAD_GATEWAY` `SERVICE_UNAVAILABLE` `GATEWAY_TIMEOUT`

### `logRequest` — requests HTTP

```typescript
logger.logRequest('API Request', 'GET', '/api/users', 200, 150, { userId: 123 });
// → info  (2xx)
// → warn  (4xx)
// → error (5xx)
```

### `logXml` — procesar y loguear XML

```typescript
import { logger, LogLevel } from '@smdv/logwise';

logger.logXml('<user><id>123</id></user>', LogLevel.INFO, { origen: 'fel-service' });
// XML válido → lo parsea y loguea como objeto JSON
// XML inválido → loguea como error con el string original
```

## Middleware Express

### Básico

```typescript
import express from 'express';
import { requestLogger } from '@smdv/logwise';

const app = express();
app.use(requestLogger);
```

### Avanzado con opciones

```typescript
import { createRequestLogger } from '@smdv/logwise';

app.use(createRequestLogger({
  logBody: true,             // incluir req.body en el log
  logHeaders: false,         // incluir headers
  skipPaths: ['/health', '/metrics'],  // paths ignorados
  skipSuccessful: false,     // omitir logs de 2xx
}));
```

## Clases de error HTTP

Para lanzar errores estandarizados desde controllers o servicios:

```typescript
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnprocessableEntityError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
} from '@smdv/logwise';

// En un controller:
throw new NotFoundError('Usuario no encontrado', 'User');
throw new ValidationError('Datos inválidos', [{ email: ['formato inválido'] }]);
throw new TooManyRequestsError(undefined, 60); // retryAfter en segundos
throw new ExternalServiceError(undefined, 'payment-gateway');
```

### Middleware de manejo de errores

```typescript
import { createErrorHandler, asyncHandler, notFoundHandler, SupportedLang } from '@smdv/logwise';

// Al final de todas las rutas, antes del error handler:
app.use(notFoundHandler());

// Error handler global:
app.use(createErrorHandler({
  lang: SupportedLang.ES,
  includeStackInDev: true,
  onError: (err, req) => {
    // callback para métricas, alertas, etc.
  },
}));

// Wrapper para evitar try/catch en cada handler:
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) throw new NotFoundError();
  res.json(user);
}));
```

## Decoradores HTTP estilo NestJS

Requiere `reflect-metadata`, `class-validator` y `class-transformer` instalados.

```typescript
import 'reflect-metadata';
import {
  Controller, Get, Post, Put, Delete,
  ValidateBody, ValidateParams, ValidateQuery, Validate,
  registerControllers,
} from '@smdv/logwise';
import { IsString, IsEmail, IsUUID } from 'class-validator';

class CreateUserDTO {
  @IsString() @IsEmail() email!: string;
  @IsString() name!: string;
}

class IdParamDTO {
  @IsUUID() id!: string;
}

@Controller('/users')
class UserController {
  @Get('/')
  async index(req: Request, res: Response) {
    res.json({ users: [] });
  }

  @Post('/')
  @ValidateBody(CreateUserDTO)
  async store(req: Request, res: Response) {
    // req.body ya es una instancia validada de CreateUserDTO
    res.status(201).json({ created: true });
  }

  @Get('/:id')
  @ValidateParams(IdParamDTO)
  async show(req: Request, res: Response) {
    res.json({ id: req.params.id });
  }

  @Put('/:id')
  @Validate({ params: IdParamDTO, body: CreateUserDTO })
  async update(req: Request, res: Response) {
    res.json({ updated: true });
  }

  @Delete('/:id')
  @ValidateParams(IdParamDTO)
  async destroy(req: Request, res: Response) {
    res.status(204).send();
  }
}

// Registrar en Express:
registerControllers(app, [UserController]);

// Configurar idioma de mensajes de validación globalmente:
import { configureValidation } from '@smdv/logwise';
configureValidation({ lang: SupportedLang.ES });
```

## Mensajes estándar de respuesta API

```typescript
import { Messages, getMessage, createMessageHelper, SupportedLang } from '@smdv/logwise';

// Acceso directo (español):
res.json({ success: true, message: Messages.CREATED_SUCCESS });

// Con i18n dinámico:
const msg = getMessage(SupportedLang.EN, 'NOT_FOUND');

// Helper con idioma fijo:
const m = createMessageHelper(SupportedLang.ES);
res.json({ success: false, message: m.get('BAD_REQUEST') });
```

## Constantes HTTP

```typescript
import { HTTP_OK, HTTP_CREATED, HTTP_NOT_FOUND, isSuccessCode, isClientError } from '@smdv/logwise';

res.status(HTTP_CREATED).json({ ... });

if (isClientError(statusCode)) { ... }
if (isSuccessCode(statusCode)) { ... }
```

## Debug en producción — activación en caliente

`setLevel()` cambia el nivel de log sin reiniciar el proceso ni redesplegar.
El segundo parámetro `resetAfterMs` restaura el nivel original automáticamente, evitando olvidar debug encendido en producción.

```typescript
import { logger, LogLevel } from '@smdv/logwise';

// Activar debug por 30 minutos y volver a warn automáticamente
logger.setLevel(LogLevel.DEBUG, 30 * 60 * 1000);

// Consultar el nivel activo
logger.getLevel(); // → 'debug'
```

Cada cambio emite un log de auditoría visible en CloudWatch:
```json
{"level":"info","message":"Log level changed","service":"ms-sale-orders","from":"warn","to":"debug","resetAfterMs":1800000}
{"level":"info","message":"Log level restored","service":"ms-sale-orders","to":"warn"}
```

### Patrón de endpoint admin en Express

Proteger el endpoint con un token de admin (no exponer sin autenticación):

```typescript
import express from 'express';
import { logger, LogLevel } from '@smdv/logwise';

const router = express.Router();

// Middleware de autenticación para rutas admin
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

// GET /admin/log-level → consultar nivel actual
router.get('/admin/log-level', adminAuth, (req, res) => {
  res.json({ level: logger.getLevel() });
});

// POST /admin/log-level { "level": "debug", "resetAfterMs": 1800000 }
router.post('/admin/log-level', adminAuth, (req, res) => {
  const { level, resetAfterMs } = req.body;

  if (!Object.values(LogLevel).includes(level)) {
    return res.status(400).json({ success: false, message: 'Invalid level' });
  }

  logger.setLevel(level as LogLevel, resetAfterMs);
  res.json({ success: true, level, resetAfterMs });
});
```

**`ADMIN_TOKEN`** debe vivir en Secrets Manager (`dev/{servicio}` o `prod/{servicio}`), nunca en el código.

### Flujo para investigar un error de producción

```bash
# 1. Activar debug por 30 minutos en el pod
curl -X POST https://api.dev-sale.net/ms-sale-orders/admin/log-level \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level":"debug","resetAfterMs":1800000}'

# 2. Reproducir el error y observar en CloudWatch / Grafana
# Los logs de debug aparecen como una sola línea JSON, filtrables por service + level

# 3. El nivel vuelve a warn automáticamente al cumplirse resetAfterMs
#    o se puede restaurar manualmente:
curl -X POST https://api.dev-sale.net/ms-sale-orders/admin/log-level \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level":"warn"}'
```

> **Nota de costo**: el modo debug puede multiplicar el volumen de logs en CloudWatch. Usar siempre `resetAfterMs` en producción.

## Transports personalizados

`LogTransport` es la interfaz para agregar destinos de log adicionales (métricas, alertas, tests):

```typescript
import { LogTransport, logger } from '@smdv/logwise';

class MyTransport implements LogTransport {
  write(entry: Record<string, any>): void {
    // entry = { level, message, service, timestamp, ...meta }
    myMonitoringSystem.send(entry);
  }
}

logger.addTransport(new MyTransport());
```

> Los stubs `TransportFactory.createCloudWatchTransport`, `createELKTransport`, `createLokiTransport` y `createDatadogTransport` son placeholders para implementaciones futuras.

## Scripts

```bash
npm run build   # compilar TypeScript
npm run test    # ejecutar tests
npm run lint    # ESLint
npm run pack    # empaquetar
```

## Estructura

```
src/
├── logger.ts          # Clase Logger principal
├── middleware.ts      # Middleware Express (requestLogger, createRequestLogger)
├── factory.ts         # createCustomLogger, TransportFactory
├── types.ts           # Tipos e interfaces exportados
├── constants.ts       # ENV_KEYS, DEFAULTS
├── xml.ts             # XmlProcessor
├── http/              # Constantes HTTP y helpers
├── errors/            # ApiError, clases de error, createErrorHandler
├── messages/          # Mensajes i18n de respuesta API
├── i18n/              # Mensajes i18n del logger
├── decorators/        # @Controller, @Get/@Post/…, @ValidateBody/…
└── __tests__/
```

## Licencia

MIT
