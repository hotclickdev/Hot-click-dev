import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export const SRC = join(process.cwd(), 'src')
export const leer = (rel: string) => readFileSync(join(SRC, rel), 'utf8')

export function archivosFuente(dir = SRC): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === '__tests__' || n === 'node_modules' ? [] : archivosFuente(p)
    return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [relative(SRC, p)] : []
  })
}
