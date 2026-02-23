import type { APIRoute } from 'astro';
import { getAllAgencies } from '../lib/db';

export const GET: APIRoute = async ({ site, locals }) => {
  const base = site?.href || 'https://plainrecalls.com/';
  const env = (locals as any).runtime.env;
  const agencies = await getAllAgencies(env);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${agencies.map(a => `  <url>
    <loc>${base}agency/${a.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
