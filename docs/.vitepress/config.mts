import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'ROMie',
  description:
    'ROMie is a ROM manager for retro handheld gaming. Import and organize your game library with RetroAchievements metadata, then sync directly to MiyooMini+, RG35XX, and other handhelds.',

  themeConfig: {
    nav: [
      { text: 'Get Started', link: '/getting-started/installation' },
      { text: 'Download', link: 'https://github.com/JZimz/romie/releases' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Quick Start', link: '/getting-started/quick-start' },
          { text: 'Importing ROMs', link: '/getting-started/importing-roms' },
          { text: 'Building from Source', link: '/getting-started/build-from-source' },
        ],
      },
      {
        text: 'Your Library',
        items: [
          { text: 'Overview', link: '/library/overview' },
          { text: 'Tags', link: '/library/tags' },
          { text: 'ROM Details', link: '/library/rom-details' },
        ],
      },
      {
        text: 'Devices',
        items: [
          { text: 'Overview', link: '/devices/overview' },
          { text: 'Adding a Device', link: '/devices/adding-a-device' },
          { text: 'Syncing', link: '/devices/syncing' },
          { text: 'Supported Devices', link: '/devices/supported-devices' },
        ],
      },
      {
        text: 'RetroAchievements',
        items: [
          { text: 'Overview', link: '/retroachievements/overview' },
          { text: 'Setup', link: '/retroachievements/setup' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Supported Systems', link: '/reference/supported-systems' },
          { text: 'FAQ', link: '/reference/faq' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/JZimz/romie' },
      { icon: 'discord', link: 'https://discord.gg/ZmhHgEfAsD' },
    ],

    footer: {
      message: 'Released under the MIT License.',
    },

    editLink: {
      pattern: 'https://github.com/JZimz/romie/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
});
