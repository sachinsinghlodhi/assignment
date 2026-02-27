# BuiltWith Explorer — Fiber AI Challenge

A full-stack Next.js TypeScript app for searching and exploring BuiltWith company and technology data. Supports powerful boolean filtering (AND/OR/NOT), fuzzy typeahead search, per-category technology counts, server-side pagination and sorting, full CSV/JSON export, input validation, and more.

## Tech Stack

- **Framework:** Next.js 15.5 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Database:** SQLite via better-sqlite3 (local, zero-config, no credentials)
- **Validation:** Zod (strict schema validation on all API inputs)
- **UI:** Tailwind CSS v4, lucide-react (icons)
- **Testing:** Vitest (39 tests across 3 test suites)
- **Linting:** Biome (zero warnings)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Prepare the Data

The `data/` folder contains the 3 BuiltWith sample data files. Run the setup script to parse all 3 files, join them across domain keys, and build a local SQLite database:

```bash
npm run setup
```

This creates `data/builtwith.db` with 4 tables:

| Table | Source | Description |
|---|---|---|
| `companies` | metaData.sample.json | 6,689 companies with domain, name, IAB category, country, city, contacts |
| `tech_index` | techIndex.sample.json | 155 technology definitions with category (Advertising, Analytics, etc.) |
| `company_technologies` | techData.sample.json | 3,651 company↔technology links with detection dates |
| `company_tech_categories` | Pre-computed join | 872 rows: per-company, per-category tech counts (optimization) |

The join path is: `metaData.D` → `techData.D` → `techData.T[].N` → `techIndex.Name`

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Run Tests

```bash
npm run test
```

39 tests across 3 suites: database query builder, input validation, and fuzzy search.

### 5. Verify the Build

```bash
npm run build
```

## Search Features

### Required Features

| Feature | Implementation |
|---|---|
| **Company metadata search** | Filter by name, domain, IAB category, country |
| **Technology search** | Search companies by technologies they use |
| **AND/OR/NOT boolean logic** | Three separate multi-selects: "Include ALL", "Include ANY", "Exclude" |
| **Technology typeahead** | Fuzzy-matching combobox with Levenshtein distance (handles misspellings like "jQueri" → "jQuery") |
| **Stats-based search** | Total tech count range, monthly tech spend range |
| **Per-category tech counts** | "Find companies with 2+ technologies in Advertising" |
| **Search UI** | Sidebar with multi-select dropdowns, number inputs, select dropdowns |
| **Backend API route** | `POST /api/search` builds dynamic SQL from filter object |
| **Results table** | Paginated table with domain, company, category, country, spend, techs, contact |
| **Pagination** | Server-side with configurable rows per page (10/25/50/100) |

### Nice-to-Have Features

| Feature | Implementation |
|---|---|
| **CSV/JSON export** | Exports ALL matching results (not just current page) via server-side endpoint |
| **Sortable columns** | Click any column header to toggle asc/desc with directional arrow indicators |
| **Save/Load filters** | Persist filter state to localStorage, auto-restore on load |
| **Public API + docs** | Documented POST/GET endpoints with Zod validation (see below) |
| **Fuzzy search** | Levenshtein-based misspelling tolerance in typeahead dropdowns |
| **Unit/integration tests** | 39 tests: query builder, validation schema, fuzzy search |
| **Input validation** | Zod strict schema rejects invalid types, unknown fields, out-of-range values |
| **Loading skeleton** | Table skeleton animation during search (not a generic spinner) |
| **Accessibility** | Proper `aria-label` attributes, semantic `fieldset`/`legend`, keyboard-navigable |
| **Per-category optimization** | Pre-computed `company_tech_categories` table eliminates expensive runtime joins |

## API Documentation

### `POST /api/search`

Search for companies with filters. All fields are optional. Request body is validated with Zod; invalid payloads return 400 with detailed error messages.

```json
{
  "search": "builtwith",
  "categories": ["Travel"],
  "countries": ["GB"],
  "technologiesAnd": ["jQuery", "Apache"],
  "technologiesOr": ["Shopify", "Stripe"],
  "technologiesNot": ["Intercom"],
  "techCategories": ["Advertising"],
  "techCountMin": 5,
  "techCountMax": 100,
  "techSpendMin": 100,
  "techSpendMax": 5000,
  "categoryTechFilter": { "techCategory": "Advertising", "minCount": 2 },
  "page": 1,
  "pageSize": 25,
  "sortBy": "total_technologies",
  "sortDir": "desc"
}
```

**Response:** `{ results: CompanyResult[], total: number, page: number, pageSize: number, facets: {...} }`

**Validation errors (400):** `{ message: "Invalid search filters.", errors: { field: ["error message"] } }`

### `GET /api/search`

Returns facets only (available filter options with counts).

### `GET /api/search?export=json&filters={...}`

Exports ALL matching results as a JSON file download (no pagination limit).

### `GET /api/search?export=csv&filters={...}`

Exports ALL matching results as a CSV file download (no pagination limit).

## Project Structure

```
├── data/                          # BuiltWith sample data + generated SQLite DB
│   ├── metaData.sample.json       # Company metadata (NDJSON, UTF-16LE)
│   ├── techData.sample.json       # Per-company technology data (NDJSON, UTF-16LE)
│   ├── techIndex.sample.json      # Technology reference index (JSON array)
│   └── builtwith.db               # Generated SQLite database (after npm run setup)
├── src/
│   ├── __tests__/
│   │   ├── db.test.ts             # 20 tests: query builder, filters, pagination, SQL injection
│   │   ├── validation.test.ts     # 10 tests: Zod schema validation
│   │   └── fuzzy.test.ts          # 9 tests: fuzzy/Levenshtein matching
│   ├── app/
│   │   ├── page.tsx               # Main page — orchestrates sidebar + table + skeleton
│   │   ├── layout.tsx             # Root layout with Geist font
│   │   ├── globals.css            # Tailwind v4 imports
│   │   └── api/search/route.ts    # Search API (POST + GET + export) with Zod validation
│   ├── components/
│   │   ├── search-sidebar.tsx     # Filter sidebar with all controls (a11y-compliant)
│   │   ├── results-table.tsx      # Paginated, sortable results table with full export
│   │   └── multi-select.tsx       # Fuzzy typeahead multi-select with Levenshtein matching
│   ├── lib/
│   │   ├── db.ts                  # SQLite access layer + SQL query builder + export
│   │   ├── types.ts               # All TypeScript type definitions
│   │   └── utils.ts               # cn() class utility
│   └── setup.ts                   # Setup script: parses data → builds DB
├── next.config.ts
├── biome.json
└── package.json
```

## Design Decisions

1. **SQLite over Firestore/external DB**: Local, zero-config, no credentials needed. The reviewer can `npm run setup && npm run dev` and everything works.

2. **Pre-computed `company_tech_categories`**: Instead of running `JOIN tech_index ON company_technologies` at query time for every "2+ techs in Advertising" query, we materialize the join result at seed time. This turns a correlated subquery with a join into a simple indexed lookup.

3. **Server-side pagination**: Only the current page is fetched from SQLite. The frontend never holds the full 6,689 rows in memory.

4. **Dynamic SQL builder with parameterized queries**: All user inputs are passed as `?` parameters to prevent SQL injection. Sort columns are validated against a whitelist.

5. **Zod strict validation**: All API inputs are validated against a strict Zod schema that rejects unknown fields, out-of-range values, and incorrect types. This prevents malformed payloads from reaching the database layer.

6. **Fuzzy typeahead with Levenshtein distance**: The technology dropdown supports misspellings (e.g., "jQueri" matches "jQuery") using a combination of subsequence matching and edit distance, with thresholds scaled by query length.

7. **Full-result export**: CSV/JSON export fetches ALL matching results server-side (not just the current page), ensuring complete data downloads regardless of pagination settings.
