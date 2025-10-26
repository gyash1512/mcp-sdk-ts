/**
 * OpenAPI to MCP tool generator
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
}

interface OpenAPISchema {
  type?: string;
  format?: string;
  enum?: (string | number)[];
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  description?: string;
}

interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: OpenAPISchema;
}

interface OpenAPIRequestBody {
  required?: boolean;
  content?: Record<string, { schema?: OpenAPISchema }>;
}

interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, unknown>;
}

interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  paths: Record<string, Record<string, OpenAPIOperation | undefined>>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
  };
}

/**
 * Generate MCP tools from OpenAPI specification
 */
export async function generateFromOpenAPI(specPath: string, options: {
  outputDir: string;
  baseUrl?: string;
  generateHandlers?: boolean;
}): Promise<void> {
  // Read spec file
  const specContent = await fs.readFile(specPath, 'utf-8');
  const spec: OpenAPISpec = specPath.endsWith('.yaml') || specPath.endsWith('.yml')
    ? yaml.load(specContent) as OpenAPISpec
    : JSON.parse(specContent);

  // Create output directory
  await fs.mkdir(options.outputDir, { recursive: true });

  // Generate tools for each endpoint
  const tools: string[] = [];
  let toolIndex = 0;

  for (const [pathPattern, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method === 'parameters' || !operation) continue;

      const toolName = operation.operationId || generateToolName(method, pathPattern);
      const toolCode = generateToolCode(toolName, method, pathPattern, operation, options.baseUrl);
      
      tools.push(toolCode);
      toolIndex++;
    }
  }

  // Write generated tools to file
  const toolExports = tools.map((_, i) => `tool${i}`).join(',\n  ');
  const output = `import { defineTool, z } from 'mcp-sdk-ts';

${tools.join('\n\n')}

export const generatedTools = [
  ${toolExports}
];
`;

  await fs.writeFile(path.join(options.outputDir, 'openapi-tools.ts'), output);
}

/**
 * Generate tool name from HTTP method and path
 */
function generateToolName(method: string, pathPattern: string): string {
  const cleanPath = pathPattern
    .replace(/^\//, '')
    .replace(/\//g, '_')
    .replace(/\{([^}]+)\}/g, 'by_$1')
    .replace(/[^a-zA-Z0-9_]/g, '_');
  
  return `${method}_${cleanPath}`;
}

/**
 * Generate tool code for an operation
 */
function generateToolCode(
  toolName: string,
  method: string,
  pathPattern: string,
  operation: OpenAPIOperation,
  baseUrl?: string
): string {
  const parameters = operation.parameters || [];
  const pathParams = parameters.filter((p) => p.in === 'path');
  const queryParams = parameters.filter((p) => p.in === 'query');

  // Generate input schema
  const inputFields: string[] = [];
  for (const param of pathParams) {
    const zodType = param.schema ? getZodType(param.schema) : 'string()';
    const optional = !param.required ? '.optional()' : '';
    const description = param.description ? `.describe('${param.description.replace(/'/g, "\\'")}')` : '';
    inputFields.push(`  ${param.name}: z.${zodType}${optional}${description}`);
  }

  for (const param of queryParams) {
    const zodType = param.schema ? getZodType(param.schema) : 'string()';
    const optional = !param.required ? '.optional()' : '';
    const description = param.description ? `.describe('${param.description.replace(/'/g, "\\'")}')` : '';
    inputFields.push(`  ${param.name}: z.${zodType}${optional}${description}`);
  }

  if (operation.requestBody?.content?.['application/json']) {
    inputFields.push('  body: z.record(z.unknown()).describe(\'Request body\')');
  }

  const inputSchema = inputFields.length > 0 
    ? `z.object({\n${inputFields.join(',\n')}\n})`
    : 'z.object({})';

  // For now, use a generic output schema
  const outputSchema = 'z.record(z.unknown())';

  // Build path with parameters
  let urlPath = pathPattern;
  for (const param of pathParams) {
    urlPath = urlPath.replace(`{${param.name}}`, `\${input.${param.name}}`);
  }

  // Build query string
  const queryString = queryParams.length > 0
    ? `const queryParams = new URLSearchParams({
      ${queryParams.map((p) => `${p.name}: String(input.${p.name})`).join(',\n      ')}
    });`
    : '';

  const description = operation.summary || operation.description || `${method.toUpperCase()} ${pathPattern}`;

  return `export const ${toolName} = defineTool({
  name: '${toolName}',
  description: '${description.replace(/'/g, "\\'")}',
  input: ${inputSchema},
  output: ${outputSchema},
  handler: async ({ input, ctx }) => {
    ${queryString}
    const url = \`${baseUrl || ''}${urlPath}\${queryParams ? '?' + queryParams.toString() : ''}\`;
    
    const response = await ctx.http.request({
      method: '${method.toUpperCase()}',
      url,
      ${operation.requestBody ? 'data: input.body,' : ''}
    });
    
    return response.data as Record<string, unknown>;
  },
});`;
}

/**
 * Get Zod type string from OpenAPI schema
 */
function getZodType(schema: OpenAPISchema): string {
  if (!schema || !schema.type) return 'unknown()';

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') return 'string().datetime()';
      if (schema.format === 'email') return 'string().email()';
      if (schema.format === 'uri') return 'string().url()';
      if (schema.enum) {
        const enumValues = schema.enum.map(v => typeof v === 'string' ? `'${v}'` : v).join(',');
        return `enum([${enumValues}])`;
      }
      return 'string()';
    case 'number':
    case 'integer':
      return 'number()';
    case 'boolean':
      return 'boolean()';
    case 'array':
      const itemType = schema.items ? getZodType(schema.items) : 'unknown()';
      return `array(z.${itemType})`;
    case 'object':
      return 'record(z.unknown())';
    default:
      return 'unknown()';
  }
}
