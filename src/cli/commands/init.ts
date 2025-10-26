/**
 * Init command - scaffold new MCP server project
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';

interface InitOptions {
  template: string;
  typescript: boolean;
}

export async function initCommand(projectName: string, options: InitOptions): Promise<void> {
  const spinner = ora('Creating MCP server project...').start();

  try {
    const projectDir = path.join(process.cwd(), projectName);

    // Check if directory exists
    try {
      await fs.access(projectDir);
      spinner.fail(chalk.red(`Directory "${projectName}" already exists!`));
      process.exit(1);
    } catch {
      // Directory doesn't exist, good to proceed
    }

    // Create project directory
    await fs.mkdir(projectDir, { recursive: true });

    // Create subdirectories
    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'dist'), { recursive: true });

    // Generate package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: `MCP server - ${projectName}`,
      main: 'dist/index.js',
      type: 'module',
      bin: {
        [projectName]: './dist/index.js',
      },
      scripts: {
        build: 'tsc',
        watch: 'tsc --watch',
        start: 'node dist/index.js',
        dev: 'npm run build && npm start',
      },
      keywords: ['mcp', 'model-context-protocol'],
      author: '',
      license: 'MIT',
      dependencies: {
        'mcp-sdk-ts': '^0.1.0',
        zod: '^3.22.4',
        axios: '^1.7.2',
        dotenv: '^16.4.5',
      },
      devDependencies: {
        '@types/node': '^20.19.23',
        typescript: '^5.4.5',
      },
    };

    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Generate tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'Node16',
        moduleResolution: 'Node16',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        sourceMap: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    };

    await fs.writeFile(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );

    // Generate .env.example
    const envExample = `# API Keys
API_KEY=your_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
`;

    await fs.writeFile(path.join(projectDir, '.env.example'), envExample);

    // Generate .gitignore
    const gitignore = `node_modules/
dist/
.env
*.log
.DS_Store
`;

    await fs.writeFile(path.join(projectDir, '.gitignore'), gitignore);

    // Generate example server code based on template
    const serverCode = generateServerTemplate(projectName, options.template);
    await fs.writeFile(path.join(projectDir, 'src', 'index.ts'), serverCode);

    // Generate README
    const readme = generateReadme(projectName);
    await fs.writeFile(path.join(projectDir, 'README.md'), readme);

    spinner.succeed(chalk.green(`✅ Created MCP server project: ${projectName}`));

    console.log('\n' + chalk.bold('Next steps:'));
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan('  npm install'));
    console.log(chalk.cyan('  npm run dev'));
    console.log('\n' + chalk.gray('Edit src/index.ts to add your tools!'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(error);
    process.exit(1);
  }
}

function generateServerTemplate(projectName: string, template: string): string {
  if (template === 'basic') {
    return `#!/usr/bin/env node

import { createMCPServer, defineTool, z } from 'mcp-sdk-ts';
import dotenv from 'dotenv';

dotenv.config();

// Create server
const server = createMCPServer({
  name: '${projectName}',
  version: '1.0.0',
  description: 'My MCP server built with mcp-sdk-ts',
});

// Define a simple tool
server.registerTool(defineTool({
  name: 'hello',
  description: 'Say hello to someone',
  input: z.object({
    name: z.string().describe('Name to greet'),
  }),
  output: z.object({
    message: z.string(),
    timestamp: z.string(),
  }),
  handler: async ({ input, ctx }) => {
    ctx.logger.info(\`Saying hello to \${input.name}\`);
    
    return {
      message: \`Hello, \${input.name}!\`,
      timestamp: new Date().toISOString(),
    };
  },
}));

// Start server
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
`;
  }

  // Add more templates as needed
  return generateServerTemplate(projectName, 'basic');
}

function generateReadme(projectName: string): string {
  return `# ${projectName}

MCP server built with [mcp-sdk-ts](https://github.com/gyash1512/mcp-sdk-ts)

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Usage

Configure in your MCP client:

\`\`\`json
{
  "mcpServers": {
    "${projectName}": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/${projectName}"
    }
  }
}
\`\`\`

## Tools

### hello

Say hello to someone.

**Input:**
- \`name\` (string): Name to greet

**Output:**
- \`message\` (string): Greeting message
- \`timestamp\` (string): ISO timestamp

## License

MIT
`;
}
