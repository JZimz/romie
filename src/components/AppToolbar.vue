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
      <Message
        v-if="unavailableCount > 0 && !unavailableDismissed"
        class="app-toolbar__unavailable-message"
        severity="warn"
        size="small"
        :closable="true"
        @close="unavailableDismissed = true"
      >
        <a
          href="#"
          class="app-toolbar__unavailable-count"
          @click.prevent="emit('filter-unavailable')"
        >
          {{ unavailableCount }} {{ pluralize(unavailableCount, 'ROM') }}
        </a>
        {{ pluralize(unavailableCount, 'has', 'have') }} missing or moved files.
        <a
          href="#"
          class="app-toolbar__unavailable-action"
          @click.prevent="handleRemoveUnavailable"
        >
          Remove from library
        </a>
      </Message>
    </div>
    <div class="app-toolbar__tools">
      <div class="app-toolbar__actions">
        <slot name="actions" />
      </div>
      <div class="app-toolbar__search">
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
import { useConfirm } from 'primevue/useconfirm';
import AppSettingsModal from '@/components/AppSettingsModal.vue';
import { pluralize } from '@/utils/string.utils';

const props = withDefaults(
  defineProps<{
    unavailableCount?: number;
  }>(),
  { unavailableCount: 0 }
);

const emit = defineEmits<{
  (e: 'filter-unavailable'): void;
  (e: 'remove-unavailable'): void;
}>();

const confirm = useConfirm();
const settingsModal = ref();
const updateAvailable = ref<string | null>(null);
const unavailableDismissed = ref(false);
let unsubscribeUpdates: (() => void) | null = null;

onMounted(() => {
  unsubscribeUpdates = window.update.onUpdateAvailable((version) => {
    updateAvailable.value = version;
  });
});

onBeforeUnmount(() => {
  if (unsubscribeUpdates) unsubscribeUpdates();
});

function handleUpdate() {
  window.update.quitAndInstall();
}

function handleRemoveUnavailable() {
  confirm.require({
    header: 'Remove Unavailable ROMs',
    message: `Are you sure you want to remove ${props.unavailableCount} unavailable ${pluralize(props.unavailableCount, 'ROM')} from your library?`,
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Remove All', severity: 'danger' },
    accept: () => emit('remove-unavailable'),
  });
}
</script>

<style scoped lang="less">
.app-toolbar {
  &__update-message {
    position: relative;
    cursor: pointer;
    user-select: none;
  }

  &__unavailable-count,
  &__unavailable-action {
    font-weight: 600;
    color: inherit;
  }

  &__unavailable-action {
    margin-left: 4px;
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
  :deep(a),
  :deep(input),
  :deep(select),
  :deep(.p-button),
  :deep(.p-inputtext),
  :deep(.p-dropdown),
  :deep(.p-iconfield),
  &__update-message {
    z-index: var(--z-index-ui-elements);
    -webkit-app-region: no-drag;
    position: relative;
  }
}
</style>
