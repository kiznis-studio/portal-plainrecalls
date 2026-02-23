import type { APIRoute } from 'astro';
import { getAllCategories } from '../lib/db';

export const GET: APIRoute = async ({ site, locals }) => {
  const base = site?.href || 'https://plainrecalls.com/';
  const env = (locals as any).runtime.env;
  const categories = await getAllCategories(env);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categories.filter(c => c.recall_count > 0).map(c => `  <url>
    <loc>${base}category/${c.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
