# Contributing to mcp-sdk-ts

Thank you for your interest in contributing to mcp-sdk-ts! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- TypeScript knowledge

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcp-sdk-ts.git
   cd mcp-sdk-ts
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Watch Mode (Development)**
   ```bash
   npm run watch
   ```

## 🏗️ Project Structure

```
mcp-sdk-ts/
├── src/
│   ├── core/           # Core SDK functionality
│   ├── cli/            # CLI commands
│   ├── utils/          # Utility functions
│   └── types.ts        # Type definitions
├── examples/           # Example servers
├── dist/               # Compiled output
└── templates/          # Project templates
```

## 📝 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Edit TypeScript files in `src/`
- Follow existing code style
- Add types for everything (no `any` types)
- Document public APIs with JSDoc comments

### 3. Build and Test

```bash
# Build
npm run build

# Run tests
npm test

# Test CLI locally
node dist/cli/index.js init test-server
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 📐 Code Style Guidelines

### TypeScript

```typescript
// ✅ Good: Explicit types, clear naming
async function createTool(config: ToolConfig): Promise<MCPTool> {
  const tool = await buildTool(config);
  return tool;
}

// ❌ Bad: Implicit any, unclear names
async function create(c) {
  const t = await build(c);
  return t;
}
```

### Error Handling

```typescript
// ✅ Good: Proper error handling
try {
  const result = await externalAPI();
  return { success: true, data: result };
} catch (error) {
  if (error instanceof SpecificError) {
    return { error: `Specific error: ${error.message}` };
  }
  return { error: formatError(error) };
}

// ❌ Bad: Silent failures
try {
  await externalAPI();
} catch (e) {
  return null;
}
```

### Documentation

```typescript
/**
 * Create a new MCP server with configuration
 * 
 * @param config - Server configuration options
 * @returns Configured MCP server instance
 * @throws {Error} If configuration is invalid
 * 
 * @example
 * ```typescript
 * const server = createMCPServer({
 *   name: 'my-server',
 *   version: '1.0.0'
 * });
 * ```
 */
export function createMCPServer(config: MCPServerConfig): MCPServerInstance {
  // Implementation
}
```

## 🎯 Contribution Areas

### 1. Core Features

- Enhance server capabilities
- Add new middleware options
- Improve error handling
- Optimize performance

### 2. CLI Improvements

- Add new CLI commands
- Enhance code generation
- Improve user experience
- Better error messages

### 3. Documentation

- Improve README
- Add tutorials
- Create API documentation
- Write blog posts

### 4. Examples

- Create example servers
- Add integration demos
- Document best practices

### 5. Testing

- Add unit tests
- Add integration tests
- Improve test coverage

## 🧪 Testing Guidelines

### Writing Tests

```typescript
import { createMCPServer, defineTool, z } from '../src/index.js';

describe('MCP Server', () => {
  test('should create server with config', () => {
    const server = createMCPServer({
      name: 'test-server',
    });
    
    expect(server).toBeDefined();
    expect(server.getManifest().name).toBe('test-server');
  });

  test('should register tool', () => {
    const server = createMCPServer({ name: 'test' });
    
    server.registerTool(defineTool({
      name: 'test-tool',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    }));
    
    expect(server.getTools()).toHaveLength(1);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- server.test.ts

# Watch mode
npm test -- --watch
```

## 📋 Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code builds without errors (`npm run build`)
- [ ] TypeScript has no errors (`npx tsc --noEmit`)
- [ ] No `any` types added (use explicit types)
- [ ] All new functions have JSDoc comments
- [ ] Tests pass (`npm test`)
- [ ] README updated (if adding features)
- [ ] Examples updated (if changing API)
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

## 🐛 Bug Reports

When reporting bugs, include:

1. **Description** - What happened vs. what you expected
2. **Reproduction Steps** - How to reproduce the issue
3. **Environment**
   - Node.js version
   - Operating system
   - SDK version
4. **Logs** - Error messages or console output
5. **Code Sample** - Minimal code to reproduce (if applicable)

## 💡 Feature Requests

When requesting features:

1. **Use Case** - Describe the problem you're trying to solve
2. **Proposed Solution** - How you envision it working
3. **Alternatives** - Other approaches you've considered
4. **Examples** - Code examples if possible

## 📚 Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [Zod Documentation](https://zod.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the project's guidelines

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 💬 Questions?

- Open a GitHub issue
- Start a discussion
- Check existing issues and PRs

---

**Thank you for contributing to mcp-sdk-ts!** 🎉
