# LSWT Playground - Project Knowledge Base

**Stack:** Nuxt 3 + Nitro + Vue 3 + TypeScript + UnoCSS + Plotly.js
**Purpose:** Lake Surface Water Temperature analysis tool with mutation detection algorithms
**Entry:** [app/pages/index.vue](app/pages/index.vue) (docs), [app/pages/playground/index.vue](app/pages/playground/index.vue) (tool)

---

## STRUCTURE

```
./
├── app/
│   ├── pages/
│   │   ├── index.vue           # Documentation landing page
│   │   ├── docs/[...slug].vue  # Documentation pages (nuxt-content)
│   │   ├── slides/[[id]].vue   # Slidev presentations
│   │   └── playground/
│   │       ├── index.vue       # Mutation detection (main tool)
│   │       └── segments.vue    # Segmentation analysis
│   ├── components/
│   │   ├── base/               # Base components (PlaygroundLayout)
│   │   ├── ui/                 # UI primitives (Q*, Link*)
│   │   ├── params/             # Control panel components
│   │   ├── charts/             # Chart components
│   │   └── matrix/             # Factor matrix components
│   ├── composables/
│   │   ├── useTimeSeriesData.ts   # Time series data fetching
│   │   ├── useLakeFactors.ts      # Lake metadata fetching
│   │   ├── useMutationDetection.ts # Mutation detection logic
│   │   ├── usePlotly.ts           # Plotly rendering
│   │   └── usePlotlyColor.ts      # Theme-aware colors
│   ├── types/                  # Shared types (client + server)
│   └── layouts/                # Page layouts
├── content/
│   ├── index.md               # Homepage content
│   └── docs/                  # Documentation files
├── server/api/                # Nitro API endpoints
└── public/                    # CSV data files + static assets
```

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| **Add chart** | `app/components/charts/` | Extend PlotlyCompo pattern |
| **Add API** | `server/api/*.ts` | Follow load/detect/preprocess pattern |
| **Types** | `app/types/*.d.ts` | Keep client/server aligned |
| **Documentation** | `content/docs/*.md` | Use MDC syntax |
| **Presentations** | `app/pages/slides/` | Slidev integration ready |
| **Styling** | `uno.config.ts` + `app/app.vue` | UnoCSS `un-*` prefix |
| **Theme colors** | `usePlotlyColor()` | Mirrors colorMode for Plotly |
| **Data fetching** | `app/composables/use*.ts` | New composables for shared logic |

---

## ROUTES

| URL | Page | Description |
|-----|------|-------------|
| `/` | Documentation landing | Platform overview, feature cards |
| `/docs` | Documentation | Full documentation with MDC |
| `/docs/**` | Docs subpages | Dynamic content pages |
| `/slides` | Presentations list | Available slide decks |
| `/slides/:id` | Individual slide | Slidev presentation view |
| `/playground` | Mutation detection | Main analysis tool |
| `/playground/segments` | Segmentation | Time series segmentation |

---

## NEW COMPOSABLES

### useTimeSeriesData()
Unified time series data fetching and preprocessing:
```typescript
const { rawSeries, processedSeries, tCandidates, loadData, preprocessData } = useTimeSeriesData({ dataset })
```

### useLakeFactors()
Lake metadata management:
```typescript
const { lakeFactorsMap, loadFactors } = useLakeFactors()
```

### useMutationDetection()
Mutation detection logic:
```typescript
const { mutationPoints, detectMutations } = useMutationDetection({ mutationMethod, minSegLen })
```

---

## CONVENTIONS

### Composables
- Use `useXxx()` naming for all composables
- Return refs for reactive data
- Accept options as object parameter
- Handle loading states and errors internally

### Components
- `<script setup lang="ts">` composition API
- Props with `defineProps<{}>()` + emits with `defineEmits<{}>()`
- Use slots for flexible layouts (see PlaygroundLayout)
- Chart components: use `PlotlyCompo` + `usePlotly` composable

### Styling
- **UnoCSS** with `un-*` prefix (see `app/app.vue`)
- Dark mode via `useColorMode` + `html.dark`
- Custom fonts: `YshiPen-ShutiTC`, `LXGW` series

### Content (Nuxt Content)
- Markdown files in `content/docs/`
- Frontmatter for metadata (title, description)
- MDC syntax for Vue components in markdown
- Access via `queryCollection('content')`

---

## ANTI-PATTERNS

- Mutating Plotly `data`/`layout` objects in place (use deepMerge)
- Bypassing `usePlotlyColor()` for chart colors
- Client/server type drift - share via `types/`
- Inline data fetching in pages (use composables instead)
- Duplicated lake factors loading (use `useLakeFactors()`)

---

## COMMANDS

```bash
# Dev
pnpm dev              # Standard dev
pnpm dev:pwa          # With PWA enabled

# Build
pnpm build            # Production build
pnpm preview          # Preview production
pnpm start            # Start production server

# Quality
pnpm lint             # ESLint
pnpm typecheck        # vue-tsc

# Release
pnpm changelog:preview  # Preview changelog
pnpm release:patch      # Bump patch version
```

---

## NOTES

- **Chinese UI** - Copilot instructed to respond in Chinese
- **Catalog deps** - Uses pnpm catalog for dependency management
- **Data files** - CSVs in `public/` (lake_temperature.csv, factors_simplified.csv)
- **PWA** - Configured but disabled by default (see `dev:pwa`)
- **Slidev** - Ready for iframe embedding or MDC-based slides
