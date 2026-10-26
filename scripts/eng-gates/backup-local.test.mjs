// Prueba del respaldo local cifrado (scripts/backup/backup-local-gpg.sh).
// Usa un pg_dump simulado y una llave GPG de prueba generada en el momento.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'scripts/backup/backup-local-gpg.sh')
const MARCA = 'HOTCLICK_DATO_PLANO_DE_PRUEBA_123'
let tmp, gnupg, pub, fpr

before(() => {
  tmp = mkdtempSync(path.join(tmpdir(), 'hc-backup-'))
  gnupg = path.join(tmp, 'gnupg')
  execFileSync('mkdir', ['-m', '700', gnupg])
  execFileSync('gpg', ['--homedir', gnupg, '--batch', '--passphrase', '', '--quick-gen-key',
    'HotClick Backups TEST <test@example.invalid>', 'default', 'default', '1d'], { stdio: 'ignore' })
  const out = execFileSync('gpg', ['--homedir', gnupg, '--with-colons', '--list-keys'], { encoding: 'utf8' })
  fpr = out.split('\n').find((l) => l.startsWith('fpr:')).split(':')[9]
  pub = path.join(tmp, 'pub.asc')
  writeFileSync(pub, execFileSync('gpg', ['--homedir', gnupg, '--armor', '--export', fpr]))
})
after(() => rmSync(tmp, { recursive: true, force: true }))

function correr(dir, extra = {}) {
  return spawnSync('bash', [script], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: tmp,
      BACKUP_DIR: dir,
      BACKUP_KEEP: '2',
      BACKUP_GPG_RECIPIENT: fpr,
      BACKUP_GPG_PUBKEY: pub,
      PG_DUMP_CMD: `printf '%s\\n' "${MARCA}" "INSERT INTO t VALUES (1);"`,
      ...extra,
    },
  })
}
const archivos = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : [])

test('cifra, sin texto plano, permisos 700/600 y descifrable con la privada', () => {
  const dir = path.join(tmp, 'b1')
  const r = correr(dir)
  assert.equal(r.status, 0, r.stderr)
  const fs = archivos(dir)
  assert.equal(fs.length, 1)
  assert.match(fs[0], /^hotclick-\d{8}T\d{6}Z\.dump\.gz\.gpg$/)
  const f = path.join(dir, fs[0])
  assert.ok(!readFileSync(f).includes(MARCA), 'no debe haber texto plano')
  assert.equal(statSync(dir).mode & 0o777, 0o700)
  assert.equal(statSync(f).mode & 0o777, 0o600)
  const plano = execFileSync('bash', ['-c', `gpg --homedir "${gnupg}" --batch -q --decrypt "${f}" | gunzip`], { encoding: 'utf8' })
  assert.ok(plano.includes(MARCA))
})

test('rota y conserva solo los últimos BACKUP_KEEP', () => {
  const dir = path.join(tmp, 'b2')
  for (let i = 0; i < 4; i++) {
    assert.equal(correr(dir).status, 0)
    execFileSync('sleep', ['1.1'])
  }
  assert.equal(archivos(dir).length, 2)
})

test('falla si el cifrado falla (destinatario inexistente) y no deja nada', () => {
  const dir = path.join(tmp, 'b3')
  const r = correr(dir, { BACKUP_GPG_RECIPIENT: 'NO-EXISTE' })
  assert.notEqual(r.status, 0)
  assert.equal(archivos(dir).filter((n) => !n.startsWith('.')).length, 0)
})

test('falla si pg_dump falla y no deja parciales', () => {
  const dir = path.join(tmp, 'b4')
  const r = correr(dir, { PG_DUMP_CMD: `echo ${MARCA}; exit 3` })
  assert.notEqual(r.status, 0)
  assert.deepEqual(archivos(dir), [])
})

test('exige destinatario y rechaza llave privada', () => {
  assert.notEqual(correr(path.join(tmp, 'b5'), { BACKUP_GPG_RECIPIENT: '' }).status, 0)
  const priv = path.join(tmp, 'priv.asc')
  writeFileSync(priv, '-----BEGIN PGP PRIVATE KEY BLOCK-----\nx\n')
  const r = correr(path.join(tmp, 'b6'), { BACKUP_GPG_PUBKEY: priv })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /PRIVADA/)
})

test('el script no usa AWS ni instala cron', () => {
  const s = readFileSync(script, 'utf8').split('\n').filter((l) => !l.trim().startsWith('#')).join('\n')
  assert.doesNotMatch(s, /\baws\s+s3|crontab\s|\/etc\/cron/)
})
