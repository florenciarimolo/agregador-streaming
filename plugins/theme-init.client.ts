/**
 * Theme initialization plugin
 * Runs before the app mounts to prevent flash of wrong theme
 * Must run synchronously before any rendering
 */
import { STORAGE_KEYS } from '@/constants/storage/keys';
import { Theme } from '@/types/enums/Theme';

export default defineNuxtPlugin({
  name: 'theme-init',
  enforce: 'pre', // Run before other plugins
  setup() {
    if (import.meta.client && typeof document !== 'undefined') {
      // Check if user has manually changed theme before

      const hasManualTheme =
        localStorage.getItem(STORAGE_KEYS.THEME_MANUAL) === 'true';
      const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      const savedTheme =
        storedTheme === Theme.LIGHT || storedTheme === Theme.DARK
          ? (storedTheme as Theme)
          : null;

      if (hasManualTheme && savedTheme) {
        // User has changed theme before, use saved preference immediately
        document.documentElement.classList.remove(Theme.LIGHT, Theme.DARK);
        document.documentElement.classList.add(savedTheme);
      } else {
        // First time or no saved preference, use system preference
        const systemPrefersDark = window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;
        const initialTheme = systemPrefersDark ? Theme.DARK : Theme.LIGHT;
        document.documentElement.classList.remove(Theme.LIGHT, Theme.DARK);
        document.documentElement.classList.add(initialTheme);
      }
    }
  },
});
