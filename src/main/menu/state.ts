import { Menu } from 'electron';

const UPDATE_MENU_ITEM_ID = 'check-for-updates';

export type UpdateMenuStatus = 'idle' | 'checking' | 'ready';

let updateReady = false;

export function isUpdateReady(): boolean {
  return updateReady;
}

export function setUpdateMenuStatus(status: UpdateMenuStatus): void {
  if (status === 'ready') updateReady = true;

  const menu = Menu.getApplicationMenu();
  if (!menu) return;

  const menuItem = menu.getMenuItemById(UPDATE_MENU_ITEM_ID);
  if (!menuItem) return;

  const config = {
    idle: { label: 'Check for Updates…', enabled: true },
    checking: { label: 'Checking for Updates…', enabled: false },
    ready: { label: 'Restart to Update…', enabled: true },
  }[status];

  menuItem.label = config.label;
  menuItem.enabled = config.enabled;
}

export { UPDATE_MENU_ITEM_ID };
