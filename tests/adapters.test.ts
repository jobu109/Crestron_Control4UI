import { describe, expect, it } from 'vitest';
import { FrameCollector, encodeFrames } from '../src/adapters/wire';
import { HouseStore } from '../src/model/store';
import { MockAdapter, SAMPLE_HOUSE } from '../src/adapters/mock';
import { CONTRACT, CrestronContractAdapter, HOUSE_ROOM, type CrComLibLike } from '../src/adapters/crestron';
import { HomeAssistantAdapter, type HassLike } from '../src/adapters/home-assistant';

const tick = () => new Promise((r) => setTimeout(r, 0));
const EPOCH = '0123456789abcdef';

describe('wire framing', () => {
  it('round-trips a long Unicode document through <=255 byte frames', () => {
    const doc = { room_id: 13, names: Array.from({ length: 60 }, (_, i) => `Café “${i}” ✓`) };
    const frames = encodeFrames(13, 'a', EPOCH, doc);
    expect(frames.length).toBeGreaterThan(3);
    frames.forEach((f) => expect(f.length).toBeLessThanOrEqual(255));
    const c = new FrameCollector(13, 'a');
    let result;
    for (const f of frames) result = c.accept(f);
    expect(result).toEqual({ status: 'complete', document: doc });
  });

  it('asks for a missing page and ignores other rooms', () => {
    const frames = encodeFrames(1, 'c', EPOCH, { x: 'y'.repeat(600) });
    const c = new FrameCollector(1, 'c');
    expect(c.accept(frames[1])).toEqual({ status: 'partial', requestPage: 1 });
    expect(new FrameCollector(2, 'c').accept(frames[0])).toEqual({ status: 'ignored' });
  });

  it('rejects conflicting frames', () => {
    const frames = encodeFrames(1, 'c', EPOCH, { x: 'y'.repeat(600) });
    const c = new FrameCollector(1, 'c');
    c.accept(frames[0]);
    const bad = JSON.parse(frames[0]);
    bad.d = 'AAAA';
    expect(() => c.accept(JSON.stringify(bad))).toThrow();
  });
});

describe('mock adapter', () => {
  it('loads the sample house and applies commands', async () => {
    const store = new HouseStore();
    store.attach(new MockAdapter());
    expect(store.config.floors.map((f) => f.name)).toEqual(['Basement', 'Main Level', 'Upper Level']);
    store.send({ kind: 'room-lights', id: 'living', action: 'off' });
    expect(store.lightsOn(store.room('living')!)).toBe(0);
    store.send({ kind: 'zone', id: 'z-living', action: 'volume', value: 61 });
    expect(store.get('zone', 'z-living')?.volume).toBe(61);
    await tick();
  });
});

class FakeCrComLib implements CrComLibLike {
  subs = new Map<string, (v: never) => void>();
  published: Array<[string, string, unknown]> = [];
  subscribeState(type: string, signal: string, cb: (v: never) => void) { this.subs.set(`${type}:${signal}`, cb); return signal; }
  unsubscribeState() {}
  publishEvent(type: string, signal: string, value: unknown) { this.published.push([type, signal, value]); }
  emit(type: string, signal: string, value: unknown) { this.subs.get(`${type}:${signal}`)?.(value as never); }
}

describe('crestron contract adapter', () => {
  it('builds config from frames, applies states and sends compact commands', () => {
    const lib = new FakeCrComLib();
    const store = new HouseStore();
    store.attach(new CrestronContractAdapter(lib));
    lib.emit('b', CONTRACT.connected, true);
    expect(store.connection).toBe('online');
    const config = { name: 'House', services: ['lighting'], floors: [{ id: 'f1', name: 'Main Level', order: 1 }], rooms: [{ id: '13', name: 'Living Room', floorId: 'f1', lights: [{ id: '437', name: 'Main Hall', dimmable: true }] }] };
    for (const f of encodeFrames(HOUSE_ROOM, 'c', EPOCH, config)) lib.emit('s', CONTRACT.configFrame, f);
    expect(store.room('13')?.lights[0].name).toBe('Main Hall');
    expect(store.room('13')?.shades).toEqual([]);
    for (const f of encodeFrames(HOUSE_ROOM, 's', 'fedcba9876543210', { states: [{ kind: 'light', id: '437', on: true, level: 50 }] })) lib.emit('s', CONTRACT.stateFrame, f);
    expect(store.get('light', '437')).toEqual({ on: true, level: 50 });
    store.send({ kind: 'light', id: '437', action: 'level', value: 75 });
    expect(lib.published[lib.published.length - 1]).toEqual(['s', CONTRACT.command, '{"k":"light","i":"437","a":"level","v":75}']);
  });
});

describe('home assistant adapter', () => {
  it('builds floors and rooms from the registries', async () => {
    const calls: unknown[] = [];
    const hass: HassLike = {
      states: {
        'light.living_downlights': { entity_id: 'light.living_downlights', state: 'on', attributes: { friendly_name: 'Living Room Downlights', brightness: 128, supported_color_modes: ['brightness'] } },
        'cover.living_shade': { entity_id: 'cover.living_shade', state: 'open', attributes: { friendly_name: 'Living Room Shade', current_position: 100 } },
        'media_player.kitchen': { entity_id: 'media_player.kitchen', state: 'playing', attributes: { friendly_name: 'Kitchen', volume_level: 0.3, source_list: ['Spotify'] } }
      },
      callService: async (...args) => { calls.push(args); },
      callWS: async <T,>(msg: { type: string }) => {
        const data: Record<string, unknown> = {
          'config/floor_registry/list': [{ floor_id: 'main', name: 'Main Level', level: 1 }],
          'config/area_registry/list': [{ area_id: 'living', name: 'Living Room', floor_id: 'main' }, { area_id: 'kitchen', name: 'Kitchen', floor_id: null }],
          'config/device_registry/list': [{ id: 'd1', area_id: 'kitchen' }],
          'config/entity_registry/list': [
            { entity_id: 'light.living_downlights', area_id: 'living', device_id: null },
            { entity_id: 'cover.living_shade', area_id: 'living', device_id: null },
            { entity_id: 'media_player.kitchen', area_id: null, device_id: 'd1' }
          ]
        };
        return data[msg.type] as T;
      }
    };
    const store = new HouseStore();
    const adapter = new HomeAssistantAdapter(hass);
    store.attach(adapter);
    await tick(); await tick();
    expect(store.connection).toBe('online');
    expect(store.sortedFloors().map((f) => f.name)).toEqual(['Main Level', 'Other']);
    expect(store.room('living')?.lights[0]).toEqual({ id: 'light.living_downlights', name: 'Downlights', dimmable: true });
    expect(store.get('light', 'light.living_downlights')?.level).toBe(50);
    expect(store.config.audioZones.map((z) => z.id)).toEqual(['media_player.kitchen']);
    expect(store.config.services.sort()).toEqual(['audio', 'lighting', 'media', 'shades']);
    store.send({ kind: 'light', id: 'light.living_downlights', action: 'level', value: 20 });
    expect(calls[calls.length - 1]).toEqual(['light', 'turn_on', { entity_id: 'light.living_downlights', brightness_pct: 20 }]);
  });
});

it('sample house has unique device ids', () => {
  const ids = SAMPLE_HOUSE.rooms.flatMap((r) => [...r.lights, ...r.shades].map((d) => d.id));
  expect(new Set(ids).size).toBe(ids.length);
});
