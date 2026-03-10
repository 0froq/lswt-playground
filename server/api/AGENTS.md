# Server API Directory

**Purpose:** Nitro API endpoints for data loading, preprocessing, and mutation detection

---

## STRUCTURE

```
./
├── loadTimeSeries.ts        # Load CSV time series data
├── loadFactorsConstant.ts   # Load lake factor constants
├── loadFactorsSeries.ts     # Load factor time series
├── loadLakeFactors.ts       # Lake metadata
├── preprocessTimeSeries.ts  # Data normalization, smoothing
├── detectMutation.ts        # Pettitt/seq-T mutation detection
└── segmentTimeSeries.ts     # Time series segmentation
```

---

## API PATTERNS

### Request/Response Pattern
```typescript
// GET /api/loadTimeSeries?agg=DJF&clipRange=1980,2020
// Response: { series: TimeSeries[], error?: string }

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  // validation, processing...
  return { series, error: null }
})
```

### Error Handling
- Return `{ error: string, detail?: unknown }` for failures
- Use try/catch with structured error responses

---

## KEY ENDPOINTS

| Endpoint | Input | Output | Purpose |
|----------|-------|--------|---------|
| `loadTimeSeries` | `agg`, `clipRange`, `idColumn` | `TimeSeries[]` | Load raw lake data |
| `preprocessTimeSeries` | `series`, `smoothWindow`, `diffOrder` | `TimeSeries` | Normalize/smooth data |
| `detectMutation` | `processedSeries`, `method`, `numMutations` | `MutationPoint[]` | Run detection algorithms |
| `loadFactorsConstant` | `dataset?` | `LakeFactors[]` | Lake metadata |

---

## DATA FLOW

```
loadTimeSeries → preprocessTimeSeries → detectMutation
     ↓                    ↓                    ↓
   Raw CSV           Normalized          Mutation
                     + Smoothed          Points
```

---

## CONVENTIONS

- **Types:** Import from `~/types/mutation` (shared with client)
- **Validation:** Use runtime checks, TypeScript guards
- **Algorithms:** Pettitt test, sequential t-test, Sen slope
- **Math Utils:** Mean, variance, linear regression (OLS)

---

## ANTI-PATTERNS

- Don't use `any` for request/response types (define in `types/`)
- Don't mutate input arrays (return new objects)
- Don't forget error handling for malformed CSV data
