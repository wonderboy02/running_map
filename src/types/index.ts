export interface Spot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  categories: string[];
  is_highlighted: boolean;
  operating_hours: Record<string, string> | null;
  description: string | null;
  phone: string | null;
  photos: string[];
  extra_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SpotInsert = Omit<Spot, "id" | "created_at" | "updated_at">;
export type SpotUpdate = Partial<SpotInsert>;

export interface Overlay {
  id: string;
  name: string;
  image_url: string;
  nw_lat: number;
  nw_lng: number;
  se_lat: number;
  se_lng: number;
  opacity: number;
  is_active: boolean;
  description: string | null;
  difficulty: number | null;
  distance_km: number | null;
  pin_lat: number | null;
  pin_lng: number | null;
  created_at: string;
  updated_at: string;
}

export type DrawerSelection =
  | { type: 'spot'; data: Spot }
  | { type: 'overlay'; data: Overlay };

export const CATEGORIES = [
  "러너스팟",
  "샤워",
  "짐보관",
] as const;

export type Category = (typeof CATEGORIES)[number];
