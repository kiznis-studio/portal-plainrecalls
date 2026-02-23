#!/usr/bin/env node
// Fetch FDA enforcement data (food, drug, device) from openFDA API
// Paginates by skip (max 26000), then by date range for full history

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const RAW_DIR = '/storage/plainrecalls/raw';
mkdirSync(RAW_DIR, { recursive: true });

const ENDPOINTS = [
  { type: 'fda_food', url: 'https://api.fda.gov/food/enforcement.json' },
  { type: 'fda_drug', url: 'https://api.fda.gov/drug/enforcement.json' },
  { type: 'fda_device', url: 'https://api.fda.gov/device/enforcement.json' },
];

async function fetchEndpoint(endpoint) {
  const all = [];
  let skip = 0;
  const limit = 1000;

  while (skip <= 26000) {
    const url = `${endpoint.url}?limit=${limit}&skip=${skip}`;
    console.log(`  ${endpoint.type}: skip=${skip}...`);

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.log(`  ${endpoint.type}: HTTP ${resp.status} at skip=${skip}, stopping`);
        break;
      }
      const data = await resp.json();
      const results = data.results || [];
      if (results.length === 0) break;
      all.push(...results);
      skip += limit;

      // Rate limit: 240 req/min, be gentle
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`  ${endpoint.type}: Error at skip=${skip}:`, err.message);
      break;
    }
  }

  return all;
}

async function main() {
  for (const ep of ENDPOINTS) {
    console.log(`\nFetching ${ep.type}...`);
    const results = await fetchEndpoint(ep);
    const outPath = resolve(RAW_DIR, `${ep.type}.json`);
    writeFileSync(outPath, JSON.stringify(results, null, 0));
    console.log(`  ${ep.type}: ${results.length} records → ${outPath}`);
  }
  console.log('\nDone!');
}

main();
