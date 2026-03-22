# FAQ

## Why didn't my game get a name after importing?

ROMie matches games by hashing the file and looking it up in the RetroAchievements database. If a game doesn't match, it's usually because:

- The ROM is a patched, hacked, or regional variant that isn't in the RA database
- The file was renamed or modified

The game still gets added to your library with the filename as the title. You can manually edit the display name by opening the game and clicking the title.

## Some games were skipped during sync, why?

Check the sync results summary for the skip reason. Common ones:

- **Already exists**: the file was already on the SD card. Not a problem, it was just skipped to avoid a redundant copy.
- **Unsupported system**: your device's firmware profile doesn't include that console. Check [Supported Devices](/devices/supported-devices).
- **Unsupported format**: the file format isn't in the profile's accepted list for that system. You may need a different ROM format.
- **Drive disconnected**: the ROM is on a drive that isn't plugged in right now.

## My SD card path changed, what do I do?

Open the device in ROMie, click edit, and update the mount path to the new location. This happens sometimes on Windows when a drive letter changes, or on macOS after a restart.

## Can I use ROMie with multiple SD cards for the same device?

Yes. Just add a device entry for each SD card. Give them distinct names like "MiyooMini Main" and "MiyooMini Backup" and point each one at the right mount path when you're ready to sync.

## Will syncing delete games already on my SD card?

Only if you enable the **Clean destination** option before syncing. With that off (the default), ROMie only adds files, it never removes what's already there.

## Can I back up my library?

Yes. Go to **Settings → Database** and click **Export Backup**. This saves a `.zip` file with your full library database including tags, device profiles, and settings. To restore it later, use **Import Backup** from the same screen. ROMie will restart and load your backed-up data.

## Where does ROMie store its data?

ROMie keeps everything in a local database on your machine. Nothing is sent to a cloud service. The only external connections ROMie makes are to the RetroAchievements API (for game metadata and achievements, if you've set that up) and to GitHub to check for app updates.

## ROMie won't start / something is broken

Try **Settings → Database → Reset Database** as a last resort. This clears your library and settings but won't touch your actual ROM files. If you have a backup, you can restore it immediately after.

If something is consistently broken, please [open an issue on GitHub](https://github.com/JZimz/romie/issues) with details about what happened.
