import { STORAGE_KEYS } from '@/constants/storage/keys';
import { useCookieConsent } from '@/composables/useCookieConsent';
import { Theme } from '@/types/enums/Theme';

// Use Nuxt's useState for SSR-safe state management
export const useTheme = () => {
  // Use useState for SSR-safe singleton state
  const theme = useState<Theme>('theme', () => Theme.LIGHT);

  const setTheme = (newTheme: Theme, isManualChange = false) => {
    theme.value = newTheme;
    if (import.meta.client && typeof document !== 'undefined') {
      document.documentElement.classList.remove(Theme.LIGHT, Theme.DARK);
      document.documentElement.classList.add(newTheme);

      // Only save preference cookies if user has accepted optional cookies
      if (isManualChange) {
        const { hasConsent } = useCookieConsent();
        if (hasConsent.value) {
          localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
          localStorage.setItem(STORAGE_KEYS.THEME_MANUAL, 'true');
        }
        // If cookies are rejected, theme still works but preference is not saved
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = theme.value === Theme.DARK ? Theme.LIGHT : Theme.DARK;
    setTheme(newTheme, true);
  };

  // Sync theme with DOM - call this in onMounted
  const syncTheme = () => {
    if (import.meta.client && typeof document !== 'undefined') {
      const { hasConsent } = useCookieConsent();

      // Only load saved theme preference if user has accepted optional cookies
      let savedTheme: Theme | null = null;
      if (hasConsent.value) {
        const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        if (storedTheme === Theme.LIGHT || storedTheme === Theme.DARK) {
          savedTheme = storedTheme as Theme;
        }
      }

      // Apply saved theme or detect from DOM
      const currentTheme =
        savedTheme ||
        (document.documentElement.classList.contains(Theme.DARK)
          ? Theme.DARK
          : Theme.LIGHT);
      theme.value = currentTheme;

      if (savedTheme) {
        document.documentElement.classList.remove(Theme.LIGHT, Theme.DARK);
        document.documentElement.classList.add(savedTheme);
      }

      // Set up system preference listener
      const hasManualTheme =
        hasConsent.value &&
        localStorage.getItem(STORAGE_KEYS.THEME_MANUAL) === 'true';
      if (!hasManualTheme) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const win = window as Window & { __themeListenerAdded?: boolean };
        if (!win.__themeListenerAdded) {
          win.__themeListenerAdded = true;
          const listener = (e: MediaQueryListEvent) => {
            const stillHasManual =
              hasConsent.value &&
              localStorage.getItem(STORAGE_KEYS.THEME_MANUAL) === 'true';
            if (!stillHasManual) {
              setTheme(e.matches ? Theme.DARK : Theme.LIGHT, false);
            }
          };
          mediaQuery.addEventListener('change', listener);
        }
      }
    }
  };

  return {
    theme: readonly(theme),
    setTheme,
    toggleTheme,
    syncTheme,
  };
};
