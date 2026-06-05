# @smdv/logwise

Logging library for Node.js microservices. Every log entry is a single-line JSON — ready for CloudWatch Logs and Grafana Loki with zero configuration.

## What it does

- **Single-line JSON per event** — structured and queryable by default
- **Automatic log levels by environment** — `debug` in local/develop, `warn` in testing/production
- **`LOG_PRETTY=true`** — colorized, indented output for local development without an observability stack
- **`setLevel()` hot-reload** — change log level at runtime without restarting the process
- **Express middleware** — automatic request/response logging
- **HTTP-style decorators** — `@Controller`, `@Get`, `@Post`, `@ValidateBody`, etc. (NestJS-style for Express)
- **Full TypeScript support**

> **Error classes, HTTP response helpers, and API messages** are provided by [`@smdv/middleware`](https://www.npmjs.com/package/@smdv/middleware), not this package.

## Installation

```bash
npm install @smdv/logwise
```

## Environment variables

| Variable | Values | Default | Description |
|---|---|---|---|
| `SERVICE_NAME` | string | `unknown-service` | Injected into every log entry |
| `NODE_ENV` | `local` `develop` `testing` `production` | `develop` | Controls automatic log level |
| `LOG_LEVEL` | `debug` `info` `warn` `error` | — | Overrides `NODE_ENV` level |
| `LOG_LANG` | `es` `en` | `en` | Language for built-in i18n messages |
| `LOG_PRETTY` | `true` `false` | `false` | Colorized output (local only — never in CloudWatch environments) |

### Automatic levels by `NODE_ENV`

| Environment | Active level | Logs emitted |
|---|---|---|
| `local` / `develop` | `debug` | debug · info · warn · error |
| `testing` / `production` | `warn` | warn · error |

> `LOG_LEVEL` takes precedence over `NODE_ENV` when set.

## Output format

### Default — compact JSON (CloudWatch / Grafana)

Each call emits exactly **one JSON line**, regardless of how many meta fields are included.

```json
{"level":"info","message":"Server started","service":"ms-sale-orders","timestamp":"2026-06-04 10:00:00"}
{"level":"warn","message":"Slow connection","service":"ms-sale-orders","timestamp":"2026-06-04 10:00:01","latencyMs":1500}
{"level":"error","message":"DB connection failed","service":"ms-sale-orders","timestamp":"2026-06-04 10:00:02","host":"mysql:3306"}
```

### `LOG_PRETTY=true` — colorized for local development

```
[INFO]  [develop] 2026-06-04 10:00:00 [ms-sale-orders]: Server started
[WARN]  [develop] 2026-06-04 10:00:01 [ms-sale-orders]: Slow connection
{
  "latencyMs": 1500
}
[ERROR] [develop] 2026-06-04 10:00:02 [ms-sale-orders]: DB connection failed
Error: ECONNREFUSED
    at Object.<anonymous> (/app/index.js:10:23)
```

## Basic usage

```typescript
import { logger } from '@smdv/logwise';

logger.info('Server ready on port 3000');
logger.warn('Slow connection detected', undefined, { latencyMs: 1200 });
logger.error('Failed to connect to Redis', undefined, { host: 'redis:6379' });
logger.debug('Request payload', undefined, { body: req.body });
```

## Factory helper (recommended)

```typescript
import { createCustomLogger } from '@smdv/logwise';

const logger = createCustomLogger({ service: process.env.APP_NAME || 'ms-sale-orders' });

logger.info('Order created', undefined, { orderId: 42 });
```

## Custom logger instance

```typescript
import { Logger, LogLevel, SupportedLang } from '@smdv/logwise';

const log = new Logger({
  service: 'ms-sale-orders',
  level: LogLevel.DEBUG,
  lang: SupportedLang.ES,
  logPretty: false,
});
```

## i18n messages

The logger checks if the first argument is a registered i18n key. If it exists, it translates it using `LOG_LANG`; otherwise it uses the string as-is.

```typescript
logger.info('SERVICE_STARTED');    // → "Service started successfully" (en)
logger.warn('MEMORY_WARNING');     // → "Memory warning"
logger.error('DB_ERROR');          // → "Database error"

// Free-form message (not an i18n key):
logger.info('Custom message without translation');
```

## Specialized logging methods

### `logHttpError` — HTTP errors with automatic level selection

Level is chosen automatically: `>= 500 → error`, `4xx → warn`, otherwise `info`.

```typescript
import { logger, HttpStatusCode } from '@smdv/logwise';

logger.logHttpError('Resource not found', HttpStatusCode.NOT_FOUND, {
  userId: 123,
  endpoint: '/api/users/123',
});
```

### `logApplicationError` — domain errors with typed codes

Level is chosen by code prefix:

| Prefix | Level | Meaning |
|---|---|---|
| `SYS_` `DB_` `EXT_` | error | Infrastructure — needs immediate attention |
| `AUTH_` `BIZ_` `VAL_` | warn | Operational — expected flow |
| other | info | Informational |

```typescript
import { logger, ApplicationErrorCode } from '@smdv/logwise';

logger.logApplicationError('Connection refused', ApplicationErrorCode.DB_CONNECTION_ERROR, {
  component: 'user-service',
  operation: 'createUser',
});

logger.logApplicationError('Insufficient balance', ApplicationErrorCode.BIZ_INSUFFICIENT_BALANCE, {
  userId: 123,
  requestedAmount: 1000,
  availableBalance: 500,
});
```

Available code groups: `AUTH_*` · `DB_*` · `EXT_*` · `BIZ_*` · `SYS_*` · `VAL_*` · `GEN_*`

### `logRequest` — HTTP requests

```typescript
logger.logRequest('API Request', 'GET', '/api/users', 200, 150, { userId: 123 });
// → info  (2xx)
// → warn  (4xx)
// → error (5xx)
```

### `logXml` — parse and log XML

```typescript
import { logger, LogLevel } from '@smdv/logwise';

logger.logXml('<user><id>123</id></user>', LogLevel.INFO, { source: 'fel-service' });
// Valid XML → parsed and logged as JSON
// Invalid XML → logged as error with raw string
```

## `HttpStatusCode` enum

```typescript
import { HttpStatusCode } from '@smdv/logwise';

// 2xx
HttpStatusCode.OK                   // 200
HttpStatusCode.CREATED              // 201
HttpStatusCode.NO_CONTENT           // 204

// 4xx
HttpStatusCode.BAD_REQUEST          // 400
HttpStatusCode.UNAUTHORIZED         // 401
HttpStatusCode.FORBIDDEN            // 403
HttpStatusCode.NOT_FOUND            // 404
HttpStatusCode.CONFLICT             // 409
HttpStatusCode.UNPROCESSABLE_ENTITY // 422
HttpStatusCode.TOO_MANY_REQUESTS    // 429

// 5xx
HttpStatusCode.INTERNAL_SERVER_ERROR // 500
HttpStatusCode.SERVICE_UNAVAILABLE   // 503
HttpStatusCode.GATEWAY_TIMEOUT       // 504
```

## Hot reload — change log level at runtime

`setLevel()` changes the log level without restarting the process or redeploying.
`resetAfterMs` automatically restores the original level — prevents accidentally leaving debug on in production.

```typescript
import { logger, LogLevel } from '@smdv/logwise';

// Enable debug for 30 minutes, then revert to warn automatically
logger.setLevel(LogLevel.DEBUG, 30 * 60 * 1000);

// Query the current level
logger.getLevel(); // → 'debug'
```

Each change emits an audit log visible in CloudWatch:

```json
{"level":"info","message":"Log level changed","service":"ms-sale-orders","from":"warn","to":"debug","resetAfterMs":1800000}
{"level":"info","message":"Log level restored","service":"ms-sale-orders","to":"warn"}
```

### Admin endpoint pattern (Express)

```typescript
import express from 'express';
import { logger, LogLevel } from '@smdv/logwise';

const router = express.Router();

function adminAuth(req: any, res: any, next: any) {
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

router.get('/admin/log-level', adminAuth, (_req, res) => {
  res.json({ level: logger.getLevel() });
});

router.post('/admin/log-level', adminAuth, (req, res) => {
  const { level, resetAfterMs } = req.body;
  if (!Object.values(LogLevel).includes(level)) {
    return res.status(400).json({ success: false, message: 'Invalid level' });
  }
  logger.setLevel(level as LogLevel, resetAfterMs);
  res.json({ success: true, level, resetAfterMs });
});
```

> `ADMIN_TOKEN` must live in a secrets manager (AWS Secrets Manager, Vault, etc.) — never in source code.

### Investigating a production error

```bash
# 1. Enable debug for 30 minutes
curl -X POST https://api.example.com/ms-sale-orders/admin/log-level \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level":"debug","resetAfterMs":1800000}'

# 2. Reproduce the error and observe in CloudWatch / Grafana

# 3. Level reverts automatically — or restore manually:
curl -X POST https://api.example.com/ms-sale-orders/admin/log-level \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level":"warn"}'
```

> Debug mode can multiply CloudWatch log volume significantly. Always use `resetAfterMs` in production.

## Express middleware

### Basic

```typescript
import express from 'express';
import { requestLogger } from '@smdv/logwise';

const app = express();
app.use(requestLogger);
```

### Advanced

```typescript
import { createRequestLogger } from '@smdv/logwise';

app.use(createRequestLogger({
  logBody: true,
  logHeaders: false,
  skipPaths: ['/health', '/metrics'],
  skipSuccessful: false,
}));
```

## HTTP-style decorators (Express)

Requires `reflect-metadata`, `class-validator`, and `class-transformer`.

```typescript
import 'reflect-metadata';
import {
  Controller, Get, Post, Put, Delete,
  ValidateBody, ValidateParams, Validate,
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
}

// Register with Express
registerControllers(app, [UserController]);
```

## Custom transports

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

## Package structure

```
src/
├── logger.ts          # Logger class — core
├── middleware.ts      # Express request logger
├── factory.ts         # createCustomLogger
├── types.ts           # Exported types and interfaces
├── constants.ts       # ENV_KEYS, DEFAULTS
├── xml.ts             # XmlProcessor
├── messages/          # Internal i18n (not part of public API)
├── decorators/        # @Controller, @Get/@Post/…, @ValidateBody/…
└── __tests__/
```

## Error handling and response formatting

Error classes (`ApiError`, `NotFoundError`, `ValidationError`…), HTTP response helpers (`okResponse`, `notFoundResponse`…), exception handlers for AdonisJS/NestJS (`ExceptionHandlerV5`, `ExceptionHandlerV6`), and API messages (`Messages`, `getMessage`…) are provided by [`@smdv/middleware`](https://www.npmjs.com/package/@smdv/middleware).

## Changelog

### 2.1.0

Removed from public API (moved to `@smdv/middleware`):
- Error classes: `ApiError`, `NotFoundError`, `ValidationError`, `ForbiddenError`, etc.
- Error handler: `handleError`, `createErrorHandler`, `asyncHandler`, `notFoundHandler`
- Error codes: `ERROR_CODES`, `ERROR_MESSAGE_KEYS`
- HTTP constants: `HTTP_OK`, `HTTP_NOT_FOUND`, `isSuccessCode`, `isClientError`, etc.
- API messages: `Messages`, `getMessage`, `createMessageHelper`, `translate`

`HttpStatusCode` enum stays in logwise (used for logging context, not HTTP responses).

### 2.0.0

Removed Winston. Native logger with `setLevel()`, `LOG_PRETTY`, automatic levels by `NODE_ENV`.

## Scripts

```bash
npm run build   # compile TypeScript
npm run test    # run tests
npm run lint    # ESLint
```

## License

MIT
