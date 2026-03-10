<script setup lang="ts">
import type { Break, Segment } from '~/types/segments'
import { computed } from 'vue'

const props = defineProps<{
  segments?: Segment[]
  breaks?: Break[]
}>()

const segmentColors = ['#14b8a6', '#eab308', '#6366f1', '#f43f5e', '#84cc16']
const breakColors = ['#f97316', '#10b981', '#ec4899', '#06b6d4']

function colorForGroup(groupKey: string): string {
  if (groupKey.startsWith('seg-')) {
    const idx = Number(groupKey.split('-')[1] ?? 0)
    return segmentColors[idx % segmentColors.length] || segmentColors[0]
  }
  if (groupKey.startsWith('break-')) {
    const idx = Number(groupKey.split('-')[1] ?? 0)
    return breakColors[idx % breakColors.length] || breakColors[0]
  }
  return '#94a3b8'
}

function formatMean(sum: number, count: number): string {
  if (!count)
    return '-'
  return (sum / count).toFixed(3)
}

function formatRatio(pos: number, count: number): string {
  if (!count)
    return '-'
  const ratio = (pos / count) * 100
  return `${ratio.toFixed(1)}% (${pos}/${count})`
}

const segmentSummary = computed(() => {
  const map = new Map<number, {
    segmentIndex: number
    count: number
    sumAvg: number
    sumSlope: number
    posSlope: number
  }>()
  for (const seg of props.segments ?? []) {
    const existing = map.get(seg.segmentIndex) ?? { segmentIndex: seg.segmentIndex, count: 0, sumAvg: 0, sumSlope: 0, posSlope: 0 }
    existing.count += 1
    existing.sumAvg += seg.avg
    existing.sumSlope! += seg.slope
    existing.posSlope += seg.slope > 0 ? 1 : 0
    map.set(seg.segmentIndex, existing)
  }
  return Array.from(map.values()).sort((a, b) => a.segmentIndex - b.segmentIndex)
})

const breakSummary = computed(() => {
  const map = new Map<number, {
    breakIndex: number
    count: number
    sumDeltaAvg: number
    posDeltaAvg: number
    sumDeltaSlope: number
    posDeltaSlope: number
    sumDeltaVar: number
    posDeltaVar: number
    sumAbsD: number
  }>()

  for (const bk of props.breaks ?? []) {
    const existing = map.get(bk.breakIndex) ?? {
      breakIndex: bk.breakIndex,
      count: 0,
      sumDeltaAvg: 0,
      posDeltaAvg: 0,
      sumDeltaSlope: 0,
      posDeltaSlope: 0,
      sumDeltaVar: 0,
      posDeltaVar: 0,
      sumAbsD: 0,
    }

    existing.count += 1
    existing.sumDeltaAvg += bk.deltaAvg
    existing.posDeltaAvg += bk.deltaAvg > 0 ? 1 : 0
    existing.sumDeltaSlope += bk.deltaSlope
    existing.posDeltaSlope += bk.deltaSlope > 0 ? 1 : 0
    existing.sumDeltaVar += bk.deltaVar
    existing.posDeltaVar += bk.deltaVar > 0 ? 1 : 0
    existing.sumAbsD += Math.abs(bk.cohenD)

    map.set(bk.breakIndex, existing)
  }

  return Array.from(map.values()).sort((a, b) => a.breakIndex - b.breakIndex)
})
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-4
    un-w-full
  >
    <div
      un-border="~ neutral-300 dark:neutral-700"
      un-overflow-hidden
    >
      <div un-overflow-x-auto>
        <table
          un-w-full
          un-text-sm
        >
          <thead

            un-text="neutral-800 dark:neutral-200"
          >
            <tr>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Seg
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Avg Mean
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Avg Slope
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Slope > 0
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="segmentSummary.length === 0"
              un-text="neutral-700 dark:neutral-300"
            >
              <td
                un-px-3
                un-py-2
                colspan="4"
              >
                暂无数据
              </td>
            </tr>
            <tr
              v-for="seg in segmentSummary"
              :key="seg.segmentIndex"
              un-border="t neutral-200 dark:neutral-800"
              un-text="neutral-700 dark:neutral-300"
            >
              <td
                un-px-3
                un-py-2
                un-flex="~ row items-center gap-2"
              >
                <span
                  un-w-3
                  un-h-3
                  un-rounded-full
                  :style="{ backgroundColor: colorForGroup(`seg-${seg.segmentIndex}`) }"
                />
                <span>Seg {{ seg.segmentIndex + 1 }}</span>
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatMean(seg.sumAvg, seg.count) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatMean(seg.sumSlope, seg.count) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatRatio(seg.posSlope, seg.count) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      un-border="~ neutral-300 dark:neutral-700"
      un-overflow-hidden
    >
      <div un-overflow-x-auto>
        <table
          un-w-full
          un-text-sm
        >
          <thead
            un-text="neutral-800 dark:neutral-200"
          >
            <tr>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Break
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Δ Avg Mean
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Δ Avg > 0
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Δ Sen Mean
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Δ Sen > 0
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Δ Var Mean
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Δ Var > 0
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Mean |d|
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="breakSummary.length === 0"
              un-text="neutral-700 dark:neutral-300"
            >
              <td
                un-px-3
                un-py-2
                colspan="9"
              >
                暂无数据
              </td>
            </tr>
            <tr
              v-for="bk in breakSummary"
              :key="bk.breakIndex"
              un-border="t neutral-200 dark:neutral-800"
              un-text="neutral-700 dark:neutral-300"
            >
              <td
                un-px-3
                un-py-2
                un-flex="~ row items-center gap-2"
              >
                <span
                  un-w-3
                  un-h-3
                  un-rounded-full
                  :style="{ backgroundColor: colorForGroup(`break-${bk.breakIndex}`) }"
                />
                <span>Break {{ bk.breakIndex + 1 }}</span>
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatMean(bk.sumDeltaAvg, bk.count) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatRatio(bk.posDeltaAvg, bk.count) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatMean(bk.sumDeltaSlope, bk.count) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatRatio(bk.posDeltaSlope, bk.count) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatMean(bk.sumDeltaVar, bk.count) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatRatio(bk.posDeltaVar, bk.count) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ formatMean(bk.sumAbsD, bk.count) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
