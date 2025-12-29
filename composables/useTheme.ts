// Use Nuxt's useState for SSR-safe state management
export const useTheme = () => {
  // Use useState for SSR-safe singleton state
  const theme = useState<'light' | 'dark'>('theme', () => 'dark');
  const themeInitialized = useState<boolean>('theme-initialized', () => false);

  const setTheme = (newTheme: 'light' | 'dark', isManualChange = false) => {
    theme.value = newTheme;
    if (import.meta.client && typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);

      if (isManualChange) {
        // User manually changed theme, save preference
        localStorage.setItem('theme', newTheme);
        localStorage.setItem('theme-manual', 'true');
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark', true);
  };

  // Initialize theme only once (on client side)
  if (
    import.meta.client &&
    typeof document !== 'undefined' &&
    !themeInitialized.value
  ) {
    themeInitialized.value = true;

    // Check if user has manually changed theme before
    const hasManualTheme = localStorage.getItem('theme-manual') === 'true';
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

    // Get current theme from DOM (set by plugin) or use saved/system preference
    const currentTheme = document.documentElement.classList.contains('dark')
      ? 'dark'
      : document.documentElement.classList.contains('light')
        ? 'light'
        : null;

    // Sync theme state with DOM
    if (currentTheme) {
      theme.value = currentTheme;
    } else if (hasManualTheme && savedTheme) {
      // User has changed theme before, use saved preference
      setTheme(savedTheme, false);
    } else {
      // First time or no saved preference, use system preference
      const systemPrefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      const initialTheme = systemPrefersDark ? 'dark' : 'light';
      setTheme(initialTheme, false);
    }

    // Listen for system theme changes if user hasn't manually changed
    if (!hasManualTheme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        // Only update if user hasn't manually changed since initialization
        if (localStorage.getItem('theme-manual') !== 'true') {
          setTheme(e.matches ? 'dark' : 'light', false);
        }
      };

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(listener);
      }
    }
  }

  return {
    theme: readonly(theme),
    setTheme,
    toggleTheme,
  };
};
