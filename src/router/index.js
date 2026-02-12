import { createRouter, createWebHashHistory } from 'vue-router';

import LibraryView from '@/views/LibraryView.vue';
import FavoritesView from '@/views/FavoritesView.vue';
import TagView from '@/views/TagView.vue';
import SystemView from '@/views/SystemView.vue';
import DeviceAddView from '@/views/DeviceAddView.vue';
import DeviceView from '@/views/DeviceView.vue';
import RomImportView from '@/views/RomImportView.vue';
import DocumentsView from '@/views/DocumentsView.vue';

const routes = [
  {
    path: '/',
    redirect: '/library',
  },
  {
    path: '/library',
    name: 'library',
    component: LibraryView,
  },
  {
    path: '/import',
    name: 'import',
    component: RomImportView,
  },
  {
    path: '/documents',
    name: 'documents',
    component: DocumentsView,
  },
  {
    path: '/add-device',
    name: 'add-device',
    component: DeviceAddView,
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: FavoritesView,
  },
  {
    path: '/tags/:tag',
    name: 'tag-detail',
    component: TagView,
    props: true,
  },
  {
    path: '/devices/:deviceId',
    name: 'device-detail',
    component: DeviceView,
    props: true,
  },
  {
    path: '/systems/:system',
    name: 'system-detail',
    component: SystemView,
    props: true,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
