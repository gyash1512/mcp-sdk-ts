#!/usr/bin/env node

/**
 * CLI entry point for mcp-sdk-ts
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { runCommand } from './commands/run.js';
import { testCommand } from './commands/test.js';

const program = new Command();

program
  .name('mcp')
  .description('TypeScript SDK for building Model Context Protocol servers')
  .version('0.1.0');

// Init command
program
  .command('init <project-name>')
  .description('Scaffold a new MCP server project')
  .option('-t, --template <template>', 'Project template (basic|express|fastify|advanced)', 'basic')
  .option('--no-typescript', 'Use JavaScript instead of TypeScript')
  .action(initCommand);

// Generate command
program
  .command('generate <type> <source>')
  .description('Generate MCP tools from external sources')
  .option('-o, --output <dir>', 'Output directory', './src/generated')
  .option('--base-url <url>', 'Base URL for API calls (OpenAPI only)')
  .option('--tables <tables>', 'Comma-separated list of tables (DB only)')
  .option('--read-only', 'Generate read-only tools (DB only)', true)
  .action(generateCommand);

// Run command
program
  .command('run [file]')
  .description('Run MCP server in development mode')
  .option('-w, --watch', 'Watch for file changes', false)
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-e, --env <file>', 'Environment file', '.env')
  .action(runCommand);

// Test command
program
  .command('test')
  .description('Run schema and contract validation tests')
  .option('-t, --tool <name>', 'Test specific tool only')
  .option('-c, --coverage', 'Generate coverage report', false)
  .action(testCommand);

// Docs command
program
  .command('docs [output]')
  .description('Generate documentation for your MCP server')
  .option('-f, --format <format>', 'Output format (markdown|json|openapi)', 'markdown')
  .action(async (output: string = './TOOLS.md', options: { format: string }) => {
    console.log(chalk.blue('📚 Generating documentation...'));
    console.log(chalk.yellow('⚠️  Not implemented yet'));
  });

// Parse arguments
program.parse();
