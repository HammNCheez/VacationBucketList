import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ExportPayload, Settings } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly baseUrl = '/api/settings';

  constructor(private readonly http: HttpClient) {}

  getSettings(): Observable<Settings> {
    return this.http.get<Settings>(this.baseUrl);
  }

  updateSettings(payload: Settings): Observable<Settings> {
    return this.http.put<Settings>(this.baseUrl, payload);
  }

  exportData(): Observable<ExportPayload> {
    return this.http.get<ExportPayload>('/api/export');
  }
}
