import type { Command, HouseConfig, Room, StateKind, StateMap } from './types';
import { stateKey } from './types';

export type ConnectionState = 'connecting' | 'online' | 'offline';

/** Anything that can feed the store: mock data, a Crestron contract or Home Assistant. */
export interface Adapter {
  readonly name: string;
  /** Start talking to the system. The adapter calls store.setConfig/setState as data arrives. */
  connect(store: HouseStore): void | Promise<void>;
  send(command: Command): void;
  dispose?(): void;
}

const EMPTY: HouseConfig = {
  name: '',
  services: [],
  floors: [],
  rooms: [],
  scenes: [],
  audioZones: [],
  thermostats: []
};

/**
 * Single source of truth for the UI. Components listen for `change` and
 * re-render; they never talk to an adapter except through `send`.
 */
export class HouseStore extends EventTarget {
  config: HouseConfig = EMPTY;
  connection: ConnectionState = 'connecting';
  private states = new Map<string, unknown>();
  private adapter?: Adapter;
  private pending = false;

  attach(adapter: Adapter): void {
    this.adapter?.dispose?.();
    this.adapter = adapter;
    void adapter.connect(this);
  }

  setConfig(config: HouseConfig): void {
    this.config = config;
    this.notify();
  }

  setConnection(connection: ConnectionState): void {
    if (this.connection === connection) return;
    this.connection = connection;
    this.notify();
  }

  setState<K extends StateKind>(kind: K, id: string, patch: Partial<StateMap[K]>): void {
    const key = stateKey(kind, id);
    const previous = (this.states.get(key) ?? {}) as StateMap[K];
    this.states.set(key, { ...previous, ...patch });
    this.notify();
  }

  get<K extends StateKind>(kind: K, id: string): StateMap[K] | undefined {
    return this.states.get(stateKey(kind, id)) as StateMap[K] | undefined;
  }

  send(command: Command): void {
    this.adapter?.send(command);
  }

  // ---- convenience lookups ----

  room(id: string): Room | undefined {
    return this.config.rooms.find((r) => r.id === id);
  }

  roomsOnFloor(floorId: string): Room[] {
    return this.config.rooms.filter((r) => r.floorId === floorId);
  }

  sortedFloors() {
    return [...this.config.floors].sort((a, b) => a.order - b.order);
  }

  floorName(floorId: string): string {
    return this.config.floors.find((f) => f.id === floorId)?.name ?? '';
  }

  lightsOn(room: Room): number {
    return room.lights.filter((l) => this.get('light', l.id)?.on).length;
  }

  has(service: string): boolean {
    return (this.config.services as string[]).includes(service);
  }

  /** Batch notifications so a burst of feedback causes one render. */
  private notify(): void {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      this.dispatchEvent(new Event('change'));
    });
  }
}
