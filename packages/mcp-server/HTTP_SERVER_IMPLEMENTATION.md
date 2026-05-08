# HTTP Server Mode Implementation

This refactoring adds HTTP server mode support to the Contentful MCP Server, allowing it to run in both stdio and HTTP modes.

## Files Created

### 1. `src/server.ts`

Main server implementation that handles both stdio and HTTP modes:

- **SSE Transport**: Implements Server-Sent Events for HTTP communication
- **Configuration**: Reads from environment variables (PORT, OUTPUT_FORMAT)
- **Mode Detection**: Automatically detects stdio vs HTTP mode based on:
  - `NODE_ENV=cli` environment variable
  - `--stdio` command line flag
- **Endpoints**:
  - `GET /sse` - Establishes SSE connection
  - `POST /messages` - Handles client messages

### 2. `src/bin.ts`

Entry point for HTTP mode execution:

- Loads `.env` file from current working directory
- Calls `startServer()` to initialize in HTTP mode
- Proper error handling and exit codes

## Files Modified

### 1. `src/index.ts`

Refactored to support modular server creation:

- **`createServer(options)`**: New exported function to create MCP server instance
- **`registerTools(server, options)`**: Internal function to register all tools
- **Options Support**: Accepts `outputFormat` for future extensibility
- **Backward Compatibility**: Still works as stdio entry point when run directly

### 2. `package.json`

Enhanced with HTTP mode support:

- **New Scripts**:
  - `start:http`: Runs the server in HTTP mode via `dist/bin.js`
- **New Bin Entry**:
  - `contentful-mcp-server-http`: Direct binary for HTTP mode
- **New Dependencies**:
  - `express`: ^4.18.2 (HTTP server framework)
- **New DevDependencies**:
  - `@types/express`: ^4.17.21 (TypeScript types)

### 3. `tsup.config.ts`

Updated build configuration:

- Added `src/bin.ts` and `src/server.ts` to entry points
- Ensures all necessary files are compiled

## Usage

### Stdio Mode (Default)

```bash
# Via npm script (existing)
npm start

# Via binary
contentful-mcp-server
```

### HTTP Mode

```bash
# Build first
npm run build

# Via npm script
npm run start:http

# Via binary
contentful-mcp-server-http

# With custom port
PORT=4000 npm run start:http
```

### Environment Variables

- `PORT`: HTTP server port (default: 3000)
- `OUTPUT_FORMAT`: Output format - 'yaml' or 'json' (default: 'yaml')
- `NODE_ENV`: Set to 'cli' to force stdio mode
- All existing Contentful env vars (CONTENTFUL_MANAGEMENT_ACCESS_TOKEN, etc.)

## Installation

After these changes, install the new dependencies:

```bash
npm install
```

## Architecture

```
┌─────────────────────┐
│   Entry Points      │
├─────────────────────┤
│ index.ts (stdio)    │
│ bin.ts (http)       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   server.ts         │
├─────────────────────┤
│ startServer()       │
│ - Detects mode      │
│ - Creates server    │
│ - Sets up transport │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   index.ts          │
├─────────────────────┤
│ createServer()      │
│ - Initializes MCP   │
│ - Registers tools   │
└─────────────────────┘
```

## Testing

1. **Build the project**:

   ```bash
   npm run build
   ```

2. **Test stdio mode**:

   ```bash
   node dist/index.js
   ```

3. **Test HTTP mode**:
   ```bash
   node dist/bin.js
   ```
   Then connect via SSE endpoint at `http://localhost:3000/sse`

## Notes

- The HTTP implementation uses SSE (Server-Sent Events) transport, which is widely supported
- StreamableHTTP transport was omitted as it may not be available in all MCP SDK versions
- All existing stdio functionality remains unchanged
- The server gracefully handles SIGINT for clean shutdown
