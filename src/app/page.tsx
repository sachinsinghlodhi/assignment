"use client";

import { Filter } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ResultsTable } from "@/components/results-table";
import { SearchSidebar } from "@/components/search-sidebar";
import type { CompanyResult, FilterOption, SearchFilters } from "@/lib/types";

function TableSkeleton() {
  return (
    <div className="flex h-full flex-col animate-pulse">
      <div className="flex items-center justify-between pb-3">
        <div className="h-7 w-48 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded bg-gray-200" />
          <div className="h-8 w-16 rounded bg-gray-200" />
        </div>
      </div>
      <div className="flex-1 rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-3 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={`h-${i.toString()}`}
                className="h-3 w-20 rounded bg-gray-200"
              />
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-100 bg-white">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`r-${i.toString()}`}
              className="flex items-center gap-4 px-3 py-3"
            >
              <div className="h-4 w-28 rounded bg-gray-100" />
              <div className="h-4 w-24 rounded bg-gray-100" />
              <div className="h-4 w-16 rounded bg-gray-100" />
              <div className="h-4 w-10 rounded bg-gray-100" />
              <div className="h-4 w-14 rounded bg-gray-100" />
              <div className="h-4 w-12 rounded bg-gray-100" />
              <div className="h-4 w-8 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-3">
        <div className="h-4 w-40 rounded bg-gray-200" />
        <div className="h-4 w-32 rounded bg-gray-200" />
      </div>
    </div>
  );
}

const emptyFacets = {
  categories: [] as FilterOption[],
  countries: [] as FilterOption[],
  techCategories: [] as FilterOption[],
  technologies: [] as FilterOption[],
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState("domain");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [facets, setFacets] = useState(emptyFacets);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const doSearch = useCallback(
    async (
      filters: SearchFilters,
      p: number,
      ps: number,
      sb: string,
      sd: "asc" | "desc",
    ) => {
      setIsSearching(true);
      setError(null);
      try {
        const body: SearchFilters = {
          ...filters,
          page: p,
          pageSize: ps,
          sortBy: sb,
          sortDir: sd,
        };
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        let data: {
          results?: CompanyResult[];
          total?: number;
          facets?: typeof emptyFacets;
          message?: string;
        };
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {
            message: res.ok ? "Invalid response" : text || "Search failed",
          };
        }
        if (!res.ok) {
          throw new Error(data?.message || "Search failed");
        }
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
        if (data.facets) setFacets(data.facets);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Search failed. Run npm run setup first.";
        setError(message);
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  useEffect(() => {
    doSearch({}, 1, 25, "domain", "asc").then(() => setIsLoading(false));
  }, [doSearch]);

  const handleSearch = useCallback(
    (filters: SearchFilters) => {
      setCurrentFilters(filters);
      setPage(1);
      doSearch(filters, 1, pageSize, sortBy, sortDir);
    },
    [doSearch, pageSize, sortBy, sortDir],
  );

  const handleReset = useCallback(() => {
    setCurrentFilters({});
    setPage(1);
    setSortBy("domain");
    setSortDir("asc");
    doSearch({}, 1, pageSize, "domain", "asc");
  }, [doSearch, pageSize]);

  const handlePageChange = useCallback(
    (p: number) => {
      setPage(p);
      doSearch(currentFilters, p, pageSize, sortBy, sortDir);
    },
    [currentFilters, doSearch, pageSize, sortBy, sortDir],
  );

  const handlePageSizeChange = useCallback(
    (ps: number) => {
      setPageSize(ps);
      setPage(1);
      doSearch(currentFilters, 1, ps, sortBy, sortDir);
    },
    [currentFilters, doSearch, sortBy, sortDir],
  );

  const handleSort = useCallback(
    (col: string) => {
      const newDir = sortBy === col && sortDir === "asc" ? "desc" : "asc";
      setSortBy(col);
      setSortDir(newDir);
      setPage(1);
      doSearch(currentFilters, 1, pageSize, col, newDir);
    },
    [currentFilters, doSearch, pageSize, sortBy, sortDir],
  );

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-3 text-sm text-gray-500">
            Loading BuiltWith data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-80 shrink-0 transform bg-white shadow-xl transition-transform duration-200 ease-out
          md:relative md:translate-x-0 md:shadow-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <SearchSidebar
          facets={facets}
          onSearch={(f) => {
            handleSearch(f);
            setSidebarOpen(false);
          }}
          onReset={handleReset}
          isSearching={isSearching}
          onClose={() => setSidebarOpen(false)}
          showCloseButton={sidebarOpen}
        />
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded p-2 hover:bg-gray-100 md:hidden"
            aria-label="Open filters"
          >
            <Filter className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            BuiltWith Explorer
          </h1>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {isSearching ? (
            <TableSkeleton />
          ) : (
            <ResultsTable
              data={results}
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              currentFilters={currentFilters}
            />
          )}
        </main>
      </div>
    </div>
  );
}
