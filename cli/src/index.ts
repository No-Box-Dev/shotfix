import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCaptureTools } from './tools/capture.js';

const server = new McpServer({
  name: 'shotfix',
  version: '0.1.0',
});

registerCaptureTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
