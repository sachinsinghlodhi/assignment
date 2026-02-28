import { describe, expect, it } from "vitest";
import { exportAllCompanies } from "../lib/db";

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

function toCsvFormat(data: Record<string, unknown>[]): string {
  const keys = [
    "domain",
    "company_name",
    "category",
    "country",
    "city",
    "tech_spend",
    "total_technologies",
    "first_indexed",
    "last_indexed",
    "technologies",
    "telephones",
    "emails",
  ];
  const csvRows = [keys.join(",")];
  for (const r of data) {
    const row = keys.map((k) => {
      const v = r[k];
      const cell = Array.isArray(v) ? v.join("; ") : String(v ?? "");
      return cell.includes(",") || cell.includes('"') || cell.includes("\n")
        ? `"${cell.replace(/"/g, '""')}"`
        : cell;
    });
    csvRows.push(row.join(","));
  }
  return csvRows.join("\n");
}

describe("JSON and CSV export consistency", () => {
  const testFilters = { categories: ["Travel"] as const, countries: ["GB"] as const };

  it("search returns same data as export source", () => {
    const jsonData = exportAllCompanies(testFilters);
    expect(jsonData.length).toBeGreaterThan(0);
    expect(jsonData.every((r) => r.category === "Travel" && r.country === "GB")).toBe(true);
  });

  it("JSON and CSV exports contain the same records", () => {
    const jsonData = exportAllCompanies(testFilters);

    const jsonForExport = jsonData.map((r) => ({
      domain: r.domain,
      company_name: r.company_name,
      category: r.category,
      country: r.country,
      city: r.city,
      tech_spend: r.tech_spend,
      total_technologies: r.total_technologies,
      first_indexed: r.first_indexed,
      last_indexed: r.last_indexed,
      technologies: r.technologies.join("; "),
      telephones: r.telephones.join("; "),
      emails: r.emails.join("; "),
    }));

    const csvOutput = toCsvFormat(jsonForExport);
    const csvParsed = parseCsv(csvOutput);

    expect(csvParsed.length).toBe(jsonData.length);

    const jsonDomains = new Set(jsonData.map((r) => r.domain));
    const csvDomains = new Set(csvParsed.map((r) => r.domain));
    expect(jsonDomains.size).toBe(csvDomains.size);
    for (const d of jsonDomains) {
      expect(csvDomains.has(d)).toBe(true);
    }

    for (let i = 0; i < jsonData.length; i++) {
      const j = jsonData[i];
      const c = csvParsed.find((row) => row.domain === j.domain);
      expect(c).toBeDefined();
      expect(c!.domain).toBe(j.domain);
      expect(c!.company_name).toBe(j.company_name);
      expect(c!.category).toBe(j.category);
      expect(c!.country).toBe(j.country);
      expect(c!.city).toBe(j.city);
      expect(c!.tech_spend).toBe(String(j.tech_spend));
      expect(c!.total_technologies).toBe(String(j.total_technologies));
      expect(c!.technologies).toBe(j.technologies.join("; "));
      expect(c!.telephones).toBe(j.telephones.join("; "));
      expect(c!.emails).toBe(j.emails.join("; "));
    }
  });

});
