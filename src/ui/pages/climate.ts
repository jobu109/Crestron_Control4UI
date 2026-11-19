import { css, html, nothing } from 'lit';
import { ZPage, iconButton, shared } from '../base';

export class ClimatePage extends ZPage {
  static properties = { ...ZPage.properties, thermostatId: { state: true } };
  thermostatId = '';

  static styles = [shared, css`
    .content { top: 108px; height: 620px; left: 40px; right: 40px; display: flex; gap: 20px; }
    .stat { flex: 1; padding: 28px; display: flex; align-items: center; gap: 28px; }
    .opts { width: 240px; display: flex; flex-direction: column; gap: 12px; }
    .opts h2 { font-size: 22px; font-weight: 700; margin-top: 8px; }
    .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .grid2 .btn { height: 60px; font-size: 16px; }
    .dial { width: 320px; height: 320px; position: relative; flex-shrink: 0; }
    .dial .mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
    .dial .sp { font-size: 100px; font-weight: 200; line-height: 1; }
    .side { display: flex; flex-direction: column; gap: 16px; }
    .side .btn { width: 76px; height: 76px; border-radius: 16px; }
    .pick { display: flex; gap: 8px; }
  `];

  render() {
    const list = this.store.config.thermostats;
    const t = list.find((x) => x.id === this.thermostatId) ?? list[0];
    if (!t) return html`<div class="toolbar"><span class="hint">No thermostats reported</span></div>`;
    const st = this.store.get('thermostat', t.id) ?? { power: false, mode: '', fanMode: '', setpoint: 0, current: 0 };
    const circ = 2 * Math.PI * 140;
    const arc = circ * 0.75;
    const fill = arc * Math.min(1, Math.max(0, (st.setpoint - 50) / 40));
    return html`
      ${list.length > 1 ? html`<div class="toolbar" style="top:104px;left:40px;justify-content:flex-start"><div class="pick">
        ${list.map((x) => html`<button type="button" class="btn ${x.id === t.id ? 'sel' : ''}" @click=${() => (this.thermostatId = x.id)}>${x.name}</button>`)}
      </div></div>` : nothing}
      <div class="content" style=${list.length > 1 ? 'top:168px;height:560px' : ''}>
        <section class="panel stat" aria-label="${t.name} thermostat">
          <div class="opts">
            ${t.fanModes.length ? html`<h2>Fan Speed</h2><div class="grid2">${t.fanModes.map((f) => html`<button type="button" class="btn ${f === st.fanMode ? 'sel' : ''}" @click=${() => this.send({ kind: 'thermostat', id: t.id, action: 'fan', value: f })}>${f}</button>`)}</div>` : nothing}
            <h2>Mode</h2>
            <div class="grid2">${t.modes.map((m) => html`<button type="button" class="btn ${m === st.mode ? 'sel' : ''}" @click=${() => this.send({ kind: 'thermostat', id: t.id, action: 'mode', value: m })}>${m}</button>`)}</div>
          </div>
          <div class="dial">
            <svg width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="Target ${st.setpoint} degrees, room ${st.current} degrees">
              <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3BA7F0"></stop><stop offset="0.5" stop-color="#7B4DFF"></stop><stop offset="1" stop-color="#F0473C"></stop></linearGradient></defs>
              <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="16" stroke-linecap="round" stroke-dasharray="${arc} ${circ}" transform="rotate(135 160 160)"></circle>
              <circle cx="160" cy="160" r="140" fill="none" stroke="url(#ring)" stroke-width="16" stroke-linecap="round" stroke-dasharray="${fill} ${circ}" transform="rotate(135 160 160)"></circle>
            </svg>
            <div class="mid">
              <span class="sp">${st.setpoint}°</span>
              <span style="font-size:15px;letter-spacing:1px;text-align:center;line-height:1.2">TARGET<br />TEMPERATURE</span>
              <span style="width:160px;height:1px;background:rgba(255,255,255,0.5);margin:6px 0"></span>
              <span style="font-size:14px"><strong>CURRENT TEMP.</strong> ${st.current}°</span>
            </div>
          </div>
          <div class="side">
            ${iconButton('power', st.power ? 'Climate is on, tap to turn off' : 'Climate is off, tap to turn on', () => this.send({ kind: 'thermostat', id: t.id, action: 'power', value: !st.power }), `btn square ${st.power ? 'on' : ''}`)}
            <button type="button" class="btn square" aria-label="Raise setpoint" @click=${() => this.send({ kind: 'thermostat', id: t.id, action: 'setpoint', value: st.setpoint + 1 })}>+</button>
            <button type="button" class="btn square" aria-label="Lower setpoint" @click=${() => this.send({ kind: 'thermostat', id: t.id, action: 'setpoint', value: st.setpoint - 1 })}>−</button>
          </div>
        </section>
      </div>`;
  }
}

customElements.define('z-climate', ClimatePage);
