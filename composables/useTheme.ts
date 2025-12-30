// Use Nuxt's useState for SSR-safe state management
export const useTheme = () => {
  // Use useState for SSR-safe singleton state
  const theme = useState<'light' | 'dark'>('theme', () => 'light');

  const setTheme = (newTheme: 'light' | 'dark', isManualChange = false) => {
    theme.value = newTheme;
    if (import.meta.client && typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);

      if (isManualChange) {
        localStorage.setItem('theme', newTheme);
        localStorage.setItem('theme-manual', 'true');
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = theme.value === 'dark' ? 'light' : 'dark';
    setTheme(newTheme, true);
  };

  // Sync theme with DOM - call this in onMounted
  const syncTheme = () => {
    if (import.meta.client && typeof document !== 'undefined') {
      const currentTheme = document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light';
      theme.value = currentTheme;

      // Set up system preference listener
      const hasManualTheme = localStorage.getItem('theme-manual') === 'true';
      if (!hasManualTheme) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const win = window as Window & { __themeListenerAdded?: boolean };
        if (!win.__themeListenerAdded) {
          win.__themeListenerAdded = true;
          const listener = (e: MediaQueryListEvent) => {
            if (localStorage.getItem('theme-manual') !== 'true') {
              setTheme(e.matches ? 'dark' : 'light', false);
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
