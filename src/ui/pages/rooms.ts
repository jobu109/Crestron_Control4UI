import { css, html, nothing } from 'lit';
import type { Room } from '../../model/types';
import { ZPage, iconButton, shared, slider, toggle } from '../base';
import { icon, roomIcon } from '../icons';

/** Status line under a room name, e.g. "3 lights on · Apple TV". */
export function roomStatus(page: ZPage, room: Room): string {
  const store = page.store;
  const parts: string[] = [];
  const lit = store.lightsOn(room);
  if (lit) parts.push(`${lit} ${lit === 1 ? 'light' : 'lights'} on`);
  const media = store.get('media', room.id);
  if (media?.power && media.title) parts.push(media.title);
  const t = room.thermostatId ? store.get('thermostat', room.thermostatId) : undefined;
  if (t?.current) parts.push(`${Math.round(t.current)}°`);
  return parts.length ? parts.join(' · ') : 'All off';
}

export class RoomsPage extends ZPage {
  static styles = [shared, css`
    .content { display: grid; gap: 16px; }
    section { padding: 18px 22px; display: flex; flex-direction: column; overflow: hidden; }
    .head { height: 40px; }
    .floor { font-size: 15px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
    .list { overflow-y: auto; }
    a.row { height: 76px; }
  `];

  render() {
    const floors = this.store.sortedFloors();
    return html`
      <div class="toolbar"><span class="hint">Tap a room to open its controls</span></div>
      <div class="content" style="grid-template-columns: repeat(${Math.max(1, Math.min(floors.length, 4))}, minmax(0, 1fr))">
        ${floors.map((f) => {
          const rooms = this.store.roomsOnFloor(f.id);
          return html`<section class="panel" aria-label=${f.name}>
            <div class="head"><span class="floor">${f.name}</span><span class="sub">${rooms.length} rooms</span></div>
            <div class="list">
              ${rooms.map((r) => {
                const status = roomStatus(this, r);
                const active = this.store.lightsOn(r) > 0 || !!this.store.get('media', r.id)?.power;
                return html`<a class="row" href="#/room/${encodeURIComponent(r.id)}">
                  <span class="tile ${active ? 'on' : ''}">${icon(roomIcon(r.name, r.icon), 24, 1.5)}</span>
                  <span class="grow"><span class="name" style="display:block">${r.name}</span><span class="sub">${status}</span></span>
                  ${icon('chevronRight', 18, 1.8)}
                </a>`;
              })}
            </div>
          </section>`;
        })}
      </div>
    `;
  }
}

type Sheet = 'lighting' | 'shades' | 'climate' | null;

export class RoomPage extends ZPage {
  static properties = { ...ZPage.properties, sheet: { state: true } };
  sheet: Sheet = null;

  static styles = [shared, css`
    .side { position: absolute; left: 0; top: 0; bottom: 0; width: 270px; background: rgba(6,8,11,0.62); }
    .menu { position: absolute; left: 40px; top: 280px; display: flex; flex-direction: column; gap: 22px; }
    .menu button { height: 56px; padding: 0; border: none; background: transparent; display: flex; align-items: center; gap: 18px; font-size: 16px; font-weight: 700; letter-spacing: 1px; }
    .menu .tile { width: 56px; height: 56px; border-radius: 12px; background: rgba(0,0,0,0.3); }
    .menu .tile.on { background: #fff; }
    .swipe { position: absolute; left: 310px; right: 40px; top: 108px; height: 64px; display: flex; justify-content: space-between; align-items: center; }
    .swipe button { height: 64px; padding: 0 12px; border: none; background: transparent; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; }
    .swipe span { font-size: 22px; font-weight: 700; letter-spacing: 3px; color: var(--soft); }
    .hero { position: absolute; left: 330px; right: 60px; top: 330px; display: flex; justify-content: space-between; align-items: flex-end; }
    .hero h1 { font-size: 104px; font-weight: 300; line-height: 1; letter-spacing: -1px; }
    .hero .st { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; font-size: 24px; font-weight: 300; }
    .quick { position: absolute; left: 330px; right: 60px; top: 500px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
    .quick .btn { height: 68px; font-size: 18px; letter-spacing: 1.5px; }
    .sheet { position: absolute; left: 290px; right: 40px; top: 100px; bottom: 64px; border-radius: 16px; background: rgba(6,8,11,0.96); border: 1px solid rgba(255,255,255,0.12); padding: 26px 40px 110px; overflow: hidden; }
    .sheet .scroll { height: 100%; overflow-y: auto; }
    .load { padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.12); display: flex; flex-direction: column; gap: 12px; }
    .load .top { display: flex; justify-content: space-between; align-items: center; font-size: 20px; }
    .grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .grid3 .btn { height: 64px; font-size: 16px; font-weight: 700; }
    .close { position: absolute; left: 50%; bottom: 20px; margin-left: -38px; }
    .empty { padding-top: 40px; font-size: 18px; color: var(--soft); }
  `];

  private get room(): Room | undefined {
    return this.store.room(decodeURIComponent(this.params[0] ?? '')) ?? this.store.config.rooms[0];
  }

  private step(delta: number): void {
    const room = this.room;
    if (!room) return;
    const peers = this.store.roomsOnFloor(room.floorId);
    const next = peers[(peers.indexOf(room) + delta + peers.length) % peers.length];
    this.sheet = null;
    location.hash = `#/room/${encodeURIComponent(next.id)}`;
  }

  render() {
    const room = this.room;
    if (!room) return html`<div class="toolbar"><span class="hint">No rooms reported</span></div>`;
    const lit = this.store.lightsOn(room);
    const t = room.thermostatId ? this.store.get('thermostat', room.thermostatId) : undefined;
    const media = this.store.get('media', room.id);
    const menu: Array<[Exclude<Sheet, null>, string, string, boolean]> = [
      ['lighting', 'LIGHTING', 'light', room.lights.length > 0],
      ['shades', 'SHADES', 'shades', room.shades.length > 0],
      ['climate', 'CLIMATE', 'climate', !!room.thermostatId]
    ];
    return html`
      <div class="side"></div>
      <nav class="menu" aria-label="Room controls">
        ${menu.filter((m) => m[3]).map(([id, label, ic]) => html`<button type="button" @click=${() => (this.sheet = id)}>
          <span class="tile ${this.sheet === id ? 'on' : ''}">${icon(ic, 28)}</span>${label}</button>`)}
        ${room.videoSources.length || room.audioSources.length ? html`<button type="button" @click=${() => (location.hash = '#/media')}><span class="tile">${icon('media', 28)}</span>MEDIA</button>` : nothing}
      </nav>
      <div class="swipe">
        <button type="button" @click=${() => this.step(-1)}>${icon('doubleLeft', 34, 1.4)}BACK<br />ROOM</button>
        <span>SWIPE</span>
        <button type="button" @click=${() => this.step(1)}>NEXT<br />ROOM${icon('doubleRight', 34, 1.4)}</button>
      </div>
      <div class="hero">
        <h1>${room.name}</h1>
        <div class="st">
          ${room.lights.length ? html`<span>Lights are <em>${lit ? `${lit} on` : 'Off'}</em></span>` : nothing}
          ${t ? html`<span>Climate is <em>${t.power ? `${t.mode} ${t.setpoint}°` : 'Off'}</em></span>` : nothing}
          ${media ? html`<span>Media is <em>${media.power ? media.title ?? 'On' : 'Off'}</em></span>` : nothing}
        </div>
      </div>
      ${room.lights.length ? html`<div class="quick" role="group" aria-label="Lighting scene">
        <button type="button" class="btn outline" @click=${() => this.send({ kind: 'room-lights', id: room.id, action: 'ambient' })}>AMBIENT</button>
        <button type="button" class="btn outline" @click=${() => this.send({ kind: 'room-lights', id: room.id, action: 'on' })}>ON</button>
        <button type="button" class="btn ${lit ? 'outline' : 'sel'}" @click=${() => this.send({ kind: 'room-lights', id: room.id, action: 'off' })}>OFF</button>
      </div>` : nothing}
      ${this.sheet ? this.renderSheet(room) : nothing}
      <z-chrome .store=${this.store} heading=${this.store.floorName(room.floorId)} subheading=${room.name} back="rooms" current="rooms"></z-chrome>
    `;
  }

  private renderSheet(room: Room) {
    let body;
    if (this.sheet === 'lighting') {
      body = room.lights.map((l) => {
        const st = this.store.get('light', l.id) ?? { on: false, level: 0 };
        return html`<div class="load">
          <div class="top"><span>${l.name}</span>${toggle(st.on, () => this.send({ kind: 'light', id: l.id, action: 'toggle' }), `${l.name} ${st.on ? 'on' : 'off'}`)}</div>
          ${l.dimmable ? slider(st.level, (v) => this.send({ kind: 'light', id: l.id, action: 'level', value: v }), `${l.name} level`) : nothing}
        </div>`;
      });
    } else if (this.sheet === 'shades') {
      body = room.shades.map((s) => {
        const pos = this.store.get('shade', s.id)?.position ?? 0;
        const label = pos >= 100 ? 'Open' : pos <= 0 ? 'Closed' : `${pos}% open`;
        return html`<div class="load">
          <div class="top"><span>${s.name} is <em>${label}</em></span></div>
          <div class="grid3">
            <button type="button" class="btn ${pos <= 0 ? 'sel' : ''}" @click=${() => this.send({ kind: 'shade', id: s.id, action: 'close' })}>CLOSE</button>
            <button type="button" class="btn" @click=${() => this.send({ kind: 'shade', id: s.id, action: 'stop' })}>STOP</button>
            <button type="button" class="btn ${pos >= 100 ? 'sel' : ''}" @click=${() => this.send({ kind: 'shade', id: s.id, action: 'open' })}>OPEN</button>
          </div>
        </div>`;
      });
    } else {
      const id = room.thermostatId!;
      const t = this.store.get('thermostat', id);
      body = t ? html`<div class="load" style="flex-direction:row;align-items:center;justify-content:space-between;border:none">
        <span style="font-size:96px;font-weight:200">${t.setpoint}°</span>
        <span style="display:flex;gap:14px">
          ${iconButton('chevronDown', 'Lower setpoint', () => this.send({ kind: 'thermostat', id, action: 'setpoint', value: t.setpoint - 1 }))}
          ${iconButton('chevronUp', 'Raise setpoint', () => this.send({ kind: 'thermostat', id, action: 'setpoint', value: t.setpoint + 1 }))}
          ${iconButton('power', t.power ? 'Turn climate off' : 'Turn climate on', () => this.send({ kind: 'thermostat', id, action: 'power', value: !t.power }), `btn square ${t.power ? 'on' : ''}`)}
        </span>
      </div>` : html`<p class="empty">Waiting for climate state</p>`;
    }
    return html`<div class="scrim" @click=${() => (this.sheet = null)}></div>
      <section class="sheet" aria-label="${room.name} ${this.sheet}">
        <span class="label">${room.name} · ${this.sheet}</span>
        <div class="scroll">${body}</div>
        <button type="button" class="close" aria-label="Close" @click=${() => (this.sheet = null)}>${icon('close', 36, 1.3)}</button>
      </section>`;
  }
}

customElements.define('z-rooms', RoomsPage);
customElements.define('z-room', RoomPage);
