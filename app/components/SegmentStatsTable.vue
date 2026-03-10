<script setup lang="ts">
import type { Break, Segment } from '~/types/segments'
import { computed } from 'vue'

const props = defineProps<{
  segments?: Segment[]
  breaks?: Break[]
}>()

function pToStars(p: number | undefined) {
  if (p === undefined || Number.isNaN(p))
    return ''
  if (p <= 0.001)
    return '***'
  if (p <= 0.01)
    return '**'
  if (p <= 0.05)
    return '*'
  return ''
}

const rows = computed(() => {
  const segs = (props.segments ?? [])
    .slice()
    .sort((a, b) => a.lakeId.localeCompare(b.lakeId) || a.segmentIndex - b.segmentIndex)
  const brks = props.breaks ?? []
  const lastSlopeByLake = new Map<string, number>()

  return segs.map((seg) => {
    const relatedBreak = brks.find(
      b => b.lakeId === seg.lakeId && b.yearIndex === seg.startYearIndex,
    )

    const prevSlope = lastSlopeByLake.get(seg.lakeId)
    const slopeTrend = prevSlope === undefined
      ? undefined
      : (seg.slope > prevSlope ? 'up' : seg.slope < prevSlope ? 'down' : 'flat')
    lastSlopeByLake.set(seg.lakeId, seg.slope)

    return {
      key: `${seg.lakeId}-${seg.segmentIndex}`,
      segmentIndex: seg.segmentIndex,
      years: `${seg.startYear} - ${seg.endYear}`,
      avg: seg.avg,
      slope: seg.slope,
      slopeStars: pToStars(seg.p),
      slopeTrend,
      var: seg.var,
      breakP: relatedBreak?.p,
      breakStars: relatedBreak ? pToStars(relatedBreak.p) : '',
      breakD: relatedBreak?.cohenD,
    }
  })
})
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-2
  >
    <div
      v-if="rows.length === 0"
      un-text="sm neutral-700 dark:neutral-300"
    >
      No segment stats available.
    </div>
    <div v-else>
      <div
        un-overflow-x-auto
        un-border="~ neutral-300 dark:neutral-700"
      >
        <table
          un-w-full
          un-text-sm
        >
          <thead
            un-bg="neutral-100 dark:neutral-900"
            un-text="neutral-900 dark:neutral-100"
            un-font="bold"
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
                Years
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Avg
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Slope
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Var
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Break p
              </th>
              <th
                un-text-left
                un-px-3
                un-py-2
              >
                Break d
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.key"
              un-border="t neutral-200 dark:neutral-800"
              un-text="neutral-700 dark:neutral-300"
            >
              <td
                un-px-3
                un-py-2
              >
                {{ row.segmentIndex }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ row.years }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ row.avg.toFixed(3) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                <span
                  :class="{
                    'text-emerald-500': row.slopeTrend === 'up',
                    'text-rose-500': row.slopeTrend === 'down',
                  }"
                >
                  {{ row.slope.toFixed(4) }}
                </span>
                <span
                  v-if="row.slopeStars"
                  un-ml-1
                >{{ row.slopeStars }}</span>
              </td>
              <td
                un-px-3
                un-py-2
              >
                {{ row.var.toFixed(3) }}
              </td>
              <td
                un-px-3
                un-py-2
              >
                <template v-if="row.breakP !== undefined && !Number.isNaN(row.breakP)">
                  {{ row.breakP.toFixed(4) }}
                  <span
                    v-if="row.breakStars"
                    un-ml-1
                  >{{ row.breakStars }}</span>
                </template>
                <span v-else>-</span>
              </td>
              <td
                un-px-3
                un-py-2
              >
                <template v-if="row.breakD !== undefined && !Number.isNaN(row.breakD)">
                  {{ row.breakD.toFixed(3) }}
                </template>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
