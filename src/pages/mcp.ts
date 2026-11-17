import type { APIRoute } from 'astro';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { homeMarkdown } from '../site-info';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== 'https://berlintune.com') {
    return new Response('Forbidden origin', { status: 403 });
  }

  const server = new McpServer({ name: 'berlintune', version: '1.0.0' });
  server.registerTool(
    'get_site_information',
    {
      description: 'Get an overview of berlintune studio and links to its pages.',
      annotations: { readOnlyHint: true },
    },
    async () => ({ content: [{ type: 'text', text: homeMarkdown }] }),
  );
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    maxRequestBodySize: 64 * 1024,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
};

export const GET: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
export const DELETE: APIRoute = GET;
