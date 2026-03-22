# Devices Overview

A device in ROMie represents an SD card paired with a firmware profile. The profile tells ROMie where to put files and which formats are supported for that firmware.

## How it works

Different retro handheld firmwares expect ROMs in different folder structures. Onion OS on a MiyooMini+ wants NES games in `/Roms/FC/`. muOS on an RG35XX wants them in `/ROMS/nes/`. ROMie handles all of that automatically. You just pick the right profile when setting up a device.

When you sync, ROMie:

1. Looks at which tags you selected
2. Finds all games with those tags
3. Checks each game against the profile, skipping systems or file formats the device doesn't support
4. Copies the files to the correct folders on your SD card

## Device profiles

ROMie ships with built-in profiles for the most popular firmwares:

- **Onion OS**: for MiyooMini and MiyooMini+
- **muOS**: for RG35XX and similar Anbernic devices
- **Knulli**: for a range of Anbernic and other ARM handhelds
- **RetroArch**: generic profile for any device running standard RetroArch

You can also create a custom profile if your device's folder layout doesn't match any of the built-ins. See [Supported Devices](/devices/supported-devices) for details on each.

## Multiple devices

You can add as many devices as you want. Each one has its own name, profile, and SD card path. Switching between your MiyooMini+ and your RG35XX is just picking from the device list before you sync.
