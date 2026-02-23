export interface Recall {
  recall_id: string;
  agency: string;
  recall_number: string;
  slug: string;
  title: string;
  product_description: string | null;
  reason: string | null;
  hazard: string | null;
  remedy: string | null;
  classification: string | null;
  severity: number;
  date_reported: string | null;
  date_initiated: string | null;
  status: string | null;
  affected_count: string | null;
  manufacturer_id: string | null;
  distribution: string | null;
  category_id: string | null;
  recalling_firm: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  url: string | null;
}

export interface Category {
  category_id: string;
  category_name: string;
  slug: string;
  description: string | null;
  recall_count: number;
}

export interface Manufacturer {
  manufacturer_id: string;
  name: string;
  slug: string;
  recall_count: number;
  latest_recall_date: string | null;
}

export interface Agency {
  agency_id: string;
  agency_name: string;
  slug: string;
  description: string | null;
  url: string | null;
  recall_count: number;
}

export interface SearchResult {
  recalls: Recall[];
  total: number;
  page: number;
  perPage: number;
}

export interface AgencyStats {
  agency: string;
  count: number;
  name: string;
  slug: string;
}
