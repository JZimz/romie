# Syncing

## Running a sync

1. Make sure your SD card is plugged in.
2. Open your device from the **Devices** section.
3. Select one or more tags to sync, these are the games that will be copied.
4. Click **Sync**.

ROMie shows live progress as it copies files. You can cancel mid-sync if needed and it'll stop cleanly.

## Sync options

**Clean destination**: deletes all existing ROMs on the SD card before copying. Use this if you want the SD card to exactly match your selected tags with no leftover files. Leave it off if you just want to add new games without touching what's already there.

**Verify files**: after copying each file, ROMie checks the copy against the original to make sure it transferred correctly. Slower, but catches any bad copies. Good to run occasionally or if you're using a finicky SD card.

**Clean filenames**: renames files on the SD card to match the game's display name instead of the original filename. So instead of `Super_Mario_Bros_(U)_[!].nes` you'd get `Super Mario Bros.nes`. Purely cosmetic, this only affects how the name looks in your device's menu.

## Understanding sync results

After a sync completes, ROMie shows a summary:

- **Copied**: files that were successfully transferred
- **Skipped**: files that were skipped, with a reason for each:
  - _Already exists_, the file was already on the SD card and didn't need to be copied again
  - _Unsupported system_, your device's firmware profile doesn't support that console
  - _Unsupported format_, the file format isn't supported by that profile (e.g. a `.7z` when the profile only accepts `.nes`)
  - _Drive disconnected_, the original ROM file is on a drive that isn't currently plugged in
- **Failed**: files that couldn't be copied, usually a permissions or disk space issue

## Tips

If a game keeps showing as "unsupported format", check the [Supported Systems](/reference/supported-systems) page to see which formats your device's firmware accepts. You may need a different ROM format for that game.

If you're getting "drive disconnected" skips, those ROMs live on an external drive that isn't plugged in. Plug it in and re-run the sync.
