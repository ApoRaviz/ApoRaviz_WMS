import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const PATHS = {
  box: 'M21 8 12 3 3 8v9l9 5 9-5V8ZM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  search: 'M21 21l-4.4-4.4M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2M17 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  lock: 'M6 10h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  eyeOff: 'm3 3 18 18M10.5 5.1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.2 4.2M6.1 6.1A20 20 0 0 0 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.2M10 10a3 3 0 0 0 4 4',
  shield: 'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7l-9-4Zm-4 9 3 3 5-5',
  building: 'M4 21V5l8-3v19M12 8h8v13M2 21h20M7 7h2M7 11h2M7 15h2M15 12h2M15 16h2',
  grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  logout: 'M9 3H4v18h5m6-14 5 5-5 5M8 12h12',
  switch: 'M3 7h17l-4-4m5 14H4l4 4M20 7l-4 4M4 17l4-4',
  check: 'm5 12 4 4L19 6',
  info: 'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
} as const;

@Component({
  selector: 'wms-icon', changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0 align-middle' },
  template: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="paths[name()]" /></svg>',
})
export class Icon {
  readonly name = input<keyof typeof PATHS>('box');
  readonly paths = PATHS;
}
