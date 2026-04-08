import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';

import { DEFAULT_SETTINGS, LocalSettings, PaperWidth } from '../../core/models/local-settings.model';
import { LocalSettingsService } from '../../core/services/local-settings.service';
import { TopbarComponent } from '../../shared/topbar/topbar.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectButtonModule,
    TagModule,
    TopbarComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  settings: LocalSettings = { ...DEFAULT_SETTINGS };
  saving = false;
  saved = false;

  readonly paperOptions: Array<{ label: string; value: PaperWidth }> = [
    { label: '58 mm', value: 58 },
    { label: '80 mm', value: 80 },
  ];

  constructor(
    private readonly localSettings: LocalSettingsService,
    private readonly messageService: MessageService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.settings = await this.localSettings.get();
  }

  get printerConfigured(): boolean {
    return !!this.settings.printerUrl.trim();
  }

  async save(): Promise<void> {
    this.saving = true;
    this.saved = false;

    try {
      const printerUrl = this.settings.printerUrl.trim();

      if (printerUrl && !this.isLocalQzUrl(printerUrl)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Configuraci\u00f3n',
          detail: 'QZ Tray solo debe configurarse con una URL local de localhost o 127.0.0.1.',
        });
        return;
      }

      await this.localSettings.save({
        paperWidth: this.settings.paperWidth,
        printerUrl,
      });
      this.saved = true;
      this.messageService.add({
        severity: 'success',
        summary: 'Configuraci\u00f3n',
        detail: 'Ajustes guardados correctamente.',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Configuraci\u00f3n',
        detail: 'No se pudieron guardar los ajustes.',
      });
    } finally {
      this.saving = false;
    }
  }

  private isLocalQzUrl(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return ['localhost', 'localhost.qz.io', '127.0.0.1', '::1'].includes(hostname);
    } catch {
      return false;
    }
  }
}
