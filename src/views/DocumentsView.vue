<template>
  <div class="documents-view">
    <div class="documents-view__header">
      <h2>Documents</h2>
      <span class="documents-view__meta">{{ docs.length }} rezultate</span>
    </div>

    <div class="documents-view__controls">
      <input
        v-model="query"
        class="documents-view__search"
        type="search"
        placeholder="Cauta in titlu, autor, subiect sau continut..."
        @input="runSearch"
      />
      <button class="documents-view__refresh" @click="refreshAll">Refresh</button>
    </div>

    <div class="documents-view__list">
      <div v-if="loading" class="documents-view__state">Se incarca...</div>
      <div v-else-if="docs.length === 0" class="documents-view__state">Nu exista documente.</div>
      <table v-else class="documents-view__table">
        <thead>
          <tr>
            <th>Titlu</th>
            <th>Tip</th>
            <th>Autor</th>
            <th>Dimensiune</th>
            <th>Actualizat</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in docs" :key="doc.id">
            <td>{{ doc.title || doc.filename }}</td>
            <td>{{ doc.fileType.toUpperCase() }}</td>
            <td>{{ doc.author || '-' }}</td>
            <td>{{ formatBytes(doc.size) }}</td>
            <td>{{ formatDate(doc.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Document } from '@/types/document';

const docs = ref<Document[]>([]);
const query = ref('');
const loading = ref(false);

onMounted(async () => {
  await refreshAll();
});

async function refreshAll() {
  loading.value = true;
  try {
    docs.value = await window.documents.list();
  } finally {
    loading.value = false;
  }
}

async function runSearch() {
  loading.value = true;
  try {
    if (!query.value.trim()) {
      docs.value = await window.documents.list();
      return;
    }

    docs.value = await window.documents.search(query.value, 200);
  } finally {
    loading.value = false;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
}
</script>

<style scoped lang="less">
.documents-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  &__meta {
    opacity: 0.7;
    font-size: 0.9rem;
  }

  &__controls {
    display: flex;
    gap: 8px;
  }

  &__search {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--p-content-border-color);
    border-radius: 6px;
    background: var(--p-content-background);
    color: var(--p-text-color);
  }

  &__refresh {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--p-content-border-color);
    background: var(--p-content-background);
    color: var(--p-text-color);
    cursor: pointer;
  }

  &__list {
    min-height: 0;
    overflow: auto;
    border: 1px solid var(--p-content-border-color);
    border-radius: 8px;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 10px;
      border-bottom: 1px solid var(--p-content-border-color);
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
    }
  }

  &__state {
    padding: 18px;
    opacity: 0.75;
  }
}
</style>
