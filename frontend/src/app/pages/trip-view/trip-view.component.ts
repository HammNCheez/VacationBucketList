import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  Comment,
  CostItem,
  Trip,
  TripUpdate,
} from '../../core/models/trip.model';
import { TripService } from '../../core/services/trip.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-trip-view',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './trip-view.component.html',
  styleUrl: './trip-view.component.scss',
})
export class TripViewComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  trip: Trip | null = null;
  loading = false;
  saving = false;
  errorMessage = '';
  tripId!: number;

  showAddCostItem = false;
  showAddComment = false;

  readonly costItemForm = this.fb.group({
    category: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    currency: ['USD'],
  });

  readonly commentForm = this.fb.group({
    body: ['', Validators.required],
    url: [''],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tripService: TripService,
    private readonly confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.tripId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTrip();
  }

  goBack(): void {
    void this.router.navigate(['/trips']);
  }

  goEdit(): void {
    void this.router.navigate(['/trips', this.tripId, 'edit']);
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

  formatDistance(miles: number | null | undefined): string {
    if (miles == null) return 'Unavailable';
    return `${miles.toLocaleString()} mi`;
  }

  totalCost(): number {
    if (!this.trip) return 0;
    return this.trip.cost_items.reduce((sum, item) => sum + item.amount, 0);
  }

  // --- Cost Item inline add/remove ---

  toggleAddCostItem(): void {
    this.showAddCostItem = !this.showAddCostItem;
    if (this.showAddCostItem) {
      this.costItemForm.reset({ category: '', amount: 0, currency: 'USD' });
    }
  }

  saveCostItem(): void {
    if (this.costItemForm.invalid || !this.trip) {
      this.costItemForm.markAllAsTouched();
      return;
    }

    const newItem = this.costItemForm.getRawValue() as CostItem;
    const updatedItems = [...this.trip.cost_items, newItem];
    this.persistTrip({ ...this.trip, cost_items: updatedItems });
  }

  removeCostItem(index: number): void {
    if (!this.trip) return;
    const item = this.trip.cost_items[index];
    const label = item.category?.trim() ? `cost item "${item.category}"` : 'this cost item';

    this.confirmDialog.confirm({ message: `Delete ${label}?` }).subscribe((confirmed) => {
      if (!confirmed || !this.trip) return;
      const updatedItems = this.trip.cost_items.filter((_, i) => i !== index);
      this.persistTrip({ ...this.trip!, cost_items: updatedItems });
    });
  }

  // --- Comment inline add/remove ---

  toggleAddComment(): void {
    this.showAddComment = !this.showAddComment;
    if (this.showAddComment) {
      this.commentForm.reset({ body: '', url: '' });
    }
  }

  saveComment(): void {
    if (this.commentForm.invalid || !this.trip) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const newComment = this.commentForm.getRawValue() as Comment;
    const updatedComments = [...this.trip.comments, newComment];
    this.persistTrip({ ...this.trip, comments: updatedComments });
  }

  removeComment(index: number): void {
    if (!this.trip) return;
    const comment = this.trip.comments[index];
    const label = comment.body?.trim() ? `comment "${comment.body}"` : 'this comment';

    this.confirmDialog.confirm({ message: `Delete ${label}?` }).subscribe((confirmed) => {
      if (!confirmed || !this.trip) return;
      const updatedComments = this.trip.comments.filter((_, i) => i !== index);
      this.persistTrip({ ...this.trip!, comments: updatedComments });
    });
  }

  // --- Private helpers ---

  private loadTrip(): void {
    this.loading = true;
    this.errorMessage = '';

    this.tripService
      .getTrip(this.tripId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (trip) => {
          this.trip = trip;
        },
        error: () => {
          this.errorMessage = 'Could not load trip.';
        },
      });
  }

  private persistTrip(updatedTrip: Trip): void {
    this.saving = true;
    const payload = this.buildPayload(updatedTrip);

    this.tripService
      .updateTrip(this.tripId, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (saved) => {
          this.trip = saved;
          this.showAddCostItem = false;
          this.showAddComment = false;
        },
        error: () => {
          this.errorMessage = 'Could not save changes.';
        },
      });
  }

  private buildPayload(trip: Trip): TripUpdate {
    return {
      title: trip.title,
      location: trip.location,
      origin: trip.origin || null,
      status: trip.status,
      priority: trip.priority,
      activity_level: trip.activity_level,
      travel_time_hours: trip.travel_time_hours,
      duration_days: trip.duration_days,
      target_date_start: trip.target_date_start || null,
      target_date_end: trip.target_date_end || null,
      target_date_range: trip.target_date_range || null,
      notes: trip.notes || null,
      trip_types: trip.trip_types,
      person_ids: trip.people.map((p) => p.id),
      cost_items: trip.cost_items.map((ci) => ({
        category: ci.category,
        amount: ci.amount,
        currency: ci.currency ?? 'USD',
      })),
      comments: trip.comments.map((c) => ({
        body: c.body,
        url: c.url ?? null,
      })),
    };
  }
}
