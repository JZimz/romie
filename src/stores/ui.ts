import { defineStore } from 'pinia';
import { ref } from 'vue';
import { applyColorThemes, DEFAULT_THEME_ID } from '@/themes/colorThemes';

export const useUIStore = defineStore('ui', () => {
  const lightColorTheme = ref<string>(DEFAULT_THEME_ID);
  const darkColorTheme = ref<string>(DEFAULT_THEME_ID);

  async function initColorThemes() {
    const saved = await window.settings.get();
    lightColorTheme.value = saved.lightColorTheme || DEFAULT_THEME_ID;
    darkColorTheme.value = saved.darkColorTheme || DEFAULT_THEME_ID;
    applyColorThemes(lightColorTheme.value, darkColorTheme.value);
  }

  async function setLightColorTheme(themeId: string) {
    lightColorTheme.value = themeId;
    applyColorThemes(lightColorTheme.value, darkColorTheme.value);
    await window.settings.update({ lightColorTheme: themeId });
  }

  async function setDarkColorTheme(themeId: string) {
    darkColorTheme.value = themeId;
    applyColorThemes(lightColorTheme.value, darkColorTheme.value);
    await window.settings.update({ darkColorTheme: themeId });
  }

  return { lightColorTheme, darkColorTheme, initColorThemes, setLightColorTheme, setDarkColorTheme };
});
