import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bandFromCvss,
  evaluateFindings,
  iterFindings,
  normalizeSeverity,
  primaryId,
  runGate,
} from './osv-deps-gate.mjs';

test('bandFromCvss maps CVSS bands', () => {
  assert.equal(bandFromCvss('9.8'), 'critical');
  assert.equal(bandFromCvss('7.5'), 'high');
  assert.equal(bandFromCvss('5.0'), 'moderate');
  assert.equal(bandFromCvss('2.1'), 'low');
  assert.equal(bandFromCvss('not-a-number'), null);
});

test('normalizeSeverity maps medium→moderate', () => {
  assert.equal(normalizeSeverity('MEDIUM'), 'moderate');
  assert.equal(normalizeSeverity('High'), 'high');
});

test('primaryId prefers GHSA then CVE', () => {
  assert.equal(primaryId({ id: 'GHSA-aaaa-bbbb-cccc' }), 'GHSA-aaaa-bbbb-cccc');
  assert.equal(
    primaryId({ id: 'OSV-1', aliases: ['CVE-2024-1', 'GHSA-zzzz-yyyy-xxxx'] }),
    'GHSA-zzzz-yyyy-xxxx',
  );
});

test('iterFindings usa database_specific y fallback CVSS', () => {
  const doc = {
    results: [
      {
        source: { path: 'pnpm-lock.yaml', type: 'lockfile' },
        packages: [
          {
            package: { name: 'xlsx', version: '0.18.5', ecosystem: 'npm' },
            vulnerabilities: [
              {
                id: 'GHSA-4r6h-8v6p-xvw6',
                aliases: ['CVE-2024-22363'],
                summary: 'Prototype Pollution',
                database_specific: { severity: 'HIGH' },
              },
              {
                id: 'GHSA-low-only',
                summary: 'Low issue',
                database_specific: { severity: 'LOW' },
              },
            ],
            groups: [
              { ids: ['GHSA-4r6h-8v6p-xvw6'], max_severity: '7.8' },
              { ids: ['GHSA-low-only'], max_severity: '2.0' },
            ],
          },
        ],
      },
    ],
  };
  const findings = iterFindings(doc);
  assert.equal(findings.length, 2);
  assert.equal(findings[0].severity, 'high');
  assert.equal(findings[1].severity, 'low');
});

test('evaluateFindings bloquea HIGH y reporta low; allowlist suprime', () => {
  const findings = [
    {
      name: 'xlsx',
      version: '0.18.5',
      ecosystem: 'npm',
      source: 'lock',
      id: 'GHSA-high',
      aliases: ['CVE-1'],
      severity: 'high',
      summary: 'bad',
    },
    {
      name: 'left-pad',
      version: '1.0.0',
      ecosystem: 'npm',
      source: 'lock',
      id: 'GHSA-low',
      aliases: [],
      severity: 'low',
      summary: 'meh',
    },
  ];
  const empty = { active: new Map(), expired: [] };
  const open = evaluateFindings(findings, empty);
  assert.equal(open.blocking.length, 1);
  assert.equal(open.informational.length, 1);

  const withAllow = {
    active: new Map([
      [
        'GHSA-high',
        {
          id: 'GHSA-high',
          reason: 'test',
          acceptedAt: '2026-09-23',
          expiresOn: '2099-01-01',
        },
      ],
    ]),
    expired: [],
  };
  const suppressed = evaluateFindings(findings, withAllow);
  assert.equal(suppressed.blocking.length, 0);
  assert.equal(suppressed.suppressed.length, 1);
});

test('runGate falla en HIGH y pasa con solo low', () => {
  const lowOnly = {
    results: [
      {
        source: { path: 'x', type: 'lockfile' },
        packages: [
          {
            package: { name: 'a', version: '1', ecosystem: 'npm' },
            vulnerabilities: [
              {
                id: 'GHSA-low',
                summary: 'low',
                database_specific: { severity: 'LOW' },
              },
            ],
            groups: [],
          },
        ],
      },
    ],
  };
  assert.equal(runGate({ doc: lowOnly, allowlist: { active: new Map(), expired: [] }, osvRc: 1 }), 0);

  const high = {
    results: [
      {
        source: { path: 'x', type: 'lockfile' },
        packages: [
          {
            package: { name: 'xlsx', version: '0.18.5', ecosystem: 'npm' },
            vulnerabilities: [
              {
                id: 'GHSA-high',
                summary: 'high',
                database_specific: { severity: 'HIGH' },
              },
            ],
            groups: [],
          },
        ],
      },
    ],
  };
  assert.equal(runGate({ doc: high, allowlist: { active: new Map(), expired: [] }, osvRc: 1 }), 1);
});

test('runGate fail-closed si scanner rc inválido', () => {
  assert.equal(
    runGate({ doc: { results: [] }, allowlist: { active: new Map(), expired: [] }, osvRc: 127 }),
    2,
  );
});
