import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { SettingsComponent } from './settings.component';
import { SettingsService } from '../../core/services/settings.service';
import { ExportPayload } from '../../core/models/settings.model';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let settingsService: jasmine.SpyObj<SettingsService>;

  beforeEach(async () => {
    settingsService = jasmine.createSpyObj('SettingsService', [
      'getSettings',
      'updateSettings',
      'exportData',
    ]);

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, NoopAnimationsModule],
      providers: [{ provide: SettingsService, useValue: settingsService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads settings on init', () => {
    settingsService.getSettings.and.returnValue(of({ home_city: 'Austin', home_zip: '78701' }));

    fixture.detectChanges();

    expect(settingsService.getSettings).toHaveBeenCalled();
    expect(component.form.get('home_city')?.value).toBe('Austin');
  });

  it('saves settings', () => {
    settingsService.getSettings.and.returnValue(of({ home_city: null, home_zip: null }));
    settingsService.updateSettings.and.returnValue(of({ home_city: 'Paris', home_zip: '75001' }));

    fixture.detectChanges();

    component.form.patchValue({ home_city: 'Paris', home_zip: '75001' });
    component.save();

    expect(settingsService.updateSettings).toHaveBeenCalledWith({
      home_city: 'Paris',
      home_zip: '75001',
    });
    expect(component.message).toBe('Settings saved.');
  });

  it('exports data as a download', () => {
    settingsService.getSettings.and.returnValue(of({ home_city: null, home_zip: null }));

    const payload: ExportPayload = {
      schema_version: '1',
      exported_at: '2026-01-01T00:00:00Z',
      trips: [],
      people: [],
      settings: { home_city: null, home_zip: null },
    };

    settingsService.exportData.and.returnValue(of(payload));

    const originalCreateElement = document.createElement.bind(document);
    const clickSpy = jasmine.createSpy('click');

    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        (element as HTMLAnchorElement).click = clickSpy;
      }
      return element;
    });

    const createUrlSpy = spyOn(globalThis.URL, 'createObjectURL').and.returnValue('blob:export');
    const revokeUrlSpy = spyOn(globalThis.URL, 'revokeObjectURL');

    fixture.detectChanges();

    component.exportData();

    expect(settingsService.exportData).toHaveBeenCalled();
    expect(createUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalled();
  });
});
