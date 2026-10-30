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
  // pg_restore simulado: --list lee SOLO 5 bytes (cabecera PGDMP) y cierra sin drenar,
  // como el real que lee el TOC y sale: reproduce el SIGPIPE de tee (rc=141).
  // Sin --list registra la llamada y drena stdin.
  restoreLog = path.join(tmp, 'restore.log')
  mockRestore = path.join(tmp, 'pg_restore_mock.sh')
  writeFileSync(mockRestore, `#!/usr/bin/env bash
if [[ "$1" == --list ]]; then
  if [[ -n "$2" ]]; then d="$(head -c 5 "$2")"; else d="$(head -c 5)"; fi
  [[ "$d" == PGDMP ]] || exit 1
  echo "; Archive"; echo "1; TABLE public t"; exit 0
fi
[[ -t 0 ]] || cat >/dev/null
echo "RESTORE $*" >> "${restoreLog}"
`)
  chmodSync(mockRestore, 0o755)
})
after(() => rmSync(tmp, { recursive: true, force: true }))

const envBase = (extra = {}) => ({ PATH: process.env.PATH, HOME: tmp, PG_RESTORE_CMD: mockRestore, ...extra })
const respaldar = (dir, extra = {}) => spawnSync('bash', [pull], {
  encoding: 'utf8',
  env: envBase({ RESPALDO_DIR: dir, RESPALDO_GPG_RECIPIENT: fpr, RESPALDO_GPG_PUBKEY: pub,
    RESPALDO_FUENTE_CMD: `printf '%s\\n' "${MARCA}"; for i in $(seq 1 40000); do echo "INSERT INTO t VALUES ($i);"; done`, ...extra }),
})
const restaurarCon = (args, extra = {}) => spawnSync('bash', [restaurar, ...args], { encoding: 'utf8', env: envBase({ GNUPGHOME: gnupg, ...extra }) })
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

test('allowlist de destino: rechaza todo lo que no sea host local + base restore/drill/test', () => {
  const dir = path.join(tmp, 'r4')
  respaldar(dir)
  const full = path.join(dir, gpgs(dir)[0])
  const rechazados = [
    'hotclick',
    'postgresql://u@10.0.0.5:5432/hotclick',
    'host=db.interno dbname=hotclick',
    'postgresql://u@10.0.0.5:5432/hotclick_restore',
    'host=db.interno dbname=hotclick_drill',
    'postgresql://u@localhost/hotclick',
    'postgresql://u@db/hotclick_prod',
    'postgresql://u@localhost/hotclick_test?host=10.0.0.5',
    'host=localhost,10.0.0.5 dbname=hotclick_test',
    'postgresql://u@localhost,10.0.0.5/hotclick_test',
  ]
  for (const destino of rechazados) {
    const s = restaurarCon(['--archivo', full, '--destino', destino, '--ejecutar'])
    assert.notEqual(s.status, 0, destino)
    assert.match(s.stderr, /allowlist/, destino)
  }
  assert.ok(!existsSync(restoreLog) || !readFileSync(restoreLog, 'utf8').includes('10.0.0.5'))
  const aceptados = ['postgresql://u@localhost/hotclick_restore', 'host=127.0.0.1 dbname=drill',
    'postgresql://u@[::1]:5432/hotclick_test', 'host=/var/run/postgresql dbname=hc_restore']
  for (const destino of aceptados) {
    const s = restaurarCon(['--archivo', full, '--destino', destino])
    assert.equal(s.status, 0, `${destino}: ${s.stderr}`)
  }
  const e = restaurarCon(['--archivo', full, '--destino', 'host=127.0.0.1 dbname=drill', '--ejecutar'])
  assert.equal(e.status, 0, e.stderr)
  assert.match(readFileSync(restoreLog, 'utf8'), /-d host=127\.0\.0\.1 dbname=drill/)
  const ok = restaurarCon(['--archivo', full, '--destino', 'hotclick', '--permitir-prod'])
  assert.equal(ok.status, 0, ok.stderr)
  assert.match(ok.stdout, /PELIGROSO/)
})

test('entorno libpq y claves que desvían el destino: fail-closed', () => {
  const dir = path.join(tmp, 'r8')
  respaldar(dir)
  const full = path.join(dir, gpgs(dir)[0])
  const casos = [
    [{ PGHOSTADDR: '10.0.0.5' }, 'postgresql://localhost/test', /PGHOSTADDR/],
    [{ PGHOSTADDR: '10.0.0.5' }, 'host=localhost dbname=test', /PGHOSTADDR/],
    [{ PGHOSTADDR: '10.0.0.5' }, 'hotclick_test', /PGHOSTADDR/],
    [{ PGHOSTADDR: '10.0.0.5' }, 'hotclick_test', /PGHOSTADDR/, ['--permitir-prod']],
    [{ PGSERVICE: 'prod' }, 'hotclick_test', /PGSERVICE/],
    [{ PGSERVICEFILE: '/tmp/x' }, 'hotclick_test', /PGSERVICEFILE/],
    [{ PGDATABASE: 'hotclick' }, 'host=localhost dbname=test', /PGDATABASE/],
    [{ PGREQUIREAUTH: 'none' }, 'hotclick_test', /PGREQUIREAUTH/],
    [{ PGOPTIONS: '-c x=y' }, 'hotclick_test', /PGOPTIONS/],
    [{ PGHOST: '10.0.0.5' }, 'hotclick_test', /PGHOST/],
    [{ PGHOST: '10.0.0.5' }, 'hostaddr= dbname=test', /PGHOST/],
    [{ PGHOST: '' }, 'hotclick_test', /PGHOST/],
    [{ PGHOST: 'localhost,10.0.0.5' }, 'hotclick_test', /PGHOST/],
  ]
  for (const [env, destino, re, extra = []] of casos) {
    const s = restaurarCon(['--archivo', full, '--destino', destino, '--ejecutar', ...extra], env)
    assert.notEqual(s.status, 0, `${JSON.stringify(env)} ${destino}`)
    assert.match(s.stderr, re, `${JSON.stringify(env)} ${destino}`)
  }
  const rechazados = [
    'hostaddr= dbname=test',
    'hostaddr=10.0.0.5 dbname=test',
    'host=localhost hostaddr=10.0.0.5 dbname=test',
    'host= dbname=test',
    'service=prod dbname=test',
    'passfile=/tmp/x host=localhost dbname=test',
    'host=localhost host=10.0.0.5 dbname=test',
    'host = localhost dbname=test',
    'postgresql:///test?service=prod',
    'postgresql://localhost/test?hostaddr=10.0.0.5',
    'postgresql://localhost/test?serv%69ce=prod',
    'postgresql:///test?host=',
    'postgresql://[]/test',
    'hotclick_test_prod',
    'postgresql://localhost/hotclick_test_prod',
    'host=localhost dbname=hotclick_restore_x',
    'testing',
    'HOTCLICK_TEST',
  ]
  for (const destino of rechazados) {
    const s = restaurarCon(['--archivo', full, '--destino', destino, '--ejecutar'])
    assert.notEqual(s.status, 0, destino)
    assert.match(s.stderr, /allowlist/, destino)
  }
  for (const [env, destino] of [[{}, 'restore'], [{}, 'test'], [{ PGHOST: 'localhost' }, 'hotclick_drill'],
    [{ PGHOST: '/var/run/postgresql', PGPORT: '5432', PGUSER: 'postgres' }, 'postgresql:///hc_test'],
    [{}, 'postgresql://localhost/x?dbname=hc_restore&sslmode=disable']]) {
    const s = restaurarCon(['--archivo', full, '--destino', destino], env)
    assert.equal(s.status, 0, `${destino}: ${s.stderr}`)
  }
  assert.ok(!existsSync(restoreLog) || !readFileSync(restoreLog, 'utf8').includes('10.0.0.5'))
})

test('pull: --list que cierra temprano no tumba el respaldo (SIGPIPE) y rechaza recipient no-fingerprint', () => {
  const dir = path.join(tmp, 'r6')
  const r = respaldar(dir)
  assert.equal(r.status, 0, r.stderr)
  assert.equal(gpgs(dir).length, 1)
  const malo = respaldar(path.join(tmp, 'r7'), { RESPALDO_GPG_RECIPIENT: 'HotClick Backups' })
  assert.notEqual(malo.status, 0)
  assert.match(malo.stderr, /40 hex/)
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
