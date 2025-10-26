/**
 * Manifest generation utilities
 */

import type { MCPManifest, MCPServerConfig, MCPToolDefinition } from '../types.js';
import { zodToJsonSchema } from './tool.js';

/**
 * Generate MCP manifest from server configuration and tools
 */
export function generateManifest(
  config: MCPServerConfig,
  tools: MCPToolDefinition[]
): MCPManifest {
  const metadata: Record<string, string | number | boolean> = {
    framework: config.framework || 'mcp-sdk-ts',
  };

  if (config.auth) {
    metadata.authType = config.auth.type;
  }

  if (config.rateLimit) {
    metadata.rateLimitMax = config.rateLimit.max;
    metadata.rateLimitWindow = typeof config.rateLimit.timeWindow === 'string' 
      ? config.rateLimit.timeWindow 
      : `${config.rateLimit.timeWindow}ms`;
  }

  if (config.cors) {
    metadata.corsEnabled = true;
  }

  return {
    name: config.name,
    version: config.version || '1.0.0',
    description: config.description,
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input: zodToJsonSchema(tool.inputSchema),
      output: zodToJsonSchema(tool.outputSchema),
      metadata: tool.metadata,
    })),
    metadata,
  };
}

/**
 * Generate Markdown documentation from manifest
 */
export function generateMarkdownDocs(manifest: MCPManifest): string {
  let md = `# ${manifest.name}\n\n`;
  
  if (manifest.description) {
    md += `${manifest.description}\n\n`;
  }
  
  md += `**Version:** ${manifest.version}\n\n`;
  md += `## Tools\n\n`;
  
  for (const tool of manifest.tools) {
    md += `### ${tool.name}\n\n`;
    
    if (tool.description) {
      md += `${tool.description}\n\n`;
    }
    
    md += `**Input Schema:**\n\n\`\`\`json\n${JSON.stringify(tool.input, null, 2)}\n\`\`\`\n\n`;
    md += `**Output Schema:**\n\n\`\`\`json\n${JSON.stringify(tool.output, null, 2)}\n\`\`\`\n\n`;
    
    if (tool.metadata) {
      md += `**Metadata:**\n\n\`\`\`json\n${JSON.stringify(tool.metadata, null, 2)}\n\`\`\`\n\n`;
    }
    
    md += '---\n\n';
  }
  
  return md;
}

/**
 * Generate OpenAPI-compatible specification
 */
export function generateOpenAPISpec(manifest: MCPManifest): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  
  for (const tool of manifest.tools) {
    paths[`/tools/${tool.name}`] = {
      post: {
        summary: tool.description || tool.name,
        operationId: tool.name,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: tool.input,
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: tool.output,
              },
            },
          },
          '400': {
            description: 'Bad request - validation error',
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
    };
  }
  
  return {
    openapi: '3.0.0',
    info: {
      title: manifest.name,
      version: manifest.version,
      description: manifest.description,
    },
    paths,
  };
}
