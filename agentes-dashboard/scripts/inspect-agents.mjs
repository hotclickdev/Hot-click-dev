/**
 * I1 — Inspector de agentes de ingeniería HotClick.
 * Escanea .github/workflows y docs/AGENTES_*.md para cada ID conocido.
 * Estados: al_dia | activar | actualizar | mejorar
 *
 * Uso (desde repo root o agentes-dashboard/):
 *   node agentes-dashboard/scripts/inspect-agents.mjs
 *   node scripts/inspect-agents.mjs --source local
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = resolve(SCRIPT_DIR, '..');
const KNOWN_PREFIX = { D: 12, S: 14, E: 18 };
const MAX_RUNS = 30;
const DOC_GLOB_PREFIX = 'AGENTES_';

export const KNOWN_IDS = [
  ...rangeIds('D', KNOWN_PREFIX.D),
  ...rangeIds('S', KNOWN_PREFIX.S),
  ...rangeIds('E', KNOWN_PREFIX.E),
  'DOC1',
  'SCALE1',
  'I1',
];

function rangeIds(prefix, max) {
  return Array.from({ length: max }, (_, i) => `${prefix}${i + 1}`);
}

export function findRepoRoot(startDir = process.cwd()) {
  const seeds = [startDir, DASHBOARD_DIR, resolve(DASHBOARD_DIR, '..')];
  for (const seed of seeds) {
    let dir = seed;
    for (let i = 0; i < 8; i += 1) {
      const workflows = join(dir, '.github', 'workflows');
      const docs = join(dir, 'docs');
      if (existsSync(workflows) && existsSync(docs)) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

export function idBoundaryRegex(id) {
  return new RegExp(`(?<![A-Z0-9])${id}(?![0-9])`);
}

export function loadCatalog(dashboardDir = DASHBOARD_DIR) {
  const raw = JSON.parse(readFileSync(join(dashboardDir, 'data', 'agents.json'), 'utf8'));
  return raw.agents;
}

function listWorkflowFiles(repoRoot) {
  const dir = join(repoRoot, '.github', 'workflows');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
}

function readWorkflowIndex(repoRoot) {
  const names = listWorkflowFiles(repoRoot);
  return names.map((name) => {
    const path = join(repoRoot, '.github', 'workflows', name);
    const content = readFileSync(path, 'utf8');
    return { name, content, triggers: detectTriggers(content) };
  });
}

function readDocsBlob(repoRoot) {
  const docsDir = join(repoRoot, 'docs');
  if (!existsSync(docsDir)) return '';
  const files = readdirSync(docsDir).filter(
    (f) => f.startsWith(DOC_GLOB_PREFIX) && f.endsWith('.md'),
  );
  return files.map((f) => readFileSync(join(docsDir, f), 'utf8')).join('\n');
}

export function detectTriggers(yaml) {
  return {
    hasSchedule: /^\s*schedule:/m.test(yaml) || /^\s*-\s*cron:/m.test(yaml),
    hasPr: /^\s*pull_request:/m.test(yaml),
    hasPush: /^\s*push:/m.test(yaml),
    hasWorkflowRun: /^\s*workflow_run:/m.test(yaml),
    hasIssues: /^\s*issues:/m.test(yaml),
    hasDispatch: /^\s*workflow_dispatch:/m.test(yaml),
  };
}

export function cadenceMatches(cadence, triggers) {
  if (cadence === 'daily' || cadence === 'weekly') return triggers.hasSchedule;
  if (cadence === 'event') {
    return (
      triggers.hasPr ||
      triggers.hasPush ||
      triggers.hasWorkflowRun ||
      triggers.hasIssues ||
      triggers.hasSchedule ||
      triggers.hasDispatch
    );
  }
  return true;
}

function findWorkflowForAgent(agent, index) {
  if (agent.workflow) {
    const exact = index.find((w) => w.name === agent.workflow);
    if (exact) return exact;
  }
  const re = idBoundaryRegex(agent.id);
  return index.find((w) => re.test(w.content)) ?? null;
}

export function evaluateAgent(agent, { workflows, docsBlob, repoRoot }) {
  const notes = [];
  const re = idBoundaryRegex(agent.id);
  const docsFound = re.test(docsBlob) || (agent.doc != null && existsSync(join(repoRoot, agent.doc)));
  const wf = findWorkflowForAgent(agent, workflows);
  const workflowFound = wf != null;
  const scriptFound = Boolean(agent.script && existsSync(join(repoRoot, agent.script)));
  const cadenceMatch = wf ? cadenceMatches(agent.cadence, wf.triggers) : false;

  if (!docsFound) notes.push('No aparece en docs/AGENTES_*.md');
  if (agent.workflow && !workflowFound) notes.push(`Falta workflow ${agent.workflow}`);
  if (!agent.workflow && !workflowFound) notes.push('Sin workflow asignado');
  if (agent.script && !scriptFound) notes.push(`Falta script ${agent.script}`);
  if (workflowFound && !cadenceMatch) {
    notes.push(`Trigger no calza con cadencia ${agent.cadence}`);
  }

  const status = decideStatus({
    docsFound,
    workflowFound,
    scriptFound,
    cadenceMatch,
    expectsWorkflow: Boolean(agent.workflow),
    expectsScript: Boolean(agent.script),
  });
  if (status === 'al_dia' && notes.length === 0) {
    notes.push('Doc, workflow y script presentes; trigger coherente');
  }
  return {
    id: agent.id,
    status,
    workflowFound,
    workflowFile: wf?.name ?? agent.workflow,
    docsFound,
    scriptFound,
    cadenceMatch,
    notes,
  };
}

export function decideStatus(flags) {
  const { docsFound, workflowFound, expectsWorkflow } = flags;
  if (!docsFound && !workflowFound && !expectsWorkflow) return 'activar';
  if (!workflowFound && expectsWorkflow) return 'actualizar';
  if (workflowFound && !docsFound) return 'actualizar';
  if (workflowFound && flags.expectsScript && !flags.scriptFound) return 'mejorar';
  if (workflowFound && docsFound && !flags.cadenceMatch) return 'actualizar';
  if (workflowFound && docsFound) return 'al_dia';
  return 'activar';
}

function emptySummary() {
  return { al_dia: 0, activar: 0, actualizar: 0, mejorar: 0 };
}

function tally(results) {
  const summary = emptySummary();
  for (const row of results) summary[row.status] += 1;
  return summary;
}

function parseArgs(argv) {
  const args = { source: 'local', stdout: false, write: true };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--stdout') args.stdout = true;
    else if (a === '--no-write') args.write = false;
    else if (a === '--source' && argv[i + 1]) {
      args.source = argv[++i];
    } else if (a.startsWith('--source=')) {
      args.source = a.slice('--source='.length);
    }
  }
  return args;
}

function loadHistory(outPath) {
  if (!existsSync(outPath)) return { runs: [] };
  try {
    const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
    return { runs: Array.isArray(parsed.runs) ? parsed.runs : [] };
  } catch {
    return { runs: [] };
  }
}

export function buildRun({ catalog, workflows, docsBlob, repoRoot, source }) {
  const agents = catalog.map((agent) => evaluateAgent(agent, { workflows, docsBlob, repoRoot }));
  const missingFromCatalog = KNOWN_IDS.filter((id) => !catalog.some((a) => a.id === id));
  for (const id of missingFromCatalog) {
    agents.push({
      id,
      status: 'activar',
      workflowFound: false,
      workflowFile: null,
      docsFound: false,
      scriptFound: false,
      cadenceMatch: false,
      notes: ['ID conocido ausente del catálogo data/agents.json'],
    });
  }
  agents.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const ranAt = new Date().toISOString();
  return {
    id: `i1-${ranAt.replace(/[:.]/g, '-')}`,
    ranAt,
    source,
    repoRoot: '.',
    summary: tally(agents),
    agents,
  };
}

export function renderIssueMarkdown(run) {
  const lines = [
    `## I1 — inspección ${run.ranAt}`,
    '',
    `Fuente: \`${run.source}\`. Resumen: al día **${run.summary.al_dia}** · activar **${run.summary.activar}** · actualizar **${run.summary.actualizar}** · mejorar **${run.summary.mejorar}**.`,
    '',
    '| ID | Estado | Workflow | Notas |',
    '| --- | --- | --- | --- |',
  ];
  for (const row of run.agents) {
    if (row.status === 'al_dia') continue;
    const notes = row.notes.join('; ').replace(/\|/g, '/');
    lines.push(`| ${row.id} | ${row.status} | ${row.workflowFile ?? '—'} | ${notes} |`);
  }
  if (run.agents.every((a) => a.status === 'al_dia')) {
    lines.push('| — | al_dia | — | Todos los IDs conocidos están al día |');
  }
  lines.push('', 'JSON: `agentes-dashboard/data/inspections.json` (espejo en `Hot_click_outlet/src/main/resources/agentes/`). Dashboard admin: `/admin/agentes/inspecciones`. Espejo Next: `/agentes/inspecciones`.');
  return `${lines.join('\n')}\n`;
}

function persistRun(outPath, run) {
  mkdirSync(dirname(outPath), { recursive: true });
  const history = loadHistory(outPath);
  const runs = [run, ...history.runs.filter((r) => r.id !== run.id)].slice(0, MAX_RUNS);
  const payload = { updatedAt: run.ranAt, runs };
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

function syncSpringResources(dashboardDir) {
  const dest = join(resolve(dashboardDir, '..'), 'Hot_click_outlet', 'src', 'main', 'resources', 'agentes');
  mkdirSync(dest, { recursive: true });
  for (const name of ['agents.json', 'olas.json', 'inspections.json']) {
    const src = join(dashboardDir, 'data', name);
    if (existsSync(src)) copyFileSync(src, join(dest, name));
  }
}

export function inspectRepo({ repoRoot, dashboardDir = DASHBOARD_DIR, source = 'local' }) {
  if (!repoRoot) {
    throw new Error('No se encontró la raíz del repo (.github/workflows + docs). Corré I1 en el clone de Hot-click-dev, no en Vercel.');
  }
  const catalog = loadCatalog(dashboardDir);
  const workflows = readWorkflowIndex(repoRoot);
  const docsBlob = readDocsBlob(repoRoot);
  return buildRun({ catalog, workflows, docsBlob, repoRoot, source });
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = findRepoRoot();
  const run = inspectRepo({ repoRoot, source: args.source });
  const outPath = join(DASHBOARD_DIR, 'data', 'inspections.json');
  if (args.write) {
    persistRun(outPath, run);
    syncSpringResources(DASHBOARD_DIR);
  }
  const md = renderIssueMarkdown(run);
  if (args.stdout) {
    process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
  } else {
    console.log(`I1 ${run.id}  al_dia=${run.summary.al_dia} activar=${run.summary.activar} actualizar=${run.summary.actualizar} mejorar=${run.summary.mejorar}`);
    process.stdout.write(md);
  }
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    main();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`I1 falló: ${message}`);
    process.exit(1);
  }
}
