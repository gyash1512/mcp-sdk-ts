# API Documentation - mcp-sdk-ts

Complete API reference for mcp-sdk-ts

---

## Core API

### `createMCPServer(config)`

Create a new MCP server instance.

**Parameters:**
- `config` (MCPServerConfig): Server configuration

**Returns:** `MCPServerInstance`

**Example:**
```typescript
const server = createMCPServer({
  name: 'my-server',
  version: '1.0.0',
  description: 'My MCP server',
  port: 3000,
  auth: {
    type: 'apiKey',
    headerName: 'x-api-key',
  },
  rateLimit: {
    max: 100,
    timeWindow: '1m',
  },
  cors: true,
  logging: {
    level: 'info',
    pretty: true,
  },
});
```

---

### `defineTool(config)`

Define a new MCP tool with type-safe schemas.

**Parameters:**
- `config.name` (string): Tool name
- `config.description` (string, optional): Tool description
- `config.input` (ZodSchema): Input validation schema
- `config.output` (ZodSchema): Output validation schema
- `config.handler` (Function): Tool handler function
- `config.preHandler` (Array, optional): Pre-handler hooks
- `config.postHandler` (Array, optional): Post-handler hooks
- `config.metadata` (object, optional): Additional metadata

**Returns:** `MCPToolDefinition`

**Example:**
```typescript
const greetTool = defineTool({
  name: 'greet',
  description: 'Greet a user',
  input: z.object({
    name: z.string(),
    formal: z.boolean().optional().default(false),
  }),
  output: z.object({
    message: z.string(),
  }),
  handler: async ({ input, ctx }) => {
    const greeting = input.formal ? 'Good day' : 'Hello';
    return { message: `${greeting}, ${input.name}!` };
  },
});
```

---

## MCPServerInstance Methods

### `registerTool(tool)`

Register a tool with the server.

**Parameters:**
- `tool` (MCPToolDefinition): Tool definition

**Example:**
```typescript
server.registerTool(greetTool);
```

---

### `use(middleware)`

Add middleware to the server.

**Parameters:**
- `middleware` (Function): Middleware function

**Example:**
```typescript
server.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});
```

---

### `useAuth(validator)`

Add authentication middleware.

**Parameters:**
- `validator` (Function): Validation function

**Example:**
```typescript
server.useAuth(async (req) => {
  const token = req.headers['x-api-key'];
  return token === process.env.API_KEY;
});
```

---

### `start(port?)`

Start the MCP server.

**Parameters:**
- `port` (number, optional): Port number

**Returns:** `Promise<void>`

**Example:**
```typescript
await server.start(3000);
```

---

### `stop()`

Stop the server.

**Returns:** `Promise<void>`

**Example:**
```typescript
await server.stop();
```

---

### `getManifest()`

Get server manifest with tool definitions.

**Returns:** `MCPManifest`

**Example:**
```typescript
const manifest = server.getManifest();
console.log(manifest.tools);
```

---

### `getTools()`

Get all registered tools.

**Returns:** `MCPToolDefinition[]`

**Example:**
```typescript
const tools = server.getTools();
console.log(`Registered ${tools.length} tools`);
```

---

## Context Object (ctx)

The context object passed to tool handlers:

```typescript
interface MCPContext {
  http: AxiosInstance;      // HTTP client
  db?: Knex;                // Database (if configured)
  logger: Logger;           // Pino logger
  env: Record<string, string>; // Environment variables
  request?: {
    id: string;
    timestamp: number;
    headers?: Record<string, string>;
  };
}
```

### `ctx.http`

Pre-configured Axios instance for HTTP requests.

**Example:**
```typescript
const response = await ctx.http.get('https://api.example.com/data');
const data = response.data;
```

### `ctx.logger`

Pino logger instance.

**Methods:**
- `ctx.logger.trace(msg, data?)`
- `ctx.logger.debug(msg, data?)`
- `ctx.logger.info(msg, data?)`
- `ctx.logger.warn(msg, data?)`
- `ctx.logger.error(msg, data?)`
- `ctx.logger.fatal(msg, data?)`

**Example:**
```typescript
ctx.logger.info('Processing request', { userId: input.userId });
ctx.logger.error('Operation failed', { error: err.message });
```

### `ctx.db`

Knex database instance (if configured).

**Example:**
```typescript
const users = await ctx.db('users').select('*').limit(10);
```

---

## Middleware Functions

### `createRateLimitMiddleware(options)`

Create rate limiting middleware.

**Parameters:**
- `options.max` (number): Max requests
- `options.timeWindow` (string): Time window ('1s', '1m', '1h', '1d')

**Example:**
```typescript
import { createRateLimitMiddleware } from 'mcp-sdk-ts';

const rateLimiter = createRateLimitMiddleware({
  max: 100,
  timeWindow: '1m',
});

server.use(rateLimiter);
```

---

### `createAuthMiddleware(options)`

Create authentication middleware.

**Parameters:**
- `options.type` ('apiKey' | 'bearer' | 'custom')
- `options.headerName` (string, optional): Header name for API key
- `options.validate` (Function, optional): Custom validation

**Example:**
```typescript
import { createAuthMiddleware } from 'mcp-sdk-ts';

const authMiddleware = createAuthMiddleware({
  type: 'apiKey',
  headerName: 'x-api-key',
  validate: async (token, ctx) => {
    return token === process.env.API_KEY;
  },
});

server.use(authMiddleware);
```

---

### `createCorsMiddleware(options?)`

Create CORS middleware.

**Parameters:**
- `options.origin` (string | string[] | boolean)
- `options.methods` (string[])
- `options.allowedHeaders` (string[])
- `options.credentials` (boolean)

**Example:**
```typescript
import { createCorsMiddleware } from 'mcp-sdk-ts';

const cors = createCorsMiddleware({
  origin: ['https://example.com'],
  credentials: true,
});

server.use(cors);
```

---

### `createLoggingMiddleware(logger)`

Create request logging middleware.

**Example:**
```typescript
import { createLoggingMiddleware } from 'mcp-sdk-ts';
import pino from 'pino';

const logger = pino({ level: 'info' });
const logging = createLoggingMiddleware(logger);

server.use(logging);
```

---

## Utility Functions

### `zodToJsonSchema(schema)`

Convert Zod schema to JSON Schema.

**Parameters:**
- `schema` (ZodType): Zod schema

**Returns:** JSON Schema object

**Example:**
```typescript
import { zodToJsonSchema, z } from 'mcp-sdk-ts';

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const jsonSchema = zodToJsonSchema(schema);
```

---

### `validateWithSchema(schema, data)`

Validate data against Zod schema.

**Parameters:**
- `schema` (ZodType): Zod schema
- `data` (unknown): Data to validate

**Returns:** Validation result

**Example:**
```typescript
import { validateWithSchema, z } from 'mcp-sdk-ts';

const schema = z.object({ name: z.string() });
const result = validateWithSchema(schema, { name: 'Alice' });

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.errors);
}
```

---

### `formatZodError(error)`

Format Zod validation errors for display.

**Parameters:**
- `error` (ZodError): Zod error

**Returns:** Formatted error string

**Example:**
```typescript
import { formatZodError } from 'mcp-sdk-ts';

try {
  schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(formatZodError(error));
  }
}
```

---

## Manifest Generation

### `generateManifest(config, tools)`

Generate MCP manifest from config and tools.

**Example:**
```typescript
import { generateManifest } from 'mcp-sdk-ts';

const manifest = generateManifest(serverConfig, tools);
```

---

### `generateMarkdownDocs(manifest)`

Generate Markdown documentation from manifest.

**Example:**
```typescript
import { generateMarkdownDocs } from 'mcp-sdk-ts';

const docs = generateMarkdownDocs(manifest);
console.log(docs);
```

---

### `generateOpenAPISpec(manifest)`

Generate OpenAPI specification from manifest.

**Example:**
```typescript
import { generateOpenAPISpec } from 'mcp-sdk-ts';

const openapi = generateOpenAPISpec(manifest);
```

---

## CLI Commands

### `mcp init <project-name>`

Initialize new MCP server project.

**Options:**
- `-t, --template <template>`: Template name (basic|express|fastify|advanced)
- `--no-typescript`: Use JavaScript

**Example:**
```bash
mcp init my-server --template advanced
```

---

### `mcp generate <type> <source>`

Generate tools from external sources.

**Types:**
- `openapi`: Generate from OpenAPI spec
- `db`: Generate from database

**Options:**
- `-o, --output <dir>`: Output directory
- `--base-url <url>`: Base URL (OpenAPI)
- `--tables <tables>`: Tables to include (DB)
- `--read-only`: Read-only tools (DB)

**Examples:**
```bash
mcp generate openapi ./spec.yaml --output ./src/generated
mcp generate db postgresql://localhost/db --read-only
```

---

### `mcp run [file]`

Run server in development mode.

**Options:**
- `-w, --watch`: Watch for changes
- `-p, --port <port>`: Port number
- `-e, --env <file>`: Environment file

**Example:**
```bash
mcp run --watch --port 3000
```

---

### `mcp test`

Run tests.

**Options:**
- `-t, --tool <name>`: Test specific tool
- `-c, --coverage`: Generate coverage

**Example:**
```bash
mcp test --tool greet --coverage
```

---

## Type Definitions

### `MCPServerConfig`

```typescript
interface MCPServerConfig {
  name: string;
  version?: string;
  description?: string;
  framework?: 'fastify' | 'express';
  port?: number;
  cors?: boolean | CorsOptions;
  rateLimit?: RateLimitOptions;
  auth?: AuthOptions;
  logging?: LoggingOptions;
  database?: DatabaseOptions;
  metrics?: boolean;
  middleware?: Middleware[];
}
```

### `MCPToolDefinition`

```typescript
interface MCPToolDefinition<TInput, TOutput> {
  name: string;
  description?: string;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  handler: ToolHandler<TInput, TOutput>;
  metadata?: Record<string, any>;
  preHandler?: PreHandlerHook[];
  postHandler?: PostHandlerHook[];
}
```

### `ToolHandler`

```typescript
interface ToolHandler<TInput, TOutput> {
  (params: { input: TInput; ctx: MCPContext }): Promise<TOutput>;
}
```

---

## Best Practices

### 1. Always Use Type-Safe Schemas

```typescript
// ✅ Good
input: z.object({
  email: z.string().email(),
  age: z.number().min(0),
})

// ❌ Bad
input: z.any()
```

### 2. Handle Errors Properly

```typescript
handler: async ({ input, ctx }) => {
  try {
    return await operation();
  } catch (error) {
    ctx.logger.error('Operation failed', error);
    throw new Error('Failed to complete operation');
  }
}
```

### 3. Log Important Events

```typescript
handler: async ({ input, ctx }) => {
  ctx.logger.info('Starting operation', { input });
  const result = await operation();
  ctx.logger.info('Operation completed', { result });
  return result;
}
```

### 4. Validate Environment Variables

```typescript
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

---

## Examples

See the [examples/](./examples/) directory for complete working examples:

- `demo-mcp/` - Basic demonstration with greeting, calculator, and HTTP fetch tools
- More examples coming soon!

---

For more information, see the [README](./README.md) and [Quick Start Guide](./QUICKSTART.md).
