#!/usr/bin/env node

/**
 * Demo MCP Server - Minimal example
 */

import { createMCPServer, defineTool, z } from '../../src/index.js';

const server = createMCPServer({
  name: 'demo-mcp',
  version: '1.0.0',
  description: 'Demo MCP server showcasing basic functionality',
});

// Tool 1: Simple greeting
server.registerTool(defineTool({
  name: 'greet',
  description: 'Greet a user by name',
  input: z.object({
    name: z.string().describe('Name of the person to greet'),
    formal: z.boolean().optional().default(false).describe('Use formal greeting'),
  }),
  output: z.object({
    message: z.string(),
    timestamp: z.string(),
  }),
  handler: async ({ input, ctx }) => {
    ctx.logger.info(`Greeting ${input.name}`);
    
    const greeting = input.formal ? 'Good day' : 'Hello';
    
    return {
      message: `${greeting}, ${input.name}!`,
      timestamp: new Date().toISOString(),
    };
  },
}));

// Tool 2: Calculate
server.registerTool(defineTool({
  name: 'calculate',
  description: 'Perform basic mathematical operations',
  input: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  output: z.object({
    result: z.number(),
    operation: z.string(),
  }),
  handler: async ({ input, ctx }) => {
    let result = 0;
    
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
        if (input.b === 0) {
          throw new Error('Division by zero');
        }
        result = input.a / input.b;
        break;
    }
    
    return {
      result,
      operation: `${input.a} ${input.operation} ${input.b}`,
    };
  },
}));

// Tool 3: Fetch data
server.registerTool(defineTool({
  name: 'fetchData',
  description: 'Fetch data from a public API',
  input: z.object({
    endpoint: z.string().url().describe('API endpoint URL'),
  }),
  output: z.object({
    status: z.number(),
    data: z.record(z.unknown()),
  }),
  handler: async ({ input, ctx }) => {
    const response = await ctx.http.get(input.endpoint);
    
    return {
      status: response.status,
      data: response.data as Record<string, unknown>,
    };
  },
}));

// Start server
server.start().catch((error: Error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
