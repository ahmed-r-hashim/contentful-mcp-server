#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllPrompts } from './prompts/register.js';
import { registerAllResources } from './resources/register.js';
import { registerAllTools } from './tools/register.js';
import { getVersion } from './getVersion.js';

if (process.env.NODE_ENV === 'development') {
  try {
    await import('mcps-logger/console');
  } catch {
    console.warn(
      'mcps-logger not available outside the development environment.',
    );
  }
}

const MCP_SERVER_NAME = '@contentful/mcp-server';

export interface CreateServerOptions {
  isHTTP?: boolean;
  outputFormat?: 'yaml' | 'json';
}

/**
 * Create and configure an MCP server instance
 */
export function createServer(options: CreateServerOptions = {}): McpServer {
  const { outputFormat = 'json' } = options;

  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: getVersion(),
  });

  registerTools(server, { outputFormat });
  registerAllPrompts(server);
  registerAllResources(server);

  return server;
}

/**
 * Register all tools with the server
 */
function registerTools(server: McpServer): void {
  registerAllTools(server);
}

async function main() {
  try {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
