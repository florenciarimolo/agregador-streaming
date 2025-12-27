export const useTheme = () => {
  const theme = ref<'light' | 'dark'>('dark');
  let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

  const setTheme = (newTheme: 'light' | 'dark', isManualChange = false) => {
    theme.value = newTheme;
    if (import.meta.client) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      
      if (isManualChange) {
        // User manually changed theme, save preference
        localStorage.setItem('theme', newTheme);
        localStorage.setItem('theme-manual', 'true');
        
        // Stop listening to system theme changes
        if (systemThemeListener) {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          if (mediaQuery.removeEventListener) {
            mediaQuery.removeEventListener('change', systemThemeListener);
          } else {
            mediaQuery.removeListener(systemThemeListener);
          }
          systemThemeListener = null;
        }
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark', true);
  };

  if (import.meta.client) {
    // Check if user has manually changed theme before
    const hasManualTheme = localStorage.getItem('theme-manual') === 'true';
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    
    // Get current theme from DOM (set by plugin) or use saved/system preference
    const currentTheme = document.documentElement.classList.contains('dark') 
      ? 'dark' 
      : document.documentElement.classList.contains('light')
      ? 'light'
      : 'dark';
    
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
      systemThemeListener = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light', false);
      };
      
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', systemThemeListener);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(systemThemeListener);
      }
    }
  }

  return {
    theme: readonly(theme),
    setTheme,
    toggleTheme,
  };
};
