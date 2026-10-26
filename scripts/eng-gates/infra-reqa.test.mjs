// Re-QA Infra (INF-05 scripts, INF-06): guardas de regresión. Las guardas sobre
// .github/workflows viven en la rama fix/infra-reqa-workflows (requiere scope workflow).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runHealthPager } from './health-pager.mjs';
import { runRealHealth } from './real-health.mjs';
import { resolveHealthTargets } from './ola7-lib.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

describe('INF-05 scripts de health sin fallback a onrender', () => {
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
