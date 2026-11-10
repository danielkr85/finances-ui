import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type Theme = 'light' | 'dark';

/** Must match the inline script in index.html, which applies the theme before Angular starts (no flash). */
export const THEME_STORAGE_KEY = 'finances-theme';

/**
 * Light / dark / follow the system, applied as Bootstrap's `data-bs-theme` on `<html>`. The choice is a per-device
 * display preference, so it lives in localStorage (it is not account data and holds nothing sensitive).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = window.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly preference = signal<ThemePreference>(readStoredPreference());

  /** The theme actually shown. Charts read this to redraw with the new colours. */
  readonly theme = computed<Theme>(() => {
    const pref = this.preference();
    return pref === 'auto' ? (this.systemDark() ? 'dark' : 'light') : pref;
  });

  constructor() {
    const onSystemChange = (e: MediaQueryListEvent) => {
      this.systemDark.set(e.matches);
      this.apply();
    };
    this.media?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', onSystemChange));
    this.apply();
  }

  setPreference(pref: ThemePreference): void {
    this.preference.set(pref);
    try {
      if (pref === 'auto') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, pref);
      }
    } catch {
      // Storage blocked (private mode): the choice still applies until the page reloads.
    }
    this.apply();
  }

  // Set synchronously (not in an effect) so the attribute is already in place when a chart reacts to `theme()`
  // and reads its colours from CSS.
  private apply(): void {
    document.documentElement.setAttribute('data-bs-theme', this.theme());
  }
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'auto';
  } catch {
    return 'auto';
  }
}
