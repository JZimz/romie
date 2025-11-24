<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__header"></div>
    <div class="app-sidebar__content">
      <div v-for="section in sections" :key="section.id" class="app-sidebar__section">
        <h4 v-if="section.title" class="app-sidebar__title">
          {{ section.title }}
        </h4>
        <ul v-if="section.id === 'tags'" class="app-sidebar__items app-sidebar__items--tags">
          <li v-for="item in section.items" :key="item.id">
            <RouterLink
              v-slot="{ isActive }"
              :to="item.route"
              class="app-sidebar__item"
              active-class="app-sidebar__item--active"
            >
              <Tag
                :key="item.id"
                :severity="isActive ? 'contrast' : 'secondary'"
                :value="item.label"
              ></Tag>
            </RouterLink>
          </li>
          <li v-if="section.items.length === 0" class="app-sidebar__item--empty">No tags yet</li>
        </ul>
        <ul v-else class="app-sidebar__items">
          <li v-for="item in section.items" :key="item.id">
            <RouterLink
              :to="item.route"
              class="app-sidebar__item"
              active-class="app-sidebar__item--active"
            >
              <span v-if="item.icon" class="app-sidebar__icon">
                <i :class="item.icon"></i>
              </span>
              <span class="app-sidebar__label">{{ item.label }}</span>
              <Badge
                v-if="item.count"
                :value="item.count"
                severity="secondary"
                class="app-sidebar__count"
              />
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
    <div class="app-sidebar__footer">
      <div class="app-logo">ROMie</div>
      <Button icon="pi pi-discord" size="small" severity="secondary" @click="openDiscordInvite" />
      <Button
        class="app-sidebar__kofi-button"
        size="small"
        severity="secondary"
        @click="openKofiLink"
      >
        <template #icon>
          <span class="pi-button-icon">
            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <title>Ko-fi</title>
              <path
                d="M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298"
              />
            </svg>
          </span>
        </template>
      </Button>
      <Button
        :icon="`pi pi-${isDark ? 'moon' : 'sun'}`"
        size="small"
        severity="secondary"
        @click="handleDisplayModeToggle"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import Tag from 'primevue/tag';
import { useRomStore, useDeviceStore } from '@/stores';
import { getSystemDisplayName } from '@/utils/systems';

import type { RouteLocationRaw } from 'vue-router';
import type { SystemCode } from '@/types/system';

// prettier-ignore
const SYSTEM_SORT_ORDER: SystemCode[] = [
  'nes','snes','n64','gb','gbc','gba', 'nds', // Nintendo
  'sms','genesis','gg',                       // Sega
  'psx',                                      // Sony
  'atari2600',                                // Atari
  'arcade'                                    // Arcade
];

const romStore = useRomStore();
const deviceStore = useDeviceStore();

interface SidebarItem {
  id: string;
  label: string;
  count?: number;
  icon?: string;
  route: RouteLocationRaw;
}

interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarItem[];
}

const isDark = ref(false);
let unsubscribeDarkMode: (() => void) | null = null;

onMounted(async () => {
  romStore.loadStats();
  romStore.loadRoms();
  deviceStore.loadDevices();
  isDark.value = await window.darkMode.value();
  unsubscribeDarkMode = window.darkMode.onChange((value) => {
    isDark.value = value;
  });
});

onBeforeUnmount(() => {
  if (unsubscribeDarkMode) unsubscribeDarkMode();
});

const systemsSection = computed((): SidebarSection => {
  const systems = Object.entries(romStore.stats.systemCounts) as [SystemCode, number][];
  const items: SidebarItem[] = [];

  systems.sort((a, b) => {
    return SYSTEM_SORT_ORDER.indexOf(a[0]) - SYSTEM_SORT_ORDER.indexOf(b[0]);
  });

  systems.forEach(([system, count]) => {
    items.push({
      id: `system-${system}`,
      label: getSystemDisplayName(system),
      count,
      route: {
        name: 'system-detail',
        params: { system },
      },
    });
  });

  return { id: 'systems', title: 'Systems', items };
});

const tagsSection = computed((): SidebarSection => {
  const { tagStats } = romStore.stats;

  // Build tag list sorted alphabetically
  const items = Object.values(tagStats)
    .sort((a, b) => a.tag.localeCompare(b.tag))
    .map(({ tag, romCount }) => ({
      id: `tag-${tag}`,
      label: tag,
      count: romCount,
      icon: 'pi pi-tag',
      route: {
        name: 'tag-detail',
        params: { tag },
      },
    }));

  return {
    id: 'tags',
    title: 'Tags',
    items,
  };
});

const devicesSection = computed((): SidebarSection => {
  const items = deviceStore.devices.map((device) => ({
    id: `device-${device.id}`,
    label: device.name,
    icon: 'pi pi-tablet',
    route: {
      name: 'device-detail',
      params: { deviceId: device.id },
    },
  }));

  return {
    id: 'devices',
    title: 'Devices',
    items,
  };
});

const sections = computed((): SidebarSection[] => {
  const baseSections: SidebarSection[] = [
    {
      id: 'library',
      items: [
        {
          id: 'import',
          label: 'Import',
          icon: 'pi pi-upload',
          route: { name: 'import' },
        },
        {
          id: 'add-device',
          label: 'Add device',
          icon: 'pi pi-plus',
          route: { name: 'add-device' },
        },
        {
          id: 'all-roms',
          label: 'Library',
          count: romStore.stats.totalRoms,
          icon: 'pi pi-folder',
          route: { name: 'library' },
        },
        {
          id: 'favorites',
          label: 'Favorites',
          count: romStore.roms.reduce((acc, rom) => acc + (rom.favorite ? 1 : 0), 0),
          icon: 'pi pi-heart',
          route: { name: 'favorites' },
        },
      ],
    },
  ];

  if (devicesSection.value.items.length > 0) {
    baseSections.push(devicesSection.value);
  }
  if (systemsSection.value.items.length > 0) {
    baseSections.push(systemsSection.value);
  }
  baseSections.push(tagsSection.value);

  return baseSections;
});

async function openDiscordInvite() {
  window.util.openExternalLink('https://discord.gg/ZmhHgEfAsD');
}

async function openKofiLink() {
  window.util.openExternalLink('https://ko-fi.com/jzimz');
}

async function handleDisplayModeToggle() {
  isDark.value = await window.darkMode.toggle();
}
</script>

<style scoped lang="less">
.app-sidebar {
  width: 220px;
  border-right: 1px solid var(--p-content-border-color);
  height: 100vh;
  display: flex;
  flex-direction: column;

  &__header,
  &__footer {
    flex: 0 0 auto;
  }

  &__header {
    height: 30px;
  }

  &__footer {
    display: flex;
    height: 36px;
    gap: 4px;
    align-items: center;
    justify-content: flex-end;
    padding: 0 14px;

    .app-logo {
      font-family: var(--font-alt);
      font-size: 2rem;
      flex-grow: 1;
      user-select: none;
    }
  }

  &__kofi-button {
    .pi-button-icon {
      width: 1rem;
      height: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      fill: var(--p-button-secondary-color);
    }
  }

  &__content {
    flex: 1 1 auto;
    overflow-y: auto;
  }

  &__section {
    margin-bottom: 16px;
  }

  &__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--p-navigation-submenu-label-color);
    margin: 0 16px 8px 16px;
    padding: 0;
    user-select: none;
  }

  &__items {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  &__items--tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0 14px;

    .app-sidebar__item {
      padding: 0;
      margin: 0;
    }

    .app-sidebar__item--empty {
      font-size: var(--font-size-sm);
      color: var(--p-text-muted-color);
    }
  }

  &__item {
    display: flex;
    align-items: center;
    padding: 6px 16px;
    cursor: pointer;
    border-radius: 6px;
    margin: 0 8px;
    transition: all 0.15s ease;
    line-height: 1.4;
    text-decoration: none;
    color: inherit;

    &:hover,
    &:focus {
      background: var(--p-navigation-item-focus-background);
      color: var(--p-navigation-item-focus-color); // If available
    }

    &--active {
      background: var(--p-navigation-item-active-background);
      color: var(--p-navigation-item-active-color);
    }
  }

  &__icon {
    margin-right: 8px;
    opacity: 0.7;
    font-size: 12px;
    color: var(--p-text-muted-color);
  }

  &__label {
    flex: 1;
    font-weight: 400;
  }

  &__count {
    font-size: 11px;
    opacity: 0.7;
    font-weight: 500;
    margin-left: auto;
  }
}
</style>
