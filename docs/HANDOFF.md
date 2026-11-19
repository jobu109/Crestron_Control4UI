# Handoff to Claude Code (2026-11-19)

## Folder layout

Clone both repos side by side so one Claude Code session can see both:

```
<workspace>/
  Control4_Crestron/      # processor program: SIMPL Windows + SIMPL+ + C# gateway (existing, working)
  Crestron_Control4UI/    # this repo: Zenith UI for CH5 panels and Home Assistant
```

```bash
gh repo clone jobu109/Control4_Crestron
gh repo clone jobu109/Crestron_Control4UI
```

Start Claude Code in `<workspace>` (not inside one repo) so both are in reach.

## Working preferences (from Michael)

- Before building or changing anything, ask clarifying questions until you are about 95% sure what is needed.
- Use the GitHub CLI (`gh`) for all github.com operations.
- Do not break anything that already works in Control4_Crestron. All program-side work is additive, on its own branch, and nothing merges until Michael has loaded and tested it on the RMC4. Read `Control4_Crestron/AGENTS.md` and `CONTROL4_CRESTRON_VS2026_HANDOFF.md` before touching that repo.

## Decisions already made

- **Target panels:** TSW-1070 / TSW-1080, usable area 1280×800. One design scales to other screens.
- **Look:** Zenith-style (inspired by Ryelec Zenith, not copied). Dark wallpaper, bold Montserrat titles, outlined square icon tiles, white for "selected", green (#2EB85C) for "on", gradient ring on the thermostat. The approved mockups are on the "Zenith-style TSW-1060 UI" design canvas.
- **Navigation:** the dock is only on Home. Sub-pages have a centered two-line title and a bottom MENU tab that slides the dock up. Settings is under the ••• button.
- **Dynamic dock:** tiles come from the services each house reports. A house without pool, irrigation or energy shows no tiles for them.
- **Rooms:** one Rooms tile. The list is grouped by floor (Basement / Main Level / Upper Level in the sample), each row shows name + status, and a tap opens the Room page (back/next room, Ambient/On/Off, sheets for lighting, shades, climate).
- **Media:** Video and Audio tabs per room. The Audio tab shows only that room's audio sources. Multi Audio is a separate page: a zone grid with power, mute, −, slider and + per zone.
- **Framework:** Lit + TypeScript + Vite. One codebase builds a CH5 archive and a Home Assistant custom panel.
- **Crestron connection:** a new CH5 contract (`ZenithUI`) with C#. It does not reuse the Panel Room Router joins, and the router must keep working. Draft spec: `docs/CONTRACT.md`.
- **House data on Crestron:** sent dynamically by the program as framed JSON (`w:1`, the same framing as `UiSerialFrames.cs`).
- **Floors on Crestron:** from Control4 project data (Director items carry `floorId`/`floorName`). Still needs verifying on the EA-5.
- **Home Assistant:** rooms and floors from HA's own floor/area/device/entity registries.
- **Services with no program side yet** (climate, comfort, security, cameras, pool, irrigation, energy, scenes on Crestron) stay hidden until supported.

## Current state of this repo

- All core pages are built and run on the mock adapter and the Home Assistant adapter.
- The Crestron adapter is written against the draft contract. The processor side does not exist yet, so a real panel shows "NOT CONNECTED".
- Comfort, Security, Cameras, Pool, Irrigation and Energy are designed on the canvas but have no data model or page yet.
- `npm run typecheck`, `npm test`, `npm run build` and `npm run archive` pass.

## Next steps (in order, confirm each with Michael first)

1. Review `docs/CONTRACT.md` with Michael and settle its open questions, especially where audio zones come from.
2. In Control4_Crestron, on a new branch: verify that Director returns `floorId`/`floorName` for every room (read-only test first).
3. Add a new SIMPL+ wrapper plus C# class (for example `Control4_Zenith_House`) that reuses the gateway by `Gateway_ID`, builds the house config, publishes states and accepts commands per the contract. Follow that repo's AGENTS.md rules (4-Series only, `_skip_` rules, CRLF, signature check).
4. Generate `ZenithUI.cse2j` with the Crestron Contract Editor so the signal names resolve in CrComLib. Wire it in SIMPL Windows alongside the existing program.
5. Phase 2: carry the existing room media documents (sources, catalogs, now playing, progress, remote keys) over `Room.*` contract signals, reusing the current C#.
6. UI polish: bundle the Montserrat font for offline panels, add wallpapers, real swipe gestures and slide animations.
