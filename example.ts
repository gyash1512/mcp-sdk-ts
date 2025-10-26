#!/usr/bin/env node

/**
 * Complete Example - mcp-sdk-ts
 * 
 * This example demonstrates all major features of the SDK:
 * - Server creation with configuration
 * - Tool registration with Zod validation
 * - Pre/post handler hooks
 * - External API integration
 * - Error handling
 * - Logging
 */

import { createMCPServer, defineTool, z } from './src/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Create server with full configuration
const server = createMCPServer({
  name: 'complete-example-mcp',
  version: '1.0.0',
  description: 'Complete example showcasing all SDK features',
  
  // Authentication
  auth: {
    type: 'apiKey',
    headerName: 'x-api-key',
    validate: async (token) => {
      // In production, verify against database or secret manager
      return token === process.env.API_KEY || token === 'demo-key-12345';
    },
  },
  
  // Rate limiting
  rateLimit: {
    max: 100,
    timeWindow: '1m',
  },
  
  // CORS
  cors: {
    origin: ['http://localhost:3000', 'https://example.com'],
    credentials: true,
  },
  
  // Logging
  logging: {
    level: 'info',
    pretty: true,
  },
});

// ============================================================================
// Tool 1: Simple Greeting with Validation
// ============================================================================

server.registerTool(defineTool({
  name: 'greet',
  description: 'Greet a user with customizable options',
  
  input: z.object({
    name: z.string().min(1).max(100).describe('Name to greet'),
    language: z.enum(['en', 'es', 'fr', 'de']).default('en').describe('Language'),
    formal: z.boolean().default(false).describe('Use formal greeting'),
  }),
  
  output: z.object({
    message: z.string(),
    language: z.string(),
    timestamp: z.string(),
  }),
  
  handler: async ({ input, ctx }) => {
    ctx.logger.info(`Greeting ${input.name} in ${input.language}`);
    
    const greetings: Record<string, { formal: string; informal: string }> = {
      en: { formal: 'Good day', informal: 'Hello' },
      es: { formal: 'Buenos días', informal: 'Hola' },
      fr: { formal: 'Bonjour', informal: 'Salut' },
      de: { formal: 'Guten Tag', informal: 'Hallo' },
    };
    
    const lang = input.language || 'en';
    const greeting = input.formal
      ? greetings[lang].formal
      : greetings[lang].informal;
    
    return {
      message: `${greeting}, ${input.name}!`,
      language: lang,
      timestamp: new Date().toISOString(),
    };
  },
}));

// ============================================================================
// Tool 2: Calculator with Error Handling
// ============================================================================

server.registerTool(defineTool({
  name: 'calculate',
  description: 'Perform mathematical operations',
  
  input: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt']),
    a: z.number().describe('First operand'),
    b: z.number().optional().describe('Second operand (not needed for sqrt)'),
  }),
  
  output: z.object({
    result: z.number(),
    operation: z.string(),
  }),
  
  handler: async ({ input, ctx }) => {
    let result: number;
    
    try {
      switch (input.operation) {
        case 'add':
          if (!input.b) throw new Error('Second operand required');
          result = input.a + input.b;
          break;
        case 'subtract':
          if (!input.b) throw new Error('Second operand required');
          result = input.a - input.b;
          break;
        case 'multiply':
          if (!input.b) throw new Error('Second operand required');
          result = input.a * input.b;
          break;
        case 'divide':
          if (!input.b) throw new Error('Second operand required');
          if (input.b === 0) throw new Error('Division by zero');
          result = input.a / input.b;
          break;
        case 'power':
          if (!input.b) throw new Error('Second operand required');
          result = Math.pow(input.a, input.b);
          break;
        case 'sqrt':
          if (input.a < 0) throw new Error('Cannot calculate square root of negative number');
          result = Math.sqrt(input.a);
          break;
      }
      
      ctx.logger.info('Calculation successful', { operation: input.operation, result });
      
      return {
        result,
        operation: input.b
          ? `${input.a} ${input.operation} ${input.b}`
          : `${input.operation}(${input.a})`,
      };
    } catch (error) {
      ctx.logger.error('Calculation failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
}));

// ============================================================================
// Tool 3: HTTP Request with Pre/Post Hooks
// ============================================================================

server.registerTool(defineTool({
  name: 'fetchData',
  description: 'Fetch data from an external API',
  
  input: z.object({
    url: z.string().url().describe('API endpoint URL'),
    method: z.enum(['GET', 'POST']).default('GET'),
    headers: z.record(z.string()).optional(),
    body: z.record(z.unknown()).optional(),
  }),
  
  output: z.object({
    status: z.number(),
    data: z.record(z.unknown()),
    duration: z.number(),
  }),
  
  // Pre-handler: Validate URL
  preHandler: [
    async (ctx, input) => {
      ctx.logger.info('Validating request', { url: input.url });
      
      // Example: Block certain domains
      const blockedDomains = ['malicious.com', 'blocked.net'];
      const url = new URL(input.url);
      
      if (blockedDomains.some(domain => url.hostname.includes(domain))) {
        throw new Error('Domain is blocked');
      }
    },
  ],
  
  // Post-handler: Log response
  postHandler: [
    async (ctx, input, output) => {
      ctx.logger.info('Request completed', {
        url: input.url,
        status: output.status,
        duration: output.duration,
      });
    },
  ],
  
  handler: async ({ input, ctx }) => {
    const startTime = Date.now();
    
    try {
      const response = await ctx.http.request({
        url: input.url,
        method: input.method,
        headers: input.headers,
        data: input.body,
        timeout: 10000,
      });
      
      const duration = Date.now() - startTime;
      
      return {
        status: response.status,
        data: response.data as Record<string, unknown>,
        duration,
      };
    } catch (error) {
      ctx.logger.error('HTTP request failed', {
        url: input.url,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to fetch data: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
}));

// ============================================================================
// Tool 4: Data Transformation
// ============================================================================

server.registerTool(defineTool({
  name: 'transformText',
  description: 'Transform text in various ways',
  
  input: z.object({
    text: z.string().min(1).describe('Text to transform'),
    transformation: z.enum([
      'uppercase',
      'lowercase',
      'reverse',
      'capitalize',
      'snake_case',
      'camelCase',
      'base64',
    ]),
  }),
  
  output: z.object({
    original: z.string(),
    transformed: z.string(),
    transformation: z.string(),
  }),
  
  handler: async ({ input, ctx }) => {
    let transformed: string;
    
    switch (input.transformation) {
      case 'uppercase':
        transformed = input.text.toUpperCase();
        break;
      case 'lowercase':
        transformed = input.text.toLowerCase();
        break;
      case 'reverse':
        transformed = input.text.split('').reverse().join('');
        break;
      case 'capitalize':
        transformed = input.text
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        break;
      case 'snake_case':
        transformed = input.text
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        break;
      case 'camelCase':
        transformed = input.text
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
        break;
      case 'base64':
        transformed = Buffer.from(input.text).toString('base64');
        break;
    }
    
    return {
      original: input.text,
      transformed,
      transformation: input.transformation,
    };
  },
}));

// ============================================================================
// Tool 5: Multi-step Process
// ============================================================================

server.registerTool(defineTool({
  name: 'processData',
  description: 'Multi-step data processing pipeline',
  
  input: z.object({
    data: z.array(z.number()).min(1).describe('Array of numbers to process'),
    operations: z.array(z.enum(['sort', 'reverse', 'unique', 'sum', 'average', 'filter_positive']))
      .min(1)
      .describe('Operations to apply in sequence'),
  }),
  
  output: z.object({
    original: z.array(z.number()),
    result: z.union([z.array(z.number()), z.number()]),
    operations_applied: z.array(z.string()),
    steps: z.array(z.object({
      operation: z.string(),
      result: z.union([z.array(z.number()), z.number()]),
    })),
  }),
  
  handler: async ({ input, ctx }) => {
    let current: number[] = [...input.data];
    const steps: Array<{ operation: string; result: number[] | number }> = [];
    
    ctx.logger.info('Starting data processing', {
      data_length: input.data.length,
      operations: input.operations,
    });
    
    for (const operation of input.operations) {
      let stepResult: number[] | number;
      
      switch (operation) {
        case 'sort':
          current = current.sort((a, b) => a - b);
          stepResult = [...current];
          break;
        case 'reverse':
          current = current.reverse();
          stepResult = [...current];
          break;
        case 'unique':
          current = [...new Set(current)];
          stepResult = [...current];
          break;
        case 'sum':
          stepResult = current.reduce((sum, n) => sum + n, 0);
          current = [stepResult];
          break;
        case 'average':
          stepResult = current.reduce((sum, n) => sum + n, 0) / current.length;
          current = [stepResult];
          break;
        case 'filter_positive':
          current = current.filter(n => n > 0);
          stepResult = [...current];
          break;
      }
      
      steps.push({ operation, result: stepResult });
      ctx.logger.debug(`Applied ${operation}`, { result: current });
    }
    
    const finalResult = current.length === 1 ? current[0] : current;
    
    return {
      original: input.data,
      result: finalResult,
      operations_applied: input.operations,
      steps,
    };
  },
}));

// ============================================================================
// Start Server
// ============================================================================

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          Complete Example MCP Server                       ║
║          Powered by mcp-sdk-ts                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

Available Tools:
  1. greet         - Greet users in multiple languages
  2. calculate     - Mathematical operations
  3. fetchData     - HTTP requests with hooks
  4. transformText - Text transformations
  5. processData   - Multi-step data pipeline

Configuration:
  • Authentication: API key required (use 'demo-key-12345')
  • Rate Limit: 100 requests/minute
  • CORS: Enabled for localhost:3000
  • Logging: Info level, pretty output

Starting server...
`);

server.start().catch((error: Error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
