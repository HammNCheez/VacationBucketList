import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { TripViewComponent } from './trip-view.component';
import { TripService } from '../../core/services/trip.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { Trip } from '../../core/models/trip.model';

describe('TripViewComponent', () => {
  let fixture: ComponentFixture<TripViewComponent>;
  let component: TripViewComponent;
  let tripService: jasmine.SpyObj<TripService>;
  let router: jasmine.SpyObj<Router>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  const sampleTrip: Trip = {
    id: 5,
    title: 'Iceland',
    location: 'Reykjavik',
    origin: 'New York',
    distance_miles: 2600,
    status: 'Wishlist',
    priority: 'Must-do',
    trip_types: ['Adventure', 'Nature'],
    activity_level: 4,
    travel_time_hours: 6,
    duration_days: 7,
    total_trip_length: '7 days',
    target_date_start: '2026-08-01',
    target_date_end: '2026-08-08',
    target_date_range: 'Late Summer',
    notes: 'Pack warm clothes',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    cost_items: [{ category: 'Flights', amount: 800, currency: 'USD' }],
    comments: [{ body: 'Check Northern Lights schedule', url: 'https://example.com' }],
    people: [{ id: 1, name: 'Alice' }],
  };

  beforeEach(async () => {
    tripService = jasmine.createSpyObj('TripService', ['getTrip', 'updateTrip']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    confirmDialog = jasmine.createSpyObj('ConfirmDialogService', ['confirm']);

    const route = {
      snapshot: { paramMap: convertToParamMap({ id: '5' }) },
    } as unknown as ActivatedRoute;

    await TestBed.configureTestingModule({
      imports: [TripViewComponent, NoopAnimationsModule],
      providers: [
        { provide: TripService, useValue: tripService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: ConfirmDialogService, useValue: confirmDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TripViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    tripService.getTrip.and.returnValue(of(sampleTrip));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads trip on init', () => {
    tripService.getTrip.and.returnValue(of(sampleTrip));
    fixture.detectChanges();

    expect(tripService.getTrip).toHaveBeenCalledWith(5);
    expect(component.trip).toEqual(sampleTrip);
  });

  it('navigates back to trips list', () => {
    tripService.getTrip.and.returnValue(of(sampleTrip));
    fixture.detectChanges();

    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/trips']);
  });

  it('navigates to edit page', () => {
    tripService.getTrip.and.returnValue(of(sampleTrip));
    fixture.detectChanges();

    component.goEdit();
    expect(router.navigate).toHaveBeenCalledWith(['/trips', 5, 'edit']);
  });

  it('returns fire emojis for activity level', () => {
    expect(component.activityEmoji(3)).toBe('🔥🔥🔥');
    expect(component.activityEmoji(1)).toBe('🔥');
    expect(component.activityEmoji(5)).toBe('🔥🔥🔥🔥🔥');
  });

  it('adds a cost item', () => {
    tripService.getTrip.and.returnValue(of(sampleTrip));
    fixture.detectChanges();

    const updatedTrip = { ...sampleTrip, cost_items: [...sampleTrip.cost_items, { category: 'Hotel', amount: 500, currency: 'USD' }] };
    tripService.updateTrip.and.returnValue(of(updatedTrip));

    component.toggleAddCostItem();
    component.costItemForm.patchValue({ category: 'Hotel', amount: 500, currency: 'USD' });
    component.saveCostItem();

    expect(tripService.updateTrip).toHaveBeenCalledWith(5, jasmine.objectContaining({
      cost_items: jasmine.arrayContaining([
        jasmine.objectContaining({ category: 'Hotel', amount: 500 }),
      ]),
    }));
  });

  it('adds a comment', () => {
    tripService.getTrip.and.returnValue(of(sampleTrip));
    fixture.detectChanges();

    const updatedTrip = { ...sampleTrip, comments: [...sampleTrip.comments, { body: 'New note', url: '' }] };
    tripService.updateTrip.and.returnValue(of(updatedTrip));

    component.toggleAddComment();
    component.commentForm.patchValue({ body: 'New note', url: '' });
    component.saveComment();

    expect(tripService.updateTrip).toHaveBeenCalledWith(5, jasmine.objectContaining({
      comments: jasmine.arrayContaining([
        jasmine.objectContaining({ body: 'New note' }),
      ]),
    }));
  });

  it('removes a cost item after confirmation', () => {
    tripService.getTrip.and.returnValue(of(sampleTrip));
    fixture.detectChanges();

    confirmDialog.confirm.and.returnValue(of(true));
    const updatedTrip = { ...sampleTrip, cost_items: [] };
    tripService.updateTrip.and.returnValue(of(updatedTrip));

    component.removeCostItem(0);

    expect(confirmDialog.confirm).toHaveBeenCalled();
    expect(tripService.updateTrip).toHaveBeenCalledWith(5, jasmine.objectContaining({
      cost_items: [],
    }));
  });

  it('computes total cost', () => {
    tripService.getTrip.and.returnValue(of(sampleTrip));
    fixture.detectChanges();

    expect(component.totalCost()).toBe(800);
  });
});
