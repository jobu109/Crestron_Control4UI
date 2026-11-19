# ZenithUI CH5 contract (draft v0.1)

Status: **draft, not implemented on the processor.** Nothing in `jobu109/Control4_Crestron` uses this yet. The existing Panel Room Router (serial joins 101–108), the Sources/Transport modules, their joins and `ui/room-media` remain the working reference and must not change for this contract.

## Goal

One small, fixed contract that carries a house of any size. Fixed contracts cannot grow with the number of rooms or devices, so the dynamic parts (floors, rooms, devices, states) travel as JSON documents over a few serial signals. They use the same framing the gateway already uses (`w:1` base64 frames ≤ 255 bytes; see `src/adapters/wire.ts` and `docs/UI_SERIAL_TRANSPORT.md` in Control4_Crestron).

## Signals

Contract name `ZenithUI`, component `House`. Direction is from the panel's point of view.

| Signal | Type | Direction | Purpose |
|---|---|---|---|
| `House.Connected_FB` | digital | processor → panel | Gateway connected and the house document is valid |
| `House.Hello` | serial | panel → processor | Sent when the panel connects: `{"v":1,"t":<ms>}`. The processor answers by (re)sending the config and a full state snapshot |
| `House.Config_FB` | serial | processor → panel | Framed `HouseConfig` document, stream `k:"c"`, room `r:0` |
| `House.Config_Page` | analog | panel → processor | Request a missing config frame (0 then page, 25 ms apart, same as the existing bridge) |
| `House.State_FB` | serial | processor → panel | Framed state document, stream `k:"s"`, room `r:0` |
| `House.State_Page` | analog | panel → processor | Request a missing state frame |
| `House.Command` | serial | panel → processor | One compact JSON command, always ≤ 255 bytes |

Media lists (sources, catalogs, now playing, progress, remote keys) are **not** redefined. Phase 2 adds `Room.*` signals that carry the same documents the Panel Room Router already produces (`State$`, `Audio$`, `Video$`, `Catalog$`, `Playing$`, `Progress$`, `Keys$`), so the C# that builds them is reused unchanged.

## Config document (`House.Config_FB`)

Exactly the `HouseConfig` type in `src/model/types.ts`:

```json
{
  "name": "Floyd",
  "services": ["lighting", "shades", "media", "audio"],
  "floors": [{ "id": "12", "name": "Main Level", "order": 1 }],
  "rooms": [
    {
      "id": "13",
      "name": "Living Room",
      "floorId": "12",
      "lights": [{ "id": "437", "name": "Main Hall", "dimmable": true }],
      "shades": [{ "id": "226", "name": "Middle Shade", "positionable": true }],
      "videoSources": [{ "id": "542", "name": "SHIELD TV", "kind": "video" }],
      "audioSources": [{ "id": "65", "name": "Michael's Spotify", "kind": "audio" }]
    }
  ],
  "scenes": [],
  "audioZones": [{ "id": "13", "name": "Living Room", "roomId": "13" }],
  "thermostats": []
}
```

- `services` decides which dock tiles appear. Only list services the program actually supports; the UI hides the rest.
- Floors come from Control4 project data. Director items already carry `floorId`, `floorName`, `roomId` and `roomName` (seen in `tests/fixtures/ServiceDriverMapping_CP18a_2026-11-17.json`), so the gateway can group rooms without a new parameter. This still needs verifying on the EA-5.
- Missing arrays are treated as empty.
- IDs are strings. Use Control4 item IDs as-is (proxy IDs for lights and shades, as the Room Devices symbol does today).

## State document (`House.State_FB`)

```json
{ "states": [
  { "kind": "light", "id": "437", "on": true, "level": 50 },
  { "kind": "shade", "id": "226", "position": 100 },
  { "kind": "media", "id": "13", "power": true, "activeSourceId": "542", "volume": 41, "mute": false },
  { "kind": "zone", "id": "13", "power": true, "volume": 41, "mute": false, "sourceName": "Spotify" }
]}
```

- After `House.Hello` (and after a gateway reconnect) send a full snapshot. After that, send only what changed.
- Fields per kind are the `*State` types in `src/model/types.ts`. A state entry patches the previous value; omitted fields keep their value.
- Unknown state stays absent. Do not invent values that Control4 has not reported (for example, the exact active source when it is not verified).

## Commands (`House.Command`)

Compact keys keep every command under 255 bytes: `k` = kind, `i` = id, `a` = action, `v` = value (optional).

| k | a | v | Meaning |
|---|---|---|---|
| `light` | `on`, `off`, `toggle` | — | Switch one light |
| `light` | `level` | 0–100 | Set dimmer level (sent on slider release) |
| `room-lights` | `ambient`, `on`, `off` | — | Room lighting scene (`i` = room id) |
| `shade` | `open`, `close`, `stop` | — | One shade |
| `shade` | `position` | 0–100 | Shade position |
| `room-shades` | `open`, `close`, `stop` | — | All shades in a room |
| `media` | `source` | source id | Select a Watch/Listen source in room `i` |
| `media` | `volume` | 0–100 | Room volume |
| `media` | `mute`, `unmute`, `off`, `play`, `pause`, `next`, `previous`, `volume-up`, `volume-down` | — | Room media |
| `zone` | `on`, `off`, `mute`, `unmute`, `volume-up`, `volume-down` | — | Multi Audio zone |
| `zone` | `volume` | 0–100 | Zone volume |
| `scene` | `run` | — | Run a scene |
| `thermostat` | `setpoint` | number | Target temperature |
| `thermostat` | `mode`, `fan` | string | HVAC mode or fan mode |
| `thermostat` | `power` | true/false | Thermostat on/off |

Example: `{"k":"light","i":"437","a":"level","v":75}`

The processor should ignore commands for ids it does not know and confirm every change through `House.State_FB` rather than assuming the command worked.

## Program side (proposal, nothing built)

Additive only, on a separate branch of Control4_Crestron:

1. A new SIMPL+ wrapper (for example `Control4_Zenith_House.usp`) over a new C# class that reuses the shared gateway by `Gateway_ID`. It follows AGENTS.md: 4-Series only, leading `_skip_` per parameter, `_skip_` at type transitions, CRLF, signature check.
2. It builds the config from Director inventory (rooms, floors, lights, shades, sources) and reuses the existing light/shade/media registries for state.
3. Its serial outputs use the existing `UiSerialFrames` encoder.
4. Wire the module to a ZenithUI contract device in SIMPL Windows. The current modules, router and joins stay as they are.

## Open questions

- Confirm that Director item metadata returns `floorId`/`floorName` on the EA-5 for every room.
- Decide where audio zones come from (Control4 rooms with Listen sources, or a parameter list).
- Contract file: generate `ZenithUI.cse2j` with the Crestron Contract Editor so the signal names above resolve in CrComLib.
