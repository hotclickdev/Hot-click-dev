/**
 * Smoke estático: cada ancla seller del mmRegistry debe existir como data-mm en src.
 * Uso: node scripts/verify-mm-anchors.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const registryPath = path.join(root, 'src/components/ui/mentalModel/mmRegistry.ts')
const srcRoot = path.join(root, 'src')

const registry = fs.readFileSync(registryPath, 'utf8')
const anclas = [...registry.matchAll(/ancla:\s*'([^']+)'/g)]
  .map((m) => m[1])
  .filter((a) => a.startsWith('seller-'))

const unique = [...new Set(anclas)]

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      walk(full, out)
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

const files = walk(srcRoot)
const blob = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n')

const missing = unique.filter((ancla) => {
  const asAttr = `data-mm="${ancla}"`
  const asProp = `dataMm="${ancla}"`
  const asPropSingle = `dataMm='${ancla}'`
  return !blob.includes(asAttr) && !blob.includes(asProp) && !blob.includes(asPropSingle)
})

if (missing.length) {
  console.error('MM anchors missing in src:', missing.join(', '))
  process.exit(1)
}

console.log(`OK ${unique.length} seller anclas presentes en src`)
console.log(unique.join('\n'))
