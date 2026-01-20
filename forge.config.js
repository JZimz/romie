import 'dotenv/config';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const S3_BUCKET = 'romie.jzimz.com';
const S3_REGION = 'us-east-1';
const CDN_URL = `https://romie.jzimz.com`;

export default {
  packagerConfig: {
    // Extracts native module binaries from app.asar to app.asar.unpacked
    // (native modules can't run from inside archive)
    asar: {
      unpack: '**/*.{node,dylib,so}', // Matches all native binaries in any subdirectory
    },
    name: 'ROMie',
    executableName: 'ROMie',
    // App icons (platform-specific)
    icon:
      process.platform === 'darwin'
        ? 'src/assets/icons/app/mac/icon.icns'
        : process.platform === 'win32'
          ? 'src/assets/icons/app/win/icon.ico'
          : 'src/assets/icons/app/png/512x512.png',
    // Add these for better Windows experience
    win32metadata: {
      CompanyName: 'JZimz Labs',
      FileDescription: 'ROM Manager for Retro Handhelds',
      ProductName: 'ROMie',
      InternalName: 'romie',
    },
    // Allow for unsigned builds
    ...(process.env.SKIP_CODESIGN
      ? {}
      : {
          osxSign: {},
          osxNotarize: {
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
          },
        }),
    extraResource: [
      // Include 7zip binaries for packaging/unpacking ROM archives
      'node_modules/7zip-bin',
      // Include database migration files
      'drizzle',
    ],
  },
  // Rebuilds better-sqlite3 for Electron's Node.js version
  rebuildConfig: {
    onlyModules: ['better-sqlite3'],
    force: true,
  },
  hooks: {
    // Note: This hook is needed because @electron-forge/plugin-vite doesn't package
    // external dependencies. We mark better-sqlite3 as external (Vite can't bundle
    // native modules), so we manually install it during packaging.
    packageAfterCopy(_forgeConfig, buildPath) {
      try {
        const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
        const nativeModules = ['better-sqlite3', 'node-rcheevos'];

        // Build install command with all modules in one go to avoid overwriting
        const installArgs = nativeModules.map((moduleName) => {
          const version = pkg.dependencies?.[moduleName];
          if (!version) {
            throw new Error(`${moduleName} not found in package.json dependencies`);
          }
          return `${moduleName}@${version}`;
        });

        console.log(`Installing native modules in packaged app: ${installArgs.join(', ')}`);
        execSync(`npm install --omit=dev --no-save ${installArgs.join(' ')}`, {
          cwd: buildPath,
          stdio: 'inherit',
        });
      } catch (error) {
        throw new Error(`Failed to install native modules during packaging: ${error.message}`);
      }
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: (arch) => ({
        name: 'ROMie',
        authors: 'JZimz Labs',
        description: 'ROM Manager for Retro Handhelds',
        // Builds the manifest file for Windows auto-updates
        remoteReleases: `${CDN_URL}/releases/win32/${arch}`,
      }),
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: (arch) => ({
        // Builds the manifest file for MacOS auto-updates
        macUpdateManifestBaseUrl: `${CDN_URL}/releases/darwin/${arch}`,
      }),
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'romie',
          productName: 'ROMie',
          bin: 'ROMie',
          genericName: 'ROM Manager',
          description: 'ROM Manager for Retro Handhelds',
          section: 'games',
          categories: ['Utility', 'Game'],
          maintainer: 'JZimz <jzimz.tv@gmail.com>',
          homepage: 'https://github.com/JZimz/romie',
          icon: 'src/assets/icons/app/png/512x512.png',
          depends: [
            'libgtk-3-0',
            'libnotify4',
            'libnss3',
            'libxss1',
            'libxtst6',
            'xdg-utils',
            'libatspi2.0-0',
            'libsecret-1-0',
            'libasound2',
            'libgbm1',
            'libdrm2',
            'libxcb-dri3-0',
          ],
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          name: 'romie',
          productName: 'ROMie',
          bin: 'ROMie',
          genericName: 'ROM Manager',
          description: 'ROM Manager for Retro Handhelds',
          categories: ['Utility', 'Game'],
          homepage: 'https://github.com/JZimz/romie',
          icon: 'src/assets/icons/app/png/512x512.png',
          license: 'MIT',
        },
      },
    },
    {
      name: '@reforged/maker-appimage',
      config: {
        options: {
          name: 'romie',
          bin: 'ROMie',
          productName: 'ROMie',
          genericName: 'ROM Manager',
          icon: 'src/assets/icons/app/png/512x512.png',
          categories: ['Utility', 'Game'],
        },
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-s3',
      config: {
        bucket: S3_BUCKET,
        region: S3_REGION,
        keyResolver: (filename, platform, arch) => {
          return `releases/${platform}/${arch}/${filename}`;
        },
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.ts',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
