// Shared by the three app shells (client/employee/admin) and the
// Settings page. "system" means no explicit choice — the .portal wrapper
// gets no data-theme attribute, so globals.css's prefers-color-scheme
// media query decides. An explicit "light"/"dark" choice always wins.
export const THEME_KEY = 'dxe-theme';

export function getStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem(THEME_KEY) || 'system';
}

export function setStoredTheme(value) {
  localStorage.setItem(THEME_KEY, value);
}
