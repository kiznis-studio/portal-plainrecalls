import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const base = site?.href || 'https://plainrecalls.com/';
  const sitemaps = [
    'sitemap-static.xml',
    'sitemap-radar.xml',
    'sitemap-agencies.xml',
    'sitemap-categories.xml',
    'sitemap-manufacturers.xml',
    'sitemap-recalls-0.xml',
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(s => `  <sitemap><loc>${base}${s}</loc></sitemap>`).join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
