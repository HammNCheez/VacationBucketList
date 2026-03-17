export interface Settings {
  home_city: string | null;
  home_zip: string | null;
  ors_api_key: string | null;
}

export interface ExportPayload {
  schema_version: string;
  exported_at: string;
  trips: unknown[];
  people: unknown[];
  settings: Settings;
}

export interface RestoreResponse {
  schema_version: string;
  restored_at: string;
  restored_trips: number;
  restored_people: number;
}
