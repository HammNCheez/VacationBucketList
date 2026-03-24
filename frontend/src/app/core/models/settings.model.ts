export type OrsApiKeySource = 'environment' | 'database' | 'none';

export interface SettingsData {
  home_city: string | null;
  home_zip: string | null;
  ors_api_key: string | null;
}

export interface Settings extends SettingsData {
  ors_api_key_source: OrsApiKeySource;
  ors_api_key_from_environment: boolean;
}

export interface ExportPayload {
  schema_version: string;
  exported_at: string;
  trips: unknown[];
  people: unknown[];
  settings: SettingsData;
}

export interface RestoreResponse {
  schema_version: string;
  restored_at: string;
  restored_trips: number;
  restored_people: number;
}
