# ⚙️ mcp-sdk-ts

**TypeScript SDK for building Model Context Protocol (MCP) servers with minimal boilerplate**

Build production-ready MCP servers in just a few lines of code with automatic schema validation, type safety, and built-in middleware.

[![npm version](https://badge.fury.io/js/mcp-sdk-ts.svg)](https://www.npmjs.com/package/mcp-sdk-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)

---

## 🎯 Features

- **🚀 Zero Boilerplate** - Create MCP servers in <10 lines of code
- **🔒 Type-Safe** - Full TypeScript support with Zod schema validation
- **🛠️ Built-in Middleware** - Auth, rate limiting, CORS, logging out of the box
- **📝 Auto Documentation** - Generate manifest.json and API docs automatically
- **🔌 Code Generation** - Convert OpenAPI specs and databases into MCP tools
- **⚡ Hot Reload** - Development mode with automatic restart on file changes
- **🧪 Testing Support** - Built-in schema validation and contract testing
- **📦 Production Ready** - Structured logging, metrics, error handling

---

## 📦 Installation

```bash
npm install -g mcp-sdk-ts
```

Or use with npx (no installation required):

```bash
npx mcp-sdk-ts init my-server
```

---

## 🚀 Quick Start

### Create a New Project

```bash
mcp init my-mcp-server
cd my-mcp-server
npm install
npm run dev
```

### Write Your First Tool

```typescript
import { createMCPServer, defineTool, z } from 'mcp-sdk-ts';

const server = createMCPServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

server.registerTool(defineTool({
  name: 'greet',
  description: 'Greet a user by name',
  input: z.object({
    name: z.string(),
  }),
  output: z.object({
    message: z.string(),
  }),
  handler: async ({ input, ctx }) => {
    ctx.logger.info(`Greeting ${input.name}`);
    return { message: `Hello, ${input.name}!` };
  },
}));

server.start();
```

**That's it!** Your MCP server is ready to use.

---

## 📚 Core Concepts

### 1. Define Tools with Zod Schemas

```typescript
server.registerTool(defineTool({
  name: 'getUserData',
  description: 'Get user information by ID',
  input: z.object({
    userId: z.string(),
  }),
  output: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  handler: async ({ input, ctx }) => {
    const res = await ctx.http.get(`${process.env.API_URL}/users/${input.userId}`);
    return {
      id: res.data.id,
      name: res.data.name,
      email: res.data.email,
    };
  },
}));
```

### 2. Built-in Context Object

Every handler receives a `ctx` object with:

```typescript
{
  http: axios,      // Pre-configured HTTP client
  db: knex,         // Database connection (if configured)
  logger: pino,     // Structured logger
  env: process.env, // Environment variables
  request: {        // Request metadata
    id: string,
    timestamp: number
  }
}
```

### 3. Middleware Support

```typescript
const server = createMCPServer({
  name: 'secure-server',
  auth: {
    type: 'apiKey',
    headerName: 'x-api-key',
    validate: async (token) => token === process.env.API_KEY,
  },
  rateLimit: {
    max: 100,
    timeWindow: '1m',
  },
  cors: true,
});
```

---

## 🛠️ CLI Commands

### `mcp init <project-name>`

Scaffold a new MCP server project:

```bash
mcp init my-api-server --template advanced
```

**Templates:**
- `basic` - Minimal setup (default)
- `express` - Express.js integration
- `fastify` - Fastify integration
- `advanced` - Full features (auth, DB, middleware)

### `mcp generate openapi <spec.yaml>`

Auto-generate tools from OpenAPI specification:

```bash
mcp generate openapi ./api-spec.yaml --output ./src/generated
```

Features:
- Maps `operationId` → tool name
- Infers Zod schemas from OpenAPI types
- Generates handler stubs
- Supports parameters and request bodies

### `mcp generate db <connection-string>`

Generate tools from database schema:

```bash
mcp generate db postgresql://user:pass@localhost/db --read-only
```

Generates:
- `read_{table}` - List all records
- `read_{table}_by_id` - Get single record
- `search_{table}` - Search records
- `create_{table}` - Insert (if not read-only)
- `update_{table}` - Update (if not read-only)
- `delete_{table}` - Delete (if not read-only)

### `mcp run [file]`

Run server in development mode:

```bash
mcp run --watch --port 3000
```

Options:
- `--watch` - Auto-reload on file changes
- `--port <number>` - Port number
- `--env <file>` - Environment file path

### `mcp test`

Run schema validation tests:

```bash
mcp test --tool getUserData --coverage
```

---

## 📖 Advanced Usage

### Pre/Post Handler Hooks

```typescript
server.registerTool(defineTool({
  name: 'secureAction',
  input: z.object({ data: z.string() }),
  output: z.object({ result: z.string() }),
  
  preHandler: [
    async (ctx, input) => {
      // Validate, transform, or reject
      if (input.data.length > 1000) {
        throw new Error('Input too large');
      }
    }
  ],
  
  postHandler: [
    async (ctx, input, output) => {
      // Log, cache, or transform output
      ctx.logger.info('Action completed', { input, output });
    }
  ],
  
  handler: async ({ input, ctx }) => {
    return { result: input.data.toUpperCase() };
  },
}));
```

### Custom Middleware

```typescript
import { createLoggingMiddleware, createAuthMiddleware } from 'mcp-sdk-ts';

const server = createMCPServer({
  name: 'my-server',
  middleware: [
    createLoggingMiddleware(logger),
    createAuthMiddleware({
      type: 'bearer',
      validate: async (token, ctx) => {
        // Custom auth logic
        return await verifyJWT(token);
      },
    }),
  ],
});
```

### Generate Manifest

```typescript
const manifest = server.getManifest();
// {
//   name: 'my-server',
//   version: '1.0.0',
//   tools: [...]
// }
```

Auto-generate documentation:

```bash
mcp docs > TOOLS.md
```

---

## 🏗️ Project Structure

```
my-mcp-server/
├── src/
│   ├── index.ts           # Server entry point
│   ├── tools/             # Tool definitions
│   │   ├── users.ts
│   │   └── products.ts
│   └── generated/         # Auto-generated tools
│       ├── openapi-tools.ts
│       └── db-tools.ts
├── package.json
├── tsconfig.json
├── .env
└── README.md
```

---

## 🔍 Examples

### Example 1: Weather API Server

```typescript
import { createMCPServer, defineTool, z } from 'mcp-sdk-ts';

const server = createMCPServer({ name: 'weather-api-mcp' });

server.registerTool(defineTool({
  name: 'getWeather',
  input: z.object({ city: z.string() }),
  output: z.object({
    city: z.string(),
    temperature: z.number(),
    condition: z.string(),
  }),
  handler: async ({ input, ctx }) => {
    const res = await ctx.http.get(`${process.env.WEATHER_API}/current?q=${input.city}`);
    return {
      city: input.city,
      temperature: res.data.temp,
      condition: res.data.weather,
    };
  },
}));

server.start();
```

### Example 2: Database Knowledge Graph

```typescript
server.registerTool(defineTool({
  name: 'createNode',
  input: z.object({
    label: z.string(),
    properties: z.record(z.unknown()),
  }),
  output: z.object({ id: z.number() }),
  handler: async ({ input, ctx }) => {
    const [node] = await ctx.db('nodes').insert({
      label: input.label,
      properties: JSON.stringify(input.properties),
    }).returning('id');
    
    return { id: node.id };
  },
}));
```

### Example 3: OpenAPI Integration

```bash
mcp generate openapi ./petstore.yaml
```

Generates tools like:

```typescript
getPetById({ id: 123 }) → { name: 'Fluffy', status: 'available' }
createPet({ name: 'Max', status: 'available' }) → { id: 456 }
```

---

## 🧪 Testing

### Schema Validation Tests

```typescript
import { validateWithSchema } from 'mcp-sdk-ts';

const tool = server.getTools().find(t => t.name === 'greet');

const result = validateWithSchema(tool.inputSchema, { name: 'Alice' });
expect(result.success).toBe(true);
```

### Integration Tests

```typescript
import { createMCPServer } from 'mcp-sdk-ts';

test('tool executes correctly', async () => {
  const server = createMCPServer({ name: 'test-server' });
  // Register tools
  // Call handler directly for testing
});
```

---

## 🔐 Security Best Practices

```typescript
const server = createMCPServer({
  name: 'secure-server',
  
  // API key authentication
  auth: {
    type: 'apiKey',
    headerName: 'x-api-key',
    validate: async (token) => token === process.env.API_KEY,
  },
  
  // Rate limiting
  rateLimit: {
    max: 100,
    timeWindow: '1m',
  },
  
  // CORS configuration
  cors: {
    origin: ['https://trusted-domain.com'],
    credentials: true,
  },
  
  // Logging
  logging: {
    level: 'info',
    pretty: false,
  },
});
```

---

## 📊 Observability

### Structured Logging

```typescript
ctx.logger.info('Processing request', { userId: 123 });
ctx.logger.error('Failed to fetch data', { error: err.message });
```

### Metrics (Prometheus)

```typescript
const server = createMCPServer({
  name: 'my-server',
  metrics: true, // Enables /metrics endpoint
});
```

---

## 🚢 Deployment

### Using with MCP Clients

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/my-mcp-server",
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT © [Yash Gupta](https://github.com/gyash1512)

---

## 🔗 Links

- **NPM**: https://www.npmjs.com/package/mcp-sdk-ts
- **GitHub**: https://github.com/gyash1512/mcp-sdk-ts
- **Issues**: https://github.com/gyash1512/mcp-sdk-ts/issues
- **MCP Spec**: https://modelcontextprotocol.io

---

**Built with ❤️ for the MCP community**