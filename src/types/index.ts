import type { Database } from '@/lib/supabase/database';

/** 짐보관 스팟의 단일 구역 */
export interface LockerSection {
  detail_address: string | null;
  locker_small: number | null;
  locker_medium: number | null;
  locker_large: number | null;
}

export interface Spot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: Category;
  features: string[];
  locker_sections: LockerSection[] | null;
  is_highlighted: boolean;
  operating_hours: Record<string, string> | null;
  description: string | null;
  phone: string | null;
  photos: string[];
  extra_data: { custom_url?: string } & Record<string, unknown>;
  search_tags: string[];
  created_at: string;
  updated_at: string;
}

export type SpotInsert = Omit<Spot, "id" | "created_at" | "updated_at">;
export type SpotUpdate = Partial<SpotInsert>;

export interface CoursePinpoint {
  lat: number;
  lng: number;
}

export interface Course {
  id: string;
  name: string;
  image_url: string | null;
  highlight_image_url: string | null;
  nw_lat: number;
  nw_lng: number;
  se_lat: number;
  se_lng: number;
  opacity: number;
  thumbnail_url: string | null;
  gpx_file_url: string | null;
  is_active: boolean;
  description: string | null;
  difficulty: number | null;
  distance_km: number | null;
  pinpoints: CoursePinpoint[];
  search_tags: string[];
  created_at: string;
  updated_at: string;
}

export type DrawerSelection =
  | { type: 'spot'; data: Spot }
  | { type: 'course'; data: Course };

export type AppMode = 'home' | 'course' | 'navigation';

export type Feedback = Database['public']['Tables']['feedback']['Row'];

export const CATEGORIES = [
  "러너스팟",
  "샤워",
  "짐보관",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FEATURES = [
  "샤워실",
  "물품보관함",
  "탈의실",
  "러닝용품",
  "주차장",
] as const;

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
