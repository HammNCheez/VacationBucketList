import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-autocomplete-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './autocomplete-input.component.html',
  styleUrl: './autocomplete-input.component.scss',
})
export class AutocompleteInputComponent {
  @Input() label = 'Value';
  @Input() placeholder = '';
  @Input() options: string[] = [];
  @Input() control: FormControl<string | null> = new FormControl<string>('');
  @Output() valueSelected = new EventEmitter<string>();

  get filteredOptions(): string[] {
    const value = (this.control.value ?? '').toLowerCase().trim();
    if (!value) {
      return this.options;
    }
    return this.options.filter((option) => option.toLowerCase().includes(value));
  }

  onOptionSelected(value: string): void {
    this.valueSelected.emit(value);
  }
}
