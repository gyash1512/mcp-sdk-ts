/**
 * MCP Server implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { pino, Logger } from 'pino';
import type {
  MCPServerConfig,
  MCPServerInstance,
  MCPToolDefinition,
  MCPContext,
  MCPManifest,
  Middleware,
} from '../types.js';
import { validateWithSchema, zodToJsonSchema, formatZodError } from './tool.js';
import { generateManifest } from './manifest.js';

/**
 * Create a new MCP server instance
 */
export function createMCPServer(config: MCPServerConfig): MCPServerInstance {
  const tools: MCPToolDefinition<unknown, unknown>[] = [];
  const middlewares: Middleware[] = config.middleware || [];
  
  // Initialize logger
  const logger: Logger = pino({
    level: config.logging?.level || 'info',
    transport: config.logging?.pretty
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  });

  // Initialize HTTP client
  const http = axios.create({
    timeout: 30000,
    headers: {
      'User-Agent': `${config.name}/${config.version || '1.0.0'}`,
    },
  });

  // Create internal MCP server
  const server = new Server(
    {
      name: config.name,
      version: config.version || '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Create context for tool handlers
   */
  function createContext(requestId?: string): MCPContext {
    return {
      http,
      db: undefined, // TODO: Initialize DB connection if configured
      logger,
      env: process.env as Record<string, string | undefined>,
      request: requestId
        ? {
            id: requestId,
            timestamp: Date.now(),
          }
        : undefined,
    };
  }

  /**
   * Register a new tool
   */
  function registerTool<TInput = unknown, TOutput = unknown>(
    tool: MCPToolDefinition<TInput, TOutput>
  ): void {
    // Validate tool name is unique
    if (tools.find((t) => t.name === tool.name)) {
      throw new Error(`Tool with name "${tool.name}" already registered`);
    }

    tools.push(tool as MCPToolDefinition<unknown, unknown>);
    logger.info(`Registered tool: ${tool.name}`);
  }

  /**
   * Use middleware
   */
  function use(middleware: Middleware): void {
    middlewares.push(middleware);
  }

  /**
   * Use auth middleware
   */
  function useAuth(validator: (req: { headers: Record<string, string | string[] | undefined> }) => boolean | Promise<boolean>): void {
    middlewares.push(async (req: unknown, res: unknown, next: unknown) => {
      const reqObj = req as { headers?: Record<string, string | string[] | undefined> };
      const isValid = await validator({ headers: reqObj.headers || {} });
      if (!isValid) {
        if (typeof res === 'object' && res !== null && 'status' in res) {
          const response = res as { status: (code: number) => { json: (data: unknown) => void } };
          response.status(401).json({ error: 'Unauthorized' });
        }
        return;
      }
      if (typeof next === 'function') {
        (next as () => void)();
      }
    });
  }

  /**
   * Handle tool listing
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const mcpTools: Tool[] = tools.map((tool) => {
      const schema = zodToJsonSchema(tool.inputSchema);
      return {
        name: tool.name,
        description: tool.description || `Execute ${tool.name}`,
        inputSchema: {
          ...schema,
          type: 'object' as const,
          properties: schema.properties || {},
        },
      };
    });

    return { tools: mcpTools };
  });

  /**
   * Handle tool execution
   */
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;
      const tool = tools.find((t) => t.name === name);

      if (!tool) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: `Tool "${name}" not found` }, null, 2),
            },
          ],
          isError: true,
        };
      }

      try {
        // Create context
        const requestId = request.params._meta?.requestId;
        const ctx = createContext(typeof requestId === 'string' ? requestId : undefined);

        // Validate input
        const inputValidation = validateWithSchema(tool.inputSchema, args);
        if (!inputValidation.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'Input validation failed',
                    details: formatZodError(inputValidation.errors),
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        let input = inputValidation.data;

        // Run pre-handlers
        if (tool.preHandler) {
          for (const hook of tool.preHandler) {
            const result = await hook(ctx, input);
            if (result && result.input) {
              input = result.input;
            }
          }
        }

        // Execute handler
        logger.info(`Executing tool: ${name}`);
        let output = await tool.handler({ input, ctx });

        // Validate output
        const outputValidation = validateWithSchema(tool.outputSchema, output);
        if (!outputValidation.success) {
          logger.error(`Output validation failed for tool: ${name}`);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'Output validation failed',
                    details: formatZodError(outputValidation.errors),
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        output = outputValidation.data;

        // Run post-handlers
        if (tool.postHandler) {
          for (const hook of tool.postHandler) {
            const result = await hook(ctx, input, output);
            if (result && result.output) {
              output = result.output;
            }
          }
        }

        logger.info(`Tool executed successfully: ${name}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Tool execution failed',
                  message: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Start the server
   */
  async function start(port?: number): Promise<void> {
    const actualPort = port || config.port || 3000;
    
    logger.info(`Starting ${config.name} MCP Server...`);
    logger.info(`Registered tools: ${tools.length}`);
    
    // Use stdio transport for MCP protocol
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info(`${config.name} MCP Server running on stdio`);
    logger.info(`Port: ${actualPort} (for HTTP endpoints if enabled)`);
  }

  /**
   * Stop the server
   */
  async function stop(): Promise<void> {
    logger.info(`Stopping ${config.name} MCP Server...`);
    await server.close();
    logger.info('Server stopped');
  }

  /**
   * Get manifest
   */
  function getManifest(): MCPManifest {
    return generateManifest(config, tools);
  }

  /**
   * Get registered tools
   */
  function getTools(): MCPToolDefinition[] {
    return [...tools];
  }

  return {
    server,
    registerTool,
    use,
    useAuth,
    start,
    stop,
    getManifest,
    getTools,
  };
}
