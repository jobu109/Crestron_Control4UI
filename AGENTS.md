# Working rules

- The UI talks to systems only through `src/model` (HouseConfig, states, Commands). Pages never call an adapter directly.
- Keep the Crestron adapter in step with docs/CONTRACT.md. Change both together and bump the draft version.
- Do not change jobu109/Control4_Crestron from this repo. Program-side work for the contract goes on its own branch there, as new modules only, following that repo's AGENTS.md.
- Every serial command must stay at or under 255 bytes.
- Design target is 1280×800 (TSW-1070/1080). The app scales to fit other screens.
- Run `npm run typecheck`, `npm test` and `npm run build` before committing.
