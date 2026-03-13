import { defineEventHandler, readBody } from 'h3'
import { analyzeSTLTrendComponent } from '../utils/stlTrendAnalysis'
import type { AnalyzeSTLTrendRequest, AnalyzeSTLTrendResponse, STLTrendAnalysisItem } from '~/types/stl-trend'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as AnalyzeSTLTrendRequest
    const { stlResults, breakYears } = body

    if (!stlResults?.length) {
      return { analysis: [], error: 'No STL results provided' }
    }

    if (!breakYears?.length) {
      return { analysis: [], error: 'No break years provided' }
    }

    console.log(`[API analyzeSTLTrend] Processing ${stlResults.length} lakes`)

    const analysis: STLTrendAnalysisItem[] = []

    for (const stl of stlResults) {
      try {
        const result = analyzeSTLTrendComponent(
          stl.trend,
          stl.seasonal,
          stl.time.map(t => new Date(t)),
          breakYears,
        )

        const segments = result.segments.map(s => ({ ...s, lakeId: stl.lakeId, label: stl.label }))
        const breaks = result.breaks.map(b => ({ ...b, lakeId: stl.lakeId, label: stl.label }))
        const seasonalAmplitude = { ...result.seasonalAmplitude, lakeId: stl.lakeId, label: stl.label }

        // Calculate map metrics
        const fastestPeriodIndex = segments.length > 0 
          ? segments.reduce((maxIdx, seg, idx, arr) => 
              seg.slope > arr[maxIdx]!.slope ? idx : maxIdx, 0)
          : -1
        
        const fastestPeriodSlope = segments.length > 0 
          ? Math.max(...segments.map(s => s.slope))
          : 0
        
        const slowestPeriodSlope = segments.length > 0 
          ? Math.min(...segments.map(s => s.slope))
          : 0

        const maxDeltaSlopeBreakIndex = breaks.length > 0
          ? breaks.reduce((maxIdx, brk, idx, arr) =>
              Math.abs(brk.deltaSlope) > Math.abs(arr[maxIdx]!.deltaSlope) ? idx : maxIdx, 0)
          : -1

        const maxDeltaSlope = breaks.length > 0
          ? Math.max(...breaks.map(b => Math.abs(b.deltaSlope)))
          : 0

        analysis.push({
          lakeId: stl.lakeId,
          label: stl.label,
          lat: stl.lat,
          lon: stl.lon,
          segments,
          breaks,
          seasonalAmplitude,
          mapMetrics: {
            fastestPeriodIndex,
            fastestPeriodSlope,
            slowestPeriodSlope,
            maxDeltaSlopeBreakIndex,
            maxDeltaSlope,
            seasonalAmplitudeSlope: seasonalAmplitude.amplitudeSlope,
          },
        })
      }
      catch (err) {
        console.error(`[API analyzeSTLTrend] Error processing lake ${stl.lakeId}:`, err)
      }
    }

    console.log(`[API analyzeSTLTrend] Completed: ${analysis.length} lakes analyzed`)

    return {
      analysis,
      error: null,
    } as AnalyzeSTLTrendResponse
  }
  catch (error: any) {
    console.error('[API analyzeSTLTrend] Fatal error:', error)
    return {
      analysis: [],
      error: error.message || 'Unknown error occurred',
    } as AnalyzeSTLTrendResponse
  }
})
