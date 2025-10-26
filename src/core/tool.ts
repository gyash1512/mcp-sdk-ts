/**
 * Tool definition utilities
 */

import { z } from 'zod';
import type { MCPToolDefinition, ToolHandler, PreHandlerHook, PostHandlerHook, JSONSchema } from '../types.js';

/**
 * Define a new MCP tool with type-safe input/output schemas
 */
export function defineTool<TInput = unknown, TOutput = unknown>(config: {
  name: string;
  description?: string;
  input: z.ZodType<TInput>;
  output: z.ZodType<TOutput>;
  handler: ToolHandler<TInput, TOutput>;
  metadata?: Record<string, string | number | boolean>;
  preHandler?: PreHandlerHook<TInput>[];
  postHandler?: PostHandlerHook<TInput, TOutput>[];
}): MCPToolDefinition<TInput, TOutput> {
  return {
    name: config.name,
    description: config.description,
    inputSchema: config.input,
    outputSchema: config.output,
    handler: config.handler,
    metadata: config.metadata,
    preHandler: config.preHandler || [],
    postHandler: config.postHandler || [],
  };
}

/**
 * Convert Zod schema to JSON Schema for MCP protocol
 */
export function zodToJsonSchema(schema: z.ZodType<unknown>): JSONSchema {
  // Basic conversion - can be enhanced with zod-to-json-schema library
  const def = schema._def as { typeName?: string };
  const zodType = def.typeName;
  
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodType<unknown>);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
  
  if (schema instanceof z.ZodString) {
    const def = schema._def;
    const result: JSONSchema = { type: 'string' };
    
    // Check for string validations
    if (def.checks) {
      for (const check of def.checks) {
        if (check.kind === 'email') {
          result.format = 'email';
        } else if (check.kind === 'url') {
          result.format = 'uri';
        } else if (check.kind === 'uuid') {
          result.format = 'uuid';
        } else if (check.kind === 'min') {
          result.minLength = check.value;
        } else if (check.kind === 'max') {
          result.maxLength = check.value;
        }
      }
    }
    
    return result;
  }
  
  if (schema instanceof z.ZodNumber) {
    const def = schema._def;
    const result: JSONSchema = { type: 'number' };
    
    if (def.checks) {
      for (const check of def.checks) {
        if (check.kind === 'int') {
          result.type = 'integer';
        } else if (check.kind === 'min') {
          result.minimum = check.value;
        } else if (check.kind === 'max') {
          result.maximum = check.value;
        }
      }
    }
    
    return result;
  }
  
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema._def.type),
    };
  }
  
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema._def.innerType);
  }
  
  if (schema instanceof z.ZodNullable) {
    const inner = zodToJsonSchema(schema._def.innerType);
    return {
      ...inner,
      nullable: true,
    };
  }
  
  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema._def.values,
    };
  }
  
  if (schema instanceof z.ZodLiteral) {
    const literalType = typeof schema._def.value;
    return {
      type: literalType === 'string' || literalType === 'number' || literalType === 'boolean' 
        ? literalType 
        : 'string',
      const: schema._def.value,
    };
  }
  
  // Fallback for unsupported types
  return { type: 'object' };
}

/**
 * Validate input/output against schema
 */
export function validateWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Format Zod validation errors for user-friendly display
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return `${path}: ${issue.message}`;
    })
    .join(', ');
}
