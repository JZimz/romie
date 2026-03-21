# RetroAchievements

[RetroAchievements](https://retroachievements.org) is a community project that adds achievements to classic games. ROMie integrates with it in two ways:

**Game identification**: when you import ROMs, ROMie hashes your files and looks them up against the RetroAchievements database to match them to the correct game. This is how it pulls in game names and metadata automatically. ROMie uses [node-rcheevos](https://github.com/JZimz/node-rcheevos), a Node.js wrapper around the native rcheevos library, to compute hashes using the same logic as the official RetroAchievements clients, so game matching is as accurate as it gets.

**Achievement progress**: once you've linked your RetroAchievements account, you can see achievement stats for any game right inside ROMie. Open a game and you'll see how many achievements it has and how many you've unlocked.

## Privacy

ROMie only talks to the RetroAchievements API to look up game info and your achievement data. Your ROM files are never uploaded anywhere. Everything stays on your machine.

Your API key is stored locally using your operating system's secure credential storage (Keychain on macOS, Credential Manager on Windows). ROMie never stores it in plain text.

## Setting it up

See [Setup](/retroachievements/setup) for how to link your account.
