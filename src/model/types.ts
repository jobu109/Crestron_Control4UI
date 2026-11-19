// Shared house model. Every adapter (mock, Crestron contract, Home Assistant)
// produces a HouseConfig and keeps a map of live device states. The UI only
// ever reads this model and sends Commands, so it never knows which system
// is behind it.

export type ServiceId =
  | 'lighting'
  | 'shades'
  | 'climate'
  | 'comfort'
  | 'media'
  | 'audio'
  | 'scenes'
  | 'security'
  | 'cameras'
  | 'pool'
  | 'irrigation'
  | 'energy';

export const ALL_SERVICES: ServiceId[] = [
  'lighting', 'shades', 'climate', 'comfort', 'media', 'audio',
  'scenes', 'security', 'cameras', 'pool', 'irrigation', 'energy'
];

export interface Floor {
  id: string;
  name: string;
  /** Lower numbers are listed first (Basement before Main Level). */
  order: number;
}

export interface Light {
  id: string;
  name: string;
  dimmable: boolean;
}

export interface Shade {
  id: string;
  name: string;
  /** True when the shade reports a position, not just open/closed. */
  positionable: boolean;
}

export interface Source {
  id: string;
  name: string;
  kind: 'video' | 'audio';
  detail?: string;
}

export interface Room {
  id: string;
  name: string;
  floorId: string;
  icon?: string;
  lights: Light[];
  shades: Shade[];
  videoSources: Source[];
  audioSources: Source[];
  thermostatId?: string;
}

export interface Scene {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface AudioZone {
  id: string;
  name: string;
  roomId?: string;
}

export interface Thermostat {
  id: string;
  name: string;
  roomId?: string;
  modes: string[];
  fanModes: string[];
}

export interface HouseConfig {
  name: string;
  /** Only these services get a dock tile and a page. */
  services: ServiceId[];
  floors: Floor[];
  rooms: Room[];
  scenes: Scene[];
  audioZones: AudioZone[];
  thermostats: Thermostat[];
  /** Optional wallpaper image URL per page id (home, rooms, lighting, ...). */
  wallpapers?: Record<string, string>;
}

// ---- Live state, keyed by `${kind}:${id}` (see stateKey) ----

export interface LightState { on: boolean; level: number }
export interface ShadeState { position: number; moving?: 'opening' | 'closing' }
export interface RoomMediaState {
  power: boolean;
  activeSourceId?: string;
  volume: number;
  mute: boolean;
  title?: string;
  artist?: string;
  album?: string;
  artUrl?: string;
  progress?: { position: number; duration: number };
}
export interface ZoneState { power: boolean; sourceName?: string; volume: number; mute: boolean; nowPlaying?: string }
export interface SceneState { active: boolean }
export interface ThermostatState {
  power: boolean;
  mode: string;
  fanMode: string;
  setpoint: number;
  current: number;
  action?: 'heating' | 'cooling' | 'idle';
}

export type StateKind = 'light' | 'shade' | 'media' | 'zone' | 'scene' | 'thermostat';

export interface StateMap {
  light: LightState;
  shade: ShadeState;
  media: RoomMediaState;
  zone: ZoneState;
  scene: SceneState;
  thermostat: ThermostatState;
}

export function stateKey(kind: StateKind, id: string): string {
  return `${kind}:${id}`;
}

// ---- Commands from the UI ----

export type Command =
  | { kind: 'light'; id: string; action: 'on' | 'off' | 'toggle' }
  | { kind: 'light'; id: string; action: 'level'; value: number }
  | { kind: 'room-lights'; id: string; action: 'ambient' | 'on' | 'off' }
  | { kind: 'shade'; id: string; action: 'open' | 'close' | 'stop' }
  | { kind: 'shade'; id: string; action: 'position'; value: number }
  | { kind: 'room-shades'; id: string; action: 'open' | 'close' | 'stop' }
  | { kind: 'media'; id: string; action: 'source'; value: string }
  | { kind: 'media'; id: string; action: 'volume'; value: number }
  | { kind: 'media'; id: string; action: 'mute' | 'unmute' | 'off' | 'play' | 'pause' | 'next' | 'previous' | 'volume-up' | 'volume-down' }
  | { kind: 'zone'; id: string; action: 'on' | 'off' | 'mute' | 'unmute' | 'volume-up' | 'volume-down' }
  | { kind: 'zone'; id: string; action: 'volume'; value: number }
  | { kind: 'scene'; id: string; action: 'run' }
  | { kind: 'thermostat'; id: string; action: 'setpoint'; value: number }
  | { kind: 'thermostat'; id: string; action: 'mode' | 'fan'; value: string }
  | { kind: 'thermostat'; id: string; action: 'power'; value: boolean };
