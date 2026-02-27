import { describe, expect, it } from "vitest";
import { exportAllCompanies, getFacets, searchCompanies } from "../lib/db";

describe("getFacets", () => {
  it("returns non-empty facet arrays", () => {
    const facets = getFacets();
    expect(facets.categories.length).toBeGreaterThan(0);
    expect(facets.countries.length).toBeGreaterThan(0);
    expect(facets.techCategories.length).toBeGreaterThan(0);
    expect(facets.technologies.length).toBeGreaterThan(0);
  });

  it("each facet has label, value, and count", () => {
    const facets = getFacets();
    for (const cat of facets.categories) {
      expect(cat.label).toBeTruthy();
      expect(cat.value).toBeTruthy();
      expect(cat.count).toBeGreaterThan(0);
    }
  });
});

describe("searchCompanies", () => {
  it("returns all companies with empty filters", () => {
    const result = searchCompanies({});
    expect(result.total).toBeGreaterThan(6000);
    expect(result.results.length).toBe(25);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  it("paginates correctly", () => {
    const page1 = searchCompanies({ page: 1, pageSize: 5 });
    const page2 = searchCompanies({ page: 2, pageSize: 5 });
    expect(page1.results.length).toBe(5);
    expect(page2.results.length).toBe(5);
    expect(page1.results[0].domain).not.toBe(page2.results[0].domain);
  });

  it("filters by category", () => {
    const result = searchCompanies({ categories: ["Travel"] });
    expect(result.total).toBeGreaterThan(0);
    for (const r of result.results) {
      expect(r.category).toBe("Travel");
    }
  });

  it("filters by country", () => {
    const result = searchCompanies({ countries: ["GB"] });
    expect(result.total).toBeGreaterThan(0);
    for (const r of result.results) {
      expect(r.country).toBe("GB");
    }
  });

  it("combines category + country filters", () => {
    const result = searchCompanies({
      categories: ["Travel"],
      countries: ["GB"],
    });
    expect(result.total).toBeGreaterThan(0);
    for (const r of result.results) {
      expect(r.category).toBe("Travel");
      expect(r.country).toBe("GB");
    }
  });

  it("free-text search matches name or domain", () => {
    const result = searchCompanies({ search: "wiggle" });
    expect(result.total).toBeGreaterThan(0);
    for (const r of result.results) {
      const combined = `${r.domain} ${r.company_name}`.toLowerCase();
      expect(combined).toContain("wiggle");
    }
  });

  it("AND technology filter requires ALL techs", () => {
    const result = searchCompanies({
      technologiesAnd: ["jQuery", "Apache"],
      pageSize: 100,
    });
    expect(result.total).toBeGreaterThan(0);
    for (const r of result.results) {
      expect(r.technologies).toContain("jQuery");
      expect(r.technologies).toContain("Apache");
    }
  });

  it("OR technology filter requires at least ONE tech", () => {
    const result = searchCompanies({
      technologiesOr: ["Shopify", "Stripe"],
      pageSize: 100,
    });
    expect(result.total).toBeGreaterThan(0);
    for (const r of result.results) {
      const hasShopify = r.technologies.some((t) => t === "Shopify");
      const hasStripe = r.technologies.some((t) => t === "Stripe");
      expect(hasShopify || hasStripe).toBe(true);
    }
  });

  it("NOT technology filter excludes techs", () => {
    const result = searchCompanies({
      technologiesNot: ["jQuery"],
      pageSize: 100,
    });
    expect(result.total).toBeGreaterThan(0);
    for (const r of result.results) {
      expect(r.technologies).not.toContain("jQuery");
    }
  });

  it("combined AND/OR/NOT filters work together", () => {
    const result = searchCompanies({
      technologiesOr: ["Shopify", "Stripe"],
      technologiesNot: ["Intercom"],
      pageSize: 100,
    });
    expect(result.total).toBeGreaterThan(0);
    for (const r of result.results) {
      const hasShopifyOrStripe =
        r.technologies.includes("Shopify") || r.technologies.includes("Stripe");
      expect(hasShopifyOrStripe).toBe(true);
      expect(r.technologies).not.toContain("Intercom");
    }
  });

  it("techCountMin filters by minimum technology count", () => {
    const result = searchCompanies({ techCountMin: 50, pageSize: 10 });
    expect(result.total).toBeGreaterThan(0);
    for (const r of result.results) {
      expect(r.total_technologies).toBeGreaterThanOrEqual(50);
    }
  });

  it("categoryTechFilter finds companies with N+ techs in a category", () => {
    const result = searchCompanies({
      categoryTechFilter: { techCategory: "Advertising", minCount: 2 },
      pageSize: 10,
    });
    expect(result.total).toBeGreaterThan(0);
  });

  it("sorts by total_technologies descending", () => {
    const result = searchCompanies({
      sortBy: "total_technologies",
      sortDir: "desc",
      pageSize: 5,
    });
    for (let i = 1; i < result.results.length; i++) {
      expect(result.results[i - 1].total_technologies).toBeGreaterThanOrEqual(
        result.results[i].total_technologies,
      );
    }
  });

  it("prevents SQL injection via search param", () => {
    const result = searchCompanies({
      search: "'; DROP TABLE companies;--",
    });
    expect(result.total).toBe(0);
    const check = searchCompanies({});
    expect(check.total).toBeGreaterThan(6000);
  });

  it("prevents SQL injection via sort column", () => {
    const result = searchCompanies({
      sortBy: "domain; DROP TABLE companies;--",
    });
    expect(result.total).toBeGreaterThan(0);
  });

  it("clamps pageSize to [1, 100]", () => {
    const big = searchCompanies({ pageSize: 999 });
    expect(big.pageSize).toBe(100);
    const small = searchCompanies({ pageSize: -5 });
    expect(small.pageSize).toBe(1);
  });
});

describe("exportAllCompanies", () => {
  it("returns all matching results without pagination", () => {
    const all = exportAllCompanies({
      categories: ["Travel"],
      countries: ["GB"],
    });
    const paginated = searchCompanies({
      categories: ["Travel"],
      countries: ["GB"],
    });
    expect(all.length).toBe(paginated.total);
  });

  it("respects technology filters", () => {
    const results = exportAllCompanies({ technologiesAnd: ["jQuery"] });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.technologies).toContain("jQuery");
    }
  });
});
