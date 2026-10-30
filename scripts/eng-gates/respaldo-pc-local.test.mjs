// Pruebas de INF-01: respaldo diario a la PC local (scripts/backup/respaldo-pc-pull.sh)
// y restauración (scripts/backup/restaurar-respaldo.sh).
// Sin servicios externos: pg_dump y pg_restore simulados, llave GPG de prueba efímera.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, readdirSync, writeFileSync, appendFileSync, existsSync, readFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pull = path.join(raiz, 'scripts/backup/respaldo-pc-pull.sh')
const restaurar = path.join(raiz, 'scripts/backup/restaurar-respaldo.sh')
const MARCA = 'PGDMP_HOTCLICK_DATO_PLANO_DE_PRUEBA'
let tmp, gnupg, pub, fpr, mockRestore, restoreLog

before(() => {
  tmp = mkdtempSync(path.join(tmpdir(), 'hc-respaldo-pc-'))
  gnupg = path.join(tmp, 'gnupg')
  execFileSync('mkdir', ['-m', '700', gnupg])
  execFileSync('gpg', ['--homedir', gnupg, '--batch', '--passphrase', '', '--quick-gen-key',
    'HotClick Backups TEST <test@example.invalid>', 'default', 'default', '1d'], { stdio: 'ignore' })
  const out = execFileSync('gpg', ['--homedir', gnupg, '--with-colons', '--list-keys'], { encoding: 'utf8' })
  fpr = out.split('\n').find((l) => l.startsWith('fpr:')).split(':')[9]
  pub = path.join(tmp, 'pub.asc')
  writeFileSync(pub, execFileSync('gpg', ['--homedir', gnupg, '--armor', '--export', fpr]))
  // pg_restore simulado: --list valida la cabecera PGDMP; sin --list registra la llamada.
  restoreLog = path.join(tmp, 'restore.log')
  mockRestore = path.join(tmp, 'pg_restore_mock.sh')
  writeFileSync(mockRestore, `#!/usr/bin/env bash
if [[ "$1" == --list ]]; then
  if [[ -n "$2" ]]; then d="$(head -c 5 "$2")"; else d="$(head -c 5)"; cat >/dev/null; fi
  [[ "$d" == PGDMP ]] || exit 1
  echo "; Archive"; echo "1; TABLE public t"; exit 0
fi
echo "RESTORE $*" >> "${restoreLog}"
`)
  chmodSync(mockRestore, 0o755)
})
after(() => rmSync(tmp, { recursive: true, force: true }))

const envBase = (extra = {}) => ({ PATH: process.env.PATH, HOME: tmp, PG_RESTORE_CMD: mockRestore, ...extra })
const respaldar = (dir, extra = {}) => spawnSync('bash', [pull], {
  encoding: 'utf8',
  env: envBase({ RESPALDO_DIR: dir, RESPALDO_GPG_RECIPIENT: fpr, RESPALDO_GPG_PUBKEY: pub,
    RESPALDO_FUENTE_CMD: `printf '%s\\n' "${MARCA}" "INSERT INTO t VALUES (1);"`, ...extra }),
})
const restaurarCon = (args) => spawnSync('bash', [restaurar, ...args], { encoding: 'utf8', env: envBase({ GNUPGHOME: gnupg }) })
const gpgs = (dir) => readdirSync(dir).filter((n) => n.endsWith('.gpg')).sort()

test('ida y vuelta: cifra sin texto plano, sha256, y restaura en simulacro', () => {
  const dir = path.join(tmp, 'r1')
  const r = respaldar(dir)
  assert.equal(r.status, 0, r.stderr)
  const [f] = gpgs(dir)
  assert.match(f, /^hotclick-\d{8}T\d{6}Z\.dump\.gz\.gpg$/)
  const full = path.join(dir, f)
  assert.ok(!readFileSync(full).includes(MARCA))
  assert.ok(existsSync(full + '.sha256'))
  assert.doesNotMatch(r.stdout, /INSERT|PGDMP/)
  const s = restaurarCon(['--archivo', full, '--destino', 'hotclick_drill'])
  assert.equal(s.status, 0, s.stderr)
  assert.match(s.stdout, /SIMULACRO/)
  assert.ok(!existsSync(restoreLog), 'el simulacro no debe llamar pg_restore -d')
  const e = restaurarCon(['--archivo', full, '--destino', 'hotclick_drill', '--ejecutar'])
  assert.equal(e.status, 0, e.stderr)
  assert.match(readFileSync(restoreLog, 'utf8'), /-d hotclick_drill/)
})

test('falla si el dump no es válido para pg_restore y no guarda nada', () => {
  const dir = path.join(tmp, 'r2')
  const r = respaldar(dir, { RESPALDO_FUENTE_CMD: 'echo basura' })
  assert.notEqual(r.status, 0)
  assert.equal(gpgs(dir).length, 0)
})

test('retención: 14 diarios + 8 semanales', () => {
  const dir = path.join(tmp, 'r3')
  execFileSync('mkdir', ['-p', dir])
  const base = Date.UTC(2026, 0, 1)
  for (let i = 0; i < 120; i++) {
    const d = new Date(base + i * 86400000).toISOString().slice(0, 10).replaceAll('-', '')
    writeFileSync(path.join(dir, `hotclick-${d}T081500Z.dump.gz.gpg`), 'x')
  }
  const r = respaldar(dir)
  assert.equal(r.status, 0, r.stderr)
  const quedan = gpgs(dir)
  // 14 más nuevos (incluye el de hoy) + semanas viejas hasta completar 8 semanas distintas.
  assert.ok(quedan.length >= 14 && quedan.length <= 14 + 8, `quedaron ${quedan.length}`)
  assert.ok(!quedan.includes('hotclick-20260101T081500Z.dump.gz.gpg'), 'lo más viejo se borra')
})

test('se niega a restaurar sobre producción sin --permitir-prod', () => {
  const dir = path.join(tmp, 'r4')
  respaldar(dir)
  const full = path.join(dir, gpgs(dir)[0])
  for (const destino of ['hotclick', 'postgresql://u@db/hotclick_prod']) {
    const s = restaurarCon(['--archivo', full, '--destino', destino, '--ejecutar'])
    assert.notEqual(s.status, 0)
    assert.match(s.stderr, /PRODUCCIÓN/)
  }
  const ok = restaurarCon(['--archivo', full, '--destino', 'hotclick', '--permitir-prod'])
  assert.equal(ok.status, 0, ok.stderr)
})

test('archivo corrupto: falla el checksum y también el descifrado', () => {
  const dir = path.join(tmp, 'r5')
  respaldar(dir)
  const full = path.join(dir, gpgs(dir)[0])
  appendFileSync(full, 'corrupto')
  const s = restaurarCon(['--archivo', full, '--destino', 'hotclick_drill'])
  assert.notEqual(s.status, 0)
  assert.match(s.stderr, /corrupto/)
  rmSync(full + '.sha256')
  writeFileSync(full, 'no es gpg')
  const s2 = restaurarCon(['--archivo', full, '--destino', 'hotclick_drill'])
  assert.notEqual(s2.status, 0)
  assert.match(s2.stderr, /descifrar/)
})
