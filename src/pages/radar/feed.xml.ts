export const prerender = false;

import type { APIContext } from 'astro';
import { getRadarRecalls } from '../../lib/db';
import { agencyLabel, severityLabel } from '../../lib/format';

const SITE = 'https://plainrecalls.com';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(context: APIContext) {
  const env = context.locals.runtime.env;
  const url = new URL(context.request.url);
  const agencyFilter = url.searchParams.get('agency') || undefined;
  const severityFilter = url.searchParams.get('severity')
    ? parseInt(url.searchParams.get('severity')!)
    : undefined;

  const { recalls } = await getRadarRecalls(env, {
    agency: agencyFilter,
    severity: severityFilter,
    limit: 30,
  });

  let channelTitle = 'PlainRecalls — RecallRadar';
  if (agencyFilter) channelTitle += ` (${agencyLabel(agencyFilter)})`;
  if (severityFilter) channelTitle += ` (${severityLabel(severityFilter)})`;

  const items = recalls.map(r => {
    const pubDate = r.date_reported
      ? new Date(r.date_reported + 'T12:00:00Z').toUTCString()
      : new Date().toUTCString();
    const description = [
      r.reason && `Reason: ${r.reason}`,
      r.recalling_firm && `Company: ${r.recalling_firm}`,
      `Severity: ${severityLabel(r.severity)}`,
      `Agency: ${agencyLabel(r.agency)}`,
    ].filter(Boolean).join(' | ');

    return `    <item>
      <title>${escapeXml(r.title)}</title>
      <link>${SITE}/recall/${r.slug}</link>
      <guid isPermaLink="true">${SITE}/recall/${r.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(agencyLabel(r.agency))}</category>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${SITE}/radar/</link>
    <description>Live product recall feed from FDA, CPSC, NHTSA, and USDA. Consumer safety alerts updated regularly.</description>
    <language>en-us</language>
    <atom:link href="${SITE}/radar/feed.xml${agencyFilter ? `?agency=${agencyFilter}` : ''}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600',
    },
  });
}
