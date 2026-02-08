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

export const CATEGORIES = [
  "러너스팟",
  "샤워",
  "짐보관",
] as const;

export type Category = (typeof CATEGORIES)[number];
