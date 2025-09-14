import { BrowserWindow, app, screen } from 'electron';
import * as path from 'path';
import { BoundsStore, WindowRole, Bounds } from './bounds-store';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

export class WindowRegistry {
  private store = new BoundsStore();
  private byRole = new Map<WindowRole, BrowserWindow>();

  resolveUrl(hash: string) {
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      return process.env.VITE_DEV_SERVER_URL + hash;
    }
    // Adjust renderer path according to your build
    return 'file://' + path.join(app.getAppPath(), 'dist', 'index.html') + hash;
  }

  get(role: WindowRole) {
    return this.byRole.get(role);
  }

  createOrShow(role: WindowRole, opts?: Electron.BrowserWindowConstructorOptions) {
    const existing = this.byRole.get(role);
    if (existing) {
      if (existing.isDestroyed()) {
        this.byRole.delete(role);
      } else {
        existing.show();
        existing.focus();
        return existing;
      }
    }

    const defaults: Electron.BrowserWindowConstructorOptions = {
      show: false,
      frame: true,
      backgroundColor: '#00000000',
      transparent: true, // CSSのみで透明化を扱う前提
      webPreferences: {
        preload: path.join(app.getAppPath(), 'dist', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    };

    const win = new BrowserWindow({ ...defaults, ...opts });
    this.byRole.set(role, win);

    // Bounds restore
    const saved = this.store.get(role);
    if (saved?.width && saved?.height) {
      win.setBounds({
        x: saved.x, y: saved.y, width: saved.width, height: saved.height
      });
    }
    if (saved?.maximized) win.maximize();

    // Persist bounds on move/resize
    const saveBounds = () => {
      const b = win.getBounds();
      const maximized = win.isMaximized();
      this.store.set(role, { ...b, maximized });
    };
    win.on('move', saveBounds);
    win.on('resize', saveBounds);
    win.on('maximize', saveBounds);
    win.on('unmaximize', saveBounds);

    // Hide-on-close for tool windows
    if (role === 'history' || role === 'summary') {
      win.on('close', (e) => {
        if (!win.isDestroyed()) {
          e.preventDefault();
          win.hide();
        }
      });
    } else {
      win.on('closed', () => this.byRole.delete(role));
    }

    return win;
  }

  // Setup dedicated helpers
  fitSetupTo(width: number, height: number) {
    const setup = this.get('setup');
    if (!setup) return;
    const disp = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const maxW = Math.min(width, disp.workArea.width);
    const maxH = Math.min(height, disp.workArea.height);
    setup.setSize(Math.max(320, Math.floor(maxW)), Math.max(200, Math.floor(maxH)));
    setup.center();
    setup.show();
  }

  reuseSetupAsMain() {
    const setup = this.get('setup');
    if (!setup) return;
    // restore previous main bounds
    const mainSaved = this.store.get('main');
    if (mainSaved?.width && mainSaved?.height) {
      setup.setBounds({
        x: mainSaved.x, y: mainSaved.y, width: mainSaved.width, height: mainSaved.height
      });
    }
    if (mainSaved?.maximized) setup.maximize();
    setup.loadURL(this.resolveUrl('#/main'));
    this.byRole.set('main', setup);
    this.byRole.delete('setup');
  }
}

export const windows = new WindowRegistry();
