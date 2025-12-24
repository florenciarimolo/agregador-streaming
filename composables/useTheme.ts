export const useTheme = () => {
  const theme = ref<'light' | 'dark'>('dark');

  const setTheme = (newTheme: 'light' | 'dark') => {
    theme.value = newTheme;
    if (import.meta.client) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      localStorage.setItem('theme', newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  };

  if (import.meta.client) {
    // Initialize theme on client side
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }

  return {
    theme: readonly(theme),
    setTheme,
    toggleTheme,
  };
};
