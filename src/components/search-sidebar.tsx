"use client";

import { RotateCcw, Save, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FilterOption, SearchFilters } from "@/lib/types";
import { MultiSelect } from "./multi-select";

const STORAGE_KEY = "builtwith-saved-filters";

const defaultFilters: SearchFilters = {
  search: "",
  categories: [],
  countries: [],
  technologiesAnd: [],
  technologiesOr: [],
  technologiesNot: [],
  techCategories: [],
  techCountMin: 0,
  techCountMax: 10000,
  techSpendMin: 0,
  techSpendMax: 100000,
  categoryTechFilter: { techCategory: "", minCount: 0 },
};

interface SearchSidebarProps {
  facets: {
    categories: FilterOption[];
    countries: FilterOption[];
    techCategories: FilterOption[];
    technologies: FilterOption[];
  };
  onSearch: (filters: SearchFilters) => void;
  onReset: () => void;
  isSearching: boolean;
}

export function SearchSidebar({
  facets,
  onSearch,
  onReset,
  isSearching,
}: SearchSidebarProps) {
  const [filters, setFilters] = useState<SearchFilters>({ ...defaultFilters });
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setFilters({ ...defaultFilters, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const update = useCallback(
    <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleReset = () => {
    setFilters({ ...defaultFilters });
    onReset();
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    setMessage("Filters saved!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleLoad = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFilters({ ...defaultFilters, ...JSON.parse(saved) });
        setMessage("Filters loaded!");
      } else {
        setMessage("No saved filters.");
      }
      setTimeout(() => setMessage(""), 2000);
    } catch {}
  };

  const techOpts = useMemo(
    () =>
      facets.technologies.map((t) => ({
        label: `${t.label} (${t.count})`,
        value: t.value,
      })),
    [facets.technologies],
  );
  const catOpts = useMemo(
    () =>
      facets.categories.map((c) => ({
        label: `${c.label} (${c.count})`,
        value: c.value,
      })),
    [facets.categories],
  );
  const countryOpts = useMemo(
    () =>
      facets.countries.map((c) => ({
        label: `${c.label} (${c.count})`,
        value: c.value,
      })),
    [facets.countries],
  );
  const techCatOpts = useMemo(
    () =>
      facets.techCategories.map((c) => ({
        label: `${c.label} (${c.count})`,
        value: c.value,
      })),
    [facets.techCategories],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col border-r border-gray-200 bg-white"
    >
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <Search className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {/* Free-text search */}
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Search (Name / Domain)
          </span>
          <input
            type="text"
            value={filters.search || ""}
            onChange={(e) => update("search", e.target.value)}
            placeholder="e.g. builtwith.com or Wiggle..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        {/* Technologies section */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-900 mb-2">
            Technologies
          </legend>
          <div className="space-y-3">
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                Include ALL (AND)
              </span>
              <MultiSelect
                options={techOpts}
                selected={filters.technologiesAnd || []}
                onChange={(v) => update("technologiesAnd", v)}
                placeholder="e.g. jQuery, Apache"
                ariaLabel="Include ALL technologies (AND)"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                Include ANY (OR)
              </span>
              <MultiSelect
                options={techOpts}
                selected={filters.technologiesOr || []}
                onChange={(v) => update("technologiesOr", v)}
                placeholder="e.g. Shopify, Stripe"
                ariaLabel="Include ANY technology (OR)"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                Exclude (NOT)
              </span>
              <MultiSelect
                options={techOpts}
                selected={filters.technologiesNot || []}
                onChange={(v) => update("technologiesNot", v)}
                placeholder="e.g. Intercom"
                ariaLabel="Exclude technologies (NOT)"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                Technology Categories
              </span>
              <MultiSelect
                options={techCatOpts}
                selected={filters.techCategories || []}
                onChange={(v) => update("techCategories", v)}
                placeholder="e.g. Advertising, Analytics..."
                ariaLabel="Technology categories"
              />
            </div>
          </div>
        </fieldset>

        {/* Company details section */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-900 mb-2">
            Company Details
          </legend>
          <div className="space-y-3">
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                IAB Category
              </span>
              <MultiSelect
                options={catOpts}
                selected={filters.categories || []}
                onChange={(v) => update("categories", v)}
                placeholder="e.g. Travel, Sports..."
                ariaLabel="IAB Category"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                Country (ISO code)
              </span>
              <MultiSelect
                options={countryOpts}
                selected={filters.countries || []}
                onChange={(v) => update("countries", v)}
                placeholder="e.g. GB, US, DE..."
                ariaLabel="Country"
              />
            </div>
          </div>
        </fieldset>

        {/* Stats section */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-900 mb-2">
            Stats & Ranges
          </legend>
          <div className="space-y-3">
            <fieldset>
              <legend className="block text-xs font-medium text-gray-600 mb-1">
                Total Technologies
              </legend>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  aria-label="Minimum total technologies"
                  value={filters.techCountMin || ""}
                  onChange={(e) =>
                    update(
                      "techCountMin",
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  aria-label="Maximum total technologies"
                  value={
                    filters.techCountMax === 10000
                      ? ""
                      : (filters.techCountMax ?? "")
                  }
                  onChange={(e) =>
                    update(
                      "techCountMax",
                      e.target.value === "" ? 10000 : Number(e.target.value),
                    )
                  }
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            </fieldset>
            <fieldset>
              <legend className="block text-xs font-medium text-gray-600 mb-1">
                Tech Spend ($/month)
              </legend>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  aria-label="Minimum tech spend"
                  value={filters.techSpendMin || ""}
                  onChange={(e) =>
                    update(
                      "techSpendMin",
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  aria-label="Maximum tech spend"
                  value={
                    filters.techSpendMax === 100000
                      ? ""
                      : (filters.techSpendMax ?? "")
                  }
                  onChange={(e) =>
                    update(
                      "techSpendMax",
                      e.target.value === "" ? 100000 : Number(e.target.value),
                    )
                  }
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            </fieldset>
            <fieldset>
              <legend className="block text-xs font-medium text-gray-600 mb-1">
                Techs per Category
              </legend>
              <p className="text-xs text-gray-400 mb-1">
                e.g. &quot;2+ technologies in Advertising&quot;
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="#"
                  aria-label="Minimum technologies in category"
                  className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  value={filters.categoryTechFilter?.minCount || ""}
                  onChange={(e) =>
                    update("categoryTechFilter", {
                      techCategory:
                        filters.categoryTechFilter?.techCategory || "",
                      minCount:
                        e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                />
                <span className="text-gray-400 text-xs">in</span>
                <select
                  aria-label="Technology category"
                  value={filters.categoryTechFilter?.techCategory || ""}
                  onChange={(e) =>
                    update("categoryTechFilter", {
                      techCategory: e.target.value,
                      minCount: filters.categoryTechFilter?.minCount || 0,
                    })
                  }
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Select category...</option>
                  {facets.techCategories.map((tc) => (
                    <option key={tc.value} value={tc.value}>
                      {tc.label}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
          </div>
        </fieldset>
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-200 px-4 py-3 space-y-2">
        {message && (
          <p className="text-xs text-center text-indigo-600 font-medium">
            {message}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSearching}
            className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isSearching}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw className="inline h-3.5 w-3.5 mr-1" />
            Reset
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            <Save className="inline h-3 w-3 mr-1" />
            Save Filters
          </button>
          <button
            type="button"
            onClick={handleLoad}
            className="flex-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            <RotateCcw className="inline h-3 w-3 mr-1" />
            Load Saved
          </button>
        </div>
      </div>
    </form>
  );
}
