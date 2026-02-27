import * as fs from "node:fs";
import * as path from "node:path";
import Database from "better-sqlite3";
import type { RawMetaData, RawTechData, RawTechIndex } from "./lib/types";

const DB_PATH = path.join(process.cwd(), "data", "builtwith.db");
const DATA_DIR = path.join(process.cwd(), "data");

function readNDJSON<T>(filePath: string): T[] {
  const buf = fs.readFileSync(filePath);
  let content: string;

  // BuiltWith NDJSON files are UTF-16 LE encoded
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    content = buf.toString("utf16le");
  } else {
    content = buf.toString("utf-8");
  }

  content = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function seed() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log("Removed existing database.");
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  console.log("Creating tables...");

  db.exec(`
    CREATE TABLE companies (
      domain TEXT PRIMARY KEY,
      company_name TEXT DEFAULT '',
      category TEXT DEFAULT '',
      country TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      zip TEXT DEFAULT '',
      telephones TEXT DEFAULT '[]',
      emails TEXT DEFAULT '[]',
      social_links TEXT DEFAULT '[]',
      people TEXT DEFAULT '[]',
      tech_spend INTEGER DEFAULT 0,
      first_indexed TEXT DEFAULT '',
      last_indexed TEXT DEFAULT '',
      total_technologies INTEGER DEFAULT 0
    );

    CREATE TABLE tech_index (
      name TEXT PRIMARY KEY,
      parent TEXT DEFAULT '',
      category TEXT DEFAULT '',
      subcategories TEXT DEFAULT '[]',
      description TEXT DEFAULT '',
      link TEXT DEFAULT '',
      premium TEXT DEFAULT 'No',
      first_added TEXT DEFAULT ''
    );

    CREATE TABLE company_technologies (
      domain TEXT NOT NULL,
      tech_name TEXT NOT NULL,
      first_detected TEXT DEFAULT '',
      last_detected TEXT DEFAULT '',
      PRIMARY KEY (domain, tech_name)
    );

    -- Pre-computed: number of techs per category per company
    -- Eliminates expensive correlated subquery joins at query time
    CREATE TABLE company_tech_categories (
      domain TEXT NOT NULL,
      tech_category TEXT NOT NULL,
      tech_count INTEGER DEFAULT 0,
      PRIMARY KEY (domain, tech_category)
    );

    CREATE INDEX idx_companies_country ON companies(country);
    CREATE INDEX idx_companies_category ON companies(category);
    CREATE INDEX idx_companies_name ON companies(company_name);
    CREATE INDEX idx_ct_domain ON company_technologies(domain);
    CREATE INDEX idx_ct_tech ON company_technologies(tech_name);
    CREATE INDEX idx_ctc_category ON company_tech_categories(tech_category);
  `);

  // 1. Load techIndex (standard JSON array with trailing comma fix)
  console.log("Loading tech index...");
  const techIndexPath = path.join(DATA_DIR, "techIndex.sample.json");
  const techIndexContent = fs
    .readFileSync(techIndexPath, "utf-8")
    .replace(/,\s*\]$/, "]");
  const techIndexRaw = JSON.parse(techIndexContent) as RawTechIndex[];

  const insertTech = db.prepare(`
    INSERT OR IGNORE INTO tech_index (name, parent, category, subcategories, description, link, premium, first_added)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTechMany = db.transaction((records: RawTechIndex[]) => {
    for (const t of records) {
      insertTech.run(
        t.Name,
        t.Parent || "",
        t.Category || "",
        JSON.stringify(t.SubCategories || []),
        t.Description || "",
        t.Link || "",
        t.Premium || "No",
        t.FirstAdded || "",
      );
    }
  });

  insertTechMany(techIndexRaw);
  console.log(
    `  Inserted ${techIndexRaw.length} technologies into tech_index.`,
  );

  // 2. Load metaData (NDJSON, UTF-16LE)
  console.log("Loading company metadata...");
  const metaPath = path.join(DATA_DIR, "metaData.sample.json");
  const metaRecords = readNDJSON<RawMetaData>(metaPath);

  const insertCompany = db.prepare(`
    INSERT OR IGNORE INTO companies (domain, company_name, category, country, city, state, zip, telephones, emails, social_links, people)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCompanyMany = db.transaction((records: RawMetaData[]) => {
    for (const m of records) {
      insertCompany.run(
        m.D,
        m.CN || "",
        m.CAT || "",
        m.CO || "",
        m.C || "",
        m.ST || "",
        m.Z || "",
        JSON.stringify(m.T || []),
        JSON.stringify(m.E || []),
        JSON.stringify(m.S || []),
        JSON.stringify(m.P || []),
      );
    }
  });

  insertCompanyMany(metaRecords);
  console.log(`  Inserted ${metaRecords.length} companies from metadata.`);

  // 3. Load techData (NDJSON, UTF-16LE) — merge into companies + company_technologies
  console.log("Loading tech data...");
  const techDataPath = path.join(DATA_DIR, "techData.sample.json");
  const techRecords = readNDJSON<RawTechData>(techDataPath);

  const upsertCompanyTechInfo = db.prepare(`
    INSERT INTO companies (domain, tech_spend, first_indexed, last_indexed)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(domain) DO UPDATE SET
      tech_spend = excluded.tech_spend,
      first_indexed = excluded.first_indexed,
      last_indexed = excluded.last_indexed
  `);

  const insertCompanyTech = db.prepare(`
    INSERT OR IGNORE INTO company_technologies (domain, tech_name, first_detected, last_detected)
    VALUES (?, ?, ?, ?)
  `);

  const processTechData = db.transaction((records: RawTechData[]) => {
    for (const td of records) {
      upsertCompanyTechInfo.run(td.D, td.SP || 0, td.FI, td.LI);
      for (const tech of td.T) {
        if (tech.N?.trim()) {
          insertCompanyTech.run(td.D, tech.N, tech.FD, tech.LD);
        }
      }
    }
  });

  processTechData(techRecords);
  console.log(`  Processed ${techRecords.length} tech data records.`);

  // 4. Compute total_technologies per company
  console.log("Computing total technology counts...");
  db.exec(`
    UPDATE companies SET total_technologies = (
      SELECT COUNT(*) FROM company_technologies WHERE company_technologies.domain = companies.domain
    )
  `);

  // 5. Pre-compute company_tech_categories (optimization from discussion)
  console.log("Building pre-computed tech category counts...");
  db.exec(`
    INSERT INTO company_tech_categories (domain, tech_category, tech_count)
    SELECT ct.domain, ti.category, COUNT(*)
    FROM company_technologies ct
    JOIN tech_index ti ON ct.tech_name = ti.name
    WHERE ti.category != ''
    GROUP BY ct.domain, ti.category
  `);

  // Print stats
  const stats = {
    companies: (
      db.prepare("SELECT COUNT(*) as c FROM companies").get() as { c: number }
    ).c,
    techs: (
      db.prepare("SELECT COUNT(*) as c FROM tech_index").get() as { c: number }
    ).c,
    links: (
      db.prepare("SELECT COUNT(*) as c FROM company_technologies").get() as {
        c: number;
      }
    ).c,
    catCounts: (
      db.prepare("SELECT COUNT(*) as c FROM company_tech_categories").get() as {
        c: number;
      }
    ).c,
    techCategories: db
      .prepare(
        "SELECT DISTINCT category FROM tech_index WHERE category != '' ORDER BY category",
      )
      .all() as { category: string }[],
  };

  console.log("\n--- Database Stats ---");
  console.log(`Companies: ${stats.companies}`);
  console.log(`Technologies in index: ${stats.techs}`);
  console.log(`Company-technology links: ${stats.links}`);
  console.log(`Pre-computed category counts: ${stats.catCounts}`);
  console.log(
    `Technology categories (${stats.techCategories.length}): ${stats.techCategories.map((c) => c.category).join(", ")}`,
  );
  console.log(`\nDatabase saved to: ${DB_PATH}`);

  db.close();
}

seed();
