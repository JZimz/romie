<template>
  <PageLayout
    class="rom-import"
    title="Document Import"
    subtitle="Add PDF/DOCX/XLS files to your library"
  >
    <template #actions>
      <div class="rom-import__actions">
        <Button
          size="large"
          severity="primary"
          icon="pi pi-search-plus"
          :label="scanLabel"
          :loading="processingState === 'scanning'"
          :disabled="isProcessing || isRefreshing"
          @click="handleScan"
        />
        <Button
          class="rom-import__refresh-button"
          size="large"
          severity="secondary"
          icon="pi pi-refresh"
          label="Refresh Documents"
          :loading="isRefreshing"
          :disabled="isRefreshing || isProcessing"
          @click="handleRefresh"
        />
        <div class="rom-import__supported-info">
          <strong>Supported file extensions:</strong> {{ supportedExtensions }}
        </div>
      </div>
    </template>

    <div class="rom-import__content">
      <div v-if="isProcessing" class="rom-import__progress">
        <span v-if="currentFile">
          <i class="pi pi-file"></i>
          Processing {{ currentFile }}...
        </span>
        <span v-else>Preparing files...</span>
      </div>
      <div v-if="!isProcessing && result" class="rom-import__results">
        <div class="rom-import__results-summary">
          <h3 v-if="result.successes > 0" class="rom-import__result-header">
            <i class="pi pi-check-circle success-icon"></i>
            {{ result.successes }} document{{ result.successes === 1 ? '' : 'e' }} importate cu
            succes
          </h3>
          <h3 v-else class="rom-import__result-header">
            <i class="pi pi-times error-icon"></i>
            Nu s-au importat documente
          </h3>
        </div>

        <div v-if="result.errors.length > 0" class="rom-import__results-summary">
          <h3 class="rom-import__result-header">
            <i class="pi pi-exclamation-circle error-icon"></i>
            {{ result.errors.length }}
            {{ result.errors.length === 1 ? 'fisier' : 'fisiere' }} nu au putut fi importate
          </h3>
          <div class="rom-import__result-content">
            <ul>
              <li v-for="message in result.errors" :key="message">
                {{ message }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import log from 'electron-log/renderer';
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import PageLayout from '@/layouts/PageLayout.vue';

import type { DocumentImportResult } from '@/types/electron-api';

const toast = useToast();
const processingState = ref<'idle' | 'scanning'>('idle');
const currentFile = ref('');
const isRefreshing = ref(false);

const result = ref<{
  errors: string[];
  successes: number;
  total: number;
} | null>(null);

const supportedExtensions = '.pdf, .docx, .xls, .xlsx';

const isProcessing = computed(() => processingState.value !== 'idle');

const scanLabel = computed(() => {
  if (processingState.value === 'scanning') return 'Scanning directory...';
  return 'Scan folder';
});

function showGenericError(operation: string) {
  toast.add({
    severity: 'error',
    summary: 'Sorry, something went wrong',
    detail: `We couldn't complete the ${operation}. Please try again.`,
    life: 4000,
  });
}

async function handleScan() {
  processingState.value = 'scanning';
  result.value = null;
  currentFile.value = '';

  const unsubscribeImportStatus = window.documents.onImportProgress((status) => {
    currentFile.value = status.currentFile;
  });

  try {
    const scanResult = await window.documents.scan();
    processImportResult(scanResult);
  } catch (error) {
    showGenericError('scan');
    log.error('Document import scan failed:', error);
  } finally {
    processingState.value = 'idle';
    unsubscribeImportStatus();
  }
}

async function handleRefresh() {
  isRefreshing.value = true;

  try {
    const docs = await window.documents.list();
    toast.add({
      severity: 'success',
      summary: 'Documents Refreshed',
      detail: `Library synchronized. ${docs.length} documente disponibile.`,
      life: 3000,
    });
  } catch (error) {
    showGenericError('refresh');
    log.error('Documents library refresh failed:', error);
  } finally {
    isRefreshing.value = false;
  }
}

function processImportResult(importResult: DocumentImportResult) {
  log.debug('Processing document import result');
  if (importResult.canceled) return;

  const errors = importResult.failed.map((error) => `${error.file}: ${error.reason}`);

  result.value = {
    successes: importResult.totalImported,
    errors,
    total: importResult.totalProcessed,
  };
}
</script>

<style scoped lang="less">
.rom-import {
  &__actions {
    padding: 0 var(--space-10);
  }

  &__refresh-button {
    margin-left: var(--space-6);
  }

  &__supported-info {
    color: var(--p-text-muted-color);
    font-size: var(--font-size-sm);
    max-width: 275px;
    margin-top: 6px;
  }

  &__progress,
  &__results {
    margin-top: 2rem;
  }

  &__results-summary {
    margin-top: 1rem;

    .pi {
      margin-right: 4px;
    }

    .success-icon {
      color: var(--p-green-400);
    }

    .error-icon {
      color: var(--p-red-400);
    }
  }
}
</style>
