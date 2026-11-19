import { css, html, nothing } from 'lit';
import { ZPage, shared, toggle } from '../base';
import { icon } from '../icons';

export class HomePage extends ZPage {
  static properties = { ...ZPage.properties, scenesOpen: { state: true } };
  scenesOpen = false;
  private timer?: number;

  static styles = [shared, css`
    .side { position: absolute; left: 0; top: 0; bottom: 0; width: 520px; background: rgba(6,8,11,0.62); }
    .bar { position: absolute; left: 40px; right: 40px; top: 24px; display: flex; justify-content: space-between; align-items: center; }
    .bar > div { display: flex; gap: 10px; align-items: center; }
    .sq { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(255,255,255,0.85); background: rgba(0,0,0,0.25); }
    .sq.solid { background: #fff; color: #0b0d10; border-color: #fff; }
    .greet { position: absolute; left: 56px; top: 116px; width: 420px; display: flex; flex-direction: column; gap: 32px; }
    .greet h1 { font-size: 56px; font-weight: 700; line-height: 1.05; }
    .date { display: flex; flex-direction: column; gap: 2px; font-size: 20px; }
    .date .day { font-size: 68px; font-weight: 300; line-height: 1.05; }
    .clock { position: absolute; left: 600px; top: 250px; display: flex; flex-direction: column; gap: 24px; }
    .clock .t { font-size: 96px; font-weight: 300; line-height: 1; letter-spacing: -1px; }
    .status { display: flex; flex-direction: column; gap: 6px; font-size: 16px; }
    .tab { position: absolute; right: 0; top: 220px; width: 44px; height: 150px; border: none; border-radius: 12px 0 0 12px; background: rgba(255,255,255,0.16); font-size: 12px; font-weight: 700; letter-spacing: 2px; writing-mode: vertical-rl; }
    .scenes { position: absolute; right: 0; top: 0; bottom: 130px; width: 620px; background: rgba(6,8,11,0.94); border-left: 1px solid rgba(255,255,255,0.12); padding: 24px 48px 0 40px; display: flex; flex-direction: column; }
    .scenes .row { flex: 1; max-height: 104px; gap: 28px; border-color: rgba(255,255,255,0.14); }
    .scenes .tile { width: 64px; height: 64px; border-radius: 12px; }
    .scenes .n { flex: 1; font-size: 24px; font-weight: 700; }
    .x { width: 48px; height: 48px; margin-left: -12px; border: none; background: transparent; display: flex; align-items: center; justify-content: center; }
    .all { height: 64px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; letter-spacing: 1px; color: #e6e8eb; }
  `];

  connectedCallback(): void {
    super.connectedCallback();
    this.timer = window.setInterval(() => this.requestUpdate(), 15000);
  }
  disconnectedCallback(): void {
    window.clearInterval(this.timer);
    super.disconnectedCallback();
  }

  render() {
    const now = new Date();
    const scenes = this.store.has('scenes') ? this.store.config.scenes.slice(0, 5) : [];
    return html`
      <div class="side"></div>
      <div class="bar">
        <div><span class="sq solid">${icon('home', 22, 1.7)}</span></div>
        <div><a class="sq solid" href="#/settings" aria-label="Settings">${icon('dots', 22, 3)}</a></div>
      </div>
      <div class="greet">
        <h1>Welcome<br />Home</h1>
        <div class="date">
          <span>${now.toLocaleDateString([], { weekday: 'long' })}</span>
          <span class="day">${String(now.getDate()).padStart(2, '0')}</span>
          <span>${now.toLocaleDateString([], { month: 'long' })}</span>
        </div>
      </div>
      <div class="clock">
        <span class="t">${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
        <div class="status">${this.statusLines()}</div>
      </div>
      ${scenes.length ? html`<button type="button" class="tab" aria-expanded=${this.scenesOpen ? 'true' : 'false'} @click=${() => (this.scenesOpen = true)}>SCENES</button>` : nothing}
      ${this.scenesOpen ? html`<section class="scenes" aria-label="Scenes">
        <button type="button" class="x" aria-label="Close scenes" @click=${() => (this.scenesOpen = false)}>${icon('chevronRight', 26, 1.8)}</button>
        ${scenes.map((s) => {
          const active = !!this.store.get('scene', s.id)?.active;
          return html`<div class="row"><span class="tile ${active ? 'on' : ''}">${icon(s.icon ?? 'scenes', 32, 1.4)}</span><span class="n">${s.name}</span>
            ${toggle(active, () => this.send({ kind: 'scene', id: s.id, action: 'run' }), `${s.name} ${active ? 'is on' : 'is off'}`)}</div>`;
        })}
        <a class="all" href="#/scenes">ALL SCENES ${icon('chevronRight', 18, 1.8)}</a>
      </section>` : nothing}
    `;
  }

  /** Short house summary; adapters can enrich this later with door/lock states. */
  private statusLines() {
    const rooms = this.store.config.rooms;
    const lit = rooms.filter((r) => this.store.lightsOn(r) > 0).length;
    const playing = rooms.filter((r) => this.store.get('media', r.id)?.power).length;
    return html`
      ${this.store.has('lighting') ? html`<span>Lights are <em>on in ${lit} ${lit === 1 ? 'room' : 'rooms'}</em></span>` : nothing}
      ${this.store.has('media') ? html`<span>Media is <em>${playing ? `playing in ${playing}` : 'off'}</em></span>` : nothing}
    `;
  }
}

customElements.define('z-home', HomePage);
