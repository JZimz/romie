import DefaultTheme from 'vitepress/theme';
import { onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vitepress';
import mediumZoom from 'medium-zoom';
import type { Zoom } from 'medium-zoom';
import './custom.css';

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute();
    let zoom: Zoom | null = null;

    const initZoom = () => {
      zoom?.detach();
      zoom = mediumZoom('.VPHero .image-src', { background: 'var(--vp-c-bg)' });
    };

    onMounted(() => initZoom());
    watch(
      () => route.path,
      () => nextTick(initZoom)
    );
  },
};
