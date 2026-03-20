import { Person } from './person.model';

export type TripStatus =
  | 'Wishlist'
  | 'Actively Planning'
  | 'Booked'
  | 'Completed'
  | 'Cancelled';

export type TripPriority = 'Must-do' | 'Want-to' | 'Nice-to-have';

export interface WarningMessage {
  code: string;
  message: string;
}

export interface CostItem {
  id?: number;
  category: string;
  amount: number;
  currency?: string | null;
}

export interface Comment {
  id?: number;
  body: string;
  url?: string | null;
  created_at?: string;
}

export interface Trip {
  id: number;
  title: string;
  location: string;
  location_lat?: number | null;
  location_lng?: number | null;
  origin?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  distance_miles?: number | null;
  status: TripStatus;
  priority: TripPriority;
  trip_types: string[];
  activity_level: number;
  travel_time_hours: number;
  duration_days: number;
  total_trip_length: string;
  target_date_start?: string | null;
  target_date_end?: string | null;
  target_date_range?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  cost_items: CostItem[];
  comments: Comment[];
  people: Person[];
  per_person_cost?: number | null;
  per_person_currency?: string | null;
  warnings?: WarningMessage[];
}

export interface TripCreate {
  title: string;
  location: string;
  origin?: string | null;
  status: TripStatus;
  priority: TripPriority;
  trip_types: string[];
  activity_level: number;
  travel_time_hours?: number;
  duration_days?: number;
  target_date_start?: string | null;
  target_date_end?: string | null;
  target_date_range?: string | null;
  notes?: string | null;
  cost_items?: CostItem[];
  comments?: Comment[];
  person_ids?: number[];
}

export interface TripUpdate extends Partial<TripCreate> {}

export interface TripFilters {
  status?: TripStatus[];
  priority?: TripPriority[];
  trip_type?: string[];
  activity_level?: number[];
  distance_min?: number | null;
  distance_max?: number | null;
  search?: string | null;
  target_date_start?: string | null;
  target_date_end?: string | null;
}
