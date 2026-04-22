<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import AppLayout from '@/layouts/AppLayout.vue';
import { useFeatureFlagStore, useUIStore } from './stores';

const ff = useFeatureFlagStore();
const ui = useUIStore();

ff.initialize();

onMounted(() => {
  ui.initColorThemes();
});
</script>
