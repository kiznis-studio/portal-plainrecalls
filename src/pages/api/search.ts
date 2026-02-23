import type { APIRoute } from 'astro';
import { searchRecalls } from '../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1');

  if (!query.trim()) {
    return new Response(JSON.stringify({ recalls: [], total: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env = (locals as any).runtime.env;
  const result = await searchRecalls(env, query.trim(), page, 20);

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
