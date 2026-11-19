import type { Adapter, HouseStore } from '../model/store';
import type { AudioZone, Command, Floor, HouseConfig, Room, Scene, ServiceId, Source, Thermostat } from '../model/types';

// Builds the house from Home Assistant's own floor, area, device and entity
// registries, then mirrors entity states into the store. Home Assistant hands
// the panel a new `hass` object on every state change; call update(hass).

interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HassLike {
  states: Record<string, HassEntity>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;
  callWS<T>(msg: { type: string; [key: string]: unknown }): Promise<T>;
}

interface FloorEntry { floor_id: string; name: string; level: number | null }
interface AreaEntry { area_id: string; name: string; floor_id: string | null; icon?: string | null }
interface DeviceEntry { id: string; area_id: string | null }
interface EntityEntry {
  entity_id: string;
  area_id: string | null;
  device_id: string | null;
  hidden_by?: string | null;
  disabled_by?: string | null;
  entity_category?: string | null;
}

const UNASSIGNED = '_other';

export class HomeAssistantAdapter implements Adapter {
  readonly name = 'home-assistant';
  private store?: HouseStore;
  private hass?: HassLike;
  /** Zenith room id -> media_player entity for that room. */
  private roomMedia = new Map<string, string>();
  private built = false;

  constructor(hass?: HassLike) {
    this.hass = hass;
  }

  async connect(store: HouseStore): Promise<void> {
    this.store = store;
    store.setConnection('connecting');
    if (this.hass) await this.build();
  }

  /** Call whenever Home Assistant sets a new hass object on the panel. */
  update(hass: HassLike): void {
    const first = !this.hass;
    this.hass = hass;
    if (first && this.store) void this.build();
    else if (this.built) this.syncStates();
  }

  private async build(): Promise<void> {
    const hass = this.hass;
    const store = this.store;
    if (!hass || !store) return;
    try {
      const [floors, areas, devices, entities] = await Promise.all([
        hass.callWS<FloorEntry[]>({ type: 'config/floor_registry/list' }).catch(() => [] as FloorEntry[]),
        hass.callWS<AreaEntry[]>({ type: 'config/area_registry/list' }),
        hass.callWS<DeviceEntry[]>({ type: 'config/device_registry/list' }),
        hass.callWS<EntityEntry[]>({ type: 'config/entity_registry/list' })
      ]);
      store.setConfig(this.toConfig(floors, areas, devices, entities));
      this.built = true;
      this.syncStates();
      store.setConnection('online');
    } catch (error) {
      console.error('Zenith: could not read Home Assistant registries', error);
      store.setConnection('offline');
    }
  }

  private toConfig(floors: FloorEntry[], areas: AreaEntry[], devices: DeviceEntry[], entities: EntityEntry[]): HouseConfig {
    const hass = this.hass!;
    const deviceArea = new Map(devices.map((d) => [d.id, d.area_id]));
    const areaOf = (e: EntityEntry) => e.area_id ?? (e.device_id ? deviceArea.get(e.device_id) ?? null : null);
    const visible = entities.filter((e) => !e.hidden_by && !e.disabled_by && !e.entity_category && hass.states[e.entity_id]);

    const outFloors: Floor[] = floors
      .map((f, i) => ({ id: f.floor_id, name: f.name, order: f.level ?? i }));
    const rooms = new Map<string, Room>();
    for (const a of areas) {
      rooms.set(a.area_id, {
        id: a.area_id,
        name: a.name,
        floorId: a.floor_id ?? UNASSIGNED,
        lights: [],
        shades: [],
        videoSources: [],
        audioSources: []
      });
    }
    if ([...rooms.values()].some((r) => r.floorId === UNASSIGNED)) {
      outFloors.push({ id: UNASSIGNED, name: 'Other', order: 999 });
    }

    const scenes: Scene[] = [];
    const zones: AudioZone[] = [];
    const thermostats: Thermostat[] = [];
    const services = new Set<ServiceId>();

    for (const e of visible) {
      const entity = hass.states[e.entity_id];
      const domain = e.entity_id.split('.')[0];
      const attrs = entity.attributes;
      const name = String(attrs.friendly_name ?? e.entity_id);
      const room = rooms.get(areaOf(e) ?? '');
      switch (domain) {
        case 'light': {
          const modes = attrs.supported_color_modes as string[] | undefined;
          room?.lights.push({ id: e.entity_id, name: shortName(name, room.name), dimmable: !(modes && modes.length === 1 && modes[0] === 'onoff') });
          services.add('lighting');
          break;
        }
        case 'cover':
          room?.shades.push({ id: e.entity_id, name: shortName(name, room.name), positionable: attrs.current_position !== undefined });
          services.add('shades');
          break;
        case 'media_player': {
          const isVideo = attrs.device_class === 'tv' || attrs.device_class === 'receiver';
          const sources: Source[] = ((attrs.source_list as string[] | undefined) ?? []).map((s) => ({ id: s, name: s, kind: isVideo ? 'video' : 'audio' }));
          if (room && !this.roomMedia.has(room.id)) {
            this.roomMedia.set(room.id, e.entity_id);
            if (isVideo) room.videoSources = sources;
            else room.audioSources = sources;
            services.add('media');
          }
          if (!isVideo) {
            zones.push({ id: e.entity_id, name, roomId: room?.id });
            services.add('audio');
          }
          break;
        }
        case 'climate':
          thermostats.push({
            id: e.entity_id,
            name,
            roomId: room?.id,
            modes: ((attrs.hvac_modes as string[] | undefined) ?? []).map(title),
            fanModes: ((attrs.fan_modes as string[] | undefined) ?? []).map(title)
          });
          if (room) room.thermostatId = e.entity_id;
          services.add('climate');
          break;
        case 'scene':
          scenes.push({ id: e.entity_id, name });
          services.add('scenes');
          break;
      }
    }

    return {
      name: 'Home',
      services: [...services],
      floors: outFloors,
      rooms: [...rooms.values()],
      scenes,
      audioZones: zones,
      thermostats
    };
  }

  private syncStates(): void {
    const hass = this.hass;
    const store = this.store;
    if (!hass || !store) return;
    const cfg = store.config;
    for (const room of cfg.rooms) {
      for (const l of room.lights) {
        const e = hass.states[l.id];
        if (!e) continue;
        const brightness = Number(e.attributes.brightness ?? (e.state === 'on' ? 255 : 0));
        store.setState('light', l.id, { on: e.state === 'on', level: Math.round((brightness / 255) * 100) });
      }
      for (const sh of room.shades) {
        const e = hass.states[sh.id];
        if (!e) continue;
        const pos = e.attributes.current_position;
        store.setState('shade', sh.id, {
          position: typeof pos === 'number' ? pos : e.state === 'open' ? 100 : 0,
          moving: e.state === 'opening' ? 'opening' : e.state === 'closing' ? 'closing' : undefined
        });
      }
      const mediaId = this.roomMedia.get(room.id);
      const m = mediaId ? hass.states[mediaId] : undefined;
      if (m) {
        store.setState('media', room.id, {
          power: m.state !== 'off' && m.state !== 'standby',
          activeSourceId: m.attributes.source as string | undefined,
          volume: Math.round(Number(m.attributes.volume_level ?? 0) * 100),
          mute: Boolean(m.attributes.is_volume_muted),
          title: (m.attributes.media_title as string | undefined) ?? (m.attributes.source as string | undefined),
          artist: m.attributes.media_artist as string | undefined,
          album: m.attributes.media_album_name as string | undefined,
          artUrl: m.attributes.entity_picture as string | undefined
        });
      }
    }
    for (const z of cfg.audioZones) {
      const e = hass.states[z.id];
      if (!e) continue;
      store.setState('zone', z.id, {
        power: e.state !== 'off' && e.state !== 'standby',
        sourceName: e.attributes.source as string | undefined,
        volume: Math.round(Number(e.attributes.volume_level ?? 0) * 100),
        mute: Boolean(e.attributes.is_volume_muted),
        nowPlaying: e.attributes.media_title as string | undefined
      });
    }
    for (const t of cfg.thermostats) {
      const e = hass.states[t.id];
      if (!e) continue;
      const action = e.attributes.hvac_action;
      store.setState('thermostat', t.id, {
        power: e.state !== 'off',
        mode: title(e.state),
        fanMode: title(String(e.attributes.fan_mode ?? '')),
        setpoint: Number(e.attributes.temperature ?? 0),
        current: Number(e.attributes.current_temperature ?? 0),
        action: action === 'heating' ? 'heating' : action === 'cooling' ? 'cooling' : 'idle'
      });
    }
  }

  send(c: Command): void {
    const hass = this.hass;
    if (!hass) return;
    const call = (domain: string, service: string, data: Record<string, unknown>) => void hass.callService(domain, service, data);
    switch (c.kind) {
      case 'light':
        if (c.action === 'level') call('light', c.value > 0 ? 'turn_on' : 'turn_off', c.value > 0 ? { entity_id: c.id, brightness_pct: c.value } : { entity_id: c.id });
        else call('light', c.action === 'toggle' ? 'toggle' : c.action === 'on' ? 'turn_on' : 'turn_off', { entity_id: c.id });
        break;
      case 'room-lights': {
        const ids = this.store?.room(c.id)?.lights.map((l) => l.id) ?? [];
        if (!ids.length) break;
        if (c.action === 'off') call('light', 'turn_off', { entity_id: ids });
        else call('light', 'turn_on', { entity_id: ids, brightness_pct: c.action === 'on' ? 100 : 40 });
        break;
      }
      case 'shade':
        if (c.action === 'position') call('cover', 'set_cover_position', { entity_id: c.id, position: c.value });
        else call('cover', `${c.action}_cover`, { entity_id: c.id });
        break;
      case 'room-shades': {
        const ids = this.store?.room(c.id)?.shades.map((s) => s.id) ?? [];
        if (ids.length) call('cover', `${c.action}_cover`, { entity_id: ids });
        break;
      }
      case 'media': {
        const entity = this.roomMedia.get(c.id);
        if (entity) this.mediaCommand(entity, c, call);
        break;
      }
      case 'zone':
        this.mediaCommand(c.id, c.action === 'on' || c.action === 'off' ? { action: c.action } : c, call);
        break;
      case 'scene':
        call('scene', 'turn_on', { entity_id: c.id });
        break;
      case 'thermostat':
        if (c.action === 'setpoint') call('climate', 'set_temperature', { entity_id: c.id, temperature: c.value });
        else if (c.action === 'mode') call('climate', 'set_hvac_mode', { entity_id: c.id, hvac_mode: c.value.toLowerCase() });
        else if (c.action === 'fan') call('climate', 'set_fan_mode', { entity_id: c.id, fan_mode: c.value.toLowerCase() });
        else call('climate', c.value ? 'turn_on' : 'turn_off', { entity_id: c.id });
        break;
    }
  }

  private mediaCommand(entity: string, c: { action: string; value?: unknown }, call: (d: string, s: string, data: Record<string, unknown>) => void): void {
    const id = { entity_id: entity };
    switch (c.action) {
      case 'source': call('media_player', 'select_source', { ...id, source: c.value }); break;
      case 'volume': call('media_player', 'volume_set', { ...id, volume_level: Number(c.value) / 100 }); break;
      case 'volume-up': call('media_player', 'volume_up', id); break;
      case 'volume-down': call('media_player', 'volume_down', id); break;
      case 'mute': call('media_player', 'volume_mute', { ...id, is_volume_muted: true }); break;
      case 'unmute': call('media_player', 'volume_mute', { ...id, is_volume_muted: false }); break;
      case 'off': call('media_player', 'turn_off', id); break;
      case 'on': call('media_player', 'turn_on', id); break;
      case 'play': call('media_player', 'media_play', id); break;
      case 'pause': call('media_player', 'media_pause', id); break;
      case 'next': call('media_player', 'media_next_track', id); break;
      case 'previous': call('media_player', 'media_previous_track', id); break;
    }
  }
}

function title(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : value;
}

/** "Living Room Downlights" in room "Living Room" becomes "Downlights". */
function shortName(name: string, roomName: string): string {
  const trimmed = name.startsWith(roomName + ' ') ? name.slice(roomName.length + 1) : name;
  return trimmed || name;
}
