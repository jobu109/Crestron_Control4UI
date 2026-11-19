import { css, html } from 'lit';
import { ALL_SERVICES } from '../../model/types';
import { ZPage, shared } from '../base';
import { icon } from '../icons';

export class ScenesPage extends ZPage {
  static styles = [shared, css`
    .content { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: 16px; overflow-y: auto; }
    .scene { border-radius: 16px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; text-align: left; background: var(--panel); border: 1px solid var(--line); min-height: 200px; }
    .scene.active { border: 2px solid #fff; background: rgba(8,10,13,0.8); }
    .scene .tile { width: 72px; height: 72px; border-radius: 14px; }
    .badge { height: 26px; padding: 0 10px; border-radius: 13px; background: var(--green); color: #0b0d10; font-size: 11px; font-weight: 700; letter-spacing: 1px; display: inline-flex; align-items: center; }
  `];

  render() {
    return html`
      <div class="toolbar"><span class="hint">Tap a scene to run it</span></div>
      <section class="content" aria-label="Scenes">
        ${this.store.config.scenes.map((s) => {
          const active = !!this.store.get('scene', s.id)?.active;
          return html`<button type="button" class="scene ${active ? 'active' : ''}" @click=${() => this.send({ kind: 'scene', id: s.id, action: 'run' })}>
            <span style="width:100%;display:flex;justify-content:space-between"><span class="tile ${active ? 'on' : ''}">${icon(s.icon ?? 'scenes', 34, 1.4)}</span>${active ? html`<span class="badge">ACTIVE</span>` : ''}</span>
            <span><span class="name" style="display:block;font-size:20px">${s.name}</span><span class="sub">${s.description ?? ''}</span></span>
          </button>`;
        })}
      </section>`;
  }
}

/** Settings: shows the services this house reports and the connection. */
export class SettingsPage extends ZPage {
  static styles = [shared, css`
    .content { display: flex; gap: 20px; }
    section { flex: 1; padding: 22px 30px; display: flex; flex-direction: column; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 30px; }
    .grid .row { height: 64px; justify-content: space-between; font-size: 16px; }
    .pill { height: 30px; padding: 0 12px; border-radius: 15px; font-size: 12px; font-weight: 700; letter-spacing: 1px; display: inline-flex; align-items: center; background: rgba(255,255,255,0.16); }
    .pill.on { background: var(--green); color: #0b0d10; }
    dl { display: grid; grid-template-columns: 180px 1fr; row-gap: 14px; font-size: 16px; margin: 18px 0 0; }
    dt { color: var(--soft); }
    dd { margin: 0; }
  `];

  render() {
    const c = this.store.config;
    return html`
      <div class="toolbar"><span class="hint">This panel</span></div>
      <div class="content">
        <section class="panel" aria-label="Services">
          <div class="head label"><span>Services in this house</span><span>Hidden services have no dock tile</span></div>
          <div class="grid">
            ${ALL_SERVICES.map((s) => html`<div class="row"><span style="text-transform:capitalize">${s}</span><span class="pill ${this.store.has(s) ? 'on' : ''}">${this.store.has(s) ? 'SHOWN' : 'HIDDEN'}</span></div>`)}
          </div>
        </section>
        <section class="panel" aria-label="About" style="flex:0.8">
          <div class="head label"><span>About</span></div>
          <dl>
            <dt>Connection</dt><dd>${this.store.connection}</dd>
            <dt>House</dt><dd>${c.name || '—'}</dd>
            <dt>Floors</dt><dd>${c.floors.length}</dd>
            <dt>Rooms</dt><dd>${c.rooms.length}</dd>
            <dt>Audio zones</dt><dd>${c.audioZones.length}</dd>
            <dt>UI version</dt><dd>0.1.0</dd>
          </dl>
        </section>
      </div>`;
  }
}

/** Placeholder for designed pages whose data model is not built yet. */
export class PendingPage extends ZPage {
  static styles = [shared, css`
    .content { display: flex; align-items: center; justify-content: center; }
    p { max-width: 640px; text-align: center; font-size: 20px; line-height: 1.5; color: #e6e8eb; padding: 40px; }
  `];

  render() {
    return html`<div class="content"><p class="panel">This page is designed but not wired yet. It will appear once the program or Home Assistant reports this service.</p></div>`;
  }
}

customElements.define('z-scenes', ScenesPage);
customElements.define('z-settings', SettingsPage);
customElements.define('z-pending', PendingPage);
