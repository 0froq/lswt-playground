import type { LakeFactors } from '~/types/factor'

function toCamelCase(str: string): string {
  return str.replace(/(^\w|[A-Z]|\b\w)/g, (letter, index) => (index === 0 ? letter.toLowerCase() : letter.toLowerCase())).replace(/\s+/g, '')
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      }
      else { inQuotes = !inQuotes }
    }
    else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    }
    else {
      current += ch
    }
  }
  result.push(current)
  return result.map(s => s.trim())
}

function parseFactorsCsv(csvText: string): LakeFactors[] {
  const lines = (csvText ?? '').split(/\r?\n/).filter(l => l.trim().length > 0)
  if (!lines.length)
    return []

  const headers = splitCsvLine(lines[0] ?? '').map(h => toCamelCase(h))
  const lakeIdx = headers.indexOf('lake')
  if (lakeIdx < 0)
    throw new Error('CSV 不包含 lake 列')

  const factors: LakeFactors[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i] ?? '')
    const entry: Record<string, string | number> = {}
    headers.forEach((header, idx) => {
      const val = values[idx]
      if (val !== undefined) {
        const num = Number(val)
        entry[header] = Number.isNaN(num) ? val : num
      }
    })

    if (!entry.lake)
      continue

    factors.push(entry as LakeFactors)
  }

  return factors
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as { csvPath?: string, dataset?: string }
  const datasetParam = (query.dataset ?? '').toString().trim().toLowerCase()
  // const csvPathParam = (query.csvPath ?? (datasetParam === 'era5' ? 'public/factors_era5.csv' : 'public/factors_simplified.csv')).toString().trim()
  const csvPathParam = (query.csvPath
    ? `public/factors_${datasetParam}.csv`
    : `public/factors_era5.csv`
  )

  if (!csvPathParam) {
    setResponseStatus(event, 400)
    return {
      factors: [],
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
        factors: [],
        error: `Failed to read CSV at ${csvPath}`,
        detail: 'File is empty',
      }
    }

    let factors: LakeFactors[] = []
    try {
      factors = parseFactorsCsv(csvText)
    }
    catch (e: any) {
      setResponseStatus(event, 400)
      return {
        factors: [],
        error: e?.message ?? 'Failed to parse factors CSV',
        detail: String(e),
      }
    }

    return {
      factors,
      error: null,
      detail: null,
    }
  }
  catch (err) {
    setResponseStatus(event, 500)
    return {
      factors: [],
      error: 'Failed to read CSV file from disk',
      detail: String(err),
    }
  }
})
