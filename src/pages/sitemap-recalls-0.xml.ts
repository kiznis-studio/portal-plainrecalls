import type { APIRoute } from 'astro';
import { getAllRecallSlugs } from '../lib/db';

export const GET: APIRoute = async ({ site, locals }) => {
  const base = site?.href || 'https://plainrecalls.com/';
  const env = (locals as any).runtime.env;
  const slugs = await getAllRecallSlugs(env);

  // D1 can return all slugs but sitemap should be max 50K URLs
  const subset = slugs.slice(0, 50000);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${subset.map(s => `  <url>
    <loc>${base}recall/${s}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
