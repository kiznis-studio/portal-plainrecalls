import type { APIRoute } from 'astro';

const BASE = 'https://plainrecalls.com';

export const GET: APIRoute = async () => {
  const pages = [
    { loc: '/', changefreq: 'daily' },
    { loc: '/recent', changefreq: 'daily' },
    { loc: '/agency', changefreq: 'weekly' },
    { loc: '/category', changefreq: 'weekly' },
    { loc: '/manufacturer', changefreq: 'weekly' },
    { loc: '/rankings', changefreq: 'weekly' },
    { loc: '/search', changefreq: 'weekly' },
    { loc: '/guides/', changefreq: 'weekly' },
    { loc: '/guides/how-us-recall-system-works', changefreq: 'monthly' },
    { loc: '/guides/checking-products-for-recalls', changefreq: 'monthly' },
    { loc: '/guides/recall-severity-classes', changefreq: 'monthly' },
    { loc: '/guides/what-to-do-when-a-product-is-recalled', changefreq: 'monthly' },
    { loc: '/guides/most-recalled-product-categories', changefreq: 'monthly' },
    { loc: '/about', changefreq: 'monthly' },
    { loc: '/privacy', changefreq: 'yearly' },
    { loc: '/terms', changefreq: 'yearly' },
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map(p => `  <url><loc>${BASE}${p.loc}</loc><changefreq>${p.changefreq}</changefreq></url>`),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
