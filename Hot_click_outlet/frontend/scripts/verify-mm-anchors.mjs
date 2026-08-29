/**
 * Smoke estático: cada ancla seller/visitante del mmRegistry debe existir en src.
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
  .filter((a) => a.startsWith('seller-') || a.startsWith('vis-'))

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

function anclaPresente(blob, ancla) {
  return (
    blob.includes(`data-mm="${ancla}"`)
    || blob.includes(`dataMm="${ancla}"`)
    || blob.includes(`dataMm='${ancla}'`)
    || blob.includes(`dataMm = '${ancla}'`)
    || blob.includes(`'${ancla}'`)
  )
}

const files = walk(srcRoot)
const blob = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n')

const missing = unique.filter((ancla) => !anclaPresente(blob, ancla))

if (missing.length) {
  console.error('MM anchors missing in src:', missing.join(', '))
  process.exit(1)
}

console.log(`OK ${unique.length} anclas seller/visitante presentes en src`)
console.log(unique.join('\n'))
