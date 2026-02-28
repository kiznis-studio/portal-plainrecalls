#!/usr/bin/env node
// Normalize all agency recall data into unified plainrecalls.db schema
// Reads raw JSON from /storage/plainrecalls/raw/ → writes SQLite DB

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import Database from 'better-sqlite3';

const RAW_DIR = '/storage/plainrecalls/raw';
const DB_PATH = '/storage/plainrecalls/plainrecalls.db';

// Category assignment based on agency + keywords
const CATEGORIES = [
  { id: 'food', name: 'Food', keywords: ['food', 'meat', 'poultry', 'dairy', 'produce', 'snack', 'beverage', 'cereal', 'bread', 'sauce', 'soup', 'salad', 'cheese', 'ice cream', 'seafood', 'fish', 'chicken', 'beef', 'pork', 'egg', 'nut', 'fruit', 'vegetable'] },
  { id: 'drugs', name: 'Drugs & Medications', keywords: ['drug', 'tablet', 'capsule', 'medication', 'pharmaceutical', 'prescription', 'antibiotic', 'aspirin', 'ibuprofen', 'acetaminophen', 'injection', 'oral solution', 'ophthalmic'] },
  { id: 'medical-devices', name: 'Medical Devices', keywords: ['device', 'implant', 'catheter', 'pump', 'monitor', 'ventilator', 'defibrillator', 'pacemaker', 'stent', 'surgical', 'diagnostic', 'infusion', 'syringe', 'needle', 'test kit', 'glucose', 'blood pressure'] },
  { id: 'vehicles', name: 'Vehicles', keywords: ['vehicle', 'car', 'truck', 'suv', 'sedan', 'motorcycle', 'bus', 'trailer', 'tire', 'airbag', 'seatbelt', 'brake', 'steering', 'engine', 'transmission', 'fuel system'] },
  { id: 'children', name: 'Children & Baby Products', keywords: ['child', 'infant', 'baby', 'toddler', 'crib', 'stroller', 'car seat', 'highchair', 'toy', 'pacifier', 'bottle', 'nursery', 'playpen', 'swing', 'bassinet', 'bouncer'] },
  { id: 'electronics', name: 'Electronics', keywords: ['battery', 'charger', 'laptop', 'phone', 'tablet', 'computer', 'power supply', 'adapter', 'cable', 'speaker', 'headphone', 'bluetooth', 'wireless', 'usb', 'lithium'] },
  { id: 'household', name: 'Household Products', keywords: ['furniture', 'mattress', 'chair', 'table', 'shelf', 'dresser', 'bed', 'sofa', 'couch', 'cabinet', 'drawer', 'desk', 'lamp', 'candle', 'curtain', 'rug', 'carpet', 'blind'] },
  { id: 'outdoor', name: 'Outdoor & Sports', keywords: ['bicycle', 'bike', 'helmet', 'camping', 'hiking', 'climbing', 'kayak', 'boat', 'pool', 'trampoline', 'playground', 'golf', 'fitness', 'exercise', 'scooter', 'skateboard', 'atv'] },
  { id: 'cosmetics', name: 'Cosmetics & Personal Care', keywords: ['cosmetic', 'shampoo', 'lotion', 'cream', 'sunscreen', 'makeup', 'lipstick', 'nail', 'hair', 'skin', 'perfume', 'deodorant', 'soap', 'body wash', 'toothpaste'] },
  { id: 'supplements', name: 'Dietary Supplements', keywords: ['supplement', 'vitamin', 'mineral', 'protein', 'herbal', 'probiotic', 'omega', 'dietary', 'weight loss', 'energy', 'amino acid'] },
  { id: 'meat-poultry', name: 'Meat & Poultry', keywords: ['usda', 'fsis', 'ground beef', 'ground turkey', 'sausage', 'deli meat', 'hot dog', 'ham', 'bacon', 'jerky', 'ready-to-eat'] },
  { id: 'appliances', name: 'Appliances', keywords: ['appliance', 'microwave', 'oven', 'stove', 'dishwasher', 'refrigerator', 'freezer', 'washer', 'dryer', 'heater', 'air conditioner', 'fan', 'blender', 'toaster', 'coffee maker', 'pressure cooker'] },
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
}

function assignCategory(agency, text) {
  const lower = (text || '').toLowerCase();

  // Agency-specific defaults
  if (agency === 'nhtsa') return 'vehicles';
  if (agency === 'usda') return 'meat-poultry';
  if (agency === 'fda_device') return 'medical-devices';

  // Keyword matching
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) return cat.id;
    }
  }

  // Fallback by agency
  if (agency === 'fda_food') return 'food';
  if (agency === 'fda_drug') return 'drugs';
  return 'household'; // generic fallback
}

function classificationToSeverity(classification) {
  if (!classification) return 2;
  const cl = classification.toUpperCase();
  if (cl.includes('I') && !cl.includes('II')) return 1; // Class I = most serious
  if (cl.includes('III')) return 3;
  return 2; // Class II or unknown
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  // Handle YYYYMMDD format (FDA)
  if (/^\d{8}$/.test(dateStr)) {
    return dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6, 8);
  }
  // Handle DD/MM/YYYY format (NHTSA from our DB)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }
  // Handle ISO datetime (CPSC)
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

// ---- Normalize FDA records ----
function normalizeFda(records, agency) {
  return records.map(function (r) {
    return {
      agency: agency,
      recall_number: r.recall_number || '',
      title: (r.product_description || '').substring(0, 500),
      product_description: r.product_description || '',
      reason: r.reason_for_recall || '',
      hazard: r.reason_for_recall || '',
      remedy: '',
      classification: r.classification || '',
      severity: classificationToSeverity(r.classification),
      date_reported: formatDate(r.report_date),
      date_initiated: formatDate(r.recall_initiation_date),
      status: r.status || '',
      affected_count: r.product_quantity || '',
      distribution: r.distribution_pattern || '',
      recalling_firm: r.recalling_firm || '',
      city: r.city || '',
      state: r.state || '',
      country: r.country || '',
      url: '',
    };
  });
}

// ---- Normalize CPSC records ----
function normalizeCpsc(records) {
  return records.map(function (r) {
    const hazardText = (r.Hazards || []).map(function (h) { return h.Name; }).join('; ');
    const remedyText = (r.Remedies || []).map(function (h) { return h.Name; }).join('; ');
    const mfrs = (r.Manufacturers || []).map(function (m) { return m.Name; }).filter(Boolean);
    const dists = (r.Distributors || []).map(function (d) { return d.Name; }).filter(Boolean);
    const firm = mfrs[0] || dists[0] || '';
    const units = (r.Products || []).map(function (p) { return p.NumberOfUnits; }).filter(Boolean).join(', ');

    return {
      agency: 'cpsc',
      recall_number: r.RecallNumber || String(r.RecallID || ''),
      title: r.Title || '',
      product_description: r.Description || '',
      reason: hazardText,
      hazard: hazardText,
      remedy: remedyText,
      classification: '',
      severity: 2,
      date_reported: formatDate(r.RecallDate),
      date_initiated: formatDate(r.RecallDate),
      status: 'Active',
      affected_count: units,
      distribution: '',
      recalling_firm: firm,
      city: '',
      state: '',
      country: (r.ManufacturerCountries || []).map(function (c) { return c.Country; }).join(', '),
      url: r.URL || '',
    };
  });
}

// ---- Normalize NHTSA records ----
function normalizeNhtsa(records) {
  return records.map(function (r) {
    const makesStr = r.makes || '';
    const yearRange = r.year_min === r.year_max
      ? String(r.year_min || '')
      : (r.year_min || '') + '-' + (r.year_max || '');
    const title = (makesStr + ' ' + yearRange + ': ' + (r.component || '').substring(0, 200)).trim();

    return {
      agency: 'nhtsa',
      recall_number: r.campaign_number || '',
      title: title.substring(0, 500),
      product_description: r.summary || '',
      reason: r.summary || '',
      hazard: r.consequence || '',
      remedy: r.remedy || '',
      classification: '',
      severity: r.consequence && r.consequence.toLowerCase().includes('death') ? 1
        : r.consequence && (r.consequence.toLowerCase().includes('crash') || r.consequence.toLowerCase().includes('fire')) ? 1
        : 2,
      date_reported: formatDate(r.report_date),
      date_initiated: formatDate(r.report_date),
      status: 'Active',
      affected_count: r.affected_count ? String(r.affected_count) : '',
      distribution: 'United States',
      recalling_firm: makesStr,
      city: '',
      state: '',
      country: 'United States',
      url: r.campaign_number
        ? 'https://www.nhtsa.gov/recalls?nhtsaId=' + r.campaign_number
        : '',
    };
  });
}

// ---- Build manufacturers lookup ----
function buildManufacturers(normalizedRecalls) {
  const mfrs = new Map();
  for (const r of normalizedRecalls) {
    const firm = (r.recalling_firm || '').trim();
    if (!firm) continue;
    const slug = slugify(firm);
    if (!slug) continue;
    if (!mfrs.has(slug)) {
      mfrs.set(slug, { name: firm, slug: slug, count: 0, latestDate: '' });
    }
    const m = mfrs.get(slug);
    m.count++;
    if (r.date_reported && r.date_reported > (m.latestDate || '')) {
      m.latestDate = r.date_reported;
    }
  }
  return mfrs;
}

function readJsonFile(filename) {
  const path = resolve(RAW_DIR, filename);
  if (!existsSync(path)) {
    console.log('  Skipping ' + filename + ' (not found)');
    return [];
  }
  const data = JSON.parse(readFileSync(path, 'utf8'));
  console.log('  Loaded ' + filename + ': ' + data.length + ' records');
  return data;
}

function main() {
  console.log('Building PlainRecalls database...\n');

  // Load raw data
  console.log('Loading raw data...');
  const fdaFood = readJsonFile('fda_food.json');
  const fdaDrug = readJsonFile('fda_drug.json');
  const fdaDevice = readJsonFile('fda_device.json');
  const cpsc = readJsonFile('cpsc.json');
  const nhtsa = readJsonFile('nhtsa.json');
  const usda = readJsonFile('usda.json');

  // Normalize
  console.log('\nNormalizing records...');
  const all = [
    ...normalizeFda(fdaFood, 'fda_food'),
    ...normalizeFda(fdaDrug, 'fda_drug'),
    ...normalizeFda(fdaDevice, 'fda_device'),
    ...normalizeCpsc(cpsc),
    ...normalizeNhtsa(nhtsa),
  ];
  // USDA would go here when available
  if (usda.length > 0) {
    console.log('  USDA normalization not yet implemented');
  }
  console.log('  Total normalized: ' + all.length);

  // Assign categories and generate slugs/IDs
  const seen = new Set();
  for (const r of all) {
    const catId = assignCategory(r.agency, r.title + ' ' + r.product_description + ' ' + r.reason);
    r.category_id = catId;

    // Generate unique recall_id and slug
    let baseSlug = slugify(r.recall_number + '-' + r.title.substring(0, 80));
    if (!baseSlug) baseSlug = slugify(r.recall_number || 'unknown');
    let slug = baseSlug;
    let i = 1;
    while (seen.has(slug)) {
      slug = baseSlug + '-' + (i++);
    }
    seen.add(slug);
    r.slug = slug;
    r.recall_id = r.agency + '-' + (r.recall_number || slug);
  }

  // Deduplicate by recall_id
  const deduped = new Map();
  for (const r of all) {
    if (!deduped.has(r.recall_id)) {
      deduped.set(r.recall_id, r);
    }
  }
  const recalls = [...deduped.values()];
  console.log('  After dedup: ' + recalls.length);

  // Build manufacturers
  const manufacturers = buildManufacturers(recalls);
  console.log('  Manufacturers: ' + manufacturers.size);

  // Assign manufacturer_id to recalls
  for (const r of recalls) {
    const firm = (r.recalling_firm || '').trim();
    if (firm) {
      const mSlug = slugify(firm);
      if (manufacturers.has(mSlug)) {
        r.manufacturer_id = mSlug;
      }
    }
  }

  // Build category counts
  const catCounts = new Map();
  for (const r of recalls) {
    catCounts.set(r.category_id, (catCounts.get(r.category_id) || 0) + 1);
  }

  // Agency counts
  const agencyCounts = new Map();
  for (const r of recalls) {
    agencyCounts.set(r.agency, (agencyCounts.get(r.agency) || 0) + 1);
  }

  // Create database
  console.log('\nCreating database...');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
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
  `);

  // Insert agencies
  const agencyInfo = {
    fda_food: { name: 'FDA Food Safety', slug: 'fda-food', desc: 'U.S. Food and Drug Administration — Food recalls and safety alerts', url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts' },
    fda_drug: { name: 'FDA Drug Safety', slug: 'fda-drug', desc: 'U.S. Food and Drug Administration — Drug recalls and safety communications', url: 'https://www.fda.gov/drugs/drug-safety-and-availability' },
    fda_device: { name: 'FDA Medical Devices', slug: 'fda-device', desc: 'U.S. Food and Drug Administration — Medical device recalls', url: 'https://www.fda.gov/medical-devices/medical-device-recalls' },
    cpsc: { name: 'CPSC', slug: 'cpsc', desc: 'U.S. Consumer Product Safety Commission — Consumer product recalls', url: 'https://www.cpsc.gov/Recalls' },
    nhtsa: { name: 'NHTSA', slug: 'nhtsa', desc: 'National Highway Traffic Safety Administration — Vehicle safety recalls', url: 'https://www.nhtsa.gov/recalls' },
    usda: { name: 'USDA FSIS', slug: 'usda', desc: 'U.S. Department of Agriculture Food Safety and Inspection Service — Meat and poultry recalls', url: 'https://www.fsis.usda.gov/recalls' },
  };

  const insertAgency = db.prepare('INSERT INTO agencies VALUES (?, ?, ?, ?, ?, ?)');
  for (const [id, info] of Object.entries(agencyInfo)) {
    insertAgency.run(id, info.name, info.slug, info.desc, info.url, agencyCounts.get(id) || 0);
  }

  // Insert categories
  const catDescriptions = {
    'food': 'Food safety recalls including contamination, mislabeling, and undeclared allergens',
    'drugs': 'Prescription and over-the-counter medication recalls',
    'medical-devices': 'Medical device recalls including implants, diagnostic equipment, and surgical tools',
    'vehicles': 'Vehicle safety recalls from NHTSA including cars, trucks, motorcycles, and equipment',
    'children': 'Children and baby product recalls including toys, cribs, strollers, and car seats',
    'electronics': 'Electronics recalls including batteries, chargers, and consumer devices',
    'household': 'Household product recalls including furniture, mattresses, and home goods',
    'outdoor': 'Outdoor, sports, and recreational product recalls',
    'cosmetics': 'Cosmetics and personal care product recalls',
    'supplements': 'Dietary supplement recalls including vitamins, herbs, and protein products',
    'meat-poultry': 'USDA-regulated meat, poultry, and processed meat product recalls',
    'appliances': 'Home and kitchen appliance recalls',
  };

  const insertCat = db.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?)');
  for (const cat of CATEGORIES) {
    insertCat.run(cat.id, cat.name, cat.id, catDescriptions[cat.id] || '', catCounts.get(cat.id) || 0);
  }

  // Insert manufacturers
  const insertMfr = db.prepare('INSERT INTO manufacturers VALUES (?, ?, ?, ?, ?)');
  const insertMfrTx = db.transaction(function () {
    for (const [, m] of manufacturers) {
      insertMfr.run(m.slug, m.name, m.slug, m.count, m.latestDate);
    }
  });
  insertMfrTx();
  console.log('  Inserted ' + manufacturers.size + ' manufacturers');

  // Insert recalls in batches
  const insertRecall = db.prepare(
    'INSERT INTO recalls VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const batchSize = 5000;
  let inserted = 0;
  for (let i = 0; i < recalls.length; i += batchSize) {
    const batch = recalls.slice(i, i + batchSize);
    const tx = db.transaction(function () {
      for (const r of batch) {
        insertRecall.run(
          r.recall_id, r.agency, r.recall_number, r.slug,
          r.title, r.product_description, r.reason, r.hazard, r.remedy,
          r.classification, r.severity, r.date_reported, r.date_initiated,
          r.status, r.affected_count, r.manufacturer_id || null,
          r.distribution, r.category_id, r.recalling_firm,
          r.city, r.state, r.country, r.url || ''
        );
      }
    });
    tx();
    inserted += batch.length;
    console.log('  Recalls: ' + inserted + '/' + recalls.length);
  }

  // Pre-compute stats table (avoids COUNT(*) and MIN/MAX on every page load)
  console.log('\nPopulating _stats table...');
  db.prepare('CREATE TABLE IF NOT EXISTS _stats (key TEXT PRIMARY KEY, value TEXT)').run();
  const insertStat = db.prepare('INSERT OR REPLACE INTO _stats (key, value) VALUES (?, ?)');

  const totalRecalls = db.prepare('SELECT COUNT(*) as c FROM recalls').get().c;
  insertStat.run('total_recalls', String(totalRecalls));
  console.log('  total_recalls = ' + totalRecalls);

  const yearMin = db.prepare("SELECT MIN(SUBSTR(date_reported,1,4)) as v FROM recalls WHERE date_reported IS NOT NULL").get().v;
  const yearMax = db.prepare("SELECT MAX(SUBSTR(date_reported,1,4)) as v FROM recalls WHERE date_reported IS NOT NULL").get().v;
  insertStat.run('year_min', yearMin);
  insertStat.run('year_max', yearMax);
  console.log('  year_min = ' + yearMin + ', year_max = ' + yearMax);

  const byYear = db.prepare("SELECT SUBSTR(date_reported,1,4) as year, COUNT(*) as count FROM recalls WHERE date_reported IS NOT NULL GROUP BY year ORDER BY year DESC").all();
  insertStat.run('recalls_by_year', JSON.stringify(byYear));
  console.log('  recalls_by_year = ' + byYear.length + ' years');

  // Create indexes for prefix search
  db.prepare('CREATE INDEX IF NOT EXISTS idx_recalls_title ON recalls(title)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_recalls_firm ON recalls(recalling_firm)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_recalls_number ON recalls(recall_number)').run();

  db.close();

  // Summary
  console.log('\nDone! Database: ' + DB_PATH);
  console.log('  Total recalls: ' + recalls.length);
  console.log('  Agencies: ' + agencyCounts.size);
  for (const [agency, count] of agencyCounts) {
    console.log('    ' + agency + ': ' + count);
  }
  console.log('  Categories: ' + catCounts.size);
  console.log('  Manufacturers: ' + manufacturers.size);
}

main();
