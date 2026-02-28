import type { APIRoute } from 'astro';
import { getAllCategories } from '../lib/db';

const BASE = 'https://plainrecalls.com';

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as any).runtime.env;
  const categories = await getAllCategories(env);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...categories.filter(c => c.recall_count > 0).map(c => `  <url><loc>${BASE}/category/${c.slug}</loc><changefreq>weekly</changefreq></url>`),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
