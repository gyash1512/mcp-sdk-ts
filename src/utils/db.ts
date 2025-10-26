/**
 * Database schema introspection and tool generation
 */

import knex, { Knex } from 'knex';
import * as fs from 'fs/promises';
import * as path from 'path';

interface DBColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string | number | boolean | null;
}

interface DBTable {
  name: string;
  columns: DBColumn[];
}

/**
 * Generate MCP tools from database schema
 */
export async function generateFromDatabase(connectionString: string, options: {
  outputDir: string;
  tables?: string[];
  readOnly?: boolean;
}): Promise<void> {
  // Parse connection string to get database client type
  const clientType = connectionString.startsWith('postgres') ? 'pg' : 
                    connectionString.startsWith('mysql') ? 'mysql2' : 'sqlite3';

  // Create knex instance
  const db = knex({
    client: clientType,
    connection: connectionString,
  });

  try {
    // Introspect database schema
    const tables = await introspectSchema(db, options.tables);

    // Create output directory
    await fs.mkdir(options.outputDir, { recursive: true });

    // Generate tools for each table
    const tools: string[] = [];

    for (const table of tables) {
      // Generate read tools
      tools.push(generateReadTool(table));
      tools.push(generateReadByIdTool(table));
      tools.push(generateSearchTool(table));

      // Generate write tools if not read-only
      if (!options.readOnly) {
        tools.push(generateCreateTool(table));
        tools.push(generateUpdateTool(table));
        tools.push(generateDeleteTool(table));
      }
    }

    // Write generated tools to file
    const output = `import { defineTool, z } from 'mcp-sdk-ts';

${tools.join('\n\n')}

export const dbTools = [
  ${tools.map((_, i) => `tool${i}`).join(',\n  ')}
];
`;

    await fs.writeFile(path.join(options.outputDir, 'db-tools.ts'), output);
  } finally {
    await db.destroy();
  }
}

/**
 * Introspect database schema
 */
async function introspectSchema(db: Knex, tableFilter?: string[]): Promise<DBTable[]> {
  const tables: DBTable[] = [];

  // Get table names
  let tableNames: string[];
  const client = db.client.config.client;

  if (client === 'pg') {
    const result = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `) as { rows: Array<{ table_name: string }> };
    tableNames = result.rows.map((row) => row.table_name);
  } else if (client === 'mysql2') {
    const result = await db.raw('SHOW TABLES') as Array<Record<string, string>[]>;
    tableNames = result[0].map((row) => Object.values(row)[0] as string);
  } else {
    // SQLite
    const result = await db.raw(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `) as Array<{ name: string }>;
    tableNames = result.map((row) => row.name);
  }

  // Filter tables if specified
  if (tableFilter && tableFilter.length > 0) {
    tableNames = tableNames.filter((name) => tableFilter.includes(name));
  }

  // Get columns for each table
  for (const tableName of tableNames) {
    const columns = await introspectColumns(db, tableName);
    tables.push({ name: tableName, columns });
  }

  return tables;
}

/**
 * Introspect table columns
 */
async function introspectColumns(db: Knex, tableName: string): Promise<DBColumn[]> {
  const columnInfo = await db(tableName).columnInfo();
  const columns: DBColumn[] = [];

  for (const [name, info] of Object.entries(columnInfo)) {
    const columnData = info as { 
      type: string; 
      nullable?: boolean; 
      defaultValue?: string | number | boolean | null;
    };
    
    columns.push({
      name,
      type: columnData.type,
      nullable: columnData.nullable || false,
      defaultValue: columnData.defaultValue,
    });
  }

  return columns;
}

/**
 * Generate read all tool
 */
function generateReadTool(table: DBTable): string {
  return `const read_${table.name} = defineTool({
  name: 'read_${table.name}',
  description: 'Read all records from ${table.name} table',
  input: z.object({
    limit: z.number().optional().default(10),
    offset: z.number().optional().default(0),
  }),
  output: z.object({
    data: z.array(z.record(z.unknown())),
    total: z.number(),
  }),
  handler: async ({ input, ctx }) => {
    const data = await ctx.db('${table.name}')
      .select('*')
      .limit(input.limit)
      .offset(input.offset);
    
    const [{ count }] = await ctx.db('${table.name}').count('* as count');
    
    return { data, total: Number(count) };
  },
});`;
}

/**
 * Generate read by ID tool
 */
function generateReadByIdTool(table: DBTable): string {
  return `const read_${table.name}_by_id = defineTool({
  name: 'read_${table.name}_by_id',
  description: 'Read a single record from ${table.name} by ID',
  input: z.object({
    id: z.number(),
  }),
  output: z.record(z.unknown()),
  handler: async ({ input, ctx }) => {
    const record = await ctx.db('${table.name}')
      .where({ id: input.id })
      .first();
    
    if (!record) {
      throw new Error('Record not found');
    }
    
    return record;
  },
});`;
}

/**
 * Generate search tool
 */
function generateSearchTool(table: DBTable): string {
  const searchableColumns = table.columns
    .filter((col) => col.type.includes('text') || col.type.includes('char'))
    .map((col) => col.name);

  return `const search_${table.name} = defineTool({
  name: 'search_${table.name}',
  description: 'Search records in ${table.name} table',
  input: z.object({
    query: z.string(),
    limit: z.number().optional().default(10),
  }),
  output: z.object({
    data: z.array(z.record(z.unknown())),
  }),
  handler: async ({ input, ctx }) => {
    let query = ctx.db('${table.name}');
    
    ${searchableColumns.map((col) => 
      `query = query.orWhere('${col}', 'like', \`%\${input.query}%\`);`
    ).join('\n    ')}
    
    const data = await query.limit(input.limit);
    
    return { data };
  },
});`;
}

/**
 * Generate create tool
 */
function generateCreateTool(table: DBTable): string {
  return `const create_${table.name} = defineTool({
  name: 'create_${table.name}',
  description: 'Create a new record in ${table.name} table',
  input: z.record(z.unknown()), // TODO: Generate proper schema from table columns
  output: z.object({ id: z.number() }),
  handler: async ({ input, ctx }) => {
    const [id] = await ctx.db('${table.name}').insert(input).returning('id');
    return { id };
  },
});`;
}

/**
 * Generate update tool
 */
function generateUpdateTool(table: DBTable): string {
  return `const update_${table.name} = defineTool({
  name: 'update_${table.name}',
  description: 'Update a record in ${table.name} table',
  input: z.object({
    id: z.number(),
    data: z.record(z.unknown()), // TODO: Generate proper schema from table columns
  }),
  output: z.object({
    updated: z.boolean(),
  }),
  handler: async ({ input, ctx }) => {
    const count = await ctx.db('${table.name}')
      .where({ id: input.id })
      .update(input.data);
    
    return { updated: count > 0 };
  },
});`;
}

/**
 * Generate delete tool
 */
function generateDeleteTool(table: DBTable): string {
  return `const delete_${table.name} = defineTool({
  name: 'delete_${table.name}',
  description: 'Delete a record from ${table.name} table',
  input: z.object({
    id: z.number(),
  }),
  output: z.object({
    deleted: z.boolean(),
  }),
  handler: async ({ input, ctx }) => {
    const count = await ctx.db('${table.name}')
      .where({ id: input.id })
      .delete();
    
    return { deleted: count > 0 };
  },
});`;
}
