import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { TripDetailComponent } from './trip-detail.component';
import { TripService } from '../../core/services/trip.service';
import { PeopleService } from '../../core/services/people.service';
import { SettingsService } from '../../core/services/settings.service';
import { Settings } from '../../core/models/settings.model';
import { Trip, TripCreate } from '../../core/models/trip.model';
import { Person } from '../../core/models/person.model';

const mockSettings = (overrides?: Partial<Settings>): Settings => ({
  home_city: null,
  home_zip: null,
  ors_api_key: null,
  ors_api_key_source: 'none',
  ors_api_key_from_environment: false,
  ...overrides,
});

describe('TripDetailComponent', () => {
  let fixture: ComponentFixture<TripDetailComponent>;
  let component: TripDetailComponent;
  let tripService: jasmine.SpyObj<TripService>;
  let peopleService: jasmine.SpyObj<PeopleService>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let router: jasmine.SpyObj<Router>;

  const createComponent = async (tripId?: number) => {
    tripService = jasmine.createSpyObj('TripService', [
      'getTrip',
      'createTrip',
      'updateTrip',
      'getAutocomplete',
    ]);
    peopleService = jasmine.createSpyObj('PeopleService', ['list']);
    settingsService = jasmine.createSpyObj('SettingsService', ['getSettings']);
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
        { provide: SettingsService, useValue: settingsService },
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
    settingsService.getSettings.and.returnValue(of(mockSettings()));
    tripService.getAutocomplete.and.callFake((field) =>
      field === 'target_date_range' ? of(['Late Summer']) : of(['Beach'])
    );

    fixture.detectChanges();

    expect(peopleService.list).toHaveBeenCalled();
    expect(tripService.getAutocomplete).toHaveBeenCalledWith('target_date_range');
    expect(tripService.getAutocomplete).toHaveBeenCalledWith('trip_type');
    expect(settingsService.getSettings).toHaveBeenCalled();
    expect(component.availablePeople.length).toBe(1);
    expect(component.targetDateRangeOptions).toEqual(['Late Summer']);
    expect(component.tripTypeOptions).toEqual(['Beach']);
  });

  it('prefills origin from settings on new trip', async () => {
    await createComponent();

    peopleService.list.and.returnValue(of([]));
    tripService.getAutocomplete.and.returnValue(of([]));
    settingsService.getSettings.and.returnValue(of(mockSettings({ home_city: 'Seattle', home_zip: '98101' })));

    fixture.detectChanges();

    expect(component.form.get('origin')?.value).toBe('Seattle');
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
    settingsService.getSettings.and.returnValue(of(mockSettings({ home_city: 'Seattle' })));
    tripService.getAutocomplete.and.callFake((field) =>
      field === 'target_date_range' ? of(['Early Summer']) : of(['Food'])
    );
    tripService.getTrip.and.returnValue(of(trip));

    fixture.detectChanges();

    expect(tripService.getTrip).toHaveBeenCalledWith(12);
    expect(component.form.get('title')?.value).toBe('Rome');
    expect(component.form.get('activity_level')?.value).toBe(2);
    expect(component.costItemControls.length).toBe(1);
    expect(component.commentControls.length).toBe(1);
    expect(component.targetDateRangeControl.value).toBe('Early Summer');
    expect(component.tripTypes).toEqual(['Food']);
    expect(component.dateModeControl.value).toBe('exact');
    expect(settingsService.getSettings).not.toHaveBeenCalled();
  });

  it('creates a trip on save when new', async () => {
    await createComponent();

    peopleService.list.and.returnValue(of([]));
    settingsService.getSettings.and.returnValue(of(mockSettings()));
    tripService.getAutocomplete.and.returnValue(of([]));
    tripService.createTrip.and.returnValue(of({} as Trip));

    fixture.detectChanges();

    component.form.patchValue({
      title: 'Kyoto',
      location: 'Japan',
    });
    component.tripTypes = ['Cultural'];
    component.targetDateRangeControl.setValue('Spring');

    component.save();

    expect(tripService.createTrip).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Kyoto',
        location: 'Japan',
        activity_level: 1,
        trip_types: ['Cultural'],
        target_date_range: 'Spring',
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/trips']);
  });

  it('omits travel_time_hours when left blank on save', async () => {
    await createComponent();

    peopleService.list.and.returnValue(of([]));
    settingsService.getSettings.and.returnValue(of(mockSettings()));
    tripService.getAutocomplete.and.returnValue(of([]));
    tripService.createTrip.and.returnValue(of({} as Trip));

    fixture.detectChanges();

    component.form.patchValue({
      title: 'Kyoto',
      location: 'Japan',
      travel_time_hours: null,
    });
    component.tripTypes = ['Culture'];
    component.save();

    const payload = tripService.createTrip.calls.mostRecent().args[0] as TripCreate;
    expect(payload.travel_time_hours).toBeUndefined();
  });

  it('supports case-insensitive trip type dedupe and activity selection', async () => {
    await createComponent();

    peopleService.list.and.returnValue(of([]));
    settingsService.getSettings.and.returnValue(of(mockSettings()));
    tripService.getAutocomplete.and.returnValue(of(['Beach']));

    fixture.detectChanges();

    component.addTripType('Beach');
    component.addTripType('beach');
    component.setActivityLevel(4);

    expect(component.tripTypes).toEqual(['Beach']);
    expect(component.form.get('activity_level')?.value).toBe(4);
  });

  it('adds people from existing options only', async () => {
    await createComponent();

    peopleService.list.and.returnValue(
      of([
        { id: 1, name: 'Sam' },
        { id: 2, name: 'Jordan' },
      ] as Person[])
    );
    settingsService.getSettings.and.returnValue(of(mockSettings()));
    tripService.getAutocomplete.and.returnValue(of([]));

    fixture.detectChanges();

    component.addPersonById(2);

    expect(component.selectedPersonIds).toEqual([2]);
    expect(component.selectedPeople.map((person) => person.name)).toEqual(['Jordan']);
  });

  it('does not add unknown people id from input', async () => {
    await createComponent();

    peopleService.list.and.returnValue(of([{ id: 1, name: 'Sam' }]));
    settingsService.getSettings.and.returnValue(of(mockSettings()));
    tripService.getAutocomplete.and.returnValue(of([]));

    fixture.detectChanges();

    component.addPersonById(999);

    expect(component.selectedPersonIds).toEqual([]);
  });

  it('maps date payload based on selected mode', async () => {
    await createComponent();

    peopleService.list.and.returnValue(of([]));
    settingsService.getSettings.and.returnValue(of(mockSettings()));
    tripService.getAutocomplete.and.returnValue(of([]));
    tripService.createTrip.and.returnValue(of({} as Trip));

    fixture.detectChanges();

    component.form.patchValue({
      title: 'Lisbon',
      location: 'Portugal',
      target_date_start: '2026-06-01',
      target_date_end: '2026-06-12',
    });
    component.targetDateRangeControl.setValue('Summer 2026');

    component.setDateMode('exact');
    component.save();

    const exactPayload = tripService.createTrip.calls.mostRecent().args[0] as TripCreate;
    expect(exactPayload.target_date_start).toBe('2026-06-01');
    expect(exactPayload.target_date_end).toBe('2026-06-12');
    expect(exactPayload.target_date_range).toBeNull();

    component.setDateMode('range');
    component.save();

    const rangePayload = tripService.createTrip.calls.mostRecent().args[0] as TripCreate;
    expect(rangePayload.target_date_start).toBeNull();
    expect(rangePayload.target_date_end).toBeNull();
    expect(rangePayload.target_date_range).toBe('Summer 2026');
  });

  it('updates a trip on save when editing', async () => {
    await createComponent(3);

    peopleService.list.and.returnValue(of([]));
    settingsService.getSettings.and.returnValue(of(mockSettings({ home_city: 'Ignored' })));
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
    expect(router.navigate).toHaveBeenCalledWith(['/trips', 3]);
  });
});
