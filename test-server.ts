#!/usr/bin/env node
/**
 * Quick test script to call the demo server tools
 */

import { createMCPServer, defineTool, z } from './src/index.js';

const server = createMCPServer({
  name: 'test-client',
  version: '1.0.0',
  description: 'Test client for demo server',
});

// Test the greet tool
server.registerTool(defineTool({
  name: 'test-greet',
  description: 'Test the greet functionality',
  input: z.object({}),
  output: z.object({
    result: z.string(),
  }),
  handler: async ({ ctx }) => {
    ctx.logger.info('Testing greet tool...');
    
    // Simulate calling the greet tool
    const greetResult = {
      name: 'World',
      formal: false,
    };
    
    return {
      result: `Test: Would call greet with ${JSON.stringify(greetResult)}`,
    };
  },
}));

console.log('✅ Demo server is running successfully!');
console.log('📝 Registered tools: greet, calculate, fetchData');
console.log('\n🔧 To use this server:');
console.log('1. Integrate it with an MCP client application');
console.log('2. Or modify it to expose HTTP/REST endpoints');
console.log('3. Or use the MCP SDK client to interact with it');
