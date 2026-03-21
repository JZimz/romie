# Adding a Device

## Before you start

Plug your SD card into your computer. Make sure it shows up as a mounted drive. ROMie needs to be able to see it to confirm the path is valid.

## Steps

1. Go to **Devices** in the sidebar and click **Add Device**.
2. Give it a name. Something like "MiyooMini+" or "RG35XX" works fine.
3. Pick a firmware profile from the dropdown. If you're not sure which one to pick, check the [Supported Devices](/devices/supported-devices) page.
4. Select the mount point. This is the root of your SD card. On macOS it'll be something like `/Volumes/ROMS`. On Windows it'll be a drive letter like `E:\`.
5. Click **Save**.

That's it. Your device will now show up in the device list and you can sync to it.

## Can't find your SD card?

Make sure it's fully mounted before opening the device picker. If it shows up in Finder or File Explorer but not in ROMie, try unplugging and re-plugging it, then open the device picker again.

## Updating a device

To change a device's name, profile, or mount path, open it from the device list and edit the fields. This is useful if you swap to a different firmware on the same SD card.

## Removing a device

Open the device and click **Remove**. This only removes it from ROMie. Nothing on your SD card is changed.
