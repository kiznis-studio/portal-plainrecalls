import type { Recall, Category, Manufacturer, Agency, SearchResult, AgencyStats } from './types';

type Env = { DB: D1Database };

// ---- Recalls ----

export async function getRecentRecalls(env: Env, limit = 20): Promise<Recall[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM recalls ORDER BY date_reported DESC LIMIT ?'
  ).bind(limit).all<Recall>();
  return results;
}

export async function getRecallBySlug(env: Env, slug: string): Promise<Recall | null> {
  return env.DB.prepare('SELECT * FROM recalls WHERE slug = ?').bind(slug).first<Recall>();
}

export async function getRecallsByAgency(env: Env, agency: string, page = 1, perPage = 50): Promise<SearchResult> {
  const offset = (page - 1) * perPage;
  const [countRow, { results }] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as total FROM recalls WHERE agency = ?').bind(agency).first<{ total: number }>(),
    env.DB.prepare('SELECT * FROM recalls WHERE agency = ? ORDER BY date_reported DESC LIMIT ? OFFSET ?')
      .bind(agency, perPage, offset).all<Recall>(),
  ]);
  return { recalls: results, total: countRow?.total || 0, page, perPage };
}

export async function getRecallsByCategory(env: Env, categoryId: string, page = 1, perPage = 50): Promise<SearchResult> {
  const offset = (page - 1) * perPage;
  const [countRow, { results }] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as total FROM recalls WHERE category_id = ?').bind(categoryId).first<{ total: number }>(),
    env.DB.prepare('SELECT * FROM recalls WHERE category_id = ? ORDER BY date_reported DESC LIMIT ? OFFSET ?')
      .bind(categoryId, perPage, offset).all<Recall>(),
  ]);
  return { recalls: results, total: countRow?.total || 0, page, perPage };
}

export async function getRecallsByManufacturer(env: Env, manufacturerId: string, page = 1, perPage = 50): Promise<SearchResult> {
  const offset = (page - 1) * perPage;
  const [countRow, { results }] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as total FROM recalls WHERE manufacturer_id = ?').bind(manufacturerId).first<{ total: number }>(),
    env.DB.prepare('SELECT * FROM recalls WHERE manufacturer_id = ? ORDER BY date_reported DESC LIMIT ? OFFSET ?')
      .bind(manufacturerId, perPage, offset).all<Recall>(),
  ]);
  return { recalls: results, total: countRow?.total || 0, page, perPage };
}

export async function getRecallsByYear(env: Env, year: number, page = 1, perPage = 50): Promise<SearchResult> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const offset = (page - 1) * perPage;
  const [countRow, { results }] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as total FROM recalls WHERE date_reported BETWEEN ? AND ?').bind(startDate, endDate).first<{ total: number }>(),
    env.DB.prepare('SELECT * FROM recalls WHERE date_reported BETWEEN ? AND ? ORDER BY date_reported DESC LIMIT ? OFFSET ?')
      .bind(startDate, endDate, perPage, offset).all<Recall>(),
  ]);
  return { recalls: results, total: countRow?.total || 0, page, perPage };
}

export async function searchRecalls(env: Env, query: string, page = 1, perPage = 50): Promise<SearchResult> {
  const offset = (page - 1) * perPage;
  const pattern = `%${query}%`;
  const [countRow, { results }] = await Promise.all([
    env.DB.prepare(
      'SELECT COUNT(*) as total FROM recalls WHERE title LIKE ? OR product_description LIKE ? OR recalling_firm LIKE ? OR recall_number LIKE ?'
    ).bind(pattern, pattern, pattern, pattern).first<{ total: number }>(),
    env.DB.prepare(
      'SELECT * FROM recalls WHERE title LIKE ? OR product_description LIKE ? OR recalling_firm LIKE ? OR recall_number LIKE ? ORDER BY date_reported DESC LIMIT ? OFFSET ?'
    ).bind(pattern, pattern, pattern, pattern, perPage, offset).all<Recall>(),
  ]);
  return { recalls: results, total: countRow?.total || 0, page, perPage };
}

export async function getRelatedRecalls(env: Env, recall: Recall, limit = 5): Promise<Recall[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM recalls WHERE category_id = ? AND recall_id != ? ORDER BY date_reported DESC LIMIT ?'
  ).bind(recall.category_id, recall.recall_id, limit).all<Recall>();
  return results;
}

// ---- Categories ----

export async function getAllCategories(env: Env): Promise<Category[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM categories ORDER BY recall_count DESC'
  ).all<Category>();
  return results;
}

export async function getCategoryBySlug(env: Env, slug: string): Promise<Category | null> {
  return env.DB.prepare('SELECT * FROM categories WHERE slug = ?').bind(slug).first<Category>();
}

// ---- Manufacturers ----

export async function getTopManufacturers(env: Env, limit = 100): Promise<Manufacturer[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM manufacturers ORDER BY recall_count DESC LIMIT ?'
  ).bind(limit).all<Manufacturer>();
  return results;
}

export async function getManufacturerBySlug(env: Env, slug: string): Promise<Manufacturer | null> {
  return env.DB.prepare('SELECT * FROM manufacturers WHERE slug = ?').bind(slug).first<Manufacturer>();
}

export async function searchManufacturers(env: Env, query: string, limit = 20): Promise<Manufacturer[]> {
  const pattern = `%${query}%`;
  const { results } = await env.DB.prepare(
    'SELECT * FROM manufacturers WHERE name LIKE ? ORDER BY recall_count DESC LIMIT ?'
  ).bind(pattern, limit).all<Manufacturer>();
  return results;
}

// ---- Agencies ----

export async function getAllAgencies(env: Env): Promise<Agency[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM agencies WHERE recall_count > 0 ORDER BY recall_count DESC'
  ).all<Agency>();
  return results;
}

export async function getAgencyBySlug(env: Env, slug: string): Promise<Agency | null> {
  return env.DB.prepare('SELECT * FROM agencies WHERE slug = ?').bind(slug).first<Agency>();
}

export async function getAgencyByAgencyId(env: Env, agencyId: string): Promise<Agency | null> {
  return env.DB.prepare('SELECT * FROM agencies WHERE agency_id = ?').bind(agencyId).first<Agency>();
}

// ---- Stats ----

export async function getAgencyStats(env: Env): Promise<AgencyStats[]> {
  const { results } = await env.DB.prepare(
    'SELECT a.agency_id as agency, a.recall_count as count, a.agency_name as name, a.slug FROM agencies a WHERE a.recall_count > 0 ORDER BY a.recall_count DESC'
  ).all<AgencyStats>();
  return results;
}

export async function getTotalRecallCount(env: Env): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) as total FROM recalls').first<{ total: number }>();
  return row?.total || 0;
}

export async function getYearRange(env: Env): Promise<{ minYear: number; maxYear: number }> {
  const row = await env.DB.prepare(
    "SELECT MIN(SUBSTR(date_reported,1,4)) as minYear, MAX(SUBSTR(date_reported,1,4)) as maxYear FROM recalls WHERE date_reported IS NOT NULL"
  ).first<{ minYear: string; maxYear: string }>();
  return {
    minYear: parseInt(row?.minYear || '2000'),
    maxYear: parseInt(row?.maxYear || '2026'),
  };
}

export async function getRecallCountByYear(env: Env): Promise<{ year: string; count: number }[]> {
  const { results } = await env.DB.prepare(
    "SELECT SUBSTR(date_reported,1,4) as year, COUNT(*) as count FROM recalls WHERE date_reported IS NOT NULL GROUP BY year ORDER BY year DESC"
  ).all<{ year: string; count: number }>();
  return results;
}

// ---- Sitemap helpers ----

export async function getAllRecallSlugs(env: Env): Promise<string[]> {
  const { results } = await env.DB.prepare('SELECT slug FROM recalls').all<{ slug: string }>();
  return results.map(r => r.slug);
}

export async function getAllManufacturerSlugs(env: Env): Promise<string[]> {
  const { results } = await env.DB.prepare('SELECT slug FROM manufacturers WHERE recall_count > 0').all<{ slug: string }>();
  return results.map(r => r.slug);
}
