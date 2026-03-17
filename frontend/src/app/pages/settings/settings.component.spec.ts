import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { SettingsComponent } from './settings.component';
import { SettingsService } from '../../core/services/settings.service';
import { ExportPayload, RestoreResponse } from '../../core/models/settings.model';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let settingsService: jasmine.SpyObj<SettingsService>;

  beforeEach(async () => {
    settingsService = jasmine.createSpyObj('SettingsService', [
      'getSettings',
      'updateSettings',
      'exportData',
      'restoreData',
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
    settingsService.getSettings.and.returnValue(
      of({ home_city: 'Austin', home_zip: '78701', ors_api_key: 'abc123' })
    );

    fixture.detectChanges();

    expect(settingsService.getSettings).toHaveBeenCalled();
    expect(component.form.get('home_city')?.value).toBe('Austin');
    expect(component.form.get('ors_api_key')?.value).toBe('abc123');
  });

  it('saves settings', () => {
    settingsService.getSettings.and.returnValue(
      of({ home_city: null, home_zip: null, ors_api_key: null })
    );
    settingsService.updateSettings.and.returnValue(
      of({ home_city: 'Paris', home_zip: '75001', ors_api_key: 'ors-key-1' })
    );

    fixture.detectChanges();

    component.form.patchValue({
      home_city: 'Paris',
      home_zip: '75001',
      ors_api_key: 'ors-key-1',
    });
    component.save();

    expect(settingsService.updateSettings).toHaveBeenCalledWith({
      home_city: 'Paris',
      home_zip: '75001',
      ors_api_key: 'ors-key-1',
    });
    expect(component.message).toBe('Settings saved.');
  });

  it('exports data as a download', () => {
    settingsService.getSettings.and.returnValue(
      of({ home_city: null, home_zip: null, ors_api_key: null })
    );

    const payload: ExportPayload = {
      schema_version: '1',
      exported_at: '2026-01-01T00:00:00Z',
      trips: [],
      people: [],
      settings: { home_city: null, home_zip: null, ors_api_key: null },
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

  it('restores data from selected file', () => {
    settingsService.getSettings.and.returnValue(
      of({ home_city: null, home_zip: null, ors_api_key: null })
    );

    const restoreResponse: RestoreResponse = {
      schema_version: '1.0',
      restored_at: '2026-03-16T00:00:00Z',
      restored_trips: 3,
      restored_people: 2,
    };
    settingsService.restoreData.and.returnValue(of(restoreResponse));

    fixture.detectChanges();

    const file = new File(['{}'], 'export.json', { type: 'application/json' });
    component.selectedRestoreFile = file;
    component.restoreFromFile();

    expect(settingsService.restoreData).toHaveBeenCalledWith(file);
    expect(component.restoreMessage).toContain('Restore complete: 3 trips and 2 people.');
  });
});
