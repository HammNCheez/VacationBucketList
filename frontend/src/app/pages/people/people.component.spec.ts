import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { PeopleComponent } from './people.component';
import { PeopleService } from '../../core/services/people.service';
import { Person } from '../../core/models/person.model';

describe('PeopleComponent', () => {
  let fixture: ComponentFixture<PeopleComponent>;
  let component: PeopleComponent;
  let peopleService: jasmine.SpyObj<PeopleService>;

  beforeEach(async () => {
    peopleService = jasmine.createSpyObj('PeopleService', ['list', 'create', 'delete']);

    await TestBed.configureTestingModule({
      imports: [PeopleComponent, NoopAnimationsModule],
      providers: [{ provide: PeopleService, useValue: peopleService }],
    }).compileComponents();

    fixture = TestBed.createComponent(PeopleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads people on init', () => {
    const people: Person[] = [{ id: 1, name: 'Morgan' }];
    peopleService.list.and.returnValue(of(people));

    fixture.detectChanges();

    expect(peopleService.list).toHaveBeenCalled();
    expect(component.people).toEqual(people);
  });

  it('adds a person and reloads', () => {
    peopleService.list.and.returnValue(of([]));
    peopleService.create.and.returnValue(of({ id: 2, name: 'Tanya' }));

    fixture.detectChanges();

    component.form.patchValue({ name: 'Tanya' });
    component.addPerson();

    expect(peopleService.create).toHaveBeenCalledWith({ name: 'Tanya' });
    expect(peopleService.list).toHaveBeenCalledTimes(2);
  });

  it('deletes a person and reloads', () => {
    peopleService.list.and.returnValue(of([]));
    peopleService.delete.and.returnValue(of(void 0));

    fixture.detectChanges();

    component.deletePerson(9);

    expect(peopleService.delete).toHaveBeenCalledWith(9);
    expect(peopleService.list).toHaveBeenCalledTimes(2);
  });
});
