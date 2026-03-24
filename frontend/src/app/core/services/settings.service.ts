import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ExportPayload, RestoreResponse, Settings } from '../models/settings.model';

type SettingsUpdatePayload = Pick<Settings, 'home_city' | 'home_zip' | 'ors_api_key'>;

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly baseUrl = '/api/settings';

  constructor(private readonly http: HttpClient) {}

  getSettings(): Observable<Settings> {
    return this.http.get<Settings>(this.baseUrl);
  }

  updateSettings(payload: SettingsUpdatePayload): Observable<Settings> {
    return this.http.put<Settings>(this.baseUrl, payload);
  }

  exportData(): Observable<ExportPayload> {
    return this.http.get<ExportPayload>('/api/export');
  }

  restoreData(file: File): Observable<RestoreResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<RestoreResponse>('/api/export/restore', formData);
  }
}
