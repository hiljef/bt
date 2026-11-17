import { homeMarkdown } from '../site-info';

export function GET() {
  return new Response(homeMarkdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
