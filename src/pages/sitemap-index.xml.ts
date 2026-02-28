import type { APIRoute } from 'astro';

const BASE = 'https://plainrecalls.com';

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as any).runtime.env;

  // Count total recalls for pagination
  const row = await env.DB.prepare('SELECT COUNT(*) as count FROM recalls').first<{ count: number }>();
  const totalRecalls = row?.count || 0;
  const recallPages = Math.ceil(totalRecalls / 50000);

  const sitemaps = [
    `${BASE}/sitemap-static.xml`,
    `${BASE}/sitemap-radar.xml`,
    `${BASE}/sitemap-agencies.xml`,
    `${BASE}/sitemap-categories.xml`,
    `${BASE}/sitemap-manufacturers.xml`,
    `${BASE}/sitemap-years.xml`,
  ];

  for (let i = 1; i <= recallPages; i++) {
    sitemaps.push(`${BASE}/sitemap-recalls-${i}.xml`);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemaps.map(loc => `  <sitemap><loc>${loc}</loc></sitemap>`),
    '</sitemapindex>',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
