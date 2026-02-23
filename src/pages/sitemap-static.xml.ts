import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const base = site?.href || 'https://plainrecalls.com/';
  const pages = [
    { loc: '', priority: '1.0', changefreq: 'daily' },
    { loc: 'recent', priority: '0.9', changefreq: 'daily' },
    { loc: 'agency', priority: '0.8', changefreq: 'weekly' },
    { loc: 'category', priority: '0.8', changefreq: 'weekly' },
    { loc: 'manufacturer', priority: '0.7', changefreq: 'weekly' },
    { loc: 'rankings', priority: '0.7', changefreq: 'weekly' },
    { loc: 'search', priority: '0.6', changefreq: 'weekly' },
    { loc: 'about', priority: '0.3', changefreq: 'monthly' },
    { loc: 'privacy', priority: '0.2', changefreq: 'yearly' },
    { loc: 'terms', priority: '0.2', changefreq: 'yearly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${base}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
