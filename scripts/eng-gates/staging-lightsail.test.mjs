// Prueba de Hot_click_outlet/staging: .env.staging.example seguro y deploy que aborta ante llaves live.
// git, docker y curl son falsos: no toca Docker, red, AWS ni producción.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dirStg = path.join(raiz, 'Hot_click_outlet/staging')
const ejemplo = readFileSync(path.join(dirStg, '.env.staging.example'), 'utf8')
let tmp, bin, log

const leer = (txt, k) => {
  const l = txt.split('\n').filter((x) => x.startsWith(`${k}=`)).pop()
  return l === undefined ? undefined : l.slice(k.length + 1)
}

before(() => {
  tmp = mkdtempSync(path.join(tmpdir(), 'hc-stg-'))
  bin = path.join(tmp, 'bin')
  log = path.join(tmp, 'calls.log')
  spawnSync('mkdir', ['-p', bin])
  for (const cmd of ['git', 'docker', 'curl', 'sleep']) {
    const f = path.join(bin, cmd)
    writeFileSync(f, `#!/usr/bin/env bash\necho "${cmd} $*" >> "${log}"\n${cmd === 'git' ? 'case "$1" in rev-parse) echo abc123def456;; esac\n' : ''}exit 0\n`)
    chmodSync(f, 0o755)
  }
})
after(() => rmSync(tmp, { recursive: true, force: true }))

function deploy(envTxt) {
  const envFile = path.join(tmp, 'env.staging')
  writeFileSync(envFile, envTxt)
  rmSync(log, { force: true })
  const r = spawnSync('bash', [path.join(dirStg, 'deploy-staging.sh')], {
    encoding: 'utf8',
    env: { PATH: `${bin}:${process.env.PATH}`, ENV_FILE: envFile, APP_DIR: tmp, HEALTH_SLEEP: '0' },
  })
  r.calls = existsSync(log) ? readFileSync(log, 'utf8') : ''
  return r
}
const conVar = (k, v) => ejemplo.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`)

test('.env.staging.example: staging, perfil prod, ONVO apagado y de prueba', () => {
  assert.equal(leer(ejemplo, 'HOTCLICK_ENV'), 'staging')
  const perfil = leer(ejemplo, 'SPRING_PROFILES_ACTIVE')
  assert.ok(perfil && !/(^|,)(dev|test)(,|$)/.test(perfil), `perfil inválido: ${perfil}`)
  assert.equal(leer(ejemplo, 'PAYMENTS_ONVO_ENABLED'), 'false')
  for (const k of ['ONVO_SECRET_KEY', 'ONVO_PUBLISHABLE_KEY']) assert.match(leer(ejemplo, k), /^onvo_test_/)
})

test('.env.staging.example: sin secretos, IPs ni llaves live', () => {
  assert.doesNotMatch(ejemplo, /onvo_live_|sk_live_|pk_live_|BEGIN [A-Z ]*PRIVATE KEY/)
  assert.doesNotMatch(ejemplo, /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)
  assert.doesNotMatch(ejemplo, /https:\/\/[0-9a-f]{20,}@/i, 'sin DSN de Sentry real')
  for (const k of ['DB_PASSWORD', 'JWT_SECRET', 'TOTP_ENCRYPTION_KEY', 'INTERNAL_SECRET', 'HOTCLICK_ADMIN_INITIAL_PASSWORD']) {
    assert.match(leer(ejemplo, k), /^<.*>$/, `${k} debe ser placeholder`)
  }
})

test('nginx de staging: client_max_body_size 30m como prod (30MB)', () => {
  const conf = readFileSync(path.join(dirStg, 'nginx/hotclick-staging.conf'), 'utf8')
  assert.match(conf, /client_max_body_size\s+30m;/)
  const props = readFileSync(path.join(raiz, 'Hot_click_outlet/src/main/resources/application.properties'), 'utf8')
  assert.match(props, /spring\.servlet\.multipart\.max-request-size=30MB/)
})

test('deploy con el example pasa la validación y despliega master con el proyecto de staging', () => {
  const r = deploy(ejemplo)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.calls, /git pull --ff-only origin master/)
  assert.match(r.calls, /docker compose -p hotclick-staging/)
})

for (const [nombre, txt] of [
  ['llave secreta live', () => conVar('ONVO_SECRET_KEY', 'onvo_live_secret_key_abc')],
  ['llave publicable live', () => conVar('ONVO_PUBLISHABLE_KEY', 'onvo_live_publishable_key_abc')],
  ['llave sin prefijo de prueba', () => conVar('ONVO_SECRET_KEY', 'otra_cosa')],
  ['ONVO habilitado sin llave', () => conVar('ONVO_SECRET_KEY', '').replace('PAYMENTS_ONVO_ENABLED=false', 'PAYMENTS_ONVO_ENABLED=true')],
  ['perfil dev', () => conVar('SPRING_PROFILES_ACTIVE', 'dev')],
  ['perfil prod,test', () => conVar('SPRING_PROFILES_ACTIVE', 'prod,test')],
  ['HOTCLICK_ENV no staging', () => conVar('HOTCLICK_ENV', 'production')],
]) {
  test(`deploy aborta: ${nombre}, sin tocar git ni docker`, () => {
    const r = deploy(txt())
    assert.notEqual(r.status, 0)
    assert.equal(r.calls, '', 'no debe llamar a git/docker/curl')
    assert.doesNotMatch(r.stdout + r.stderr, /onvo_live_secret_key_abc/, 'no imprime la llave')
  })
}
