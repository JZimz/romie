<template>
  <Dialog
    :visible="visible"
    modal
    :header="header"
    :style="{ width: '25rem' }"
    @update:visible="handleVisibilityChange"
  >
    <div class="delete-rom-dialog">
      <p>{{ message }}</p>
      <div class="delete-rom-dialog__option">
        <Checkbox
          v-model="deleteFromDisk"
          input-id="delete-from-disk"
          :binary="true"
          :disabled="loading"
        />
        <label for="delete-from-disk">Also delete from disk</label>
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        text
        size="small"
        severity="secondary"
        :disabled="loading"
        @click="emit('update:visible', false)"
      />
      <Button
        label="Delete"
        size="small"
        severity="danger"
        :loading="loading"
        @click="handleConfirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';

const props = defineProps<{
  visible: boolean;
  header: string;
  message: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', deleteFromDisk: boolean): void;
}>();

const deleteFromDisk = ref(false);

watch(
  () => props.visible,
  (visible) => {
    if (!visible) deleteFromDisk.value = false;
  }
);

function handleVisibilityChange(value: boolean) {
  if (!props.loading) emit('update:visible', value);
}

function handleConfirm() {
  emit('confirm', deleteFromDisk.value);
}
</script>

<style scoped lang="less">
.delete-rom-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;

  p {
    margin: 0;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--font-size-sm);
  }
}
</style>
