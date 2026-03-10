import type { TimeSeries } from '~/types/mutation'

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else {
        inQuotes = !inQuotes
      }
    }
    else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    }
    else {
      current += ch
    }
  }
  result.push(current)
  return result.map(s => s.trim())
}

function parseWideCSVLocal(csvText: string, idColumn: string, agg: string = 'avg', clipRange: [number, number] | undefined): TimeSeries[] {
  const lines = (csvText ?? '').split(/\r?\n/).filter(l => l.trim().length > 0)
  if (!lines.length)
    return []
  const header = splitCSVLine(lines[0] ?? '')
  const idIdx = header.indexOf(idColumn)
  if (idIdx < 0)
    throw new Error('CSV 不包含指定的 id 列')
  const latIdx = header.findIndex(h => /^(?:lat|latitude)$/i.test(h))
  const lonIdx = header.findIndex(h => /^(?:lon|longitude)$/i.test(h))
  const timeColumns: { idx: number, t: Date }[] = []
  for (let i = 0; i < header.length; i++) {
    if (i === idIdx)
      continue
    const raw = header[i] ?? ''
    const t = new Date(raw)
    if (!Number.isNaN(t.getTime()))
      timeColumns.push({ idx: i, t })
  }
  if (!timeColumns.length)
    throw new Error('未检测到时间列头')
  timeColumns.sort((a, b) => a.t.getTime() - b.t.getTime())

  // Group time columns by year (or season) for aggregation
  // Support seasonal aggregation: DJF (Dec-Jan-Feb), MAM (Mar-Apr-May), JJA (Jun-Jul-Aug), SON (Sep-Oct-Nov)
  const isSeasonal = /^(?:DJF|MAM|JJA|SON)$/i.test(agg)
  const seasonKey = isSeasonal ? agg.toUpperCase() : null

  const yearToCols = new Map<number, number[]>()
  for (const tc of timeColumns) {
    const y = tc.t.getFullYear()
    const month = tc.t.getMonth() // 0-11

    if (seasonKey) {
      // Only include months that belong to the specified season
      let include = false
      if (seasonKey === 'DJF' && (month === 11 || month === 0 || month === 1))
        include = true
      else if (seasonKey === 'MAM' && (month >= 2 && month <= 4))
        include = true
      else if (seasonKey === 'JJA' && (month >= 5 && month <= 7))
        include = true
      else if (seasonKey === 'SON' && (month >= 8 && month <= 10))
        include = true

      if (!include)
        continue

      // For DJF, December belongs to the previous year's DJF season
      const seasonYear = (seasonKey === 'DJF' && month === 11) ? y + 1 : y
      if (!yearToCols.has(seasonYear))
        yearToCols.set(seasonYear, [])
      yearToCols.get(seasonYear)!.push(tc.idx)
    }
    else {
      // Regular yearly aggregation
      if (!yearToCols.has(y))
        yearToCols.set(y, [])
      yearToCols.get(y)!.push(tc.idx)
    }
  }
  const years = Array.from(yearToCols.keys()).sort((a, b) => a - b)
  if (!years.length)
    throw new Error('未检测到有效年份列')
  // Group values by id and by year to allow yearly aggregation
  const grouped = new Map<string, { label: string, values: number[][], lat?: number, lon?: number }>()
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCSVLine(lines[r] ?? '')
    const id = cols[idIdx]
    if (!id)
      continue
    if (!grouped.has(id)) {
      grouped.set(id, { label: id, values: Array.from({ length: years.length }, () => [] as number[]) })
    }
    const entry = grouped.get(id)!

    if (entry.lat === undefined || entry.lon === undefined) {
      let latV: number | undefined
      let lonV: number | undefined
      if (latIdx >= 0 && lonIdx >= 0) {
        const latRaw = cols[latIdx] ?? ''
        const lonRaw = cols[lonIdx] ?? ''
        const latN = Number(latRaw)
        const lonN = Number(lonRaw)
        if (!Number.isNaN(latN) && !Number.isNaN(lonN)) {
          latV = latN
          lonV = lonN
        }
      }
      if (latV === undefined || lonV === undefined) {
        const m = id.match(/(-?\d+(?:\.\d+)?)\s*[,_]\s*(-?\d+(?:\.\d+)?)/)
        if (m) {
          latV = Number(m[1])
          lonV = Number(m[2])
        }
      }
      if (latV !== undefined && lonV !== undefined) {
        entry.lat = latV
        entry.lon = lonV
      }
    }

    for (let yi = 0; yi < years.length; yi++) {
      const colIndices = yearToCols.get(years[yi]) || []
      for (const colIdx of colIndices) {
        const raw = cols[colIdx] ?? ''
        const v = Number(raw)
        if (!Number.isNaN(v))
          entry.values[yi].push(v)
      }
    }
  }

  function aggregateArr(arr: number[]): number | null {
    if (!arr || arr.length === 0)
      return null
    const aggLower = (agg || 'avg').toLowerCase()
    // For seasonal aggregations, use avg as the aggregation method
    const effectiveAgg = /^(?:djf|mam|jja|son)$/i.test(aggLower) ? 'avg' : aggLower

    switch (effectiveAgg) {
      case 'max': return Math.max(...arr)
      case 'min': return Math.min(...arr)
      case 'var': {
        const mean = arr.reduce((s, x) => s + x, 0) / arr.length
        const v = arr.reduce((s, x) => s + (x - mean) * (x - mean), 0) / arr.length
        return v
      }
      case 'range': {
        return Math.max(...arr) - Math.min(...arr)
      }
      case 'avg':
      default:
        return arr.reduce((s, x) => s + x, 0) / arr.length
    }
  }

  const out: TimeSeries[] = []
  for (const [id, entry] of grouped.entries()) {
    const points: { t: Date, v: number }[] = []
    for (let yi = 0; yi < years.length; yi++) {
      const arr = entry.values[yi]
      const aggV = aggregateArr(arr)
      if (aggV === null)
        continue
      // use Jan 1st of the year as the representative time
      points.push({ t: new Date(years[yi], 0, 1), v: aggV })
    }
    if (points.length)
      out.push({ id, label: entry.label, lat: entry.lat ?? Number.NaN, lon: entry.lon ?? Number.NaN, points })
  }

  if (clipRange) {
    const [clipStartYear, clipEndYear] = clipRange
    for (const ts of out) {
      ts.points = ts.points.filter((p) => {
        const y = p.t.getFullYear()
        return y >= clipStartYear && y <= clipEndYear
      })
    }
  }
  return out
}

// GET /api/lakeTemp
// Query:
// - idColumn: string (required) -> CSV 首行的 id 列列头名
// - agg: string (optional) -> 聚合方式（avg/min/max/var/range）
// - csvPath: string (optional) -> CSV 文件路径，默认 public/lake_temperature.csv

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {
    idColumn?: string
    agg?: string
    clipRange?: string
    dataset?: string
  }
  const idColumn = (query.idColumn ?? 'lake_id').trim()
  const aggParam = (query.agg ?? 'avg').trim().toLowerCase()
  const rawClipIndexRange = (query.clipRange ?? '').split(',')
  const clipIndexRange = rawClipIndexRange.length === 0 ? [Number(rawClipIndexRange[0]), Number(rawClipIndexRange[1])] as [number, number] : undefined
  const datasetParam = (query.dataset ?? '').toString().trim().toLowerCase()
  // If csvPath explicitly provided, use it. Otherwise choose based on dataset.
  // const csvPathParam = (query.csvPath ?? (datasetParam === 'era5' ? 'public/lake_temperature_era5.csv' : 'public/lake_temperature.csv')).toString().trim()
  const csvPathParam = (datasetParam
    ? `public/lake_temperature_${datasetParam}.csv`
    : `public/lake_temperature_era5.csv`
  )

  if (!idColumn) {
    setResponseStatus(event, 400)
    return {
      series: [],
      error: 'idColumn is required',
      detail: null,
    }
  }
  if (!csvPathParam) {
    setResponseStatus(event, 400)
    return {
      series: [],
      error: 'csvPath is required',
      detail: null,
    }
  }

  try {
    const { readFile } = await import('node:fs/promises')
    const { isAbsolute, resolve } = await import('node:path')
    const process = await import('node:process')
    const csvPath = isAbsolute(csvPathParam) ? csvPathParam : resolve(process.cwd(), csvPathParam)
    const csvText = await readFile(csvPath, 'utf-8')
    if (!csvText) {
      setResponseStatus(event, 500)
      return {
        series: [],
        error: `Failed to read CSV at ${csvPath}`,
        detail: 'File is empty',
      }
    }

    let series: TimeSeries[] = []
    try {
      series = parseWideCSVLocal(csvText, idColumn, aggParam, clipIndexRange)
    }
    catch (e: any) {
      setResponseStatus(event, 400)
      return {
        series: [],
        error: e?.message ?? 'Failed to parse CSV',
        detail: String(e),
      }
    }

    return {
      series,
      error: null,
      detail: null,
    }
  }
  catch (err) {
    setResponseStatus(event, 500)
    return {
      series: [],
      error: 'Failed to read CSV file from disk',
      detail: String(err),
    }
  }
})
