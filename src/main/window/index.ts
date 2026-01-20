import { screen } from 'electron';
import type { BrowserWindow } from 'electron';
import logger from 'electron-log/main';
import { settings } from '@main/db/queries';
import type { WindowState } from '@/types/settings';

const log = logger.scope('window');

const DEFAULT_WINDOW_STATE: WindowState = {
  bounds: { width: 1000, height: 600 },
  isMaximized: false,
};

export function loadWindowState(): WindowState {
  try {
    const stored = settings.get('windowState');
    if (!stored) return DEFAULT_WINDOW_STATE;

    const state: WindowState = JSON.parse(stored);
    const { bounds } = state;

    // If position was saved, validate it's visible on at least one display
    if (bounds.x !== undefined && bounds.y !== undefined) {
      const savedX = bounds.x;
      const savedY = bounds.y;
      const displays = screen.getAllDisplays();
      const isVisible = displays.some((display) => {
        const { x, y, width, height } = display.bounds;
        return savedX >= x && savedX < x + width && savedY >= y && savedY < y + height;
      });

      if (!isVisible) {
        log.debug('Saved window position is off-screen, centering window');
        return {
          bounds: { width: bounds.width, height: bounds.height },
          isMaximized: state.isMaximized,
        };
      }
    }

    return state;
  } catch (error) {
    log.warn('Failed to load window state:', error);
    return DEFAULT_WINDOW_STATE;
  }
}

function saveWindowState(window: BrowserWindow): void {
  if (window.isDestroyed()) return;

  try {
    const isMaximized = window.isMaximized();
    const bounds = isMaximized ? loadWindowState().bounds : window.getBounds();

    const state: WindowState = { bounds, isMaximized };
    settings.set('windowState', JSON.stringify(state));
  } catch (error) {
    log.warn('Failed to save window state:', error);
  }
}

const saveTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

function saveWindowStateDebounced(window: BrowserWindow): void {
  const existing = saveTimeouts.get(window.id);
  if (existing) clearTimeout(existing);
  saveTimeouts.set(
    window.id,
    setTimeout(() => {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      saveTimeouts.delete(window.id);
      saveWindowState(window);
    }, 500)
  );
}

export function trackWindowState(window: BrowserWindow): void {
  window.on('resize', () => saveWindowStateDebounced(window));
  window.on('move', () => saveWindowStateDebounced(window));
  window.on('maximize', () => saveWindowState(window));
  window.on('unmaximize', () => saveWindowState(window));
  window.on('close', () => saveWindowState(window));
}
