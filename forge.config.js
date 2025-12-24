import 'dotenv/config';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const S3_BUCKET = 'romie.jzimz.com';
const S3_REGION = 'us-east-1';
const CDN_URL = `https://romie.jzimz.com`;

export default {
  packagerConfig: {
    asar: true,
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
    extraResource: ['node_modules/7zip-bin', 'drizzle'],
  },
  rebuildConfig: {},
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
