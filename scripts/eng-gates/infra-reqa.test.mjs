// Re-QA Infra (INF-04, INF-05, INF-06): guardas de regresión sobre workflows y config.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runHealthPager } from './health-pager.mjs';
import { runRealHealth } from './real-health.mjs';
import { resolveHealthTargets } from './ola7-lib.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;
const WF = join(ROOT, '.github/workflows');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

describe('INF-05 pagers sin fallback a onrender', () => {
  it('ningún workflow apunta a onrender', () => {
    for (const f of readdirSync(WF)) {
      assert.doesNotMatch(readFileSync(join(WF, f), 'utf8'), /onrender\.com/, f);
    }
  });

  it('keep-alive.yml (solo existía para Render) ya no existe', () => {
    assert.equal(existsSync(join(WF, 'keep-alive.yml')), false);
  });

  it('health-pager y real-health salen en verde si falta HEALTH_URL', () => {
    for (const f of ['health-pager.yml', 'real-health.yml']) {
      const src = readFileSync(join(WF, f), 'utf8');
      assert.match(src, /if \[ -z "\$\{HEALTH_URL\}" \]; then\s+echo "::notice::[^"]+"\s+exit 0/, f);
    }
  });

  it('los scripts se saltean sin URL y no hacen ningún ping', () => {
    const prev = process.env.HEALTH_URL;
    delete process.env.HEALTH_URL;
    try {
      const runner = () => { throw new Error('no debería pinear'); };
      assert.deepEqual(runHealthPager({ runner }), { skipped: true, reason: 'sin-health-url' });
      assert.deepEqual(
        runRealHealth({ env: {}, runner, propsText: '', javaSource: '' }),
        { skipped: true, reason: 'sin-health-url' },
      );
      assert.equal(resolveHealthTargets({}, '').primary, null);
    } finally {
      if (prev !== undefined) process.env.HEALTH_URL = prev;
    }
  });
});

describe('INF-04 restore-drill usa la misma versión de Postgres que el repo', () => {
  it('restore-drill.yml == gate-flyway-fresh.yml == docker-compose.dev.yml', () => {
    const major = (txt) => [...txt.matchAll(/image:\s*postgres:(\d+)/g)].map((m) => m[1]);
    const canon = major(read('Hot_click_outlet/docker-compose.dev.yml'));
    assert.deepEqual(canon, ['18']);
    assert.deepEqual(major(read('.github/workflows/gate-flyway-fresh.yml')), canon);
    assert.deepEqual(major(read('.github/workflows/restore-drill.yml')), canon);
  });
});

describe('INF-06 Flyway sin out-of-order ni baseline-on-migrate por defecto', () => {
  const props = read('Hot_click_outlet/src/main/resources/application.properties');
  const val = (k) => {
    const m = props.match(new RegExp(`^${k.replace(/\./g, '\\.')}=(.*)$`, 'm'));
    return m && m[1].trim();
  };
  it('out-of-order=false salvo SPRING_FLYWAY_OUT_OF_ORDER', () => {
    assert.equal(val('spring.flyway.out-of-order'), '${SPRING_FLYWAY_OUT_OF_ORDER:false}');
  });
  it('baseline-on-migrate=false salvo SPRING_FLYWAY_BASELINE_ON_MIGRATE', () => {
    assert.equal(val('spring.flyway.baseline-on-migrate'), '${SPRING_FLYWAY_BASELINE_ON_MIGRATE:false}');
  });
  it('validate-on-migrate sigue activo', () => {
    assert.equal(val('spring.flyway.validate-on-migrate'), 'true');
  });
});
