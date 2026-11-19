import { css, html, nothing } from 'lit';
import type { AudioZone, Room, Source } from '../../model/types';
import { ZPage, iconButton, shared, slider } from '../base';
import { icon } from '../icons';

export class MediaPage extends ZPage {
  static properties = { ...ZPage.properties, tab: { state: true }, roomId: { state: true } };
  tab: 'video' | 'audio' = 'video';
  roomId = '';

  static styles = [shared, css`
    .rooms, .tabs { display: flex; gap: 8px; }
    .tabs { gap: 4px; padding: 4px; border-radius: 12px; background: var(--panel); border: 1px solid rgba(255,255,255,0.18); }
    .tabs .btn { height: 40px; padding: 0 26px; display: flex; align-items: center; gap: 8px; background: transparent; }
    .tabs .btn.sel { background: #fff; }
    .rooms .btn { height: 44px; }
    .content { display: flex; gap: 20px; }
    .now { flex: 1.2; padding: 28px; display: flex; flex-direction: column; gap: 24px; }
    .art { width: 160px; height: 160px; flex-shrink: 0; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; color: var(--soft); background-size: cover; background-position: center; }
    .title { font-size: 34px; font-weight: 700; }
    .transport { display: flex; justify-content: center; align-items: center; gap: 20px; }
    .transport .btn { width: 64px; height: 64px; padding: 0; display: flex; align-items: center; justify-content: center; }
    .transport .main { width: 80px; height: 80px; }
    .vol { display: flex; align-items: center; gap: 14px; }
    .vol .btn { width: 52px; height: 52px; padding: 0; display: flex; align-items: center; justify-content: center; }
    .sources { flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .grid { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: 14px; overflow-y: auto; }
    .src { border-radius: 16px; padding: 16px 18px; display: flex; align-items: center; gap: 16px; text-align: left; background: var(--panel); border: 1px solid var(--line); min-height: 84px; }
    .src.active { border: 2px solid #fff; background: rgba(8,10,13,0.8); }
    .src .tile { width: 56px; height: 56px; border-radius: 12px; }
    .empty { padding: 30px; color: var(--soft); font-size: 16px; }
  `];

  private mediaRooms(): Room[] {
    return this.store.config.rooms.filter((r) => r.videoSources.length || r.audioSources.length);
  }

  render() {
    const rooms = this.mediaRooms();
    const room = rooms.find((r) => r.id === this.roomId) ?? rooms[0];
    if (!room) return html`<div class="toolbar"><span class="hint">No media rooms reported</span></div>`;
    const sources = this.tab === 'video' ? room.videoSources : room.audioSources;
    const st = this.store.get('media', room.id) ?? { power: false, volume: 0, mute: false };
    const active = sources.find((s) => s.id === st.activeSourceId);
    const m = (action: 'off' | 'mute' | 'unmute' | 'play' | 'pause' | 'next' | 'previous' | 'volume-up' | 'volume-down') =>
      this.send({ kind: 'media', id: room.id, action });
    return html`
      <div class="toolbar">
        <div class="rooms" role="group" aria-label="Room">
          ${rooms.slice(0, 5).map((r) => html`<button type="button" class="btn ${r.id === room.id ? 'sel' : ''}" @click=${() => (this.roomId = r.id)}>${r.name}</button>`)}
        </div>
        <div class="tabs" role="tablist" aria-label="Media type">
          ${(['video', 'audio'] as const).map((t) => html`<button type="button" role="tab" aria-selected=${this.tab === t ? 'true' : 'false'} class="btn ${this.tab === t ? 'sel' : ''}" @click=${() => (this.tab = t)}>
            ${icon(t === 'video' ? 'media' : 'music', 18, 1.7)}${t.toUpperCase()}</button>`)}
        </div>
      </div>
      <div class="content">
        <section class="panel now" aria-label="Now playing">
          <div style="display:flex;gap:24px;align-items:center">
            <div class="art" style=${st.artUrl ? `background-image:url('${st.artUrl}')` : ''}>${st.artUrl ? nothing : icon(this.tab === 'video' ? 'media' : 'music', 52, 1.2)}</div>
            <div class="grow" style="display:flex;flex-direction:column;gap:6px">
              <span class="label">${this.tab === 'video' ? 'Now watching' : 'Now playing'}</span>
              <span class="title">${st.power ? st.title ?? active?.name ?? 'On' : 'Off'}</span>
              <span style="font-size:15px;color:#e6e8eb">${[st.artist, st.album].filter(Boolean).join(' · ') || room.name}</span>
            </div>
            ${iconButton('power', st.power ? 'Turn room media off' : 'Room media is off', () => m('off'), `btn square ${st.power ? 'on' : ''}`)}
          </div>
          ${st.progress ? html`<div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.18);overflow:hidden"><div style="height:6px;background:#fff;width:${Math.min(100, (st.progress.position / Math.max(1, st.progress.duration)) * 100)}%"></div></div>` : nothing}
          <div class="transport">
            <button type="button" class="btn outline" aria-label="Previous" @click=${() => m('previous')}>${icon('previous', 24)}</button>
            <button type="button" class="btn sel main" aria-label="Pause" @click=${() => m('pause')}>${icon('pause', 30, 2.2)}</button>
            <button type="button" class="btn outline" aria-label="Next" @click=${() => m('next')}>${icon('next', 24)}</button>
          </div>
          <div style="flex:1"></div>
          <div class="vol">
            <button type="button" class="btn ${st.mute ? 'sel' : ''}" aria-label=${st.mute ? 'Unmute' : 'Mute'} @click=${() => m(st.mute ? 'unmute' : 'mute')}>${icon('mute', 22)}</button>
            <button type="button" class="btn" aria-label="Volume down" @click=${() => m('volume-down')} style="font-size:26px">−</button>
            <div class="grow">${slider(st.volume, (v) => this.send({ kind: 'media', id: room.id, action: 'volume', value: v }), 'Volume')}</div>
            <span style="width:36px;text-align:right;font-weight:700">${st.volume}</span>
            <button type="button" class="btn" aria-label="Volume up" @click=${() => m('volume-up')} style="font-size:26px">+</button>
          </div>
        </section>
        <section class="sources" aria-label="${this.tab} sources">
          <span class="label">${this.tab} sources</span>
          ${sources.length ? html`<div class="grid">${sources.map((s) => this.sourceCard(room, s, s.id === st.activeSourceId))}</div>`
            : html`<p class="panel empty">No ${this.tab} sources in ${room.name}</p>`}
        </section>
      </div>
    `;
  }

  private sourceCard(room: Room, s: Source, isActive: boolean) {
    return html`<button type="button" class="src ${isActive ? 'active' : ''}" @click=${() => this.send({ kind: 'media', id: room.id, action: 'source', value: s.id })}>
      <span class="tile ${isActive ? 'on' : ''}">${icon(s.kind === 'video' ? 'media' : 'music', 26)}</span>
      <span><span class="name" style="display:block;font-size:16px">${s.name}</span><span class="sub">${isActive ? 'Playing' : s.detail ?? ''}</span></span>
    </button>`;
  }
}

export class AudioPage extends ZPage {
  static properties = { ...ZPage.properties, openId: { state: true } };
  openId: string | null = null;

  static styles = [shared, css`
    .content { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(160px, 1fr); gap: 12px; left: 40px; right: 40px; top: 160px; height: 572px; overflow-y: auto; }
    .zone { border-radius: 6px; background: rgba(60,64,70,0.55); padding: 0 28px; display: flex; align-items: center; gap: 28px; }
    .pwr { width: 96px; height: 96px; flex-shrink: 0; border: none; border-radius: 18px; background: rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; }
    .pwr.on { background: #1F9D4B; }
    .open { border: none; background: transparent; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 8px; }
    .zname { font-size: 32px; font-weight: 400; }
    .ctl { display: flex; align-items: center; gap: 8px; }
    .ctl .btn { width: 44px; height: 44px; padding: 0; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 300; }
    .ctl.off { opacity: 0.45; }
    .sheet { position: absolute; left: 140px; right: 140px; top: 100px; bottom: 56px; border-radius: 16px; background: rgba(8,10,13,0.96); border: 1px solid var(--line); padding: 30px 40px; display: flex; flex-direction: column; gap: 26px; }
    .close { position: absolute; left: 604px; bottom: 20px; background: #0b0d10; }
  `];

  render() {
    const zones = this.store.config.audioZones;
    const open = zones.find((z) => z.id === this.openId);
    return html`
      <div class="toolbar" style="left:40px;right:40px">
        <span class="hint">Tap zone to launch controls</span>
        <button type="button" class="btn outline" @click=${() => zones.forEach((z) => this.send({ kind: 'zone', id: z.id, action: 'off' }))}>ALL ZONES OFF</button>
      </div>
      <section class="content" aria-label="Audio zones">${zones.map((z) => this.zone(z))}</section>
      ${open ? this.sheet(open) : nothing}
    `;
  }

  private zone(z: AudioZone) {
    const st = this.store.get('zone', z.id) ?? { power: false, volume: 0, mute: false };
    const send = (action: 'on' | 'off' | 'mute' | 'unmute' | 'volume-up' | 'volume-down') => this.send({ kind: 'zone', id: z.id, action });
    return html`<div class="zone">
      <button type="button" class="pwr ${st.power ? 'on' : ''}" aria-label="${st.power ? 'Turn off' : 'Turn on'} ${z.name}" @click=${() => send(st.power ? 'off' : 'on')}>${icon('power', 56)}</button>
      <div class="grow" style="display:flex;flex-direction:column;gap:14px">
        <button type="button" class="open" aria-label="Open ${z.name} controls" @click=${() => (this.openId = z.id)}>
          <span class="zname">${z.name}</span>
          <span style="font-size:13px;letter-spacing:1px;color:#e6e8eb">${st.power ? 'NOW PLAYING' : 'ZONE'} | <strong>${st.power ? `${st.nowPlaying ?? st.sourceName ?? 'On'} · Vol ${st.volume}` : 'Off'}</strong></span>
        </button>
        <div class="ctl ${st.power ? '' : 'off'}">
          <button type="button" class="btn ${st.mute ? 'sel' : ''}" aria-label="${st.mute ? 'Unmute' : 'Mute'} ${z.name}" @click=${() => send(st.mute ? 'unmute' : 'mute')}>${icon('mute', 20, 1.7)}</button>
          <button type="button" class="btn" aria-label="${z.name} volume down" @click=${() => send('volume-down')}>−</button>
          <div class="grow">${slider(st.volume, (v) => this.send({ kind: 'zone', id: z.id, action: 'volume', value: v }), `${z.name} volume`)}</div>
          <span style="width:28px;text-align:right;font-weight:700">${st.volume}</span>
          <button type="button" class="btn" aria-label="${z.name} volume up" @click=${() => send('volume-up')}>+</button>
        </div>
      </div>
    </div>`;
  }

  private sheet(z: AudioZone) {
    const st = this.store.get('zone', z.id) ?? { power: false, volume: 0, mute: false };
    const room = z.roomId ? this.store.room(z.roomId) : undefined;
    return html`<div class="scrim" @click=${() => (this.openId = null)}></div>
      <section class="sheet" aria-label="${z.name} audio controls">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span><span class="label" style="display:block">Audio zone</span><span style="font-size:36px">${z.name}</span></span>
          ${iconButton('power', st.power ? `Turn off ${z.name}` : `Turn on ${z.name}`, () => this.send({ kind: 'zone', id: z.id, action: st.power ? 'off' : 'on' }), `btn square ${st.power ? 'on' : ''}`)}
        </div>
        ${room?.audioSources.length ? html`<div style="display:flex;flex-direction:column;gap:10px">
          <span class="label">Source</span>
          <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px">
            ${room.audioSources.slice(0, 10).map((s) => html`<button type="button" class="btn ${s.name === st.sourceName ? 'sel' : ''}" style="height:56px" @click=${() => this.send({ kind: 'media', id: room.id, action: 'source', value: s.id })}>${s.name}</button>`)}
          </div>
        </div>` : nothing}
        <div style="display:flex;align-items:center;gap:14px">
          <span class="label grow">Now playing · <span style="color:#fff">${st.nowPlaying ?? st.sourceName ?? '—'}</span></span>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <div class="grow">${slider(st.volume, (v) => this.send({ kind: 'zone', id: z.id, action: 'volume', value: v }), `${z.name} volume`)}</div>
          <span style="width:44px;text-align:right;font-weight:700;font-size:18px">${st.volume}</span>
        </div>
      </section>
      <button type="button" class="close" aria-label="Close controls" @click=${() => (this.openId = null)}>${icon('close', 34, 1.4)}</button>`;
  }
}

customElements.define('z-media', MediaPage);
customElements.define('z-audio', AudioPage);
