import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { TripListComponent } from './trip-list.component';
import { TripService } from '../../core/services/trip.service';
import { Trip } from '../../core/models/trip.model';

describe('TripListComponent', () => {
  let fixture: ComponentFixture<TripListComponent>;
  let component: TripListComponent;
  let tripService: jasmine.SpyObj<TripService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    tripService = jasmine.createSpyObj('TripService', ['getTrips', 'deleteTrip']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TripListComponent, NoopAnimationsModule],
      providers: [
        { provide: TripService, useValue: tripService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TripListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads trips on init', () => {
    const trips: Trip[] = [
      {
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
      },
    ];

    tripService.getTrips.and.returnValue(of(trips));

    fixture.detectChanges();

    expect(tripService.getTrips).toHaveBeenCalledWith({
      status: [],
      priority: [],
      activity_level: [],
      search: undefined,
      distance_min: null,
      distance_max: null,
    });
    expect(component.trips).toEqual(trips);
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
      distance_min: null,
      distance_max: null,
    });
  });

  it('navigates to create and edit routes', () => {
    tripService.getTrips.and.returnValue(of([]));
    fixture.detectChanges();

    component.openCreate();
    expect(router.navigate).toHaveBeenCalledWith(['/trips/new']);

    component.openEdit(42);
    expect(router.navigate).toHaveBeenCalledWith(['/trips', 42]);
  });

  it('deletes a trip and reloads', () => {
    tripService.getTrips.and.returnValue(of([]));
    tripService.deleteTrip.and.returnValue(of(void 0));
    fixture.detectChanges();

    const loadSpy = spyOn(component, 'loadTrips');

    component.deleteTrip(7);

    expect(tripService.deleteTrip).toHaveBeenCalledWith(7);
    expect(loadSpy).toHaveBeenCalled();
  });
});
