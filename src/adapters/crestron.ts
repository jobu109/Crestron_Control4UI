import type { Adapter, HouseStore } from '../model/store';
import type { Command, HouseConfig, StateKind, StateMap } from '../model/types';
import { FrameCollector } from './wire';

// DRAFT: talks to the processor through the ZenithUI CH5 contract described
// in docs/CONTRACT.md. Nothing on the program side implements this yet; the
// existing Panel Room Router (serial 101-108) is untouched.

/** Minimal slice of CrComLib that this adapter uses. */
export interface CrComLibLike {
  subscribeState(type: 'b' | 'n' | 's', signal: string, cb: (value: never) => void): string;
  unsubscribeState(type: 'b' | 'n' | 's', signal: string, id: string): void;
  publishEvent(type: 'b' | 'n' | 's', signal: string, value: boolean | number | string): void;
}

/** Contract signal names. Kept in one place so they match the .cse2j contract. */
export const CONTRACT = {
  connected: 'ZenithUI.House.Connected_FB',
  configFrame: 'ZenithUI.House.Config_FB',
  configPage: 'ZenithUI.House.Config_Page',
  stateFrame: 'ZenithUI.House.State_FB',
  statePage: 'ZenithUI.House.State_Page',
  command: 'ZenithUI.House.Command',
  hello: 'ZenithUI.House.Hello'
} as const;

/** One entry in a state document from the processor. */
export interface WireState {
  kind: StateKind;
  id: string;
  [field: string]: unknown;
}

export interface StateDocument {
  states: WireState[];
}

/** Wire room number used for house-wide streams (config and state). */
export const HOUSE_ROOM = 0;

export class CrestronContractAdapter implements Adapter {
  readonly name = 'crestron';
  private store?: HouseStore;
  private subs: Array<[('b' | 'n' | 's'), string, string]> = [];
  private config = new FrameCollector<HouseConfig>(HOUSE_ROOM, 'c');
  private state = new FrameCollector<StateDocument>(HOUSE_ROOM, 's');

  constructor(private lib: CrComLibLike) {}

  connect(store: HouseStore): void {
    this.store = store;
    store.setConnection('connecting');
    this.sub('b', CONTRACT.connected, (online: boolean) => {
      store.setConnection(online ? 'online' : 'offline');
      if (online) this.lib.publishEvent('s', CONTRACT.hello, JSON.stringify({ v: 1, t: Date.now() }));
    });
    this.sub('s', CONTRACT.configFrame, (raw: string) => this.onFrame(raw, this.config, CONTRACT.configPage, (doc) => store.setConfig(normalize(doc))));
    this.sub('s', CONTRACT.stateFrame, (raw: string) => this.onFrame(raw, this.state, CONTRACT.statePage, (doc) => this.applyStates(doc)));
  }

  send(c: Command): void {
    // Compact keys keep every command under the 255-byte serial limit.
    const payload: Record<string, unknown> = { k: c.kind, i: c.id, a: c.action };
    if ('value' in c) payload.v = c.value;
    const text = JSON.stringify(payload);
    if (text.length > 255) {
      console.warn('ZenithUI command too long, dropped', c);
      return;
    }
    this.lib.publishEvent('s', CONTRACT.command, text);
  }

  dispose(): void {
    for (const [type, signal, id] of this.subs) this.lib.unsubscribeState(type, signal, id);
    this.subs = [];
  }

  private sub(type: 'b' | 'n' | 's', signal: string, cb: (value: never) => void): void {
    this.subs.push([type, signal, this.lib.subscribeState(type, signal, cb)]);
  }

  private onFrame<T>(raw: string, collector: FrameCollector<T>, pageSignal: string, done: (doc: T) => void): void {
    if (!raw) return;
    try {
      const result = collector.accept(raw);
      if (result.status === 'partial' && result.requestPage) this.requestPage(pageSignal, result.requestPage);
      if (result.status === 'complete') done(result.document);
    } catch (error) {
      console.warn('ZenithUI frame rejected', error);
    }
  }

  /** Same handshake the existing bridge uses: analog 0, then the page, so SIMPL+ sees a change. */
  private requestPage(signal: string, page: number): void {
    this.lib.publishEvent('n', signal, 0);
    setTimeout(() => this.lib.publishEvent('n', signal, page), 25);
  }

  private applyStates(doc: StateDocument): void {
    const store = this.store;
    if (!store || !Array.isArray(doc.states)) return;
    for (const entry of doc.states) {
      const { kind, id, ...fields } = entry;
      if (typeof id !== 'string') continue;
      store.setState(kind, id, fields as Partial<StateMap[typeof kind]>);
    }
  }
}

/** Fill optional arrays so a sparse document from the processor is still valid. */
export function normalize(doc: Partial<HouseConfig>): HouseConfig {
  return {
    name: doc.name ?? '',
    services: doc.services ?? [],
    floors: doc.floors ?? [],
    rooms: (doc.rooms ?? []).map((r) => ({
      ...r,
      lights: r.lights ?? [],
      shades: r.shades ?? [],
      videoSources: r.videoSources ?? [],
      audioSources: r.audioSources ?? []
    })),
    scenes: doc.scenes ?? [],
    audioZones: doc.audioZones ?? [],
    thermostats: doc.thermostats ?? [],
    wallpapers: doc.wallpapers
  };
}
