<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__header"></div>
    <div class="app-sidebar__content">
      <div v-for="section in sections" :key="section.id" class="app-sidebar__section">
        <h4 v-if="section.title" class="app-sidebar__title">
          {{ section.title }}
        </h4>
        <component
          :is="sectionComponents[section.id] || sectionComponents.default"
          :items="section.items"
          @reorder="handleSystemReorder"
        />
      </div>
    </div>
    <div class="app-sidebar__footer">
      <div class="app-logo">ROMie</div>
      <Button icon="pi pi-discord" size="small" severity="secondary" @click="openDiscordInvite" />
      <Button
        class="app-sidebar__sponsor-button"
        size="small"
        severity="secondary"
        @click="openSponsorLink"
      >
        <template #icon>
          <span class="pi-button-icon">
            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <title>GitHub Sponsors</title>
              <path
                d="M17.625 1.499c-2.32 0-4.354 1.203-5.625 3.03-1.271-1.827-3.305-3.03-5.625-3.03C3.129 1.499 0 4.253 0 8.249c0 4.275 3.068 7.847 5.828 10.227a33.14 33.14 0 0 0 5.616 3.876l.028.017.008.003-.001.003c.163.085.342.126.521.125.179.001.358-.041.521-.125l-.001-.003.008-.003.028-.017a33.14 33.14 0 0 0 5.616-3.876C20.932 16.096 24 12.524 24 8.249c0-3.996-3.129-6.75-6.375-6.75zm-.919 15.275a30.766 30.766 0 0 1-4.703 3.316l-.004-.002-.004.002a30.955 30.955 0 0 1-4.703-3.316c-2.677-2.307-5.047-5.298-5.047-8.523 0-2.754 2.121-4.5 4.125-4.5 2.06 0 3.914 1.479 4.544 3.684.143.495.596.797 1.086.796.49.001.943-.302 1.085-.796.63-2.205 2.484-3.684 4.544-3.684 2.004 0 4.125 1.746 4.125 4.5 0 3.225-2.37 6.216-5.048 8.523z"
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
import { computed, ref, onMounted, onBeforeUnmount, type Component } from 'vue';
import Button from 'primevue/button';
import SidebarSection from '@/components/sidebar/SidebarSection.vue';
import SystemSection from '@/components/sidebar/SystemSection.vue';
import TagsSection from '@/components/sidebar/TagsSection.vue';
import { useRomStore, useDeviceStore } from '@/stores';
import { getSystemDisplayName } from '@/utils/systems';

import type { RouteLocationRaw } from 'vue-router';
import type { SystemCode } from '@/types/system';

const sectionComponents: Record<string, Component> = {
  tags: TagsSection,
  systems: SystemSection,
  default: SidebarSection,
};

// prettier-ignore
const SYSTEM_SORT_ORDER: SystemCode[] = [
  'nes', 'snes', 'gb', 'gbc', 'gba', 'n64', 'nds', 'vb',  // Nintendo
  'genesis', 'sms', 'gg',                                 // Sega
  'psp',                                                  // Sony
  'arcade',                                               // Arcade
  'atari2600', 'lynx',                                    // Atari
  'pce',                                                  // NEC
  'ngp',                                                  // SNK
];

const romStore = useRomStore();
const deviceStore = useDeviceStore();
const customSystemOrder = ref<SystemCode[] | null>(null);

interface SidebarItem {
  id: string;
  label: string;
  count?: number;
  icon?: string;
  route: RouteLocationRaw;
}

interface Section {
  id: string;
  title?: string;
  items: SidebarItem[];
}

const isDark = ref(false);
let unsubscribeDarkMode: (() => void) | null = null;

onMounted(async () => {
  const { systemOrder } = await window.settings.get();

  romStore.loadStats();
  romStore.loadRoms();
  deviceStore.loadDevices();
  customSystemOrder.value = systemOrder || null;
  isDark.value = await window.darkMode.value();
  unsubscribeDarkMode = window.darkMode.onChange((value) => {
    isDark.value = value;
  });
});

onBeforeUnmount(() => {
  if (unsubscribeDarkMode) unsubscribeDarkMode();
});

const tagsSection = computed((): Section => {
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

const devicesSection = computed((): Section => {
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

const systemsSortOrder = computed(() => {
  if (customSystemOrder.value) {
    const customSortOrder = customSystemOrder.value;
    const defaultSortOrder = SYSTEM_SORT_ORDER.filter((code) => !customSortOrder?.includes(code));

    return [...customSortOrder, ...defaultSortOrder];
  }

  return SYSTEM_SORT_ORDER;
});
const systemsSection = computed((): Section => {
  const availableSystems = Object.entries(romStore.stats.systemCounts) as [SystemCode, number][];
  const availableCodes = new Set(availableSystems.map(([code]) => code));

  // Filter to only available systems, preserving order
  const orderedSystems = systemsSortOrder.value
    .filter((code) => availableCodes.has(code))
    .map((code) => [code, romStore.stats.systemCounts[code]] as [SystemCode, number]);

  // Append any systems not in either list in case I missed some.
  for (const [code, count] of availableSystems) {
    if (!systemsSortOrder.value.includes(code)) {
      orderedSystems.push([code, count]);
    }
  }

  const items: SidebarItem[] = orderedSystems.map(([system, count]) => ({
    id: `system-${system}`,
    label: getSystemDisplayName(system),
    count,
    route: {
      name: 'system-detail',
      params: { system },
    },
  }));

  return { id: 'systems', title: 'Systems', items };
});

const sections = computed((): Section[] => {
  const baseSections: Section[] = [
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

function handleSystemReorder(ids: string[]) {
  const newOrder = ids.map((id) => id.replace('system-', '') as SystemCode);
  customSystemOrder.value = newOrder;
  window.settings.update({ systemOrder: newOrder });
}

async function openDiscordInvite() {
  window.util.openExternalLink('https://discord.gg/ZmhHgEfAsD');
}

async function openSponsorLink() {
  window.util.openExternalLink('https://github.com/sponsors/JZimz');
}

async function handleDisplayModeToggle() {
  isDark.value = await window.darkMode.toggle();
}
</script>

<style scoped lang="less">
.app-sidebar {
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

  &__sponsor-button {
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
}
</style>
