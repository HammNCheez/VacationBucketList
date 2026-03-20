import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { filter, finalize, switchMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Trip, TripPriority, TripStatus } from '../../core/models/trip.model';
import { TripService } from '../../core/services/trip.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

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
    MatTableModule,
    MatSortModule,
    MatSliderModule,
    MatTooltipModule,
  ],
  templateUrl: './trip-list.component.html',
  styleUrl: './trip-list.component.scss',
})
export class TripListComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);

  @ViewChild(MatSort) sort!: MatSort;

  readonly statuses: TripStatus[] = [
    'Wishlist',
    'Actively Planning',
    'Booked',
    'Completed',
    'Cancelled',
  ];
  readonly priorities: TripPriority[] = ['Must-do', 'Want-to', 'Nice-to-have'];
  readonly activityLevels = [1, 2, 3, 4, 5];

  readonly displayedColumns: string[] = [
    'title',
    'location',
    'status',
    'priority',
    'activity_level',
    'target_date_start',
    'travel_time_hours',
    'actions',
  ];

  sliderMax = 500;
  sliderMin = 0;

  readonly filtersForm = this.fb.group({
    status: [[] as TripStatus[]],
    priority: [[] as TripPriority[]],
    activity_level: [[] as number[]],
    search: [''],
    distance_min: [0],
    distance_max: [500],
  });

  dataSource = new MatTableDataSource<Trip>([]);
  loading = false;
  errorMessage = '';

  constructor(
    private readonly tripService: TripService,
    private readonly router: Router,
    private readonly confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.loadTrips();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  loadTrips(): void {
    this.loading = true;
    this.errorMessage = '';

    const value = this.filtersForm.getRawValue();
    const distMin = (value.distance_min ?? 0) > 0 ? value.distance_min : null;
    const distMax = (value.distance_max ?? this.sliderMax) < this.sliderMax ? value.distance_max : null;

    this.tripService
      .getTrips({
        status: value.status ?? undefined,
        priority: value.priority ?? undefined,
        activity_level: value.activity_level ?? undefined,
        search: value.search || undefined,
        distance_min: distMin,
        distance_max: distMax,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (trips) => {
          this.dataSource.data = trips;
          this.updateSliderMax(trips);
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
      distance_min: 0,
      distance_max: this.sliderMax,
    });
    this.loadTrips();
  }

  openCreate(): void {
    void this.router.navigate(['/trips/new']);
  }

  openView(tripId: number): void {
    void this.router.navigate(['/trips', tripId]);
  }

  deleteTrip(trip: Trip): void {
    this.confirmDialog
      .confirm({
        message: `Are you sure you want to delete ${trip.title}?`,
      })
      .pipe(
        switchMap((confirmed) => {
          if (!confirmed) {
            return of(false);
          }

          return this.confirmDialog.confirm({
            message: `Are you sure you want to delete ${trip.title}?`,
            detail: `This action is permanent. Please confirm again to delete ${trip.title}.`,
            confirmDelaySeconds: 3,
          });
        }),
        filter((confirmed) => confirmed),
        switchMap(() => this.tripService.deleteTrip(trip.id))
      )
      .subscribe({
        next: () => this.loadTrips(),
        error: () => {
          this.errorMessage = 'Could not delete trip.';
        },
      });
  }

  activityEmoji(level: number): string {
    return '🔥'.repeat(level);
  }

  statusClass(status: string): string {
    return 'status-chip status-' + status.toLowerCase().replace(/\s+/g, '-');
  }

  priorityClass(priority: string): string {
    return 'priority-badge priority-' + priority.toLowerCase().replace(/\s+/g, '-');
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTravelTime(hours: number): string {
    if (!hours) return '—';
    return `${hours}h`;
  }

  sliderLabel(value: number): string {
    return `${value} mi`;
  }

  get distanceRangeLabel(): string {
    const min = this.filtersForm.get('distance_min')?.value ?? 0;
    const max = this.filtersForm.get('distance_max')?.value ?? this.sliderMax;
    return `${min} mi – ${max} mi`;
  }

  private updateSliderMax(trips: Trip[]): void {
    const maxDist = Math.max(0, ...trips.map((t) => t.distance_miles ?? 0));
    if (maxDist === 0) {
      this.sliderMax = 500;
    } else {
      this.sliderMax = Math.ceil(maxDist / 500) * 500;
    }

    const currentMax = this.filtersForm.get('distance_max')?.value ?? 0;
    if (currentMax === 0 || currentMax > this.sliderMax) {
      this.filtersForm.patchValue({ distance_max: this.sliderMax }, { emitEvent: false });
    }
  }
}
