#!/usr/bin/env node
// Export plainrecalls.db to SQL seed files for D1
// Chunks: 500 rows per INSERT, 4 INSERTs per file to avoid SQLITE_TOOBIG

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import Database from 'better-sqlite3';

const DB_PATH = '/storage/plainrecalls/plainrecalls.db';
const SEED_DIR = '/storage/plainrecalls/seed';
mkdirSync(SEED_DIR, { recursive: true });

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return "'" + s + "'";
}

function exportTable(db, table, columns, filePrefix, rowsPerInsert = 500, insertsPerFile = 4) {
  const rows = db.prepare('SELECT * FROM ' + table).all();
  console.log('  ' + table + ': ' + rows.length + ' rows');

  const ROWS_PER_INSERT = rowsPerInsert;
  const INSERTS_PER_FILE = insertsPerFile;
  let fileNum = 0;
  let currentInserts = [];

  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const batch = rows.slice(i, i + ROWS_PER_INSERT);
    const values = batch.map(function (row) {
      return '(' + columns.map(function (c) { return esc(row[c]); }).join(',') + ')';
    }).join(',\n');
    currentInserts.push('INSERT INTO ' + table + ' (' + columns.join(',') + ') VALUES\n' + values + ';');

    if (currentInserts.length >= INSERTS_PER_FILE || i + ROWS_PER_INSERT >= rows.length) {
      const fileName = filePrefix + '-' + String(fileNum).padStart(3, '0') + '.sql';
      writeFileSync(resolve(SEED_DIR, fileName), currentInserts.join('\n\n') + '\n');
      fileNum++;
      currentInserts = [];
    }
  }

  return fileNum;
}

function main() {
  console.log('Exporting to SQL seed files...\n');
  const db = new Database(DB_PATH, { readonly: true });

  // Schema file
  const schema = `
DROP TABLE IF EXISTS recalls;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS manufacturers;
DROP TABLE IF EXISTS agencies;

CREATE TABLE recalls (
  recall_id TEXT PRIMARY KEY,
  agency TEXT NOT NULL,
  recall_number TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  product_description TEXT,
  reason TEXT,
  hazard TEXT,
  remedy TEXT,
  classification TEXT,
  severity INTEGER DEFAULT 2,
  date_reported TEXT,
  date_initiated TEXT,
  status TEXT,
  affected_count TEXT,
  manufacturer_id TEXT,
  distribution TEXT,
  category_id TEXT,
  recalling_firm TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  url TEXT
);

CREATE TABLE categories (
  category_id TEXT PRIMARY KEY,
  category_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  recall_count INTEGER DEFAULT 0
);

CREATE TABLE manufacturers (
  manufacturer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  recall_count INTEGER DEFAULT 0,
  latest_recall_date TEXT
);

CREATE TABLE agencies (
  agency_id TEXT PRIMARY KEY,
  agency_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  url TEXT,
  recall_count INTEGER DEFAULT 0
);

CREATE INDEX idx_recalls_agency ON recalls(agency);
CREATE INDEX idx_recalls_date ON recalls(date_reported DESC);
CREATE INDEX idx_recalls_category ON recalls(category_id);
CREATE INDEX idx_recalls_manufacturer ON recalls(manufacturer_id);
CREATE INDEX idx_recalls_severity ON recalls(severity);
CREATE INDEX idx_recalls_status ON recalls(status);
CREATE INDEX idx_recalls_slug ON recalls(slug);
CREATE INDEX idx_manufacturers_slug ON manufacturers(slug);
CREATE INDEX idx_categories_slug ON categories(slug);
`;
  writeFileSync(resolve(SEED_DIR, '000-schema.sql'), schema.trim() + '\n');

  // Small tables first (single file each)
  const agencyCols = ['agency_id', 'agency_name', 'slug', 'description', 'url', 'recall_count'];
  exportTable(db, 'agencies', agencyCols, '001-agencies');

  const catCols = ['category_id', 'category_name', 'slug', 'description', 'recall_count'];
  exportTable(db, 'categories', catCols, '002-categories');

  // Manufacturers (12K+ rows, multiple files)
  const mfrCols = ['manufacturer_id', 'name', 'slug', 'recall_count', 'latest_recall_date'];
  const mfrFiles = exportTable(db, 'manufacturers', mfrCols, '003-manufacturers');
  console.log('    → ' + mfrFiles + ' files');

  // Recalls (85K+ rows, many files)
  const recallCols = [
    'recall_id', 'agency', 'recall_number', 'slug', 'title', 'product_description',
    'reason', 'hazard', 'remedy', 'classification', 'severity', 'date_reported',
    'date_initiated', 'status', 'affected_count', 'manufacturer_id', 'distribution',
    'category_id', 'recalling_firm', 'city', 'state', 'country', 'url'
  ];
  const recallFiles = exportTable(db, 'recalls', recallCols, '010-recalls', 50, 10);
  console.log('    → ' + recallFiles + ' files');

  db.close();

  console.log('\nSeed files written to: ' + SEED_DIR);
}

main();
