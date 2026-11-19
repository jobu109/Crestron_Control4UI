import { LitElement, css, html, nothing } from 'lit';
import { unsafeStatic, html as staticHtml } from 'lit/static-html.js';
import type { HouseStore } from '../model/store';
import './chrome';
import './pages/home';
import './pages/rooms';
import './pages/overview';
import './pages/media';
import './pages/climate';
import './pages/misc';

interface Route { tag: string; heading: string; subheading: string; chrome: 'home' | 'page' | 'own' }

const ROUTES: Record<string, Route> = {
  home: { tag: 'z-home', heading: '', subheading: '', chrome: 'home' },
  rooms: { tag: 'z-rooms', heading: 'Rooms', subheading: 'All floors', chrome: 'page' },
  room: { tag: 'z-room', heading: '', subheading: '', chrome: 'own' },
  lighting: { tag: 'z-lighting', heading: 'Lighting', subheading: 'Overview', chrome: 'page' },
  shades: { tag: 'z-shades', heading: 'Shades', subheading: 'Overview', chrome: 'page' },
  climate: { tag: 'z-climate', heading: 'Climate', subheading: 'Thermostat', chrome: 'page' },
  media: { tag: 'z-media', heading: 'Media', subheading: 'Video & audio', chrome: 'page' },
  audio: { tag: 'z-audio', heading: 'Multi Audio', subheading: 'Zones', chrome: 'page' },
  scenes: { tag: 'z-scenes', heading: 'Scenes', subheading: 'Whole home', chrome: 'page' },
  settings: { tag: 'z-settings', heading: 'Settings', subheading: 'Panel', chrome: 'page' }
};

const PENDING: Route = { tag: 'z-pending', heading: '', subheading: 'Not wired yet', chrome: 'page' };

/** Root element: hash router, wallpaper and 1280x800 scale-to-fit. */
export class ZenithApp extends LitElement {
  static properties = {
    store: { attribute: false },
    path: { state: true },
    scale: { state: true }
  };

  store!: HouseStore;
  path: string[] = ['home'];
  scale = 1;
  private onHash = () => (this.path = parseHash());
  private onResize = () => this.fit();
  private onChange = () => this.requestUpdate();

  static styles = css`
    :host { display: block; position: relative; width: 100%; height: 100%; overflow: hidden; background: #000; }
    .stage { position: absolute; left: 50%; top: 50%; width: 1280px; height: 800px; transform-origin: center; overflow: hidden; background: #1b2128 center / cover no-repeat; }
    .shade { position: absolute; inset: 0; background: rgba(5,7,10,0.55); }
    .stage.home .shade { background: rgba(5,7,10,0.40); }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.path = parseHash();
    window.addEventListener('hashchange', this.onHash);
    window.addEventListener('resize', this.onResize);
    this.store?.addEventListener('change', this.onChange);
    queueMicrotask(() => this.fit());
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.onHash);
    window.removeEventListener('resize', this.onResize);
    this.store?.removeEventListener('change', this.onChange);
    super.disconnectedCallback();
  }

  private fit(): void {
    const w = this.clientWidth || window.innerWidth;
    const h = this.clientHeight || window.innerHeight;
    this.scale = Math.min(w / 1280, h / 800) || 1;
  }

  render() {
    const [name, ...params] = this.path;
    const route = ROUTES[name] ?? (name && (this.store.config.services as string[]).includes(name) ? PENDING : ROUTES.home);
    const key = ROUTES[name] || route === PENDING ? name : 'home';
    const wall = this.store.config.wallpapers?.[key] ?? this.store.config.wallpapers?.default;
    const tag = unsafeStatic(route.tag);
    return html`<div class="stage ${key === 'home' ? 'home' : ''}"
        style="transform: translate(-50%, -50%) scale(${this.scale});${wall ? `background-image:url('${wall}')` : ''}">
      <div class="shade"></div>
      ${staticHtml`<${tag} .store=${this.store} .params=${params}></${tag}>`}
      ${route.chrome === 'own' ? nothing : html`<z-chrome .store=${this.store} variant=${route.chrome} heading=${route.heading || capitalize(key)} subheading=${route.subheading} current=${key}></z-chrome>`}
    </div>`;
  }
}

function parseHash(): string[] {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return parts.length ? parts : ['home'];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

customElements.define('zenith-app', ZenithApp);
