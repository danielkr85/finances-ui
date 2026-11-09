import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { App } from './app';
import { AuthService } from './services/auth.service';
import { tokens } from './testing/auth-fixtures';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
  });

  it('hides the navbar while signed out', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')).toBeNull();
  });

  it('shows the navbar with the user name once signed in', async () => {
    const login = firstValueFrom(TestBed.inject(AuthService).login({ email: 'me@example.com', password: 'x' }));
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/auth/login`).flush(tokens('a'));
    await login;

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav');
    expect(nav?.textContent).toContain('Me');
    expect(nav?.textContent).toContain('Sign out');
  });
});
