# Copilot Instructions for lswt-playground

NOTE: Always answer in Chinese, however "plug-in English" is allowed when necessary.

## Architecture overview
- Nuxt 3 + Nitro serves both SPA pages in `app/` and custom APIs under `[server/api](server/api)`. The entry page is [app/pages/mutation.vue](app/pages/mutation.vue), so new features should be wireframed there unless adding a static landing page.
- Front-end layout lives in [app/layouts/default.vue](app/layouts/default.vue) with `PageNav/PageFooter`, and the glow of the theme is centrally managed by `app/app.vue`, `app/app.config.ts`, and UnoCSS shorthand classes (`un-*`).
- Plotly charts are wrapped by [app/components/PlotlyCompo.vue](app/components/PlotlyCompo.vue) which delegates rendering to [app/composables/usePlotly.ts](app/composables/usePlotly.ts) and themed via [app/composables/usePlotlyColor.ts](app/composables/usePlotlyColor.ts).

## Data pipeline and APIs
- [`app/pages/mutation.vue`](app/pages/mutation.vue) is the customer-facing workflow: it loads raw data, preprocesses it, then runs mutation detection via three cascading `watchEffect` blocks that call `/api/loadTimeSeries`, `/api/preprocessTimeSeries`, and `/api/detectMutation` with tightly controlled query params.
- `/api/loadTimeSeries` (see [server/api/loadTimeSeries.ts](server/api/loadTimeSeries.ts)) reads `public/lake_temperature.csv` by default, supports `agg`/seasonal shortcuts (`DJF`, etc.), `clipRange`, and a customizable `idColumn`, and returns `TimeSeries` entries used throughout the UI.
- `/api/preprocessTimeSeries` ([server/api/preprocessTimeSeries.ts](server/api/preprocessTimeSeries.ts)) normalizes points, applies a moving average and differencing, and returns the processed series that `MutationFactorMatrix` and `ChartTimeSeries` display alongside the raw data.
- `/api/detectMutation` ([server/api/detectMutation.ts](server/api/detectMutation.ts)) accepts either a raw array or `{ processedSeries, rawSeries }`, runs Pettitt/seq-T (avg/OLS/Sen) tests, and responds with `MutationPoint` objects defined in [app/types/mutation.d.ts](app/types/mutation.d.ts) that feed all scatter/summary visuals.
- The lake-factor data powering `[app/components/MutationFactorMatrix.vue](app/components/MutationFactorMatrix.vue)` is read client-side from `public/factors_simplified.csv` on mount, so keep any column-name changes in sync with its `parseCsvLine` logic.

## Visualization & UI patterns
- Charts reuse `PlotlyCompo` + `usePlotly` so keep layout/data merges consistent with `deepMerge` in [app/utils/deepMerge.ts](app/utils/deepMerge.ts) and trigger re-renders by mutating the props the composable watches.
- `ChartsMutationScatter.vue` builds pre/post scatter plots with `Plotly` annotations and color-by-year using `usePlotlyColor`; extend new charts in the same `computed`/`buildPoints` style to keep them responsive to user's time filters.
- `ChartTimeSeries.vue` overlays raw + processed series on dual y-axes and draws mutation-year lines from the `mutationPoints` array, so mutations should continue to pass year/label/metrics in the same structure.
- Side-panel controls are grouped into small `Params*` components (`ParamsData`, `ParamsPreprocess`, `ParamsMutation`, `ParamsPoi`). Each emits updates via `watch`/`emit` combos, so preserve their prop/event shapes in [app/types/param.d.ts](app/types/param.d.ts) when expanding the panel.

## Styling and theming conventions
- The UI relies on UnoCSS utility classes with the `un-` prefix (see `app/app.vue` and components); keep new components consistent with that naming and wrap layout adjustments in `un-flex`, `un-gap`, etc.
- Dark/light theme toggles through `[app/components/PageNav.vue](app/components/PageNav.vue)` via `useColorMode`, and `usePlotlyColor` mirrors that mode for Plotly theme colors—always call `usePlotlyColor` before storing colors so the charts adapt to theme switches.
- Custom fonts (e.g., `YshiPen-ShutiTC`, `LXGW` series) are declared in `app/app.vue`; avoid importing conflicting font stacks unless necessary.

## Developer workflows
- Default dev: `pnpm dev`. Use `pnpm dev:pwa` to toggle PWA features when testing service worker builds and `pnpm preview`/`pnpm start` after `pnpm build` for production simulation.
- Lint/typechecks: `pnpm lint` and `pnpm typecheck` rely on Nuxt's ESLint/type-check pipelines configured in `nuxt.config.ts`.
- Releases are orchestrated via `changelogen`/`changelogithub` scripts (`pnpm changelog:preview`, `pnpm release:patch`, etc.) plus the bespoke runner at `scripts/release.mts`, so keep changelog metadata updated before bumping the version.
- Dependencies are managed through `pnpm` with `catalog` aliases (see `package.json`), so add new deps there and re-run `pnpm install` via the workspace root.

## Conventions & gotchas to remember
- Reactive flows prefer `ref`s + `watchEffect` over manual `watch`, especially for async fetch sequences, so keep that pattern when wiring new API calls in `app/pages/mutation.vue` or other pages.
- Plotly props are deeply merged rather than replaced; avoid mutating `data`/`layout` objects in place because `usePlotly` re-runs on prop changes detected via deep watchers.
- Always consider the client/server split: what runs in the browser is under `app/`, while transformation logic lives in the Nitro API files; share types via the `types/` folder to keep both sides aligned.
