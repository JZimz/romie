# Importing ROMs

## How it works

Click **Import ROMs** and select a folder. ROMie scans it recursively, so if your ROMs are organized into subfolders by system, that works fine. It looks at each file, identifies the system based on the file extension, and attempts to match it against the RetroAchievements game database to pull in the game's name and metadata.

Games that match get a display name and achievement data. Games that don't match still get added. They'll just show their filename as the title.

## Supported formats

ROMie supports the most common ROM formats for each system, including compressed files (`.zip`, `.7z`). Check the [Supported Systems](/reference/supported-systems) page for the full list.

## Re-importing and refreshing

You can import from multiple folders. ROMie won't create duplicates as long as the file paths are the same. If you add new ROMs to a folder you've already imported, just run import again and it'll pick up the new files.

If you move your ROMs to a different drive or folder, use **Refresh Library** to check which files are still accessible. Games on disconnected drives are flagged but not deleted from your library. They'll show up again automatically when the drive is reconnected.

## Removing games

To remove a game from your library, open it and hit **Remove**. This removes it from ROMie's database but doesn't touch the actual file on disk.
