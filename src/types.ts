/**
 * Core type definitions for mcp-sdk-ts
 */

import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response, NextFunction } from 'express';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AxiosInstance } from 'axios';
import type { Knex } from 'knex';
import type { Logger } from 'pino';

/**
 * Context object passed to tool handlers
 */
export interface MCPContext {
  /** HTTP client instance (axios) */
  http: AxiosInstance;
  /** Database connection (if configured) */
  db?: Knex;
  /** Logger instance */
  logger: Logger;
  /** Environment variables */
  env: Record<string, string | undefined>;
  /** Request metadata */
  request?: {
    id: string;
    timestamp: number;
    headers?: Record<string, string>;
  };
}

/**
 * Tool handler function signature
 */
export interface ToolHandler<TInput = unknown, TOutput = unknown> {
  (params: { input: TInput; ctx: MCPContext }): Promise<TOutput>;
}

/**
 * Pre-handler hook for validation, auth, etc.
 */
export interface PreHandlerHook<TInput = unknown> {
  (ctx: MCPContext, input: TInput): Promise<void | { input: TInput }>;
}

/**
 * Post-handler hook for logging, metrics, etc.
 */
export interface PostHandlerHook<TInput = unknown, TOutput = unknown> {
  (ctx: MCPContext, input: TInput, output: TOutput): Promise<void | { output: TOutput }>;
}

/**
 * Tool definition with Zod schemas
 */
export interface MCPToolDefinition<TInput = unknown, TOutput = unknown> {
  /** Tool name (must be unique) */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Input validation schema (Zod) */
  inputSchema: z.ZodType<TInput>;
  /** Output validation schema (Zod) */
  outputSchema: z.ZodType<TOutput>;
  /** Tool handler function */
  handler: ToolHandler<TInput, TOutput>;
  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>;
  /** Pre-handler hooks */
  preHandler?: PreHandlerHook<TInput>[];
  /** Post-handler hooks */
  postHandler?: PostHandlerHook<TInput, TOutput>[];
}

/**
 * Server configuration options
 */
export interface MCPServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version?: string;
  /** Server description */
  description?: string;
  /** Server framework ('fastify' | 'express') */
  framework?: 'fastify' | 'express';
  /** Port number (default: 3000) */
  port?: number;
  /** Enable CORS */
  cors?: boolean | CorsOptions;
  /** Rate limiting configuration */
  rateLimit?: RateLimitOptions;
  /** Authentication configuration */
  auth?: AuthOptions;
  /** Logging configuration */
  logging?: LoggingOptions;
  /** Database configuration */
  database?: DatabaseOptions;
  /** Metrics endpoint */
  metrics?: boolean;
  /** Additional middleware */
  middleware?: Middleware[];
}

/**
 * CORS configuration
 */
export interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitOptions {
  max: number;
  timeWindow: number | string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Authentication configuration
 */
export interface AuthOptions {
  /** Auth type */
  type: 'apiKey' | 'bearer' | 'custom';
  /** API key header name (for apiKey type) */
  headerName?: string;
  /** Validation function */
  validate?: (token: string, ctx: MCPContext) => Promise<boolean>;
}

/**
 * Logging configuration
 */
export interface LoggingOptions {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  pretty?: boolean;
  destination?: string;
}

/**
 * Database configuration
 */
export interface DatabaseOptions {
  client: 'pg' | 'mysql' | 'sqlite3';
  connection: string | {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
}

/**
 * Generic middleware function
 */
export type Middleware = 
  | ((req: Request, res: Response, next: NextFunction) => void | Promise<void>)
  | ((req: FastifyRequest, reply: FastifyReply, next: () => void) => void | Promise<void>);

/**
 * JSON Schema definition for tool inputs/outputs
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: (string | number | boolean)[];
  description?: string;
  default?: string | number | boolean | null;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  [key: string]: unknown;
}

/**
 * MCP Manifest structure
 */
export interface MCPManifest {
  name: string;
  version: string;
  description?: string;
  tools: Array<{
    name: string;
    description?: string;
    input: JSONSchema;
    output: JSONSchema;
    metadata?: Record<string, string | number | boolean>;
  }>;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * OpenAPI generation options
 */
export interface OpenAPIGenerateOptions {
  /** Path to OpenAPI spec file (YAML/JSON) */
  specPath: string;
  /** Output directory */
  outputDir: string;
  /** Generate handler stubs */
  generateHandlers?: boolean;
  /** Base URL for API calls */
  baseUrl?: string;
}

/**
 * Database generation options
 */
export interface DBGenerateOptions {
  /** Database connection string */
  connectionString: string;
  /** Output directory */
  outputDir: string;
  /** Tables to include (if empty, all tables) */
  tables?: string[];
  /** Generate read-only tools */
  readOnly?: boolean;
}

/**
 * Tool validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Auth request context
 */
export interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
}

/**
 * Server instance
 */
export interface MCPServerInstance {
  /** Internal MCP server */
  server: Server;
  /** Register a tool */
  registerTool: <TInput = unknown, TOutput = unknown>(
    tool: MCPToolDefinition<TInput, TOutput>
  ) => void;
  /** Use middleware */
  use: (middleware: Middleware) => void;
  /** Use auth middleware */
  useAuth: (validator: (req: AuthRequest) => boolean | Promise<boolean>) => void;
  /** Start the server */
  start: (port?: number) => Promise<void>;
  /** Stop the server */
  stop: () => Promise<void>;
  /** Get manifest */
  getManifest: () => MCPManifest;
  /** Get registered tools */
  getTools: () => MCPToolDefinition<unknown, unknown>[];
}

/**
 * CLI command options
 */
export interface InitOptions {
  name: string;
  template?: 'basic' | 'express' | 'fastify' | 'advanced';
  typescript?: boolean;
}

export interface GenerateOptions {
  type: 'openapi' | 'db';
  source: string;
  output?: string;
}

export interface RunOptions {
  watch?: boolean;
  port?: number;
  env?: string;
}

export interface TestOptions {
  tool?: string;
  coverage?: boolean;
}
