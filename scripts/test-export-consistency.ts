/**
 * Integration test: Search API → JSON export → CSV export → compare.
 * Run with: npx tsx scripts/test-export-consistency.ts
 * Requires: npm run dev (server on http://localhost:3000)
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current.replace(/""/g, '"'));
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.replace(/""/g, '"'));
  return result;
}

async function main() {
  const filters = { categories: ["Travel"], countries: ["GB"] };

  console.log("1. POST /api/search with filters:", JSON.stringify(filters));
  const searchRes = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...filters, page: 1, pageSize: 10 }),
  });
  if (!searchRes.ok) {
    throw new Error(`Search failed: ${searchRes.status} ${await searchRes.text()}`);
  }
  const searchData = (await searchRes.json()) as { total: number; results: { domain: string }[] };
  console.log(`   → Total: ${searchData.total}, Page results: ${searchData.results.length}`);

  const filtersParam = encodeURIComponent(JSON.stringify(filters));

  console.log("2. GET /api/search?export=json&filters=...");
  const jsonRes = await fetch(`${BASE}/api/search?export=json&filters=${filtersParam}`);
  if (!jsonRes.ok) {
    throw new Error(`JSON export failed: ${jsonRes.status}`);
  }
  const jsonData = (await jsonRes.json()) as Record<string, unknown>[];
  console.log(`   → JSON records: ${jsonData.length}`);

  console.log("3. GET /api/search?export=csv&filters=...");
  const csvRes = await fetch(`${BASE}/api/search?export=csv&filters=${filtersParam}`);
  if (!csvRes.ok) {
    throw new Error(`CSV export failed: ${csvRes.status}`);
  }
  const csvText = await csvRes.text();
  const csvParsed = parseCsv(csvText);
  console.log(`   → CSV records: ${csvParsed.length}`);

  console.log("4. Comparing JSON vs CSV...");
  if (jsonData.length !== csvParsed.length) {
    throw new Error(`Count mismatch: JSON=${jsonData.length}, CSV=${csvParsed.length}`);
  }

  const jsonDomains = new Set(jsonData.map((r) => r.domain as string));
  const csvDomains = new Set(csvParsed.map((r) => r.domain));
  if (jsonDomains.size !== csvDomains.size) {
    throw new Error("Domain set size mismatch");
  }
  for (const d of jsonDomains) {
    if (!csvDomains.has(d)) throw new Error(`Domain ${d} in JSON but not CSV`);
  }

  for (const j of jsonData) {
    const c = csvParsed.find((r) => r.domain === j.domain);
    if (!c) throw new Error(`Domain ${j.domain} not found in CSV`);
    const techStr = Array.isArray(j.technologies) ? (j.technologies as string[]).join("; ") : "";
    if (c.company_name !== (j.company_name ?? "")) throw new Error(`company_name mismatch for ${j.domain}`);
    if (c.category !== (j.category ?? "")) throw new Error(`category mismatch for ${j.domain}`);
    if (c.country !== (j.country ?? "")) throw new Error(`country mismatch for ${j.domain}`);
    if (c.technologies !== techStr) throw new Error(`technologies mismatch for ${j.domain}`);
  }

  console.log("✓ JSON and CSV exports are identical.");
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
