import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';

import { ConfirmDialogComponent } from './confirm-dialog.component';
import { ConfirmDialogData } from './confirm-dialog.models';

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  constructor(private readonly dialog: MatDialog) {}

  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialogComponent, {
        width: '460px',
        disableClose: true,
        autoFocus: false,
        data,
      })
      .afterClosed()
      .pipe(map((confirmed) => Boolean(confirmed)));
  }
}
