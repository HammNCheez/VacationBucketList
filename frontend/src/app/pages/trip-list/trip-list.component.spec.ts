import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { TripListComponent } from './trip-list.component';
import { TripService } from '../../core/services/trip.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { Trip } from '../../core/models/trip.model';

describe('TripListComponent', () => {
  let fixture: ComponentFixture<TripListComponent>;
  let component: TripListComponent;
  let tripService: jasmine.SpyObj<TripService>;
  let router: jasmine.SpyObj<Router>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  const sampleTrip: Trip = {
    id: 1,
    title: 'Alaska',
    location: 'Juneau',
    status: 'Wishlist',
    priority: 'Must-do',
    trip_types: ['Adventure'],
    activity_level: 4,
    travel_time_hours: 0,
    duration_days: 0,
    total_trip_length: '0 days',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    cost_items: [],
    comments: [],
    people: [],
  };

  beforeEach(async () => {
    tripService = jasmine.createSpyObj('TripService', ['getTrips', 'deleteTrip']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    confirmDialog = jasmine.createSpyObj('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [TripListComponent, NoopAnimationsModule],
      providers: [
        { provide: TripService, useValue: tripService },
        { provide: Router, useValue: router },
        { provide: ConfirmDialogService, useValue: confirmDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TripListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    tripService.getTrips.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads trips on init', () => {
    const trips: Trip[] = [sampleTrip];
    tripService.getTrips.and.returnValue(of(trips));

    fixture.detectChanges();

    expect(tripService.getTrips).toHaveBeenCalled();
    expect(component.dataSource.data).toEqual(trips);
  });

  it('clears filters and reloads', () => {
    tripService.getTrips.and.returnValue(of([]));
    fixture.detectChanges();

    const loadSpy = spyOn(component, 'loadTrips');
    component.clearFilters();

    expect(loadSpy).toHaveBeenCalled();
    expect(component.filtersForm.getRawValue()).toEqual({
      status: [],
      priority: [],
      activity_level: [],
      search: '',
      distance_min: 0,
      distance_max: component.sliderMax,
    });
  });

  it('navigates to create and view routes', () => {
    tripService.getTrips.and.returnValue(of([]));
    fixture.detectChanges();

    component.openCreate();
    expect(router.navigate).toHaveBeenCalledWith(['/trips/new']);

    component.openView(42);
    expect(router.navigate).toHaveBeenCalledWith(['/trips', 42]);
  });

  it('deletes a trip after double confirmation and reloads', () => {
    tripService.getTrips.and.returnValue(of([]));
    fixture.detectChanges();

    confirmDialog.confirm.and.returnValue(of(true));
    tripService.deleteTrip.and.returnValue(of(void 0));

    const loadSpy = spyOn(component, 'loadTrips');

    component.deleteTrip(sampleTrip);

    expect(confirmDialog.confirm).toHaveBeenCalled();
    expect(tripService.deleteTrip).toHaveBeenCalledWith(1);
    expect(loadSpy).toHaveBeenCalled();
  });

  it('returns fire emojis for activity level', () => {
    expect(component.activityEmoji(3)).toBe('🔥🔥🔥');
    expect(component.activityEmoji(1)).toBe('🔥');
    expect(component.activityEmoji(5)).toBe('🔥🔥🔥🔥🔥');
  });

  it('computes dynamic slider max from trip distances', () => {
    const trips: Trip[] = [
      { ...sampleTrip, id: 1, distance_miles: 1200 },
      { ...sampleTrip, id: 2, distance_miles: 300 },
    ];
    tripService.getTrips.and.returnValue(of(trips));

    fixture.detectChanges();

    expect(component.sliderMax).toBe(1500);
  });

  it('falls back to 500 when all distances are null', () => {
    const trips: Trip[] = [
      { ...sampleTrip, id: 1, distance_miles: null },
      { ...sampleTrip, id: 2, distance_miles: undefined },
    ];
    tripService.getTrips.and.returnValue(of(trips));

    fixture.detectChanges();

    expect(component.sliderMax).toBe(500);
  });
});
