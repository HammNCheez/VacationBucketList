import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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
  });

  saving = false;
  message = '';

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

    this.settingsService.updateSettings(this.form.getRawValue() as { home_city: string | null; home_zip: string | null }).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Settings saved.';
      },
      error: () => {
        this.saving = false;
        this.message = 'Could not save settings.';
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
        this.message = 'Could not export data.';
      },
    });
  }
}
