import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Trip, TripCreate, TripFilters, TripUpdate } from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly baseUrl = '/api/trips';

  constructor(private readonly http: HttpClient) {}

  getTrips(filters?: TripFilters): Observable<Trip[]> {
    return this.http.get<Trip[]>(this.baseUrl, {
      params: this.buildParams(filters),
    });
  }

  getTrip(tripId: number): Observable<Trip> {
    return this.http.get<Trip>(`${this.baseUrl}/${tripId}`);
  }

  createTrip(payload: TripCreate): Observable<Trip> {
    return this.http.post<Trip>(this.baseUrl, payload);
  }

  updateTrip(tripId: number, payload: TripUpdate): Observable<Trip> {
    return this.http.put<Trip>(`${this.baseUrl}/${tripId}`, payload);
  }

  deleteTrip(tripId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${tripId}`);
  }

  getAutocomplete(field: 'trip_type' | 'target_date_range' | 'cost_category'): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/autocomplete`, {
      params: new HttpParams().set('field', field),
    });
  }

  private buildParams(filters?: TripFilters): HttpParams {
    let params = new HttpParams();
    if (!filters) {
      return params;
    }

    for (const value of filters.status ?? []) {
      params = params.append('status', value);
    }
    for (const value of filters.priority ?? []) {
      params = params.append('priority', value);
    }
    for (const value of filters.trip_type ?? []) {
      params = params.append('trip_type', value);
    }
    for (const value of filters.activity_level ?? []) {
      params = params.append('activity_level', value.toString());
    }

    if (filters.distance_min != null) {
      params = params.set('distance_min', String(filters.distance_min));
    }
    if (filters.distance_max != null) {
      params = params.set('distance_max', String(filters.distance_max));
    }
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.target_date_start) {
      params = params.set('target_date_start', filters.target_date_start);
    }
    if (filters.target_date_end) {
      params = params.set('target_date_end', filters.target_date_end);
    }

    return params;
  }
}
