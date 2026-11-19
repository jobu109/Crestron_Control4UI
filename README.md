# Crestron_Control4UI — Zenith UI

A Zenith-style touch-panel interface (dark wallpaper, bold titles, outlined icon tiles, MENU pull-up dock) built once and shipped to two places:

- **Crestron** TSW-1070 / TSW-1080 panels (1280×800) and Web XPanel, as a CH5 archive.
- **Home Assistant**, as a custom panel.

The house layout is never hard-coded. Floors, rooms, devices and the list of services come from the system at runtime, so the dock and pages adapt to each house. A house without a pool simply has no Pool tile.

Design reference: the approved mockups live on the "Zenith-style TSW-1060 UI" canvas.

## How it fits together

```
          +-----------------+
          |  UI (Lit pages) |   reads HouseConfig + states, sends Commands
          +--------+--------+
                   |
             HouseStore (src/model)
                   |
   +---------------+----------------+-------------------+
   | MockAdapter   | CrestronContractAdapter | HomeAssistantAdapter |
   | sample house  | ZenithUI CH5 contract   | HA floors/areas/entities |
   +---------------+-------------------------+--------------------------+
```

- `src/model/types.ts` — the shared house model and command list.
- `src/model/store.ts` — state store and the `Adapter` interface.
- `src/adapters/wire.ts` — decoder for the framed JSON already used by Control4_Crestron (`w:1`, ≤ 255-byte frames).
- `src/adapters/crestron.ts` — **draft** adapter for the ZenithUI contract in [docs/CONTRACT.md](docs/CONTRACT.md).
- `src/adapters/home-assistant.ts` — builds rooms from Home Assistant's floor and area registries.
- `src/ui/` — chrome (top bar, MENU, dynamic dock) and pages.

## Relationship to Control4_Crestron

[`jobu109/Control4_Crestron`](https://github.com/jobu109/Control4_Crestron) is the processor program (SIMPL Windows + SIMPL+ + C# gateway) and its own `ui/room-media`. **This repo does not change anything there.** The Crestron adapter targets a new contract that will be added to the program as new, separate modules on their own branch. The existing Panel Room Router, joins and UI keep working as they are. See [docs/CONTRACT.md](docs/CONTRACT.md).

## Status

| Page | Mock | Home Assistant | Crestron |
|---|---|---|---|
| Home, Rooms, Room (sheets), Lighting, Shades | ✓ | ✓ | waits for contract |
| Media (Video / Audio tabs), Multi Audio | ✓ | ✓ | waits for contract |
| Climate, Scenes, Settings | ✓ | ✓ | waits for contract |
| Comfort, Security, Cameras, Pool, Irrigation, Energy | designed only | hidden | hidden |

Pages for services the system does not report are hidden from the dock.

## Develop

```bash
npm install
npm run dev          # http://127.0.0.1:5173 with the sample house
npm test             # adapter and wire-format tests
npm run typecheck
```

Pages are routed by hash: `#/home`, `#/rooms`, `#/room/<id>`, `#/lighting`, `#/shades`, `#/media`, `#/audio`, `#/climate`, `#/scenes`, `#/settings`.

## Build for Crestron

```bash
npm run archive      # dist/crestron -> archives/ZenithUI.ch5z
```

The archive uses the contract adapter by default. For Web XPanel, open the page with `?host=<processor>&ipId=0x03`. Add `?adapter=mock` to preview without a processor.

The processor side of the contract does not exist yet, so a real panel shows "NOT CONNECTED" until it does.

## Install in Home Assistant

```bash
npm run build:ha     # dist/ha/zenith-panel.js
```

Copy `dist/ha/zenith-panel.js` to `/config/www/zenith/` and add to `configuration.yaml`:

```yaml
panel_custom:
  - name: zenith-panel
    sidebar_title: Zenith
    sidebar_icon: mdi:tablet-dashboard
    url_path: zenith
    module_url: /local/zenith/zenith-panel.js
```

Restart Home Assistant. Rooms come from your HA areas, grouped by HA floors (areas without a floor go under "Other"). Lights, covers, media players, thermostats and scenes are picked up automatically.

## Known gaps

- The Montserrat font loads from Google Fonts. TSW panels without internet fall back to system fonts until the font is bundled.
- Wallpapers: set `wallpapers` in the house config (`{ "home": "<url>", "default": "<url>" }`). No images ship yet.
- Swipe gestures on the Room page are buttons for now.
