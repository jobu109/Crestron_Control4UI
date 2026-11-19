import type { Adapter, HouseStore } from '../model/store';
import type { Command, HouseConfig, Room, ServiceId } from '../model/types';

// Offline sample house that matches the design mockups. Used by `npm run dev`
// and as the reference for what the real adapters must produce.

const video = (id: string, name: string, detail?: string) => ({ id, name, kind: 'video' as const, detail });
const audio = (id: string, name: string, detail?: string) => ({ id, name, kind: 'audio' as const, detail });

const VIDEO = [
  video('apple-tv', 'Apple TV', 'Streaming'),
  video('cable', 'Cable', 'DirecTV'),
  video('xbox', 'Xbox', 'Gaming'),
  video('bluray', 'Blu-ray', 'Disc player'),
  video('roku', 'Roku', 'Streaming'),
  video('laptop', 'Laptop', 'HDMI wall plate')
];
const AUDIO = [
  audio('spotify', 'Spotify', 'Playing'),
  audio('airplay', 'AirPlay', 'From a phone'),
  audio('radio', 'Internet Radio', 'Presets'),
  audio('pandora', 'Pandora', 'Stations'),
  audio('turntable', 'Turntable', 'Phono input'),
  audio('bluetooth', 'Bluetooth', 'Pair a device')
];

function room(id: string, name: string, floorId: string, icon: string, lights: string[], shades: string[], media = false): Room {
  return {
    id,
    name,
    floorId,
    icon,
    lights: lights.map((n, i) => ({ id: `${id}-l${i + 1}`, name: n, dimmable: !/switch|fan/i.test(n) })),
    shades: shades.map((n, i) => ({ id: `${id}-s${i + 1}`, name: n, positionable: true })),
    videoSources: media ? VIDEO : [],
    audioSources: media ? AUDIO : [],
    thermostatId: 'main'
  };
}

export const SAMPLE_HOUSE: HouseConfig = {
  name: 'Sample House',
  services: ['lighting', 'shades', 'climate', 'media', 'audio', 'scenes'],
  floors: [
    { id: 'basement', name: 'Basement', order: 0 },
    { id: 'main', name: 'Main Level', order: 1 },
    { id: 'upper', name: 'Upper Level', order: 2 }
  ],
  rooms: [
    room('media-room', 'Media Room', 'basement', 'tv', ['Downlights', 'Step Lights', 'Sconces'], ['Front Shade', 'Side Shade'], true),
    room('bar', 'Bar', 'basement', 'dining', ['Pendants', 'Under Counter'], []),
    room('gym', 'Gym', 'basement', 'gym', ['Downlights'], []),
    room('guest', 'Guest Bedroom', 'basement', 'bed', ['Ceiling', 'Lamps'], ['Window Shade']),
    room('living', 'Living', 'main', 'sofa', ['Downlights', 'Pendants', 'Strip Lights', 'Lamps'], ['Door Shade', 'Window Shade', 'Small Window Shade'], true),
    room('dining', 'Dining', 'main', 'dining', ['Downlights', 'Chandelier'], ['Door Shade', 'Window Shade']),
    room('kitchen', 'Kitchen', 'main', 'kitchen', ['Downlights', 'Island Pendants', 'Under Cabinet', 'Toe Kick'], ['Sink Shade'], true),
    room('office', 'Office', 'main', 'desk', ['Downlights', 'Desk Lamp'], ['Window Shade']),
    room('entry', 'Entry', 'main', 'door', ['Foyer', 'Porch'], []),
    room('garage', 'Garage', 'main', 'garage', ['Overheads'], []),
    room('primary', 'Primary Bedroom', 'upper', 'bed', ['Downlights', 'Bedside Left', 'Bedside Right', 'Cove'], ['Left Shade', 'Right Shade', 'Blackout'], true),
    room('primary-bath', 'Primary Bath', 'upper', 'bath', ['Vanity', 'Shower'], []),
    room('bedroom-2', 'Bedroom 2', 'upper', 'bed', ['Ceiling'], ['Window Shade']),
    room('bedroom-3', 'Bedroom 3', 'upper', 'bed', ['Ceiling'], []),
    room('bathroom', 'Bathroom', 'upper', 'bath', ['Vanity'], []),
    room('laundry', 'Laundry', 'upper', 'laundry', ['Ceiling'], [])
  ],
  scenes: [
    { id: 'welcome', name: 'Welcome Home', icon: 'arrive', description: 'Entry lights, unlock, music' },
    { id: 'goodbye', name: 'Goodbye', icon: 'leave', description: 'All off, lock up, arm alarm' },
    { id: 'morning', name: 'Morning', icon: 'sunrise', description: 'Shades open, kitchen on' },
    { id: 'dinner', name: 'Dinner', icon: 'dining', description: 'Dining 60%, soft music' },
    { id: 'relax', name: 'Relax', icon: 'cup', description: 'Living ambient, shades half' },
    { id: 'entertain', name: 'Entertain', icon: 'music', description: 'Accents up, music everywhere' },
    { id: 'goodnight', name: 'Goodnight', icon: 'moon', description: 'Path lights, lock, arm stay' },
    { id: 'all-off', name: 'All Off', icon: 'power', description: 'Every light and source' }
  ],
  audioZones: [
    { id: 'z-living', name: 'Living Room', roomId: 'living' },
    { id: 'z-kitchen', name: 'Kitchen', roomId: 'kitchen' },
    { id: 'z-patio', name: 'Patio' },
    { id: 'z-primary', name: 'Primary Bedroom', roomId: 'primary' },
    { id: 'z-office', name: 'Office', roomId: 'office' },
    { id: 'z-garage', name: 'Garage', roomId: 'garage' }
  ],
  thermostats: [
    { id: 'main', name: 'Main Level', modes: ['Heat', 'Cool', 'Auto', 'Fan', 'Dry', 'Off'], fanModes: ['Auto', 'Low', 'Medium', 'High'] }
  ]
};

export class MockAdapter implements Adapter {
  readonly name = 'mock';
  private store?: HouseStore;

  constructor(private config: HouseConfig = SAMPLE_HOUSE, services?: ServiceId[]) {
    if (services) this.config = { ...config, services };
  }

  connect(store: HouseStore): void {
    this.store = store;
    store.setConfig(this.config);
    this.seed(store);
    store.setConnection('online');
  }

  send(c: Command): void {
    const s = this.store;
    if (!s) return;
    switch (c.kind) {
      case 'light': {
        const cur = s.get('light', c.id) ?? { on: false, level: 0 };
        if (c.action === 'level') s.setState('light', c.id, { level: c.value, on: c.value > 0 });
        else if (c.action === 'toggle') s.setState('light', c.id, { on: !cur.on, level: cur.on ? 0 : cur.level || 100 });
        else s.setState('light', c.id, { on: c.action === 'on', level: c.action === 'on' ? cur.level || 100 : 0 });
        break;
      }
      case 'room-lights': {
        const r = s.room(c.id);
        r?.lights.forEach((l, i) => {
          const level = c.action === 'off' ? 0 : c.action === 'on' ? 100 : [60, 40, 0, 35][i % 4];
          s.setState('light', l.id, { level, on: level > 0 });
        });
        break;
      }
      case 'shade':
        if (c.action === 'position') s.setState('shade', c.id, { position: c.value });
        else if (c.action !== 'stop') s.setState('shade', c.id, { position: c.action === 'open' ? 100 : 0 });
        break;
      case 'room-shades':
        s.room(c.id)?.shades.forEach((sh) => {
          if (c.action !== 'stop') s.setState('shade', sh.id, { position: c.action === 'open' ? 100 : 0 });
        });
        break;
      case 'media': {
        const cur = s.get('media', c.id) ?? { power: false, volume: 30, mute: false };
        if (c.action === 'source') s.setState('media', c.id, { power: true, activeSourceId: c.value, title: this.sourceName(c.id, c.value) });
        else if (c.action === 'volume') s.setState('media', c.id, { volume: c.value });
        else if (c.action === 'volume-up') s.setState('media', c.id, { volume: Math.min(100, cur.volume + 2) });
        else if (c.action === 'volume-down') s.setState('media', c.id, { volume: Math.max(0, cur.volume - 2) });
        else if (c.action === 'mute' || c.action === 'unmute') s.setState('media', c.id, { mute: c.action === 'mute' });
        else if (c.action === 'off') s.setState('media', c.id, { power: false, activeSourceId: undefined });
        break;
      }
      case 'zone': {
        const cur = s.get('zone', c.id) ?? { power: false, volume: 25, mute: false };
        if (c.action === 'volume') s.setState('zone', c.id, { volume: c.value });
        else if (c.action === 'volume-up') s.setState('zone', c.id, { volume: Math.min(100, cur.volume + 2) });
        else if (c.action === 'volume-down') s.setState('zone', c.id, { volume: Math.max(0, cur.volume - 2) });
        else if (c.action === 'mute' || c.action === 'unmute') s.setState('zone', c.id, { mute: c.action === 'mute' });
        else s.setState('zone', c.id, { power: c.action === 'on' });
        break;
      }
      case 'scene':
        this.config.scenes.forEach((sc) => s.setState('scene', sc.id, { active: sc.id === c.id }));
        break;
      case 'thermostat':
        if (c.action === 'setpoint') s.setState('thermostat', c.id, { setpoint: c.value });
        else if (c.action === 'mode') s.setState('thermostat', c.id, { mode: c.value });
        else if (c.action === 'fan') s.setState('thermostat', c.id, { fanMode: c.value });
        else s.setState('thermostat', c.id, { power: Boolean(c.value) });
        break;
    }
  }

  private sourceName(roomId: string, sourceId: string): string {
    const r = this.store?.room(roomId);
    return [...(r?.videoSources ?? []), ...(r?.audioSources ?? [])].find((x) => x.id === sourceId)?.name ?? '';
  }

  private seed(s: HouseStore): void {
    const on = new Set(['living-l1', 'living-l2', 'living-l4', 'kitchen-l1', 'kitchen-l2', 'kitchen-l3', 'kitchen-l4', 'office-l2', 'entry-l1', 'entry-l2', 'garage-l1', 'bar-l1', 'bar-l2', 'media-room-l2', 'primary-l4']);
    for (const r of this.config.rooms) {
      r.lights.forEach((l, i) => {
        const lit = on.has(l.id);
        s.setState('light', l.id, { on: lit, level: lit ? [100, 60, 35, 80][i % 4] : 0 });
      });
      r.shades.forEach((sh, i) => s.setState('shade', sh.id, { position: i % 2 ? 0 : 100 }));
      if (r.videoSources.length) s.setState('media', r.id, { power: false, volume: 30, mute: false });
    }
    s.setState('media', 'living', { power: true, activeSourceId: 'apple-tv', volume: 45, mute: false, title: 'Apple TV' });
    s.setState('media', 'media-room', { power: true, activeSourceId: 'apple-tv', volume: 38, mute: false, title: 'Apple TV' });
    const zones: Record<string, [boolean, string, number, boolean?]> = {
      'z-living': [true, 'Spotify', 35],
      'z-kitchen': [true, 'Spotify', 28],
      'z-patio': [true, 'AirPlay', 50, true],
      'z-primary': [false, 'Radio', 20],
      'z-office': [false, 'Spotify', 25],
      'z-garage': [false, 'Radio', 40]
    };
    for (const [id, z] of Object.entries(zones)) {
      s.setState('zone', id, { power: z[0], sourceName: z[1], volume: z[2], mute: !!z[3] });
    }
    s.setState('scene', 'welcome', { active: true });
    s.setState('thermostat', 'main', { power: true, mode: 'Cool', fanMode: 'Auto', setpoint: 72, current: 71, action: 'cooling' });
  }
}
