import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Person } from '../../core/models/person.model';
import { PeopleService } from '../../core/services/people.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './people.component.html',
  styleUrl: './people.component.scss',
})
export class PeopleComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
  });

  people: Person[] = [];
  errorMessage = '';

  constructor(
    private readonly peopleService: PeopleService,
    private readonly confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.loadPeople();
  }

  addPerson(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const name = this.form.getRawValue().name?.trim();
    if (!name) {
      return;
    }

    this.peopleService.create({ name }).subscribe({
      next: () => {
        this.form.reset();
        this.loadPeople();
      },
      error: () => {
        this.errorMessage = 'Could not add person.';
      },
    });
  }

  deletePerson(person: Person): void {
    this.confirmDialog
      .confirm({
        message: `Are you sure you want to delete ${person.name}?`,
        detail: `${person.name} will be removed from all trips they are associated with.`,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.peopleService.delete(person.id).subscribe({
          next: () => this.loadPeople(),
          error: () => {
            this.errorMessage = 'Could not delete person.';
          },
        });
      });
  }

  private loadPeople(): void {
    this.peopleService.list().subscribe({
      next: (people) => {
        this.errorMessage = '';
        this.people = people;
      },
      error: () => {
        this.errorMessage = 'Could not load people.';
      },
    });
  }
}
