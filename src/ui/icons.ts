import { html, type TemplateResult } from 'lit';

// Stroke icons drawn on a 24x24 grid. Each value is one SVG path.
export const ICONS: Record<string, string> = {
  home: 'M3 11l9-7 9 7M5 10v10h14V10',
  rooms: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  light: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z',
  shades: 'M4 3h16v4H4zM6 7v9h12V7M12 16v3',
  climate: 'M14 14.76V4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0z',
  comfort: 'M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z',
  media: 'M3 5h18v12H3zM8 21h8',
  music: 'M9 18V5l11-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  scenes: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  security: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  cameras: 'M3 7h12v10H3zM15 10l6-3v10l-6-3',
  pool: 'M2 17c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M8 13V5a2 2 0 0 1 4 0M14 13V5a2 2 0 0 1 4 0M8 9h6',
  irrigation: 'M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z',
  energy: 'M13 2L4 14h7l-1 8 9-12h-7z',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4',
  power: 'M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  doubleLeft: 'M13 6l-6 6 6 6M19 6l-6 6 6 6',
  doubleRight: 'M11 6l6 6-6 6M5 6l6 6-6 6',
  close: 'M5 5l14 14M19 5L5 19',
  play: 'M7 5l12 7-12 7z',
  pause: 'M8 5v14M16 5v14',
  previous: 'M18 6l-8 6 8 6zM6 6v12',
  next: 'M6 6l8 6-8 6zM18 6v12',
  mute: 'M4 10v4h4l5 4V6L8 10zM17 10l4 4M21 10l-4 4',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  intercom: 'M7 3h10v18H7zM10 7h4M12 17h.01M10 11h4',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z',
  unlock: 'M7 11V7a5 5 0 0 1 9.6-2M5 11h14v10H5z',
  gate: 'M3 21V5M21 21V5M3 9h18M3 15h18M8 9v6M13 9v6M18 9v6',
  garage: 'M3 10l9-6 9 6v11H3zM7 21v-8h10v8M7 16h10',
  fan: 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 10c0-4 2-6 4-6s2 4-4 6M14 12c4 0 6 2 6 4s-4 2-6-4M12 14c0 4-2 6-4 6s-2-4 4-6M10 12c-4 0-6-2-6-4s4-2 6 4',
  floorHeat: 'M7 4c-1 2 1 3 0 5M12 4c-1 2 1 3 0 5M17 4c-1 2 1 3 0 5M3 14h18l-2 6H5z',
  // room icons
  sofa: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 11h18v6H3zM5 17v2M19 17v2',
  dining: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1-3 4-3 7h3v11',
  kitchen: 'M4 4h16v16H4zM7 9a2 2 0 1 0 4 0 2 2 0 1 0-4 0M13 9a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7 15a2 2 0 1 0 4 0 2 2 0 1 0-4 0M13 15a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  desk: 'M3 5h18v11H3zM8 20h8M12 16v4',
  bath: 'M12 3v3M6 11a6 6 0 0 1 12 0zM8 15v1M12 15v1M16 15v1M10 18v1M14 18v1',
  door: 'M6 3h12v18H6zM14 12h.01',
  laundry: 'M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z',
  bed: 'M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M7 9V7h4v2M3 18v2M21 18v2',
  tv: 'M3 5h18v12H3zM8 21h8',
  gym: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  arrive: 'M3 11l9-7 9 7M5 10v10h14V10M12 18v-6M9.5 14.5L12 12l2.5 2.5',
  leave: 'M3 11l9-7 9 7M5 10v10h14V10M12 12v6M9.5 15.5L12 18l2.5-2.5',
  sunrise: 'M12 3v2M5.6 6.6l1.4 1.4M3 13h2M19 13h2M17 8l1.4-1.4M7 18a5 5 0 0 1 10 0M3 21h18',
  cup: 'M4 10h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3'
};

/** Guess a room icon from its name when the system does not supply one. */
export function roomIcon(name: string, explicit?: string): string {
  if (explicit && ICONS[explicit]) return explicit;
  const n = name.toLowerCase();
  if (/bed|guest|nursery/.test(n)) return 'bed';
  if (/bath|powder|shower/.test(n)) return 'bath';
  if (/kitchen/.test(n)) return 'kitchen';
  if (/dining|bar|breakfast/.test(n)) return 'dining';
  if (/office|study|den/.test(n)) return 'desk';
  if (/media|theater|theatre|tv/.test(n)) return 'tv';
  if (/garage/.test(n)) return 'garage';
  if (/laundry|mud/.test(n)) return 'laundry';
  if (/entry|foyer|hall|stair/.test(n)) return 'door';
  if (/gym|fitness/.test(n)) return 'gym';
  return 'sofa';
}

export function icon(name: string, size = 24, strokeWidth = 1.6): TemplateResult {
  const d = ICONS[name] ?? ICONS.dots;
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${strokeWidth} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${d}></path></svg>`;
}
