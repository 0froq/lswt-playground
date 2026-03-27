<script setup lang="ts">
import type { LakeFactors } from '~/types/factor'
import type { LakePoint, TimeSeries } from '~/types/mutation'
import type { Break, Segment } from '~/types/segments'

const props = defineProps<{
  points?: LakePoint[]
  segments?: Segment[]
  breaks?: Break[]
  lakeFactors?: Map<string, LakeFactors>
  rawSeries?: TimeSeries[]
}>()

const poi = defineModel<string | undefined>('poi')
</script>

<template>
  <div
    class="main-view"
    un-flex="~ col grow"
    un-px-4
    un-gap-4
    un-overflow-y-auto
  >
    <QSeperator
      title="Segment Map"
      un-text="teal-500"
    />
    <SegmentMapView
      v-model:poi="poi"
      :points="props.points"
      :segments="props.segments"
      :breaks="props.breaks"
    />
    <QSeperator
      title="Segment Distribution"
      un-text="teal-500"
    />
    <SegmentDistribution
      :segments="props.segments"
      :breaks="props.breaks"
    />
    <QSeperator
      title="Segment Summary"
      un-text="teal-500"
    />
    <SegmentSummaryView
      :segments="props.segments"
      :breaks="props.breaks"
    />
    <QSeperator
      title="Global Average Temperature"
      un-text="teal-500"
    />
    <SegmentGlobalAverageChart
      :raw-series="props.rawSeries"
      :breaks="props.breaks"
    />
  </div>
</template>
