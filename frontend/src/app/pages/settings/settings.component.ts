import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { Settings } from '../../core/models/settings.model';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    home_city: [''],
    home_zip: [''],
    ors_api_key: [''],
  });

  saving = false;
  message = '';
  messageIsSuccess = true;
  restoreMessage = '';
  restoreError = '';
  restoring = false;
  selectedRestoreFile: File | null = null;

  constructor(
    private readonly settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.form.patchValue(settings);
      },
    });
  }

  save(): void {
    this.saving = true;
    this.message = '';
    this.messageIsSuccess = true;

    this.settingsService.updateSettings(this.form.getRawValue() as Settings).subscribe({
      next: () => {
        this.saving = false;
        this.messageIsSuccess = true;
        this.message = 'Settings saved.';
      },
      error: () => {
        this.saving = false;
        this.messageIsSuccess = false;
        this.message = 'Could not save settings.';
      },
    });
  }

  onRestoreFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedRestoreFile = input.files?.[0] ?? null;
    this.message = '';
    this.restoreMessage = '';
    this.restoreError = '';
  }

  restoreFromFile(): void {
    if (!this.selectedRestoreFile) {
      this.restoreError = 'Please choose an export JSON file first.';
      return;
    }

    this.restoring = true;
    this.restoreError = '';
    this.restoreMessage = '';

    this.settingsService.restoreData(this.selectedRestoreFile).subscribe({
      next: (result) => {
        this.restoring = false;
        this.message = '';
        this.restoreMessage = `Restore complete: ${result.restored_trips} trips and ${result.restored_people} people.`;
      },
      error: () => {
        this.restoring = false;
        this.restoreError = 'Could not restore data from this file.';
      },
    });
  }

  exportData(): void {
    this.settingsService.exportData().subscribe({
      next: (payload) => {
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        });
        const url = globalThis.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `vacations-export-${date}.json`;
        link.click();
        globalThis.URL.revokeObjectURL(url);
      },
      error: () => {
        this.messageIsSuccess = false;
        this.message = 'Could not export data.';
      },
    });
  }
}
