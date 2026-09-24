import * as XLSX from 'xlsx'
import { sanitizarFilaImportada } from './sanitizarFilaImportada'

type FilaExport = Record<string, unknown>

// ─── EXPORT ──────────────────────────────────────────────────────────────────

/**
 * Descarga datos como archivo CSV.
 */
export function exportCSV(rows: FilaExport[], filename: string, columns?: string[]) {
  if (!rows?.length) return
  const cols = columns ?? Object.keys(rows[0])
  const escape = (v: unknown) => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replaceAll('"', '""')}"`
      : s
  }
  const header = cols.join(',')
  const body   = rows.map((r) => cols.map((c) => escape(r[c])).join(',')).join('\n')
  const blob   = new Blob([`\uFEFF${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${filename}.csv`)
}

/**
 * Descarga datos como archivo Excel (.xlsx).
 */
export function exportExcel(
  rows: FilaExport[],
  filename: string,
  columns?: string[],
  sheetName = 'Datos',
) {
  if (!rows?.length) return
  const cols = columns ?? Object.keys(rows[0])
  const data  = rows.map((r) => {
    const obj: FilaExport = {}
    cols.forEach((c) => { obj[c] = r[c] ?? '' })
    return obj
  })
  const ws = XLSX.utils.json_to_sheet(data, { header: cols })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ─── IMPORT ──────────────────────────────────────────────────────────────────

/**
 * Lee un archivo CSV o Excel y devuelve una promesa con el arreglo de filas.
 * Las columnas vacías y filas en blanco son eliminadas automáticamente.
 */
export function parseFile(file: File): Promise<FilaExport[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const result = e.target?.result
        if (!(result instanceof ArrayBuffer)) {
          reject(new Error('Error leyendo el archivo'))
          return
        }
        resolve(leerFilasDelLibro(new Uint8Array(result)))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Error leyendo el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

/** Parsea la primera hoja del libro. Los encabezados vienen del archivo subido. */
function leerFilasDelLibro(data: Uint8Array): FilaExport[] {
  const wb = XLSX.read(data, { type: 'array' })
  const nombreHoja = wb.SheetNames[0]
  if (!nombreHoja) throw new Error('El archivo no contiene ninguna hoja')
  const rows = XLSX.utils.sheet_to_json<FilaExport>(wb.Sheets[nombreHoja], { defval: '' })
  return rows
    .map(sanitizarFilaImportada)
    // Eliminar filas completamente vacías
    .filter((r) => Object.values(r).some((v) => v !== '' && v != null))
}

/**
 * Genera y descarga un archivo Excel de plantilla vacío con las columnas dadas.
 */
export function downloadTemplate(columns: string[], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([columns])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  XLSX.writeFile(wb, `${filename}_plantilla.xlsx`)
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
