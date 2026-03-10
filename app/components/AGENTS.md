# Components Directory

**Purpose:** Vue components for visualization, UI controls, and layout

---

## STRUCTURE

```
./
├── PlotlyCompo.vue              # Base Plotly wrapper (all charts extend this)
├── usePlotly.ts composables     # Rendering logic (see ../composables/)
├── Mutation*.vue                # Mutation analysis components
├── Chart*.vue                   # Chart-specific components
├── Params*.vue                  # Control panel components
└── Page*.vue                    # Layout components
```

---

## PATTERNS

### Chart Components
All charts follow the `PlotlyCompo` + `usePlotly` pattern:

```vue
<script setup lang="ts">
const props = defineProps<{
  data?: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
}>()
</script>

<template>
  <PlotlyCompo
    :data="chartData"
    :layout="chartLayout"
    @plotly-click="handleClick"
  />
</template>
```

### Control Components (Params*)
- Emit updates via `watch` + `emit` pattern
- Props defined in `types/param.d.ts`
- Group related controls: `ParamsData`, `ParamsPreprocess`, `ParamsMutation`

---

## KEY COMPONENTS

| Component | Purpose | Notes |
|-----------|---------|-------|
| `PlotlyCompo.vue` | Base wrapper | All charts extend this |
| `MutationFactorMatrix.vue` | Factor correlation matrix | Uses computed/buildPoints pattern |
| `ChartTimeSeries.vue` | Time series with mutations | Dual y-axes, mutation year lines |
| `MutationSideView.vue` | Side panel container | Orchestrates child components |
| `Params*.vue` | Control panels | Watch/emit pattern for reactivity |

---

## CONVENTIONS

- **Props:** Use `defineProps<Type>()` with interface from `types/`
- **Emits:** Type-safe emits with `defineEmits<{}>()`
- **Styling:** UnoCSS classes with `un-*` prefix
- **Reactivity:** Prefer `computed` for derived chart data
- **Events:** Bubble Plotly events up: `plotlyClick`, `plotlyHover`

---

## ANTI-PATTERNS

- Mutating Plotly objects in place (use deepMerge)
- Direct Plotly API calls (use `usePlotly` composable)
- Inline styles for theme colors (use `usePlotlyColor()`)
