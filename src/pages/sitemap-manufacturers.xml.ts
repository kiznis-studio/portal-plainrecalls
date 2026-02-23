import type { APIRoute } from 'astro';
import { getAllManufacturerSlugs } from '../lib/db';

export const GET: APIRoute = async ({ site, locals }) => {
  const base = site?.href || 'https://plainrecalls.com/';
  const env = (locals as any).runtime.env;
  const slugs = await getAllManufacturerSlugs(env);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${slugs.map(s => `  <url>
    <loc>${base}manufacturer/${s}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
