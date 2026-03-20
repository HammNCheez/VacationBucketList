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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
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
import { SettingsService } from '../../core/services/settings.service';
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
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatAutocompleteModule,
    MatRadioModule,
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
  readonly tripTypeInputControl = new FormControl<string>('', { nonNullable: true });
  readonly peopleInputControl = new FormControl<string>('', { nonNullable: true });
  readonly dateModeControl = new FormControl<'range' | 'exact'>('range', {
    nonNullable: true,
  });
  targetDateRangeOptions: string[] = [];
  tripTypeOptions: string[] = [];
  tripTypes: string[] = [];
  availablePeople: Person[] = [];

  readonly form = this.fb.group({
    title: ['', [Validators.required]],
    location: ['', [Validators.required]],
    origin: [''],
    status: ['Wishlist' as TripStatus, [Validators.required]],
    priority: ['Want-to' as TripPriority, [Validators.required]],
    activity_level: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    travel_time_hours: [null as number | null, [Validators.min(0)]],
    duration_days: [0],
    target_date_start: [''],
    target_date_end: [''],
    notes: [''],
    person_ids: [[] as number[]],
  });

  readonly costItems = new FormArray<FormGroup>([]);
  readonly comments = new FormArray<FormGroup>([]);

  tripId: number | null = null;
  saving = false;
  errorMessage = '';
  dateModeErrorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tripService: TripService,
    private readonly peopleService: PeopleService,
    private readonly settingsService: SettingsService,
    private readonly confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    const tripIdParam = this.route.snapshot.paramMap.get('id');
    this.tripId = tripIdParam ? Number(tripIdParam) : null;

    this.loadPeople();
    this.loadTargetDateRangeOptions();
    this.loadTripTypeOptions();

    if (this.tripId) {
      this.loadTrip(this.tripId);
    } else {
      this.prefillOriginFromSettings();
    }
  }

  get filteredTripTypeOptions(): string[] {
    const term = this.tripTypeInputControl.value.trim().toLowerCase();
    const selected = new Set(this.tripTypes.map((tag) => tag.toLowerCase()));

    return this.tripTypeOptions.filter((option) => {
      const normalizedOption = option.toLowerCase();
      if (selected.has(normalizedOption)) {
        return false;
      }
      if (!term) {
        return true;
      }
      return normalizedOption.includes(term);
    });
  }

  get selectedPersonIds(): number[] {
    return this.form.get('person_ids')?.value ?? [];
  }

  get selectedPeople(): Person[] {
    const selectedIds = new Set(this.selectedPersonIds);
    return this.availablePeople.filter((person) => selectedIds.has(person.id));
  }

  get filteredPeopleOptions(): Person[] {
    const term = this.peopleInputControl.value.trim().toLowerCase();
    const selectedIds = new Set(this.selectedPersonIds);

    return this.availablePeople.filter((person) => {
      if (selectedIds.has(person.id)) {
        return false;
      }

      if (!term) {
        return true;
      }

      return person.name.toLowerCase().includes(term);
    });
  }

  setActivityLevel(level: number): void {
    this.form.patchValue({ activity_level: level });
  }

  isActivityLevelSelected(level: number): boolean {
    return (this.form.get('activity_level')?.value ?? 1) === level;
  }

  get activityLevelSummary(): string {
    return `${this.form.get('activity_level')?.value ?? 1}/5`;
  }

  setDateMode(mode: 'range' | 'exact'): void {
    this.dateModeControl.setValue(mode);
    this.dateModeErrorMessage = '';
  }

  isControlInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.get(controlName);
    if (!control) {
      return false;
    }
    return control.invalid && (control.touched || control.dirty);
  }

  addTripType(value: string): void {
    const normalized = value.trim();
    if (!normalized) {
      this.tripTypeInputControl.setValue('');
      return;
    }

    const exists = this.tripTypes.some(
      (existingType) => existingType.toLowerCase() === normalized.toLowerCase()
    );
    if (!exists) {
      this.tripTypes = [...this.tripTypes, normalized];
    }

    this.tripTypeInputControl.setValue('');
  }

  removeTripType(value: string): void {
    this.tripTypes = this.tripTypes.filter((tripType) => tripType !== value);
  }

  addPersonById(personId: number | null): void {
    if (personId == null) {
      this.peopleInputControl.setValue('');
      return;
    }

    if (!this.availablePeople.some((person) => person.id === personId)) {
      this.peopleInputControl.setValue('');
      return;
    }

    const current = this.selectedPersonIds;
    if (!current.includes(personId)) {
      this.form.patchValue({ person_ids: [...current, personId] });
    }

    this.peopleInputControl.setValue('');
  }

  removePerson(personId: number): void {
    this.form.patchValue({
      person_ids: this.selectedPersonIds.filter((id) => id !== personId),
    });
  }

  handleTripTypeEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.addTripType(this.tripTypeInputControl.value);
  }

  handleTripTypeTab(event: Event, activeSuggestion: string | null): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!activeSuggestion) {
      return;
    }

    keyboardEvent.preventDefault();
    this.addTripType(activeSuggestion);
  }

  onTripTypeOptionSelected(value: string): void {
    this.addTripType(value);
  }

  handlePeopleEnter(event: Event, activeSuggestion: number | null): void {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.addPersonById(activeSuggestion);
  }

  handlePeopleTab(event: Event, activeSuggestion: number | null): void {
    if (activeSuggestion == null) {
      return;
    }

    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.addPersonById(activeSuggestion);
  }

  onPeopleOptionSelected(personId: number): void {
    this.addPersonById(personId);
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
    const label = body?.trim() ? `comment "${body.trim()}"` : 'this comment';

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
    this.dateModeErrorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const formValue = this.form.getRawValue();
    const parsedDurationDays = this.parseOptionalNumber(formValue.duration_days) ?? 0;
    const parsedTravelTime = this.parseOptionalNumber(formValue.travel_time_hours);
    const isRangeMode = this.dateModeControl.value === 'range';

    if (!isRangeMode) {
      const startDate = formValue.target_date_start || null;
      const endDate = formValue.target_date_end || null;
      if (startDate && endDate && startDate > endDate) {
        this.dateModeErrorMessage = 'Target start date must be before or equal to target end date.';
        return;
      }
    }

    const payload = {
      title: formValue.title ?? '',
      location: formValue.location ?? '',
      origin: formValue.origin || null,
      status: formValue.status ?? 'Wishlist',
      priority: formValue.priority ?? 'Want-to',
      activity_level: Number(formValue.activity_level),
      duration_days: parsedDurationDays,
      target_date_start: isRangeMode ? null : formValue.target_date_start || null,
      target_date_end: isRangeMode ? null : formValue.target_date_end || null,
      target_date_range: isRangeMode ? this.targetDateRangeControl.value || null : null,
      notes: formValue.notes || null,
      person_ids: formValue.person_ids ?? [],
      trip_types: this.tripTypes,
      cost_items: this.costItems.controls.map((control) => control.getRawValue() as CostItem),
      comments: this.comments.controls.map((control) => control.getRawValue() as Comment),
    } as TripCreate;

    if (parsedTravelTime != null) {
      payload.travel_time_hours = parsedTravelTime;
    }

    const request$ = this.tripId
      ? this.tripService.updateTrip(this.tripId, payload as TripUpdate)
      : this.tripService.createTrip(payload);

    request$.subscribe({
      next: (saved) => {
        this.saving = false;
        if (this.tripId) {
          void this.router.navigate(['/trips', this.tripId]);
        } else {
          void this.router.navigate(['/trips']);
        }
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.detail || 'Could not save trip.';
      },
    });
  }

  cancel(): void {
    if (this.tripId) {
      void this.router.navigate(['/trips', this.tripId]);
    } else {
      void this.router.navigate(['/trips']);
    }
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

  private loadTripTypeOptions(): void {
    this.tripService.getAutocomplete('trip_type').subscribe({
      next: (options) => (this.tripTypeOptions = options),
    });
  }

  private prefillOriginFromSettings(): void {
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        const existingOrigin = this.form.get('origin')?.value?.trim() ?? '';
        if (!existingOrigin && settings.home_city) {
          this.form.patchValue({ origin: settings.home_city });
        }
      },
    });
  }

  private parseOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  }

  private loadTrip(tripId: number): void {
    this.tripService.getTrip(tripId).subscribe({
      next: (trip) => {
        const hasExactDates = Boolean(trip.target_date_start || trip.target_date_end);

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
        });

        this.tripTypes = [...trip.trip_types];
        this.targetDateRangeControl.setValue(trip.target_date_range ?? '');
        this.dateModeControl.setValue(hasExactDates ? 'exact' : 'range');
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
