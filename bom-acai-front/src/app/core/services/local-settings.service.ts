import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

import { DEFAULT_SETTINGS, LocalSettings } from '../models/local-settings.model';

class BomAcaiDb extends Dexie {
  settings!: Table<LocalSettings, number>;

  constructor() {
    super('bom-acai-pos');
    this.version(1).stores({ settings: 'id' });
  }
}

@Injectable({ providedIn: 'root' })
export class LocalSettingsService {
  private readonly db = new BomAcaiDb();

  async get(): Promise<LocalSettings> {
    return (await this.db.settings.get(1)) ?? { ...DEFAULT_SETTINGS };
  }

  async save(partial: Partial<Omit<LocalSettings, 'id'>>): Promise<void> {
    const current = await this.get();
    await this.db.settings.put({ ...current, ...partial, id: 1 });
  }
}
