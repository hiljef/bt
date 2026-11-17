import type { APIRoute } from 'astro';

export const prerender = false;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const GET: APIRoute = () => Response.json({
  $schema: 'https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json',
  version: '1.0',
  protocolVersion: '2025-06-18',
  serverInfo: { name: 'berlintune', title: 'berlintune studio', version: '1.0.0' },
  description: 'Read-only information about berlintune studio.',
  transport: { type: 'streamable-http', endpoint: 'https://berlintune.com/mcp' },
  capabilities: { tools: { listChanged: true } },
  authentication: { required: false, schemes: [] },
  tools: [{
    name: 'get_site_information',
    description: 'Get an overview of berlintune studio and links to its pages.',
    inputSchema: { type: 'object', properties: {} },
  }],
}, { headers });

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers });
