# Supported Gaming Systems

ROMie supports the following gaming systems with automatic ROM detection and organization.

### Nintendo Consoles
- **NES** (Nintendo Entertainment System, 1985) - `.nes`
- **SNES** (Super Nintendo Entertainment System, 1990) - `.sfc`, `.snes`
- **N64** (Nintendo 64, 1996) - `.n64`, `.v64`, `.z64`
- **Virtual Boy** (Nintendo Virtual Boy, 1995) - `.vb`

### Nintendo Handhelds
- **Game Boy** (Nintendo Game Boy, 1989) - `.gb`, `.dmg`
- **Game Boy Color** (Nintendo Game Boy Color, 1998) - `.gbc`, `.gb`
- **Game Boy Advance** (Nintendo Game Boy Advance, 2001) - `.gba` 
- **Nintendo DS** (Nintendo DS, 2004) - `.nds`

### Sega Systems
- **Genesis** (Sega Genesis / Mega Drive, 1988) - `.md`, `.gen`, `.smd`
- **Master System** (Sega Master System, 1986) - `.sms`
- **Game Gear** (Sega Game Gear, 1990) - `.gg`

### Atari Systems
- **Atari 2600** (Atari 2600, 1977) - `.a26`
- **Lynx** (Atari Lynx, 1989) - `.lnx`

### Other Systems
- **Neo Geo Pocket** (SNK Neo Geo Pocket, 1998) - `.ngp`, `.ngc`
- **Arcade** (MAME, 1971+) - `.zip`

## Archive Files (ZIP/7Z)
ROMie supports compressed ROM files in `.zip` and `.7z` formats with automatic detection:
- **Import**: ROMie looks inside archives and processes single ROM files for system detection and RetroAchievements verification
- **Storage**: Archive files remain compressed in your library
- **Sync**: Compressed files are copied to your device as-is (not extracted)
- **Requirement**: Archives must contain exactly one supported ROM file

This saves storage space while maintaining compatibility with most emulators that can read compressed ROMs directly.

## Known Issues
**PlayStation (PSX)** is temporarily unsupported due to multi-disc game complexity. [Track progress →](https://github.com/JZimz/romie/issues/4)

**Nintendo DS** games work for syncing but cannot be verified for RetroAchievements progress. [Track progress →](https://github.com/JZimz/romie/issues/28)

## Missing a System?
Don't see your favorite gaming system listed? [Open an issue](https://github.com/jzimz/romie/issues) and let me know what you'd like added.

Many systems may already work but just haven't been tested yet. Including details like:
- System name and manufacturer
- Common ROM file extensions
- Whether it requires BIOS files

This helps prioritize which systems to add next!
