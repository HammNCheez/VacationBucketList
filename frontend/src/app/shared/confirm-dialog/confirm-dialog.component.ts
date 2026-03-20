import { Component, Inject, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ConfirmDialogData } from './confirm-dialog.models';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent implements OnDestroy {
  readonly data: Required<Pick<ConfirmDialogData, 'confirmText' | 'cancelText'>> & ConfirmDialogData;

  remainingSeconds = 0;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) dialogData: ConfirmDialogData
  ) {
    this.data = {
      confirmText: 'Delete',
      cancelText: 'Cancel',
      ...dialogData,
    };

    const delay = Math.max(0, dialogData.confirmDelaySeconds ?? 0);
    if (delay > 0) {
      this.startCountdown(delay);
    }
  }

  get isConfirmDisabled(): boolean {
    return this.remainingSeconds > 0;
  }

  get confirmLabel(): string {
    if (!this.isConfirmDisabled) {
      return this.data.confirmText;
    }

    return `${this.data.confirmText} (${this.remainingSeconds}s)`;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    if (this.isConfirmDisabled) {
      return;
    }

    this.dialogRef.close(true);
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  private startCountdown(seconds: number): void {
    this.remainingSeconds = seconds;
    this.countdownTimer = setInterval(() => {
      if (this.remainingSeconds <= 1) {
        this.remainingSeconds = 0;
        this.clearCountdown();
        return;
      }

      this.remainingSeconds -= 1;
    }, 1000);
  }

  private clearCountdown(): void {
    if (!this.countdownTimer) {
      return;
    }

    clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }
}
