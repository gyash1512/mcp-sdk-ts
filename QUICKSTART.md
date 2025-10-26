# Quick Start Guide - mcp-sdk-ts

Get started with mcp-sdk-ts in 5 minutes!

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g mcp-sdk-ts
```

### Using npx (No Installation)

```bash
npx mcp-sdk-ts init my-server
```

---

## 🚀 Create Your First MCP Server

### Step 1: Initialize Project (1 minute)

```bash
mcp init my-first-server
cd my-first-server
npm install
```

This creates:
```
my-first-server/
├── src/
│   └── index.ts      # Your server code
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Step 2: Review the Generated Code

Open `src/index.ts`:

```typescript
import { createMCPServer, defineTool, z } from 'mcp-sdk-ts';
import dotenv from 'dotenv';

dotenv.config();

const server = createMCPServer({
  name: 'my-first-server',
  version: '1.0.0',
});

server.registerTool(defineTool({
  name: 'hello',
  description: 'Say hello',
  input: z.object({
    name: z.string(),
  }),
  output: z.object({
    message: z.string(),
    timestamp: z.string(),
  }),
  handler: async ({ input, ctx }) => {
    return {
      message: `Hello, ${input.name}!`,
      timestamp: new Date().toISOString(),
    };
  },
}));

server.start();
```

### Step 3: Run Your Server

```bash
npm run dev
```

You should see:
```
Starting my-first-server MCP Server...
Registered tools: 1
my-first-server MCP Server running on stdio
```

---

## 🛠️ Add Your First Custom Tool

Edit `src/index.ts` and add a new tool:

```typescript
server.registerTool(defineTool({
  name: 'calculate',
  description: 'Perform basic math operations',
  input: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  output: z.object({
    result: z.number(),
  }),
  handler: async ({ input }) => {
    let result: number;
    switch (input.operation) {
      case 'add':
        result = input.a + input.b;
        break;
      case 'subtract':
        result = input.a - input.b;
        break;
      case 'multiply':
        result = input.a * input.b;
        break;
      case 'divide':
        if (input.b === 0) throw new Error('Division by zero');
        result = input.a / input.b;
        break;
    }
    return { result };
  },
}));
```

---

## 🔌 Configure for MCP Client

### For Claude Desktop

1. Edit config file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add your server:

```json
{
  "mcpServers": {
    "my-first-server": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/absolute/path/to/my-first-server"
    }
  }
}
```

3. Restart Claude Desktop

---

## 🧪 Test Your Tools

Try these queries in your MCP client:

1. **Test Hello Tool**
   > "Use the hello tool to greet Alice"
   
   Expected response:
   ```json
   {
     "message": "Hello, Alice!",
     "timestamp": "2025-10-26T12:00:00.000Z"
   }
   ```

2. **Test Calculate Tool**
   > "Use the calculate tool to add 5 and 3"
   
   Expected response:
   ```json
   {
     "result": 8
   }
   ```

---

## 📚 Next Steps

### Add External API Integration

```typescript
server.registerTool(defineTool({
  name: 'fetchWeather',
  description: 'Get weather data',
  input: z.object({
    city: z.string(),
  }),
  output: z.object({
    temperature: z.number(),
    condition: z.string(),
  }),
  handler: async ({ input, ctx }) => {
    const response = await ctx.http.get(
      `https://api.weather.com/v1/current?city=${input.city}`,
      {
        headers: {
          'API-Key': process.env.WEATHER_API_KEY,
        },
      }
    );
    
    return {
      temperature: response.data.temp,
      condition: response.data.condition,
    };
  },
}));
```

### Add Authentication

```typescript
const server = createMCPServer({
  name: 'secure-server',
  auth: {
    type: 'apiKey',
    headerName: 'x-api-key',
    validate: async (token) => {
      return token === process.env.API_KEY;
    },
  },
});
```

### Add Rate Limiting

```typescript
const server = createMCPServer({
  name: 'rate-limited-server',
  rateLimit: {
    max: 100,           // 100 requests
    timeWindow: '1m',   // per minute
  },
});
```

---

## 🎨 Explore Templates

### Advanced Template

```bash
mcp init advanced-server --template advanced
```

Includes:
- Authentication
- Database integration
- Multiple tools
- Advanced middleware

### Express Template

```bash
mcp init express-server --template express
```

Uses Express.js for HTTP server.

### Fastify Template

```bash
mcp init fastify-server --template fastify
```

Uses Fastify for better performance.

---

## 🔧 Code Generation

### From OpenAPI Spec

```bash
mcp generate openapi ./api-spec.yaml --output ./src/generated
```

Automatically creates tools from your API specification.

### From Database

```bash
mcp generate db postgresql://localhost/mydb --read-only
```

Creates CRUD tools for all database tables.

---

## 💡 Common Patterns

### Validation

```typescript
input: z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
  url: z.string().url(),
})
```

### Error Handling

```typescript
handler: async ({ input, ctx }) => {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    ctx.logger.error('Operation failed', error);
    throw new Error('Failed to complete operation');
  }
}
```

### Logging

```typescript
handler: async ({ input, ctx }) => {
  ctx.logger.info('Processing request', { userId: input.userId });
  // ... do work
  ctx.logger.debug('Result', { result });
  return result;
}
```

---

## 🐛 Troubleshooting

### Server won't start

```bash
# Check TypeScript compilation
npm run build

# Check for errors
npx tsc --noEmit
```

### Tool not appearing in client

1. Rebuild the project: `npm run build`
2. Restart your MCP client
3. Check server is configured correctly

### Validation errors

- Check your Zod schemas match expected types
- Use `z.object({}).describe()` for better error messages
- Test schemas independently

---

## 📖 Learn More

- [Full Documentation](./README.md)
- [API Reference](./API_DOCUMENTATION.md)
- [Examples](./examples/)
- [Contributing Guide](./CONTRIBUTING.md)

---

## 🎉 You're Ready!

You now have a working MCP server. Start building amazing tools!

**Happy coding!** 🚀
