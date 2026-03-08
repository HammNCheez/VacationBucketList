import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Person, PersonCreate } from '../models/person.model';

@Injectable({ providedIn: 'root' })
export class PeopleService {
  private readonly baseUrl = '/api/people';

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Person[]> {
    return this.http.get<Person[]>(this.baseUrl);
  }

  create(payload: PersonCreate): Observable<Person> {
    return this.http.post<Person>(this.baseUrl, payload);
  }

  delete(personId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${personId}`);
  }
}
