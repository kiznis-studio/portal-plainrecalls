#!/usr/bin/env node
// Fetch CPSC recall data from SaferProducts.gov API

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const RAW_DIR = '/storage/plainrecalls/raw';
mkdirSync(RAW_DIR, { recursive: true });

async function fetchYear(year) {
  const url = `https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=${year}-01-01&RecallDateEnd=${year}-12-31`;
  console.log(`  CPSC ${year}...`);

  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`  CPSC ${year}: HTTP ${resp.status}`);
    return [];
  }
  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}

async function main() {
  console.log('Fetching CPSC recalls by year...');
  const all = [];
  const currentYear = new Date().getFullYear();

  for (let year = 2000; year <= currentYear; year++) {
    const results = await fetchYear(year);
    all.push(...results);
    console.log(`  ${year}: ${results.length} records (total: ${all.length})`);
    await new Promise(r => setTimeout(r, 500));
  }

  const outPath = resolve(RAW_DIR, 'cpsc.json');
  writeFileSync(outPath, JSON.stringify(all, null, 0));
  console.log(`\nCPSC: ${all.length} records → ${outPath}`);
}

main();
