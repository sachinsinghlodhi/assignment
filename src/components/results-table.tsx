"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { CompanyResult, SearchFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

const BADGE_COLORS = [
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-teal-50 text-teal-700 border-teal-200",
  "bg-pink-50 text-pink-700 border-pink-200",
  "bg-lime-50 text-lime-700 border-lime-200",
];

function hashColor(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = text.charCodeAt(i) + ((h << 5) - h);
  return BADGE_COLORS[Math.abs(h) % BADGE_COLORS.length];
}

interface ResultsTableProps {
  data: CompanyResult[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (column: string) => void;
  currentFilters?: SearchFilters;
}

export function ResultsTable({
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortDir,
  onSort,
  currentFilters,
}: ResultsTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: "csv" | "json") => {
      setIsExporting(true);
      try {
        const filtersParam = currentFilters
          ? encodeURIComponent(JSON.stringify(currentFilters))
          : "";
        const url = `/api/search?export=${format}&filters=${filtersParam}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `builtwith_export.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (err) {
        console.error("Export error:", err);
      } finally {
        setIsExporting(false);
      }
    },
    [currentFilters],
  );

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const SortHeader = ({
    col,
    children,
  }: {
    col: string;
    children: React.ReactNode;
  }) => (
    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-gray-900",
          sortBy === col && "text-gray-900",
        )}
      >
        {children}
        <SortIcon col={col} />
      </button>
    </th>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
          Results{" "}
          <span className="text-sm font-normal text-gray-500 sm:text-base">
            ({total.toLocaleString()} total)
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {isExporting && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
          )}
          <button
            type="button"
            onClick={() => handleExport("json")}
            disabled={data.length === 0 || isExporting}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={data.length === 0 || isExporting}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto rounded-lg border border-gray-200">
        <table className="min-w-[640px] divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <SortHeader col="domain">Domain</SortHeader>
              <SortHeader col="company_name">Company</SortHeader>
              <SortHeader col="category">Category</SortHeader>
              <SortHeader col="country">Country</SortHeader>
              <SortHeader col="city">City</SortHeader>
              <SortHeader col="tech_spend">Spend/mo</SortHeader>
              <SortHeader col="total_technologies">Techs</SortHeader>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Technologies
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.length > 0 ? (
              data.map((c) => (
                <tr key={c.domain} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <span className="max-w-[160px] truncate">{c.domain}</span>
                      <a
                        href={`https://${c.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-indigo-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {c.company_name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {c.category ? (
                      <span className="inline-block rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
                        {c.category}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {c.country || "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {c.city || "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {c.tech_spend > 0
                      ? `$${c.tech_spend.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {c.total_technologies}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {c.technologies.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className={cn(
                            "inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            hashColor(t),
                          )}
                        >
                          {t}
                        </span>
                      ))}
                      {c.technologies.length > 3 && (
                        <span className="inline-block rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500">
                          +{c.technologies.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-[120px] truncate">
                    {c.telephones.length > 0
                      ? c.telephones[0]
                      : c.emails.length > 0
                        ? c.emails[0]
                        : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-12 text-center text-sm text-gray-500"
                >
                  No results found. Try adjusting your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col gap-3 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-gray-500">
            Showing{" "}
            <strong>
              {Math.min((page - 1) * pageSize + 1, total)}–
              {Math.min(page * pageSize, total)}
            </strong>{" "}
            of <strong>{total.toLocaleString()}</strong>
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="rounded border border-gray-300 p-1.5 hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="rounded border border-gray-300 p-1.5 hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
