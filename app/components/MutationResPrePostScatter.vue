<script setup lang="ts">
import type { MutationPoint } from '~/types/mutation'
import { computed, Static } from 'vue'

const props = defineProps<{
  mutations?: MutationPoint[]
  tCandidates?: number[]
}>()

const timeFilterRange = ref<{
  start: number | undefined
  end: number | undefined
}>({
  start: undefined,
  end: undefined,
})

interface ScatterPoint {
  year: number
  pre: number
  post: number
  label: string
}

interface TimeFilterRange {
  start?: number | null
  end?: number | null
}

// function computeColorScale(val: number, min: number, max: number) {
//   if (min === max)
//     return 'hsl(60, 100%, 50%)'
//   const t = (val - min) / (max - min)
//   const hue = Math.round((1 - t) * 60) // yellow->red
//   return `hsl(${hue}, 100%, 50%)`
// }

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function buildPoints(
  extractor: (mutation: MutationPoint) => { year: number | undefined, pre: number | undefined, post: number | undefined },
): ScatterPoint[] {
  if (!props.mutations?.length)
    return []
  const points: ScatterPoint[] = []
  for (const mutation of props.mutations) {
    const { year, pre, post } = extractor(mutation)
    if (isFiniteNumber(pre) && isFiniteNumber(post) && isFiniteNumber(year))
      points.push({ year, pre, post, label: `${mutation.lakeId} (${mutation.year ?? 'n/a'})` })
  }
  return points
}

function withinTimeFilter(year: number, filter?: TimeFilterRange) {
  if (!filter)
    return true
  if (filter.start != null && year < filter.start)
    return false
  if (filter.end != null && year > filter.end)
    return false
  return true
}

function splitPoints(points: ScatterPoint[], filter?: TimeFilterRange) {
  if (!points.length)
    return { active: [] as ScatterPoint[], inactive: [] as ScatterPoint[] }
  if (!filter)
    return { active: [...points], inactive: [] as ScatterPoint[] }
  const active: ScatterPoint[] = []
  const inactive: ScatterPoint[] = []
  for (const point of points) {
    if (withinTimeFilter(point.year, filter))
      active.push(point)
    else
      inactive.push(point)
  }
  return { active, inactive }
}

function computeRange(points: ScatterPoint[], { symmetric = false, floorZero = false }: { symmetric?: boolean, floorZero?: boolean } = {}) {
  if (!points.length)
    return symmetric ? [-1, 1] : [0, 1]
  let minVal = Math.min(...points.map(p => Math.min(p.pre, p.post)))
  const maxVal = Math.max(...points.map(p => Math.max(p.pre, p.post)))
  if (floorZero)
    minVal = Math.min(0, minVal)
  if (symmetric) {
    const maxAbs = Math.max(Math.abs(minVal), Math.abs(maxVal), 1)
    return [-maxAbs, maxAbs]
  }
  if (minVal === maxVal) {
    const offset = Math.max(Math.abs(minVal), 1)
    return [minVal - offset, maxVal + offset]
  }
  const padding = (maxVal - minVal) * 0.08
  return [minVal - padding, maxVal + padding]
}

function diagShape(range: [number, number], color = '#94a3b8') {
  return {
    type: 'line',
    x0: range[0],
    y0: range[0],
    x1: range[1],
    y1: range[1],
    line: {
      color,
      width: 1,
      dash: 'dot',
    },
  }
}

interface TwoRegionCounts { above: number, below: number }

function countTwoRegion(points: ScatterPoint[]): TwoRegionCounts {
  const counts: TwoRegionCounts = { above: 0, below: 0 }
  for (const { pre, post } of points) {
    if (post >= pre)
      counts.above += 1
    else
      counts.below += 1
  }
  return counts
}

function regionAnnotation(x: number, y: number, text: string) {
  return {
    x,
    y,
    text,
    showarrow: false,
    font: { size: 12, color: usePlotlyColor('text') },
    bgcolor: usePlotlyColor('floatBg'),
    bordercolor: usePlotlyColor('floatBorder'),
    borderpad: 4,
  }
}

function twoRegionAnnotations(
  range: [number, number],
  counts: TwoRegionCounts,
  labels: { above: string, below: string },
) {
  const span = range[1] - range[0] || 1
  const diagOffset = span * 0.15
  const upperX = range[0] + span * 0.3
  const lowerX = range[0] + span * 0.7
  const upperY = range[0] + span * 0.7 + diagOffset
  const lowerY = range[0] + span * 0.3 - diagOffset
  return [
    regionAnnotation(upperX, upperY, `${labels.above}: ${counts.above}`),
    regionAnnotation(lowerX, lowerY, `${labels.below}: ${counts.below}`),
  ]
}

const avgPoints = computed(() => buildPoints(mutation => ({ year: mutation.year, pre: mutation.preAvg, post: mutation.postAvg })))
const senPoints = computed(() => buildPoints(mutation => ({ year: mutation.year, pre: mutation.preSen, post: mutation.postSen })))
const varPoints = computed(() => buildPoints(mutation => ({ year: mutation.year, pre: mutation.preVar, post: mutation.postVar })))

const avgChart = computed(() => {
  if (!avgPoints.value.length)
    return null
  const range = computeRange(avgPoints.value)
  const { active, inactive } = splitPoints(avgPoints.value, props.timeFilter)
  const counts = countTwoRegion(active)
  const data: Plotly.Data[] = []
  if (inactive.length) {
    data.push({
      type: 'scattergl',
      mode: 'markers',
      x: inactive.map(p => p.pre),
      y: inactive.map(p => p.post),
      text: inactive.map(p => p.label),
      marker: {
        size: 7,
        color: '#94a3b8',
        opacity: 0.45,
        line: { color: '#475569', width: 0.4 },
      },
      hovertemplate: 'Pre Avg: %{x:.2f}<br>Post Avg: %{y:.2f}<br><br>%{text}<extra></extra>',
      name: 'Out of filter',
      showlegend: false,
    })
  }
  if (active.length) {
    data.push({
      type: 'scattergl',
      mode: 'markers',
      x: active.map(p => p.pre),
      y: active.map(p => p.post),
      text: active.map(p => p.label),
      marker: {
        size: 8,
        color: active.map(p => p.year),
        opacity: 0.85,
        line: { color: usePlotlyColor('markerBorder'), width: 0.8 },
      },
      hovertemplate: 'Pre Avg: %{x:.2f}<br>Post Avg: %{y:.2f}<br><br>%{text}<extra></extra>',
      name: 'Filtered window',
      showlegend: false,
    })
  }
  const layout: Partial<Plotly.Layout> = {
    title: { text: 'Avg: Pre vs Post' },
    xaxis: { title: { text: 'Pre Avg' }, range },
    yaxis: { title: { text: 'Post Avg' }, range },
    shapes: [
      diagShape([range[0] || 0, range[1] || 0], usePlotlyColor('axis')) as Partial<Plotly.Shape>,
    ],
    annotations: twoRegionAnnotations(
      [range[0] || 0, range[1] || 0],
      counts,
      { above: 'Avg post ≥ pre', below: 'Avg post < pre' },
    ),
    hovermode: 'closest',
  }
  return { data, layout }
})

interface SenRegionCounts {
  q1Above: number
  q1Below: number
  q2: number
  q3Above: number
  q3Below: number
  q4: number
}

function countSenRegions(points: ScatterPoint[]): SenRegionCounts {
  const counts: SenRegionCounts = { q1Above: 0, q1Below: 0, q2: 0, q3Above: 0, q3Below: 0, q4: 0 }
  for (const { pre, post } of points) {
    if (pre >= 0 && post >= 0) {
      if (post >= pre)
        counts.q1Above += 1
      else
        counts.q1Below += 1
    }
    else if (pre < 0 && post >= 0) {
      counts.q2 += 1
    }
    else if (pre < 0 && post < 0) {
      if (post >= pre)
        counts.q3Above += 1
      else
        counts.q3Below += 1
    }
    else {
      counts.q4 += 1
    }
  }
  return counts
}

function senAnnotations(range: [number, number], counts: SenRegionCounts) {
  const maxAbs = Math.max(Math.abs(range[0]), Math.abs(range[1])) || 1
  const positions = [
    { x: maxAbs * 0.35, y: maxAbs * 0.8, text: `Q1 (post>pre): ${counts.q1Above}` },
    { x: maxAbs * 0.8, y: maxAbs * 0.35, text: `Q1 (post<pre): ${counts.q1Below}` },
    { x: -maxAbs * 0.6, y: maxAbs * 0.7, text: `Q2: ${counts.q2}` },
    { x: -maxAbs * 0.75, y: -maxAbs * 0.4, text: `Q3 (post>=pre): ${counts.q3Above}` },
    { x: -maxAbs * 0.4, y: -maxAbs * 0.75, text: `Q3 (post<pre): ${counts.q3Below}` },
    { x: maxAbs * 0.65, y: -maxAbs * 0.65, text: `Q4: ${counts.q4}` },
  ]
  return positions.map(pos => regionAnnotation(pos.x, pos.y, pos.text))
}

const senChart = computed(() => {
  if (!senPoints.value.length)
    return null
  const range = computeRange(senPoints.value, { symmetric: true })
  const { active, inactive } = splitPoints(senPoints.value, props.timeFilter)
  const counts = countSenRegions(active)
  const data: Plotly.Data[] = []
  if (inactive.length) {
    data.push({
      type: 'scattergl',
      mode: 'markers',
      x: inactive.map(p => p.pre),
      y: inactive.map(p => p.post),
      text: inactive.map(p => p.label),
      marker: {
        size: 7,
        color: '#94a3b8',
        opacity: 0.45,
        line: { color: '#475569', width: 0.4 },
      },
      hovertemplate: 'Pre Sen: %{x:.2f}<br>Post Sen: %{y:.2f}<br><br>%{text}<extra></extra>',
      name: 'Out of filter',
      showlegend: false,
    })
  }
  if (active.length) {
    data.push({
      type: 'scattergl',
      mode: 'markers',
      x: active.map(p => p.pre),
      y: active.map(p => p.post),
      text: active.map(p => p.label),
      marker: {
        size: 8,
        color: active.map(p => p.year),
        opacity: 0.85,
        line: { color: usePlotlyColor('markerBorder'), width: 0.8 },
      },
      hovertemplate: 'Pre Sen: %{x:.2f}<br>Post Sen: %{y:.2f}<br><br>%{text}<extra></extra>',
      name: 'Filtered window',
      showlegend: false,
    })
  }
  const layout: Partial<Plotly.Layout> = {
    title: { text: 'Sen\'s Slope: Pre vs Post' },
    xaxis: { title: { text: 'Pre Sen\'s' }, range },
    yaxis: { title: { text: 'Post Sen\'s' }, range },
    shapes: [
      diagShape([range[0] || 0, range[1] || 0], usePlotlyColor('axis')) as Partial<Plotly.Shape>,
    ],
    annotations: senAnnotations([range[0] || 0, range[1] || 0], counts),
  }
  return { data, layout }
})

function varAnnotations(range: [number, number], counts: TwoRegionCounts) {
  return twoRegionAnnotations(range, counts, {
    above: 'Var post ≥ pre',
    below: 'Var post < pre',
  })
}

const varChart = computed(() => {
  if (!varPoints.value.length)
    return null
  const range = computeRange(varPoints.value, { floorZero: true })
  const { active, inactive } = splitPoints(varPoints.value, props.timeFilter)
  const counts = countTwoRegion(active)
  const data: Plotly.Data[] = []
  if (inactive.length) {
    data.push({
      type: 'scattergl',
      mode: 'markers',
      x: inactive.map(p => p.pre),
      y: inactive.map(p => p.post),
      text: inactive.map(p => p.label),
      marker: {
        size: 7,
        color: '#94a3b8',
        opacity: 0.45,
        line: { color: '#475569', width: 0.4 },
      },
      hovertemplate: 'Pre Var: %{x:.2f}<br>Post Var: %{y:.2f}<br><br>%{text}<extra></extra>',
      name: 'Out of filter',
      showlegend: false,
    })
  }
  if (active.length) {
    data.push({
      type: 'scattergl',
      mode: 'markers',
      x: active.map(p => p.pre),
      y: active.map(p => p.post),
      text: active.map(p => p.label),
      marker: {
        size: 8,
        color: active.map(p => p.year),
        opacity: 0.85,
        line: { color: usePlotlyColor('markerBorder'), width: 0.8 },
      },
      hovertemplate: 'Pre Var: %{x:.2f}<br>Post Var: %{y:.2f}<br><br>%{text}<extra></extra>',
      name: 'Filtered window',
      showlegend: false,
    })
  }
  const layout: Partial<Plotly.Layout> = {
    title: { text: 'Variance: Pre vs Post' },
    xaxis: {
      title: { text: 'Pre Var' },
      range: [Math.max(0, range[0] ?? 0), range[1]],
    },
    yaxis: {
      title: { text: 'Post Var' },
      range: [Math.max(0, range[0] ?? 0), range[1]],
    },
    shapes: [diagShape([Math.max(0, range[0] ?? 0), range[1] || 0], usePlotlyColor('axis')) as Partial<Plotly.Shape>],
    annotations: varAnnotations([Math.max(0, range[0] ?? 0), range[1] || 0], counts),
  }
  return { data, layout }
})

const chartCards = computed(() => {
  return [
    { key: 'avg', title: 'Avg', chart: avgChart.value },
    { key: 'sen', title: 'Sen', chart: senChart.value },
    { key: 'var', title: 'Var', chart: varChart.value },
  ]
})

const hasData = computed(() => chartCards.value.some(card => card.chart !== null))
</script>

<template>
  <section
    un-flex="~ col"
    un-gap-3
  >
    <div
      v-if="hasData"
      class="scatter-grid"
      un-flex="~ row wrap"
      un-gap-4
    >
      <div
        v-for="card in chartCards"
        :key="card.key"
        class="scatter-card"
        un-border="~ neutral-300 dark:neutral-700"
        style="flex: 1 1 320px; min-width: 280px;"
      >
        <div v-if="card.chart">
          <PlotlyCompo
            :data="card.chart.data"
            :layout="card.chart.layout"
            type="chart"
            un-h-30vh
          />
        </div>
        <div
          v-else
          un-text="xs neutral-500"
        >
          Insufficient data.
        </div>
      </div>
    </div>
    <div
      v-else
      un-text="sm neutral-500"
    >
      No mutation metrics available.
    </div>
  </section>
</template>
