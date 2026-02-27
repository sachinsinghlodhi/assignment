// --- Raw BuiltWith data shapes (from the JSON files) ---

export interface RawMetaData {
  D: string;
  CN?: string;
  CAT?: string;
  CO?: string;
  C?: string;
  ST?: string;
  Z?: string;
  T?: string[];
  P?: { Name: string; Title: string }[];
  E?: string[];
  S?: string[];
}

export interface RawTechData {
  D: string;
  SP?: number;
  SD?: string;
  FI: string;
  LI: string;
  T: { N: string; FD: string; LD: string }[];
}

export interface RawTechIndex {
  Name: string;
  Parent?: string;
  Category: string;
  SubCategories?: string[];
  Description?: string;
  Link?: string;
  Premium?: string;
  FirstAdded?: string;
  TrendsLink?: string;
  Ticker?: string;
  Exchange?: string;
  PublicCompanyType?: string;
  PublicCompanyName?: string;
}

// --- Application types ---

export interface CompanyResult {
  domain: string;
  company_name: string;
  category: string;
  country: string;
  city: string;
  state: string;
  telephones: string[];
  emails: string[];
  social_links: string[];
  people: { Name: string; Title: string }[];
  tech_spend: number;
  first_indexed: string;
  last_indexed: string;
  total_technologies: number;
  technologies: string[];
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface SearchFilters {
  search?: string;
  categories?: string[];
  countries?: string[];
  technologiesAnd?: string[];
  technologiesOr?: string[];
  technologiesNot?: string[];
  techCategories?: string[];
  techCountMin?: number;
  techCountMax?: number;
  techSpendMin?: number;
  techSpendMax?: number;
  categoryTechFilter?: {
    techCategory: string;
    minCount: number;
  };
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface SearchResponse {
  results: CompanyResult[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    categories: FilterOption[];
    countries: FilterOption[];
    techCategories: FilterOption[];
    technologies: FilterOption[];
  };
}
