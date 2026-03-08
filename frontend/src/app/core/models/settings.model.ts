export interface Settings {
  home_city: string | null;
  home_zip: string | null;
}

export interface ExportPayload {
  schema_version: string;
  exported_at: string;
  trips: unknown[];
  people: unknown[];
  settings: Settings;
}
