/**
 * Run command - start MCP server in development mode
 */

import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import chalk from 'chalk';
import chokidar from 'chokidar';
import dotenv from 'dotenv';

interface RunOptions {
  watch: boolean;
  port: string;
  env: string;
}

export async function runCommand(file: string = 'dist/index.js', options: RunOptions): Promise<void> {
  // Load environment variables
  dotenv.config({ path: options.env });

  console.log(chalk.blue('🚀 Starting MCP server...'));
  console.log(chalk.gray(`File: ${file}`));
  console.log(chalk.gray(`Port: ${options.port}`));
  console.log(chalk.gray(`Watch: ${options.watch}`));
  console.log();

  let serverProcess: ChildProcess | null = null;

  const startServer = () => {
    if (serverProcess) {
      console.log(chalk.yellow('Restarting server...'));
      serverProcess.kill();
    }

    const serverPath = path.resolve(file);
    serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: options.port,
      },
    });

    serverProcess.on('error', (error: Error) => {
      console.error(chalk.red('Failed to start server:'), error);
    });

    serverProcess.on('exit', (code: number) => {
      if (code !== 0 && code !== null) {
        console.error(chalk.red(`Server exited with code ${code}`));
      }
    });
  };

  // Start server
  startServer();

  // Watch mode
  if (options.watch) {
    console.log(chalk.cyan('👀 Watching for changes...\n'));

    const watcher = chokidar.watch(['src/**/*.ts', 'src/**/*.js'], {
      ignored: /node_modules/,
      persistent: true,
    });

    watcher.on('change', (filePath) => {
      console.log(chalk.yellow(`\n📝 File changed: ${filePath}`));
      console.log(chalk.blue('🔨 Rebuilding...'));

      // Run build command
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        shell: true,
      });

      buildProcess.on('exit', (code) => {
        if (code === 0) {
          startServer();
        } else {
          console.error(chalk.red('Build failed!'));
        }
      });
    });

    // Handle cleanup
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\nShutting down...'));
      watcher.close();
      if (serverProcess) {
        serverProcess.kill();
      }
      process.exit(0);
    });
  }
}
