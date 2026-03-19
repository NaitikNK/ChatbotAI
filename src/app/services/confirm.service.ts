import { Injectable, signal } from '@angular/core';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  visible = signal(false);
  config = signal<ConfirmConfig>({ title: '', message: '' });

  private resolveRef?: (value: boolean) => void;

  confirm(config: ConfirmConfig): Promise<boolean> {
    this.config.set({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'danger',
      ...config
    });
    this.visible.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolveRef = resolve;
    });
  }

  onConfirm(): void {
    this.visible.set(false);
    this.resolveRef?.(true);
  }

  onCancel(): void {
    this.visible.set(false);
    this.resolveRef?.(false);
  }
}
