# Building from Source

Here it's a guide on how to build the project from source, including all the dependencies. If you want to contribute to the main repository, check [CONTRIBUTING.md](https://github.com/gittttreporter/romie/blob/564b634051a886e078919a3919bb5cb06b32fde9/CONTRIBUTING.md).


## Cloning the repository from Github

Run this command in the directory you want to clone:
```bash
git clone https://github.com/JZimz/romie
```
## Go to the directory where is cloned

If it's cloned in home directory, run the following command:

```bash
cd romie
```
## Requirements

> [!NOTE]
> You need to have [Node.js](https://nodejs.org/en) installed on your device. Download from [here.](https://nodejs.org/en/download)

Just run:
```bash
npm install
```
And all the requirements will be installed automatically.

## Testing

For a live test, without packaging, run:
```bash
npm run start
```
## Packaging / Compiling

If you want packages for all the operating systems, run:
```bash
npm run make
```
## Packaging / Compiling by OS

If you want packages for only your operating systems, choose from here:

### Windows 11 / 10

> [!WARNING]
> The [electron windows-installer](https://github.com/electron/windows-installer/issues/263) don't work very well on Linux, I recommend using a Virtual Machine to do this.

```bash
npm run make -- --platform=win32 --arch=x64 --targets=@electron-forge/maker-squirrel
```
