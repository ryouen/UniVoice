import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export type WindowRole = 'setup' | 'main' | 'history' | 'summary';

export interface Bounds {
  x?: number; y?: number; width?: number; height?: number;
  maximized?: boolean;
  displayId?: string | number;
}

type StoreShape = Record<WindowRole, Bounds | undefined>;

export class BoundsStore {
  private file: string;
  private cache: StoreShape = { setup: undefined, main: undefined, history: undefined, summary: undefined };

  constructor(filename = 'window-bounds.json') {
    this.file = path.join(app.getPath('userData'), filename);
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, 'utf-8');
        this.cache = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[BoundsStore] load failed:', e);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[BoundsStore] save failed:', e);
    }
  }

  get(role: WindowRole): Bounds | undefined {
    return this.cache[role];
  }

  set(role: WindowRole, bounds: Bounds) {
    this.cache[role] = bounds;
    this.save();
  }
}
