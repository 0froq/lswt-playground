<script setup lang="ts">
import type { TimeSeries } from '~/types/mutation'
import type { Break } from '~/types/segments'

const props = defineProps<{
  timeSeries?: Record<string, TimeSeries | undefined>
  breaks?: Break[]
}>()

const data: ComputedRef<Plotly.Data[]> = computed(() => {
  if (!props.timeSeries || Object.keys(props.timeSeries).length === 0) {
    return [{ x: [], y: [] }]
  }

  const dataObj: Plotly.Data[] = []

  const raw = props.timeSeries.raw
  const processed = props.timeSeries.processed

  if (raw) {
    dataObj.push({
      x: raw.points.map(p => p.t),
      y: raw.points.map(p => p.v),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Raw Series',
      marker: {
        color: usePlotlyColor('marker'),
        symbol: 'circle',
      },
      line: {
        color: usePlotlyColor('line'),
        shape: 'spline',
        width: 2,
      },
      hovertemplate: '%{y:.3f}<extra></extra>',
      yaxis: 'y1',
    })
  }

  if (processed) {
    dataObj.push({
      x: processed.points.map(p => p.t),
      y: processed.points.map(p => p.v),
      type: 'scatter',
      mode: 'lines',
      name: 'Processed Series',
      line: {
        color: usePlotlyColor('lineMuted'),
        shape: 'spline',
        width: 1,
      },
      hovertemplate: '%{y:.3f}<extra></extra>',
      yaxis: 'y2',
    })
  }

  return dataObj
})

const layout = computed(() => {
  const raw = props.timeSeries?.raw
  const processed = props.timeSeries?.processed

  const resolveBreakY = (breakPoint: Break): number | undefined => {
    const fromRawByIndex = raw?.points?.[breakPoint.yearIndex]?.v
    if (Number.isFinite(fromRawByIndex))
      return fromRawByIndex

    const fromRawByYear = raw?.points?.find(p => p.t.getFullYear() === breakPoint.year)?.v
    if (Number.isFinite(fromRawByYear))
      return fromRawByYear

    const fromProcessedByIndex = processed?.points?.[breakPoint.yearIndex]?.v
    if (Number.isFinite(fromProcessedByIndex))
      return fromProcessedByIndex

    const fromProcessedByYear = processed?.points?.find(p => p.t.getFullYear() === breakPoint.year)?.v
    if (Number.isFinite(fromProcessedByYear))
      return fromProcessedByYear

    return undefined
  }

  const rawValues = raw?.points?.map(p => p.v) || []
  const processedValues = processed?.points?.map(p => p.v) || []

  const rawMin = rawValues.length ? Math.min(...rawValues) : 0
  const rawMax = rawValues.length ? Math.max(...rawValues) : 1
  const processedMin = processedValues.length ? Math.min(...processedValues) : 0
  const processedMax = processedValues.length ? Math.max(...processedValues) : 1

  const rawRange = rawMax - rawMin
  const processedRange = processedMax - processedMin

  // Calculate aligned ranges to make gridlines coincide
  const nticks = 6
  const rawPadding = rawRange * 0.1
  const processedPadding = processedRange * 0.1

  const y1Min = rawMin - rawPadding
  const y1Max = rawMax + rawPadding
  const y2Min = processedMin - processedPadding
  const y2Max = processedMax + processedPadding

  const breakHalfSpan = Math.max(rawRange, processedRange) * 0.15

  const layoutObj: Record<string, any> = {
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: usePlotlyColor('floatBg'),
      bordercolor: usePlotlyColor('floatBorder'),
      font: {
        color: usePlotlyColor('text'),
      },
    },
    title: {
      font: {
        family: 'YshiPen-ShutiTC',
        color: usePlotlyColor('text'),
      },
      text: `${props.timeSeries?.[0]?.label || ''} Time Series`,
    },
    yaxis: {
      side: 'left',
      range: [y1Min, y1Max],
      nticks,
    },
    yaxis2: {
      overlaying: 'y',
      side: 'right',
      range: [y2Min, y2Max],
      nticks,
    },
  }

  props.breaks?.forEach((breakPoint) => {
    const yCenter = resolveBreakY(breakPoint)
    if (!Number.isFinite(yCenter) || yCenter === undefined)
      return

    // Draw short vertical ticks centered at the series value instead of spanning the full plot.
    layoutObj.shapes = layoutObj.shapes || []

    layoutObj.shapes.push({
      type: 'line',
      x0: new Date(breakPoint.year, 0, 1),
      x1: new Date(breakPoint.year, 0, 1),
      y0: yCenter - breakHalfSpan,
      y1: yCenter + breakHalfSpan,
      xref: 'x',
      yref: 'y',
      line: {
        color: usePlotlyColor('line'),
        width: 2,
        dash: 'dot',
      },
    })
  })

  return layoutObj
})
watchEffect(() => {
})
</script>

<template>
  <div
    un-w-full
    un-h-full
    un-border="~ neutral-300 dark:neutral-700"
  >
    <PlotlyCompo
      :data="data"
      :layout="layout"
      type="chart"
    />
  </div>
</template>
