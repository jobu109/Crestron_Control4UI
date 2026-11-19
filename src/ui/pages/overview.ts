import { css, html, nothing } from 'lit';
import type { Room } from '../../model/types';
import { ZPage, shared } from '../base';
import { icon, roomIcon } from '../icons';

const PER_PAGE = 8;

/** Shared row list for the whole-house Lighting and Shades overviews. */
abstract class OverviewPage extends ZPage {
  static properties = { ...ZPage.properties, page: { state: true } };
  page = 0;

  static styles = [shared, css`
    section { position: absolute; left: 120px; right: 120px; top: 108px; display: flex; flex-direction: column; }
    .row { height: 66px; gap: 12px; }
    .row a { flex: 1; display: flex; align-items: center; gap: 16px; min-width: 0; }
    .row .btn { width: 170px; }
    .spacer { width: 170px; flex-shrink: 0; }
    .floor { font-size: 11px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; color: var(--soft); display: block; }
    .more { align-self: center; margin-top: 10px; height: 52px; padding: 0 24px; border: none; background: transparent; font-size: 16px; font-weight: 700; letter-spacing: 1.5px; display: flex; align-items: center; gap: 8px; }
  `];

  protected abstract rooms(): Room[];
  protected abstract columns: string;
  protected abstract actions(room: Room): unknown;
  protected detail(_room: Room): string { return ''; }

  render() {
    const all = this.rooms();
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const page = Math.min(this.page, pages - 1);
    const rows = all.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
    return html`<section>
      <div class="head label"><span>Room</span><span>${this.columns}</span></div>
      ${rows.map((r) => html`<div class="row">
        <a href="#/room/${encodeURIComponent(r.id)}">
          <span class="tile">${icon(roomIcon(r.name, r.icon), 26, 1.5)}</span>
          <span><span class="floor">${this.store.floorName(r.floorId)}${this.detail(r) ? ` · ${this.detail(r)}` : ''}</span><span class="name" style="font-size:19px">${r.name}</span></span>
        </a>
        ${this.actions(r)}
      </div>`)}
      ${pages > 1 ? html`<button type="button" class="more" @click=${() => (this.page = (page + 1) % pages)}>
        ${page < pages - 1 ? 'MORE' : 'BACK TO TOP'} ${icon(page < pages - 1 ? 'chevronDown' : 'chevronUp', 20, 1.8)}</button>` : nothing}
    </section>`;
  }
}

export class LightingPage extends OverviewPage {
  protected columns = 'Lighting scenes';
  protected rooms() { return this.store.config.rooms.filter((r) => r.lights.length); }
  protected actions(r: Room) {
    const lit = this.store.lightsOn(r);
    const all = lit === r.lights.length;
    const dimmable = r.lights.some((l) => l.dimmable);
    const send = (action: 'ambient' | 'on' | 'off') => this.send({ kind: 'room-lights', id: r.id, action });
    return html`
      ${dimmable ? html`<button type="button" class="btn ${lit && !all ? 'sel' : ''}" @click=${() => send('ambient')}>AMBIENT</button>` : html`<span class="spacer"></span>`}
      <button type="button" class="btn ${all ? 'sel' : ''}" @click=${() => send('on')}>ALL ON</button>
      <button type="button" class="btn ${lit ? '' : 'sel'}" @click=${() => send('off')}>ALL OFF</button>`;
  }
}

export class ShadesPage extends OverviewPage {
  protected columns = 'Shade scenes';
  protected rooms() { return this.store.config.rooms.filter((r) => r.shades.length); }
  protected detail(r: Room) { return `${r.shades.length} ${r.shades.length === 1 ? 'shade' : 'shades'}`; }
  protected actions(r: Room) {
    const positions = r.shades.map((s) => this.store.get('shade', s.id)?.position ?? 0);
    const closed = positions.every((p) => p <= 0);
    const open = positions.every((p) => p >= 100);
    const send = (action: 'open' | 'close' | 'stop') => this.send({ kind: 'room-shades', id: r.id, action });
    return html`
      <button type="button" class="btn ${closed ? 'sel' : ''}" @click=${() => send('close')}>ALL CLOSE</button>
      <button type="button" class="btn" @click=${() => send('stop')}>ALL STOP</button>
      <button type="button" class="btn ${open ? 'sel' : ''}" @click=${() => send('open')}>ALL OPEN</button>`;
  }
}

customElements.define('z-lighting', LightingPage);
customElements.define('z-shades', ShadesPage);
