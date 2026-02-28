import type { APIRoute } from 'astro';
import { getRecallCountByYear } from '../lib/db';

const BASE = 'https://plainrecalls.com';

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as any).runtime.env;
  const yearData = await getRecallCountByYear(env);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...yearData.map(y => `  <url><loc>${BASE}/year/${y.year}</loc><changefreq>monthly</changefreq></url>`),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=86400' },
  });
};
