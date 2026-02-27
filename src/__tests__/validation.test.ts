import { describe, expect, it } from "vitest";
import { z } from "zod";

const searchFiltersSchema = z
  .object({
    search: z.string().max(200).optional(),
    categories: z.array(z.string().max(100)).max(50).optional(),
    countries: z.array(z.string().max(10)).max(50).optional(),
    technologiesAnd: z.array(z.string().max(200)).max(50).optional(),
    technologiesOr: z.array(z.string().max(200)).max(50).optional(),
    technologiesNot: z.array(z.string().max(200)).max(50).optional(),
    techCategories: z.array(z.string().max(100)).max(50).optional(),
    techCountMin: z.number().int().min(0).max(100000).optional(),
    techCountMax: z.number().int().min(0).max(100000).optional(),
    techSpendMin: z.number().min(0).max(10000000).optional(),
    techSpendMax: z.number().min(0).max(10000000).optional(),
    categoryTechFilter: z
      .object({
        techCategory: z.string().max(100),
        minCount: z.number().int().min(0).max(10000),
      })
      .optional(),
    page: z.number().int().min(1).max(10000).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
    sortBy: z.string().max(50).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
  })
  .strict();

describe("searchFiltersSchema validation", () => {
  it("accepts valid empty filters", () => {
    const result = searchFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid full filters", () => {
    const result = searchFiltersSchema.safeParse({
      search: "test",
      categories: ["Travel"],
      countries: ["GB"],
      technologiesAnd: ["jQuery"],
      technologiesOr: ["Shopify"],
      technologiesNot: ["Intercom"],
      techCategories: ["Advertising"],
      techCountMin: 5,
      techCountMax: 100,
      techSpendMin: 0,
      techSpendMax: 5000,
      categoryTechFilter: { techCategory: "Advertising", minCount: 2 },
      page: 1,
      pageSize: 25,
      sortBy: "domain",
      sortDir: "asc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (strict mode)", () => {
    const result = searchFiltersSchema.safeParse({
      search: "test",
      maliciousField: "DROP TABLE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative page numbers", () => {
    const result = searchFiltersSchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects pageSize > 100", () => {
    const result = searchFiltersSchema.safeParse({ pageSize: 500 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sortDir", () => {
    const result = searchFiltersSchema.safeParse({ sortDir: "random" });
    expect(result.success).toBe(false);
  });

  it("rejects search strings > 200 chars", () => {
    const result = searchFiltersSchema.safeParse({
      search: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative techCountMin", () => {
    const result = searchFiltersSchema.safeParse({ techCountMin: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects arrays with > 50 items", () => {
    const result = searchFiltersSchema.safeParse({
      categories: Array.from({ length: 51 }, (_, i) => `cat${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer page", () => {
    const result = searchFiltersSchema.safeParse({ page: 1.5 });
    expect(result.success).toBe(false);
  });
});
