import * as XLSX from 'xlsx'

// ─── EXPORT ──────────────────────────────────────────────────────────────────

/**
 * Descarga datos como archivo CSV.
 * @param {Object[]} rows - Arreglo de objetos planos
 * @param {string} filename - Nombre sin extensión
 * @param {string[]} [columns] - Orden y selección de columnas (usa todas si se omite)
 */
export function exportCSV(rows, filename, columns) {
  if (!rows?.length) return
  const cols = columns ?? Object.keys(rows[0])
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const header = cols.join(',')
  const body   = rows.map((r) => cols.map((c) => escape(r[c])).join(',')).join('\n')
  const blob   = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${filename}.csv`)
}

/**
 * Descarga datos como archivo Excel (.xlsx).
 * @param {Object[]} rows
 * @param {string} filename - Sin extensión
 * @param {string[]} [columns]
 * @param {string} [sheetName]
 */
export function exportExcel(rows, filename, columns, sheetName = 'Datos') {
  if (!rows?.length) return
  const cols = columns ?? Object.keys(rows[0])
  const data  = rows.map((r) => {
    const obj = {}
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
 * @param {File} file
 * @returns {Promise<Object[]>}
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        // Eliminar filas completamente vacías
        const clean = rows.filter((r) => Object.values(r).some((v) => v !== '' && v != null))
        resolve(clean)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Error leyendo el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Genera y descarga un archivo Excel de plantilla vacío con las columnas dadas.
 * @param {string[]} columns
 * @param {string} filename
 */
export function downloadTemplate(columns, filename) {
  const ws = XLSX.utils.aoa_to_sheet([columns])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  XLSX.writeFile(wb, `${filename}_plantilla.xlsx`)
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
