/**
 * Theme initialization plugin
 * Runs before the app mounts to prevent flash of wrong theme
 */
export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    // Check if user has manually changed theme before
    const hasManualTheme = localStorage.getItem('theme-manual') === 'true';
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (hasManualTheme && savedTheme) {
      // User has changed theme before, use saved preference immediately
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(savedTheme);
    } else {
      // First time or no saved preference, use system preference
      const systemPrefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      const initialTheme = systemPrefersDark ? 'dark' : 'light';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(initialTheme);
    }
  }
});
