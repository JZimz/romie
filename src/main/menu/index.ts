import { app, Menu, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import { checkForUpdates, quitAndInstall } from '@main/updater';
import { isUpdateReady, UPDATE_MENU_ITEM_ID } from './state';

export { setUpdateMenuStatus } from './state';

function handleUpdateMenuClick(mainWindow: BrowserWindow): void {
  if (isUpdateReady()) {
    quitAndInstall();
  } else {
    checkForUpdates(mainWindow);
  }
}

export function initializeMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            {
              id: UPDATE_MENU_ITEM_ID,
              label: 'Check for Updates…',
              click: () => handleUpdateMenuClick(mainWindow),
            },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
          ],
        },
        {
          label: 'Help',
          submenu: [
            {
              label: 'Report an Issue',
              click: () => shell.openExternal('https://github.com/JZimz/romie/issues'),
            },
          ],
        },
      ]
    : [
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
          ],
        },
        {
          label: 'Help',
          submenu: [
            {
              label: 'About ROMie',
              click: () => app.showAboutPanel(),
            },
            {
              id: UPDATE_MENU_ITEM_ID,
              label: 'Check for Updates…',
              click: () => handleUpdateMenuClick(mainWindow),
            },
            { type: 'separator' },
            {
              label: 'Report an Issue',
              click: () => shell.openExternal('https://github.com/JZimz/romie/issues'),
            },
          ],
        },
      ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
