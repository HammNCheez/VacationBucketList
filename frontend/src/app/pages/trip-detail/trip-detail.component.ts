import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Person } from '../../core/models/person.model';
import {
  Comment,
  CostItem,
  TripCreate,
  TripPriority,
  TripStatus,
  TripUpdate,
} from '../../core/models/trip.model';
import { PeopleService } from '../../core/services/people.service';
import { TripService } from '../../core/services/trip.service';
import { AutocompleteInputComponent } from '../../shared/autocomplete-input/autocomplete-input.component';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    AutocompleteInputComponent,
  ],
  templateUrl: './trip-detail.component.html',
  styleUrl: './trip-detail.component.scss',
})
export class TripDetailComponent implements OnInit {
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

  readonly targetDateRangeControl = new FormControl<string | null>('');
  targetDateRangeOptions: string[] = [];
  availablePeople: Person[] = [];

  readonly form = this.fb.group({
    title: ['', [Validators.required]],
    location: ['', [Validators.required]],
    origin: [''],
    status: ['Wishlist' as TripStatus, [Validators.required]],
    priority: ['Want-to' as TripPriority, [Validators.required]],
    activity_level: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    travel_time_hours: [0],
    duration_days: [0],
    target_date_start: [''],
    target_date_end: [''],
    notes: [''],
    person_ids: [[] as number[]],
    trip_types_text: [''],
  });

  readonly costItems = new FormArray<FormGroup>([]);
  readonly comments = new FormArray<FormGroup>([]);

  tripId: number | null = null;
  saving = false;
  errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tripService: TripService,
    private readonly peopleService: PeopleService,
    private readonly confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    const tripIdParam = this.route.snapshot.paramMap.get('id');
    this.tripId = tripIdParam ? Number(tripIdParam) : null;

    this.loadPeople();
    this.loadTargetDateRangeOptions();

    if (this.tripId) {
      this.loadTrip(this.tripId);
    }
  }

  get costItemControls(): FormArray<FormGroup> {
    return this.costItems;
  }

  get commentControls(): FormArray<FormGroup> {
    return this.comments;
  }

  addCostItem(): void {
    this.costItems.push(
      this.fb.group({
        category: ['', Validators.required],
        amount: [0, [Validators.required, Validators.min(0)]],
        currency: ['USD'],
      })
    );
  }

  removeCostItem(index: number): void {
    const category = this.costItems.at(index).get('category')?.value as string | null;
    const itemName = category?.trim() ? `cost item ${category.trim()}` : 'this cost item';

    this.confirmDialog
      .confirm({
        message: `Are you sure you want to delete ${itemName}?`,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.costItems.removeAt(index);
      });
  }

  addComment(): void {
    this.comments.push(
      this.fb.group({
        body: ['', Validators.required],
        url: [''],
      })
    );
  }

  removeComment(index: number): void {
    const body = this.comments.at(index).get('body')?.value as string | null;
    const label = body?.trim() ? `comment \"${body.trim()}\"` : 'this comment';

    this.confirmDialog
      .confirm({
        message: `Are you sure you want to delete ${label}?`,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.comments.removeAt(index);
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const formValue = this.form.getRawValue();
    const payload = {
      title: formValue.title ?? '',
      location: formValue.location ?? '',
      origin: formValue.origin || null,
      status: formValue.status ?? 'Wishlist',
      priority: formValue.priority ?? 'Want-to',
      activity_level: Number(formValue.activity_level),
      travel_time_hours: Number(formValue.travel_time_hours ?? 0),
      duration_days: Number(formValue.duration_days ?? 0),
      target_date_start: formValue.target_date_start || null,
      target_date_end: formValue.target_date_end || null,
      target_date_range: this.targetDateRangeControl.value || null,
      notes: formValue.notes || null,
      person_ids: formValue.person_ids ?? [],
      trip_types: (formValue.trip_types_text ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      cost_items: this.costItems.controls.map((control) => control.getRawValue() as CostItem),
      comments: this.comments.controls.map((control) => control.getRawValue() as Comment),
    };

    const request$ = this.tripId
      ? this.tripService.updateTrip(this.tripId, payload as TripUpdate)
      : this.tripService.createTrip(payload as TripCreate);

    request$.subscribe({
      next: () => {
        this.saving = false;
        void this.router.navigate(['/trips']);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.detail || 'Could not save trip.';
      },
    });
  }

  cancel(): void {
    void this.router.navigate(['/trips']);
  }

  private loadPeople(): void {
    this.peopleService.list().subscribe({
      next: (people) => (this.availablePeople = people),
    });
  }

  private loadTargetDateRangeOptions(): void {
    this.tripService.getAutocomplete('target_date_range').subscribe({
      next: (options) => (this.targetDateRangeOptions = options),
    });
  }

  private loadTrip(tripId: number): void {
    this.tripService.getTrip(tripId).subscribe({
      next: (trip) => {
        this.form.patchValue({
          title: trip.title,
          location: trip.location,
          origin: trip.origin ?? '',
          status: trip.status,
          priority: trip.priority,
          activity_level: trip.activity_level,
          travel_time_hours: trip.travel_time_hours,
          duration_days: trip.duration_days,
          target_date_start: trip.target_date_start ?? '',
          target_date_end: trip.target_date_end ?? '',
          notes: trip.notes ?? '',
          person_ids: trip.people.map((person) => person.id),
          trip_types_text: trip.trip_types.join(', '),
        });

        this.targetDateRangeControl.setValue(trip.target_date_range ?? '');
        this.costItems.clear();
        for (const item of trip.cost_items) {
          this.costItems.push(
            this.fb.group({
              category: [item.category, Validators.required],
              amount: [item.amount, [Validators.required, Validators.min(0)]],
              currency: [item.currency ?? 'USD'],
            })
          );
        }

        this.comments.clear();
        for (const comment of trip.comments) {
          this.comments.push(
            this.fb.group({
              body: [comment.body, Validators.required],
              url: [comment.url ?? ''],
            })
          );
        }
      },
      error: () => {
        this.errorMessage = 'Could not load trip details.';
      },
    });
  }
}
