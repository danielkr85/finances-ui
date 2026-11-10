import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const html = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    html.removeAttribute('data-bs-theme');
  });

  afterEach(() => localStorage.clear());

  it('follows the system by default (light when the system has no preference)', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('auto');
    expect(service.theme()).toBe('light');
    expect(html.getAttribute('data-bs-theme')).toBe('light');
  });

  it('starts with a saved choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('dark');
    expect(html.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('ignores an unknown saved value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(TestBed.inject(ThemeService).preference()).toBe('auto');
  });

  it('applies and saves an explicit choice, and forgets it on auto', () => {
    const service = TestBed.inject(ThemeService);

    service.setPreference('dark');
    expect(service.theme()).toBe('dark');
    expect(html.getAttribute('data-bs-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.setPreference('auto');
    expect(html.getAttribute('data-bs-theme')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
