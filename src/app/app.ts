import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ThemePreference, ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);
  protected readonly themes = inject(ThemeService);
  protected readonly themeOptions: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'bi-sun' },
    { value: 'dark', label: 'Dark', icon: 'bi-moon-stars' },
    { value: 'auto', label: 'Auto', icon: 'bi-circle-half' },
  ];
  protected readonly themeIcon = computed(
    () => this.themeOptions.find((o) => o.value === this.themes.preference())!.icon,
  );
}
