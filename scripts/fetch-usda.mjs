#!/usr/bin/env node
// Fetch USDA FSIS recall data from fsis.usda.gov API

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const RAW_DIR = '/storage/plainrecalls/raw';
mkdirSync(RAW_DIR, { recursive: true });

async function main() {
  console.log('Fetching USDA FSIS recalls...');
  const all = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://fsis.usda.gov/fsis/api/recall/v/1?limit=${limit}&offset=${offset}`;
    console.log(`  USDA: offset=${offset}...`);

    try {
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
      if (!resp.ok) {
        console.log(`  USDA: HTTP ${resp.status} at offset=${offset}, stopping`);
        break;
      }
      const data = await resp.json();
      const results = Array.isArray(data) ? data : (data.results || data.recalls || []);
      if (results.length === 0) break;
      all.push(...results);
      console.log(`  USDA: got ${results.length} (total: ${all.length})`);
      offset += limit;

      // Be gentle with the API
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`  USDA: Error at offset=${offset}:`, err.message);
      break;
    }
  }

  const outPath = resolve(RAW_DIR, 'usda.json');
  writeFileSync(outPath, JSON.stringify(all, null, 0));
  console.log(`\nUSDA: ${all.length} records → ${outPath}`);
}

main();
