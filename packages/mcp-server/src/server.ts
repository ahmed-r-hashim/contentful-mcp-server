import express, { Request, Response } from 'express';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Server } from 'http';
import { createServer } from './index.js';

// Logger for HTTP mode
const Logger = {
  isHTTP: false,
  log: (...args: any[]) => {
    if (Logger.isHTTP) {
      console.log(...args);
    }
  },
};

// Track active transports for cleanup
const transports: {
  sse: Record<string, SSEServerTransport>;
} = {
  sse: {},
};

let httpServer: Server | null = null;

interface ServerConfig {
  port: number;
  outputFormat: 'yaml' | 'json';
}

/**
 * Get server configuration from environment variables
 */
function getServerConfig(isStdioMode: boolean): ServerConfig {
  const port = parseInt(process.env.PORT || '3030', 10);
  const outputFormat =
    process.env.OUTPUT_FORMAT === 'yaml' || process.env.OUTPUT_FORMAT === 'json'
      ? process.env.OUTPUT_FORMAT
      : 'json';

  return {
    port,
    outputFormat,
  };
}

/**
 * Start the MCP server in either stdio or HTTP mode.
 */
export async function startServer(): Promise<void> {
  // Check if we're running in stdio mode (e.g., via CLI)
  const isStdioMode =
    process.env.NODE_ENV === 'cli' || process.argv.includes('--stdio');

  const config = getServerConfig(isStdioMode);

  if (isStdioMode) {
    const server = createServer({
      isHTTP: false,
      outputFormat: config.outputFormat,
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } else {
    console.log(
      `Initializing Contentful MCP Server in HTTP mode on port ${config.port}...`,
    );
    Logger.isHTTP = true;
    await startHttpServer(config.port, { outputFormat: config.outputFormat });
  }
}

export async function startHttpServer(
  port: number,
  serverConfig: { outputFormat: 'yaml' | 'json' },
): Promise<void> {
  const app = express();

  app.get('/sse', async (req: Request, res: Response) => {
    Logger.log('Establishing new SSE connection');
    const transport = new SSEServerTransport('/messages', res);
    Logger.log(
      `New SSE connection established for sessionId ${transport.sessionId}`,
    );
    Logger.log('/sse request headers:', req.headers);
    Logger.log('/sse request body:', req.body);

    transports.sse[transport.sessionId] = transport;
    res.on('close', () => {
      delete transports.sse[transport.sessionId];
    });

    const mcpServer = createServer({
      isHTTP: true,
      outputFormat: serverConfig.outputFormat,
    });
    await mcpServer.connect(transport);
  });

  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.sse[sessionId];
    if (transport) {
      Logger.log(`Received SSE message for sessionId ${sessionId}`);
      Logger.log('/messages request headers:', req.headers);
      Logger.log('/messages request body:', req.body);
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send(`No transport found for sessionId ${sessionId}`);
      return;
    }
  });

  httpServer = app.listen(port, '0.0.0.0', () => {
    Logger.log(`HTTP server listening on port ${port}`);
    Logger.log(`SSE endpoint available at http://localhost:${port}/sse`);
    Logger.log(
      `Message endpoint available at http://localhost:${port}/messages`,
    );
  });

  process.on('SIGINT', async () => {
    Logger.log('Shutting down server...');

    // Close all active transports to properly clean up resources
    await closeTransports(transports.sse);

    Logger.log('Server shutdown complete');
    process.exit(0);
  });
}

async function closeTransports(transports: Record<string, SSEServerTransport>) {
  for (const sessionId in transports) {
    try {
      await transports[sessionId]?.close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
}

export async function stopHttpServer(): Promise<void> {
  if (!httpServer) {
    throw new Error('HTTP server is not running');
  }

  return new Promise((resolve, reject) => {
    httpServer!.close((err: Error | undefined) => {
      if (err) {
        reject(err);
        return;
      }
      httpServer = null;
      const closing = Object.values(transports.sse).map((transport) => {
        return transport.close();
      });
      Promise.all(closing).then(() => {
        resolve();
      });
    });
  });
}
