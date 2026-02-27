"use client";

import { useCallback, useEffect, useState } from "react";
import { ResultsTable } from "@/components/results-table";
import { SearchSidebar } from "@/components/search-sidebar";
import type {
  CompanyResult,
  FilterOption,
  SearchFilters,
  SearchResponse,
} from "@/lib/types";

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

  const doSearch = useCallback(
    async (
      filters: SearchFilters,
      p: number,
      ps: number,
      sb: string,
      sd: "asc" | "desc",
    ) => {
      setIsSearching(true);
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
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResponse = await res.json();
        setResults(data.results);
        setTotal(data.total);
        if (data.facets) setFacets(data.facets);
      } catch (err) {
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-80 shrink-0 overflow-hidden">
        <SearchSidebar
          facets={facets}
          onSearch={handleSearch}
          onReset={handleReset}
          isSearching={isSearching}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-6">
          <h1 className="text-lg font-semibold text-gray-900">
            BuiltWith Explorer
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-6">
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
