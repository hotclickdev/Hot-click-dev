import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  KNOWN_IDS,
  cadenceMatches,
  decideStatus,
  detectTriggers,
  evaluateAgent,
  findRepoRoot,
  idBoundaryRegex,
  inspectRepo,
  loadCatalog,
} from './inspect-agents.mjs';

describe('I1 catalogo', () => {
  test('cubre D1–D12, S1–S14, E1–E18, DOC1, SCALE1, I1', () => {
    const catalog = loadCatalog();
    const ids = catalog.map((a) => a.id);
    for (const id of KNOWN_IDS) {
      assert.ok(ids.includes(id), `falta ${id} en agents.json`);
    }
    assert.equal(KNOWN_IDS.length, 12 + 14 + 18 + 3);
  });
});

describe('I1 regex de IDs', () => {
  test('E1 no matchea E11', () => {
    const re = idBoundaryRegex('E1');
    assert.equal(re.test('E1 Flyway'), true);
    assert.equal(re.test('E11 Paths'), false);
    assert.equal(idBoundaryRegex('S1').test('S10 god'), false);
  });
});

describe('I1 decideStatus', () => {
  test('sin doc ni workflow → activar', () => {
    assert.equal(
      decideStatus({
        docsFound: false,
        workflowFound: false,
        scriptFound: false,
        cadenceMatch: false,
        expectsWorkflow: false,
        expectsScript: false,
      }),
      'activar',
    );
  });

  test('doc dice workflow y el archivo no está → actualizar', () => {
    assert.equal(
      decideStatus({
        docsFound: true,
        workflowFound: false,
        scriptFound: true,
        cadenceMatch: false,
        expectsWorkflow: true,
        expectsScript: true,
      }),
      'actualizar',
    );
  });

  test('workflow + doc + script + cadence → al_dia', () => {
    assert.equal(
      decideStatus({
        docsFound: true,
        workflowFound: true,
        scriptFound: true,
        cadenceMatch: true,
        expectsWorkflow: true,
        expectsScript: true,
      }),
      'al_dia',
    );
  });

  test('falta script → mejorar', () => {
    assert.equal(
      decideStatus({
        docsFound: true,
        workflowFound: true,
        scriptFound: false,
        cadenceMatch: true,
        expectsWorkflow: true,
        expectsScript: true,
      }),
      'mejorar',
    );
  });
});

describe('I1 cadence', () => {
  test('daily exige cron', () => {
    const scheduled = detectTriggers('on:\n  schedule:\n    - cron: "0 9 * * *"\n');
    const prOnly = detectTriggers('on:\n  pull_request:\n    branches: [master]\n');
    assert.equal(cadenceMatches('daily', scheduled), true);
    assert.equal(cadenceMatches('daily', prOnly), false);
    assert.equal(cadenceMatches('event', prOnly), true);
  });
});

describe('I1 contra el repo real', () => {
  test('pausados: daily/weekly actualizar; event al día; S13 activar', () => {
    const repoRoot = findRepoRoot();
    assert.ok(repoRoot, 'repo root');
    const run = inspectRepo({ repoRoot, source: 'test' });
    const byId = Object.fromEntries(run.agents.map((a) => [a.id, a]));
    assert.equal(byId.D1.status, 'actualizar', JSON.stringify(byId.D1));
    assert.equal(byId.E1.status, 'al_dia', JSON.stringify(byId.E1));
    assert.equal(byId.D12.status, 'actualizar', JSON.stringify(byId.D12));
    assert.equal(byId.S14.status, 'actualizar', JSON.stringify(byId.S14));
    assert.equal(byId.E16.status, 'al_dia', JSON.stringify(byId.E16));
    assert.equal(byId.S13.status, 'activar', JSON.stringify(byId.S13));
    assert.ok(run.summary.actualizar >= 20, `pocos actualizar: ${run.summary.actualizar}`);
    assert.equal(run.summary.activar, 1);
  });

  test('evaluateAgent marca I1 cuando el workflow existe', () => {
    const repoRoot = findRepoRoot();
    const agent = loadCatalog().find((a) => a.id === 'I1');
    const fakeWf = {
      name: 'inspect-agents.yml',
      content: 'name: I1\non:\n  schedule:\n    - cron: "15 14 * * 1"\n  workflow_dispatch:\n',
      triggers: detectTriggers('on:\n  schedule:\n    - cron: "15 14 * * 1"\n'),
    };
    const row = evaluateAgent(agent, {
      workflows: [fakeWf],
      docsBlob: 'Dashboard I1',
      repoRoot,
    });
    assert.equal(row.status, 'al_dia', JSON.stringify(row));
  });
});
