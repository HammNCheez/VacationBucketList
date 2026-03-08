import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { TripDetailComponent } from './trip-detail.component';
import { TripService } from '../../core/services/trip.service';
import { PeopleService } from '../../core/services/people.service';
import { Trip } from '../../core/models/trip.model';
import { Person } from '../../core/models/person.model';

describe('TripDetailComponent', () => {
  let fixture: ComponentFixture<TripDetailComponent>;
  let component: TripDetailComponent;
  let tripService: jasmine.SpyObj<TripService>;
  let peopleService: jasmine.SpyObj<PeopleService>;
  let router: jasmine.SpyObj<Router>;

  const createComponent = async (tripId?: number) => {
    tripService = jasmine.createSpyObj('TripService', [
      'getTrip',
      'createTrip',
      'updateTrip',
      'getAutocomplete',
    ]);
    peopleService = jasmine.createSpyObj('PeopleService', ['list']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    const route = {
      snapshot: {
        paramMap: convertToParamMap(tripId ? { id: String(tripId) } : {}),
      },
    } as ActivatedRoute;

    await TestBed.configureTestingModule({
      imports: [TripDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: TripService, useValue: tripService },
        { provide: PeopleService, useValue: peopleService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TripDetailComponent);
    component = fixture.componentInstance;
  };

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('loads people and autocomplete options on init', async () => {
    await createComponent();

    peopleService.list.and.returnValue(of([{ id: 1, name: 'Sam' } as Person]));
    tripService.getAutocomplete.and.returnValue(of(['Late Summer']));

    fixture.detectChanges();

    expect(peopleService.list).toHaveBeenCalled();
    expect(tripService.getAutocomplete).toHaveBeenCalledWith('target_date_range');
    expect(component.availablePeople.length).toBe(1);
    expect(component.targetDateRangeOptions).toEqual(['Late Summer']);
  });

  it('loads trip data when editing', async () => {
    await createComponent(12);

    const trip: Trip = {
      id: 12,
      title: 'Rome',
      location: 'Italy',
      origin: 'Home',
      status: 'Booked',
      priority: 'Want-to',
      trip_types: ['Food'],
      activity_level: 2,
      travel_time_hours: 8,
      duration_days: 5,
      total_trip_length: '5 days',
      target_date_start: '2026-06-01',
      target_date_end: '2026-06-06',
      target_date_range: 'Early Summer',
      notes: 'Remember tickets',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      cost_items: [{ category: 'Flights', amount: 500, currency: 'USD' }],
      comments: [{ body: 'Check hotels', url: 'https://example.com' }],
      people: [{ id: 5, name: 'Jordan' }],
    };

    peopleService.list.and.returnValue(of([{ id: 5, name: 'Jordan' }]));
    tripService.getAutocomplete.and.returnValue(of(['Early Summer']));
    tripService.getTrip.and.returnValue(of(trip));

    fixture.detectChanges();

    expect(tripService.getTrip).toHaveBeenCalledWith(12);
    expect(component.form.get('title')?.value).toBe('Rome');
    expect(component.form.get('activity_level')?.value).toBe(2);
    expect(component.costItemControls.length).toBe(1);
    expect(component.commentControls.length).toBe(1);
    expect(component.targetDateRangeControl.value).toBe('Early Summer');
  });

  it('creates a trip on save when new', async () => {
    await createComponent();

    peopleService.list.and.returnValue(of([]));
    tripService.getAutocomplete.and.returnValue(of([]));
    tripService.createTrip.and.returnValue(of({} as Trip));

    fixture.detectChanges();

    component.form.patchValue({
      title: 'Kyoto',
      location: 'Japan',
      trip_types_text: 'Cultural',
    });
    component.targetDateRangeControl.setValue('Spring');

    component.save();

    expect(tripService.createTrip).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Kyoto',
        location: 'Japan',
        activity_level: 3,
        trip_types: ['Cultural'],
        target_date_range: 'Spring',
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/trips']);
  });

  it('updates a trip on save when editing', async () => {
    await createComponent(3);

    peopleService.list.and.returnValue(of([]));
    tripService.getAutocomplete.and.returnValue(of([]));
    tripService.getTrip.and.returnValue(
      of({
        id: 3,
        title: 'Oslo',
        location: 'Norway',
        status: 'Wishlist',
        priority: 'Must-do',
        trip_types: [],
        activity_level: 1,
        travel_time_hours: 0,
        duration_days: 0,
        total_trip_length: '0 days',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        cost_items: [],
        comments: [],
        people: [],
      } as Trip)
    );
    tripService.updateTrip.and.returnValue(of({} as Trip));

    fixture.detectChanges();

    component.form.patchValue({
      title: 'Oslo Updated',
      location: 'Norway',
    });

    component.save();

    expect(tripService.updateTrip).toHaveBeenCalledWith(
      3,
      jasmine.objectContaining({
        title: 'Oslo Updated',
        location: 'Norway',
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/trips']);
  });
});
