import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exportAllCompanies, getFacets, searchCompanies } from "@/lib/db";

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

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = searchFiltersSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid search filters.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const response = searchCompanies(parsed.data);
    return NextResponse.json(response);
  } catch (error) {
    console.error("API Search Error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred.", error: String(error) },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("export");

    if (format === "csv" || format === "json") {
      const filtersParam = searchParams.get("filters");
      const filters = filtersParam ? JSON.parse(filtersParam) : {};
      const parsed = searchFiltersSchema.safeParse(filters);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Invalid filters.", errors: parsed.error.flatten() },
          { status: 400 },
        );
      }
      const allResults = exportAllCompanies(parsed.data);

      if (format === "json") {
        return new Response(JSON.stringify(allResults, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition":
              'attachment; filename="builtwith_export.json"',
          },
        });
      }

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
      for (const r of allResults) {
        const row = keys.map((k) => {
          const v = r[k as keyof typeof r];
          const cell = Array.isArray(v) ? v.join("; ") : String(v ?? "");
          return cell.includes(",") || cell.includes('"') || cell.includes("\n")
            ? `"${cell.replace(/"/g, '""')}"`
            : cell;
        });
        csvRows.push(row.join(","));
      }
      return new Response(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="builtwith_export.csv"',
        },
      });
    }

    const facets = getFacets();
    return NextResponse.json({ facets });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred.", error: String(error) },
      { status: 500 },
    );
  }
}
