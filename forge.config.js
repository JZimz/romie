import 'dotenv/config';
import path from 'node:path';
import { PluginBase, namedHookWithTaskFn } from '@electron-forge/plugin-base';
import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses';

const S3_BUCKET = 'romie.jzimz.com';
const S3_REGION = 'us-east-1';
const CDN_URL = `https://romie.jzimz.com`;

function getElectronExecutablePath({ appName, basePath, platform }) {
  if (platform === 'darwin' || platform === 'mas') {
    return path.join(basePath, 'MacOS', appName);
  }

  const suffix = platform === 'win32' ? '.exe' : '';
  return path.join(basePath, `${appName}${suffix}`);
}

class FusesPlugin extends PluginBase {
  constructor(fusesConfig) {
    super(fusesConfig);

    this.name = 'fuses';
    this.fusesConfig = fusesConfig ?? {};
  }

  getHooks() {
    return {
      packageAfterCopy: namedHookWithTaskFn(
        async (
          _listrTask,
          resolvedForgeConfig,
          resourcesPath,
          _electronVersion,
          platform,
          arch
        ) => {
          const applePlatforms = ['darwin', 'mas'];

          if (!this.fusesConfig || Object.keys(this.fusesConfig).length === 0) {
            return;
          }

          const pathToElectronExecutable = getElectronExecutablePath({
            appName: applePlatforms.includes(platform) ? 'Electron' : 'electron',
            basePath: path.resolve(resourcesPath, '../..'),
            platform,
          });

          const osxSignConfig = resolvedForgeConfig.packagerConfig.osxSign;
          const hasOSXSignConfig =
            (typeof osxSignConfig === 'object' &&
              osxSignConfig !== null &&
              Object.keys(osxSignConfig).length > 0) ||
            Boolean(osxSignConfig);

          await flipFuses(pathToElectronExecutable, {
            resetAdHocDarwinSignature:
              !hasOSXSignConfig && applePlatforms.includes(platform) && arch === 'arm64',
            ...this.fusesConfig,
          });
        },
        'Flipping Fuses'
      ),
    };
  }
}

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
    extraResource: ['node_modules/7zip-bin'],
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
