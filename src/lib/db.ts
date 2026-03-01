import path from "node:path";
import Database from "better-sqlite3";
import type {
  CompanyResult,
  FilterOption,
  SearchFilters,
  SearchResponse,
} from "./types";

const DB_PATH = path.join(process.cwd(), "data", "builtwith.db");

const EXPORT_ROW_LIMIT = 50_000;
const FACET_CACHE_TTL_MS = 60_000;

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma("journal_mode = WAL");
  }
  return _db;
}

function safeParseJSON<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ─── Facet caching ───────────────────────────────────────────────────────────

let _facetCache: SearchResponse["facets"] | null = null;
let _facetCacheTime = 0;

export function getFacets(): SearchResponse["facets"] {
  const now = Date.now();
  if (_facetCache && now - _facetCacheTime < FACET_CACHE_TTL_MS) {
    return _facetCache;
  }

  const db = getDb();

  const categories = db
    .prepare(
      "SELECT category as value, category as label, COUNT(*) as count FROM companies WHERE category != '' GROUP BY category ORDER BY count DESC",
    )
    .all() as FilterOption[];

  const countries = db
    .prepare(
      "SELECT country as value, country as label, COUNT(*) as count FROM companies WHERE country != '' GROUP BY country ORDER BY count DESC",
    )
    .all() as FilterOption[];

  const techCategories = db
    .prepare(
      "SELECT category as value, category as label, COUNT(*) as count FROM tech_index WHERE category != '' GROUP BY category ORDER BY count DESC",
    )
    .all() as FilterOption[];

  const technologies = db
    .prepare(
      `SELECT ti.name as value, ti.name as label, COUNT(ct.domain) as count
       FROM tech_index ti
       LEFT JOIN company_technologies ct ON ct.tech_name = ti.name
       GROUP BY ti.name HAVING count > 0
       ORDER BY count DESC LIMIT 500`,
    )
    .all() as FilterOption[];

  _facetCache = { categories, countries, techCategories, technologies };
  _facetCacheTime = now;
  return _facetCache;
}

// ─── Shared query builder ────────────────────────────────────────────────────

interface BuiltQuery {
  whereClause: string;
  params: unknown[];
}

function buildWhereClause(filters: SearchFilters): BuiltQuery {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    conditions.push("(c.company_name LIKE ? OR c.domain LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.categories?.length) {
    conditions.push(
      `c.category IN (${filters.categories.map(() => "?").join(",")})`,
    );
    params.push(...filters.categories);
  }

  if (filters.countries?.length) {
    conditions.push(
      `c.country IN (${filters.countries.map(() => "?").join(",")})`,
    );
    params.push(...filters.countries);
  }

  if (filters.techCountMin !== undefined && filters.techCountMin > 0) {
    conditions.push("c.total_technologies >= ?");
    params.push(filters.techCountMin);
  }
  if (filters.techCountMax !== undefined && filters.techCountMax < 10000) {
    conditions.push("c.total_technologies <= ?");
    params.push(filters.techCountMax);
  }

  if (filters.techSpendMin !== undefined && filters.techSpendMin > 0) {
    conditions.push("c.tech_spend >= ?");
    params.push(filters.techSpendMin);
  }
  if (filters.techSpendMax !== undefined && filters.techSpendMax < 100000) {
    conditions.push("c.tech_spend <= ?");
    params.push(filters.techSpendMax);
  }

  if (filters.technologiesAnd?.length) {
    for (const tech of filters.technologiesAnd) {
      conditions.push(
        "EXISTS (SELECT 1 FROM company_technologies ct_a WHERE ct_a.domain = c.domain AND ct_a.tech_name = ?)",
      );
      params.push(tech);
    }
  }

  if (filters.technologiesOr?.length) {
    const placeholders = filters.technologiesOr.map(() => "?").join(",");
    conditions.push(
      `EXISTS (SELECT 1 FROM company_technologies ct_o WHERE ct_o.domain = c.domain AND ct_o.tech_name IN (${placeholders}))`,
    );
    params.push(...filters.technologiesOr);
  }

  if (filters.technologiesNot?.length) {
    const placeholders = filters.technologiesNot.map(() => "?").join(",");
    conditions.push(
      `NOT EXISTS (SELECT 1 FROM company_technologies ct_n WHERE ct_n.domain = c.domain AND ct_n.tech_name IN (${placeholders}))`,
    );
    params.push(...filters.technologiesNot);
  }

  if (filters.techCategories?.length) {
    const placeholders = filters.techCategories.map(() => "?").join(",");
    conditions.push(
      `EXISTS (SELECT 1 FROM company_tech_categories ctc WHERE ctc.domain = c.domain AND ctc.tech_category IN (${placeholders}))`,
    );
    params.push(...filters.techCategories);
  }

  if (
    filters.categoryTechFilter?.techCategory &&
    filters.categoryTechFilter.minCount > 0
  ) {
    conditions.push(
      `EXISTS (SELECT 1 FROM company_tech_categories ctc2 WHERE ctc2.domain = c.domain AND ctc2.tech_category = ? AND ctc2.tech_count >= ?)`,
    );
    params.push(
      filters.categoryTechFilter.techCategory,
      filters.categoryTechFilter.minCount,
    );
  }

  return {
    whereClause:
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

// ─── Batch technology loader (eliminates N+1) ────────────────────────────────

function batchLoadTechnologies(
  db: Database.Database,
  domains: string[],
): Map<string, string[]> {
  const techMap = new Map<string, string[]>();
  if (domains.length === 0) return techMap;

  for (const d of domains) techMap.set(d, []);

  const BATCH_SIZE = 500;
  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT domain, tech_name FROM company_technologies WHERE domain IN (${placeholders}) ORDER BY domain, tech_name`,
      )
      .all(...batch) as { domain: string; tech_name: string }[];

    for (const row of rows) {
      techMap.get(row.domain)?.push(row.tech_name);
    }
  }

  return techMap;
}

// ─── Row → CompanyResult mapper ──────────────────────────────────────────────

function mapRows(
  rows: Record<string, unknown>[],
  techMap: Map<string, string[]>,
): CompanyResult[] {
  return rows.map((row) => ({
    domain: row.domain as string,
    company_name: row.company_name as string,
    category: row.category as string,
    country: row.country as string,
    city: row.city as string,
    state: row.state as string,
    telephones: safeParseJSON(row.telephones as string, []),
    emails: safeParseJSON(row.emails as string, []),
    social_links: safeParseJSON(row.social_links as string, []),
    people: safeParseJSON(row.people as string, []),
    tech_spend: row.tech_spend as number,
    first_indexed: row.first_indexed as string,
    last_indexed: row.last_indexed as string,
    total_technologies: row.total_technologies as number,
    technologies: techMap.get(row.domain as string) ?? [],
  }));
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function searchCompanies(filters: SearchFilters): SearchResponse {
  const db = getDb();
  const { whereClause, params } = buildWhereClause(filters);

  const { total } = db
    .prepare(`SELECT COUNT(*) as total FROM companies c ${whereClause}`)
    .get(...params) as { total: number };

  const sortWhitelist: Record<string, string> = {
    domain: "c.domain",
    company_name: "c.company_name",
    category: "c.category",
    country: "c.country",
    city: "c.city",
    tech_spend: "c.tech_spend",
    total_technologies: "c.total_technologies",
  };
  const sortCol = sortWhitelist[filters.sortBy || "domain"] || "c.domain";
  const sortDir = filters.sortDir === "desc" ? "DESC" : "ASC";

  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const offset = (page - 1) * pageSize;

  const rows = db
    .prepare(
      `SELECT c.* FROM companies c ${whereClause} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as Record<string, unknown>[];

  const domains = rows.map((r) => r.domain as string);
  const techMap = batchLoadTechnologies(db, domains);
  const results = mapRows(rows, techMap);
  const facets = getFacets();

  return { results, total, page, pageSize, facets };
}

export function exportAllCompanies(filters: SearchFilters): CompanyResult[] {
  const db = getDb();
  const { whereClause, params } = buildWhereClause(filters);

  const rows = db
    .prepare(
      `SELECT c.* FROM companies c ${whereClause} ORDER BY c.domain ASC LIMIT ?`,
    )
    .all(...params, EXPORT_ROW_LIMIT) as Record<string, unknown>[];

  const domains = rows.map((r) => r.domain as string);
  const techMap = batchLoadTechnologies(db, domains);
  return mapRows(rows, techMap);
}
