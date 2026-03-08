import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { Trip, TripPriority, TripStatus } from '../../core/models/trip.model';
import { TripService } from '../../core/services/trip.service';

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './trip-list.component.html',
  styleUrl: './trip-list.component.scss',
})
export class TripListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly statuses: TripStatus[] = [
    'Wishlist',
    'Actively Planning',
    'Booked',
    'Completed',
    'Cancelled',
  ];
  readonly priorities: TripPriority[] = ['Must-do', 'Want-to', 'Nice-to-have'];
  readonly activityLevels = [1, 2, 3, 4, 5];

  readonly filtersForm = this.fb.group({
    status: [[] as TripStatus[]],
    priority: [[] as TripPriority[]],
    activity_level: [[] as number[]],
    search: [''],
    distance_min: [null as number | null],
    distance_max: [null as number | null],
  });

  trips: Trip[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private readonly tripService: TripService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadTrips();
  }

  loadTrips(): void {
    this.loading = true;
    this.errorMessage = '';

    const value = this.filtersForm.getRawValue();
    this.tripService
      .getTrips({
        status: value.status ?? undefined,
        priority: value.priority ?? undefined,
        activity_level: value.activity_level ?? undefined,
        search: value.search || undefined,
        distance_min: value.distance_min,
        distance_max: value.distance_max,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (trips) => {
          this.trips = trips;
        },
        error: () => {
          this.errorMessage = 'Could not load trips.';
        },
      });
  }

  clearFilters(): void {
    this.filtersForm.reset({
      status: [],
      priority: [],
      activity_level: [],
      search: '',
      distance_min: null,
      distance_max: null,
    });
    this.loadTrips();
  }

  openCreate(): void {
    void this.router.navigate(['/trips/new']);
  }

  openEdit(tripId: number): void {
    void this.router.navigate(['/trips', tripId]);
  }

  deleteTrip(tripId: number): void {
    this.tripService.deleteTrip(tripId).subscribe({
      next: () => this.loadTrips(),
      error: () => {
        this.errorMessage = 'Could not delete trip.';
      },
    });
  }
}
