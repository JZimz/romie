<template>
  <div class="app-toolbar">
    <div class="app-toolbar__messages">
      <Message
        v-if="updateAvailable"
        class="app-toolbar__update-message"
        severity="info"
        size="small"
        @click="handleUpdate"
      >
        {{ updateAvailable }} is ready! Click here to restart and install the update.
      </Message>
    </div>
    <div class="app-toolbar__tools">
      <div class="app-toolbar__actions">
        <slot name="actions" />
      </div>
      <div ref="searchSlot" class="app-toolbar__search">
        <slot name="search" />
      </div>
      <div class="app-toolbar__settings">
        <slot name="settings">
          <Button
            class="app-toolbar__item"
            icon="pi pi-cog"
            size="small"
            severity="secondary"
            aria-label="Filters"
            @click="settingsModal.show()"
          />
        </slot>
      </div>
      <AppSettingsModal ref="settingsModal" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import AppSettingsModal from '@/components/AppSettingsModal.vue';
import { useHotkeys } from '@/composables/useHotkeys';

const settingsModal = ref();
const updateAvailable = ref<string | null>(null);
const searchSlot = ref<HTMLElement>();
let unsubscribeUpdates: (() => void) | null = null;

const emit = defineEmits<{
  (e: 'escape'): void;
}>();

const { register } = useHotkeys();
let unregisterHotkeys: (() => void)[] = [];

onMounted(() => {
  unsubscribeUpdates = window.update.onUpdateAvailable((version) => {
    updateAvailable.value = version;
  });

  unregisterHotkeys = [
    register({
      key: '/',
      handler: (event) => {
        event.preventDefault();
        focusSearch();
      },
    }),
    register({
      key: 'k',
      meta: true,
      handler: (event) => {
        event.preventDefault();
        focusSearch();
      },
    }),
    register({
      key: 'k',
      ctrl: true,
      handler: (event) => {
        event.preventDefault();
        focusSearch();
      },
    }),
    register({
      key: 'Escape',
      allowInInputs: true,
      handler: (event) => {
        if (isInSearch(event.target as HTMLElement)) {
          event.stopPropagation();
          (event.target as HTMLElement)?.blur?.();
          emit('escape');
        }
      },
    }),
  ];
});

onBeforeUnmount(() => {
  if (unsubscribeUpdates) unsubscribeUpdates();
  unregisterHotkeys.forEach((fn) => fn());
});

function focusSearch() {
  const input = searchSlot.value?.querySelector('input');
  input?.focus();
}

function handleUpdate() {
  window.update.quitAndInstall();
}

function isInSearch(target: HTMLElement | null) {
  if (!target) return false;
  return Boolean(target.closest('.app-toolbar__search'));
}
</script>

<style scoped lang="less">
.app-toolbar {
  &__update-message {
    position: relative;
    cursor: pointer;
    user-select: none;
  }
  &__messages {
    .p-message {
      border-radius: 0;
    }
  }
  &__tools {
    padding: var(--space-6) var(--space-10);
    display: flex;
    align-items: center;
    gap: 8px;

    // Specific spacing to align the update action with the page content.
    padding-left: 8px;
  }

  &__actions {
    flex: 1;
  }

  /* All interactive elements need to be above the drag region */
  :deep(button),
  :deep(input),
  :deep(select),
  :deep(.p-button),
  :deep(.p-inputtext),
  :deep(.p-dropdown),
  :deep(.p-iconfield),
  &__update-message {
    z-index: var(--z-index-ui-elements);
    -webkit-app-region: no-drag;
  }
}
</style>
