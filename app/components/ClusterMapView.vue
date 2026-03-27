<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { SpatialClusterAssignment } from '~/types/clustering'

const props = defineProps<{
  points: LakePoint[]
  clusterAssignments: SpatialClusterAssignment[]
  selectedLakeId?: string
}>()

const emit = defineEmits<{
  (e: 'selectLake', lakeId: string): void
}>()

// Cluster colors (distinct colors for each cluster)
const clusterColors = [
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
]

// Build maps for efficient lookup
const clusterMap = computed(() => {
  const map = new Map<string, number>()
  props.clusterAssignments.forEach((a) => {
    map.set(a.lakeId, a.clusterId)
  })
  return map
})

const mapFigure = computed(() => {
  if (!props.points?.length || !props.clusterAssignments?.length) {
    return { data: [], layout: {} }
  }

  // Group points by cluster
  const clusters = new Map<number, typeof props.points>()
  props.points.forEach((lake) => {
    const clusterId = clusterMap.value.get(lake.id)
    if (clusterId === undefined) return
    if (!clusters.has(clusterId)) clusters.set(clusterId, [])
    clusters.get(clusterId)!.push(lake)
  })

  const data: Plotly.Data[] = []

  // Create a trace for each cluster
  clusters.forEach((lakes, clusterId) => {
    const color = clusterColors[clusterId % clusterColors.length]

    data.push({
      type: 'scattergeo',
      mode: 'markers',
      name: `Cluster ${clusterId + 1}`,
      lat: lakes.map(l => l.lat),
      lon: lakes.map(l => l.lon),
      text: lakes.map(l => l.label),
      customdata: lakes.map(l => [l.id, clusterId]),
      marker: {
        size: lakes.map(l => l.id === props.selectedLakeId ? 16 : 10),
        color,
        opacity: lakes.map(l => l.id === props.selectedLakeId ? 1 : 0.7),
        line: {
          color: lakes.map(l => l.id === props.selectedLakeId ? '#000' : '#fff'),
          width: lakes.map(l => l.id === props.selectedLakeId ? 3 : 1),
        },
      },
      hovertemplate: `%{text}<br>Cluster: ${clusterId + 1}<extra></extra>`,
      showlegend: true,
    } as Plotly.Data)
  })

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: props.selectedLakeId
        ? 'Select a lake'
        : 'Spatial Clusters (Click to select)',
    },
    autosize: true,
  }

  return { data, layout }
})

function handleClick(event: any) {
  const lakeId = event?.points?.[0]?.customdata?.[0]
  if (typeof lakeId === 'string')
    emit('selectLake', lakeId)
}
</script>

<template>
  <div
    un-w-full
    un-h-400px
    un-relative
    un-overflow-hidden
  >
    <div un-absolute un-inset-0>
      <PlotlyCompo
        type="map"
        :data="mapFigure.data"
        :layout="mapFigure.layout"
        @plotly-click="handleClick"
      />
    </div>
  </div>
</template>
