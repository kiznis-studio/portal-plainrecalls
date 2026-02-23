#!/usr/bin/env node
// Import NHTSA recall data from PlainCars local SQLite DB
// Deduplicates by campaign_number (PlainCars has per-model-year entries)

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import Database from 'better-sqlite3';

const RAW_DIR = '/storage/plainrecalls/raw';
mkdirSync(RAW_DIR, { recursive: true });

const DB_PATH = resolve(process.env.HOME, 'Projects/portal-plaincars/data/plaincars.db');

function main() {
  console.log('Importing NHTSA recalls from PlainCars DB...');
  const db = new Database(DB_PATH, { readonly: true });

  // Get unique campaigns with aggregated info
  const rows = db.prepare(`
    SELECT
      r.campaign_number,
      r.component,
      r.summary,
      r.consequence,
      r.remedy,
      r.report_date,
      r.affected_count,
      GROUP_CONCAT(DISTINCT m.make_name) AS makes,
      MIN(r.year) AS year_min,
      MAX(r.year) AS year_max,
      COUNT(*) AS vehicle_count
    FROM recalls r
    LEFT JOIN makes m ON r.make_id = m.make_id
    GROUP BY r.campaign_number
    ORDER BY r.report_date DESC
  `).all();

  db.close();

  const outPath = resolve(RAW_DIR, 'nhtsa.json');
  writeFileSync(outPath, JSON.stringify(rows, null, 0));
  console.log(`NHTSA: ${rows.length} unique campaigns → ${outPath}`);
}

main();
