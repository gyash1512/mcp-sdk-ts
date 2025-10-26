/**
 * mcp-sdk-ts - TypeScript SDK for Model Context Protocol Servers
 * 
 * @module mcp-sdk-ts
 */

// Core exports
export { createMCPServer } from './core/server.js';
export { defineTool, zodToJsonSchema, validateWithSchema, formatZodError } from './core/tool.js';
export { generateManifest, generateMarkdownDocs, generateOpenAPISpec } from './core/manifest.js';

// Middleware exports
export {
  createRateLimitMiddleware,
  createAuthMiddleware,
  createCorsMiddleware,
  createLoggingMiddleware,
  createErrorMiddleware,
  createValidationMiddleware,
} from './core/middleware.js';

// Type exports
export type {
  MCPContext,
  ToolHandler,
  MCPToolDefinition,
  MCPServerConfig,
  MCPServerInstance,
  MCPManifest,
  PreHandlerHook,
  PostHandlerHook,
  AuthOptions,
  RateLimitOptions,
  CorsOptions,
  LoggingOptions,
  DatabaseOptions,
  Middleware,
  OpenAPIGenerateOptions,
  DBGenerateOptions,
  ValidationResult,
} from './types.js';

// Re-export Zod for convenience
export { z } from 'zod';
