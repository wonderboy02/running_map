import type { Database } from '@/lib/supabase/database';

export interface Spot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  categories: string[];
  features: string[];
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

export interface Course {
  id: string;
  name: string;
  image_url: string;
  highlight_image_url: string | null;
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
  | { type: 'course'; data: Course };

export type Feedback = Database['public']['Tables']['feedback']['Row'];

export const CATEGORIES = [
  "러너스팟",
  "샤워",
  "짐보관",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FEATURES = [
  "샤워실",
  "탈의실",
  "짐보관",
  "수건",
  "세면도구",
  "드라이기",
  "주차장",
  "와이파이",
  "음수대",
  "화장실",
] as const;

export type Feature = (typeof FEATURES)[number];

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};
