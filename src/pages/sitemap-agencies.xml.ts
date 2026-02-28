import type { APIRoute } from 'astro';
import { getAllAgencies } from '../lib/db';

const BASE = 'https://plainrecalls.com';

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as any).runtime.env;
  const agencies = await getAllAgencies(env);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...agencies.map(a => `  <url><loc>${BASE}/agency/${a.slug}</loc><changefreq>weekly</changefreq></url>`),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
