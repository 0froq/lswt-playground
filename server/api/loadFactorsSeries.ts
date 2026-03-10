import type { TimeSeries } from '~/types/mutation'

interface FactorSeriesEntry {
  factor: string
  series: TimeSeries[]
}

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

  const isSeasonal = /^(?:DJF|MAM|JJA|SON)$/i.test(agg)
  const seasonKey = isSeasonal ? agg.toUpperCase() : null

  const yearToCols = new Map<number, number[]>()
  for (const tc of timeColumns) {
    const y = tc.t.getFullYear()
    const month = tc.t.getMonth()

    if (seasonKey) {
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

      const seasonYear = (seasonKey === 'DJF' && month === 11) ? y + 1 : y
      if (!yearToCols.has(seasonYear))
        yearToCols.set(seasonYear, [])
      yearToCols.get(seasonYear)!.push(tc.idx)
    }
    else {
      if (!yearToCols.has(y))
        yearToCols.set(y, [])
      yearToCols.get(y)!.push(tc.idx)
    }
  }
  const years = Array.from(yearToCols.keys()).sort((a, b) => a - b)
  if (!years.length)
    throw new Error('未检测到有效年份列')

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
        const m = id.match(/(-?\d+(?:\.\d+)?)[\x09-\x0D\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*(?: |(?: \s*)?[,_])\s*(-?\d+(?:\.\d+)?)/)
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

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {
    dataset?: string
    idColumn?: string
    agg?: string
    clipRange?: string
  }
  const datasetParam = (query.dataset ?? 'default').toString().trim().toLowerCase() || 'default'
  const idColumn = (query.idColumn ?? 'lake_id').trim()
  const aggParam = (query.agg ?? 'avg').trim()
  const rawClipIndexRange = (query.clipRange ?? '')
    .split(',')
    .map(s => Number(s))
    .filter(v => !Number.isNaN(v))
  const clipIndexRange = rawClipIndexRange.length === 2 ? [rawClipIndexRange[0], rawClipIndexRange[1]] as [number, number] : undefined

  try {
    const { readdir, readFile } = await import('node:fs/promises')
    const { resolve } = await import('node:path')
    const process = await import('node:process')

    const dirPath = resolve(process.cwd(), `public/${datasetParam}`)
    const files = await readdir(dirPath)
    const factorFiles = files.filter(name => /^factor_series_.+\.csv$/i.test(name))
    const results: FactorSeriesEntry[] = []

    for (const fileName of factorFiles) {
      const match = fileName.match(/^factor_series_(.+)\.csv$/i)
      const factorName = match?.[1] ?? fileName
      const csvPath = resolve(dirPath, fileName)
      const csvText = await readFile(csvPath, 'utf-8')
      const series = parseWideCSVLocal(csvText, idColumn, aggParam, clipIndexRange)
      results.push({ factor: factorName, series })
    }

    return {
      factors: results,
      error: null,
      detail: null,
    }
  }
  catch (err) {
    setResponseStatus(event, 500)
    return {
      factors: [],
      error: 'Failed to load factor series CSV files',
      detail: String(err),
    }
  }
})
