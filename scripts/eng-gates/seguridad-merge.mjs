/**
 * Gate al merge: lista de amenazas, registro de pentest,
 * args de tenant en el copilot, y test nominal si cambia Stripe.
 */

import { readFileSync } from 'node:fs';
import { appendGithubOutput, gitChangedFiles, listFiles, parseLabels } from './lib.mjs';

export const AMENAZAS_DOC = 'docs/security/amenazas-activas.md';
export const PENTEST_DOC = 'docs/security/pentest.md';
export const SKIP_LABEL = 'skip-seguridad-merge';
export const PENTEST_MAX_AGE_DAYS = 180;
export const PENTEST_ALCANCE = ['login', 'tenant', 'stripe', 'copilot'];

const TENANT_ARG = /"(?:empresaId|empresa_id|tenantId|fk_id_empresa)"/;

export function isSuperficieSeguridad(path) {
  const p = normalize(path);
  if (!p.includes('/src/main/java/') || !p.endsWith('.java')) return false;
  return (
    p.includes('/com/hotclick/security/') ||
    p.includes('/service/stripe/') ||
    p.includes('/service/copilot/') ||
    p.endsWith('/AiCopilotController.java') ||
    p.endsWith('/AiCopilotService.java') ||
    p.endsWith('/CompanyScope.java') ||
    /\/Stripe[^/]*\.java$/.test(p)
  );
}

export function isStripeMain(path) {
  const p = normalize(path);
  return p.includes('/src/main/java/') && (p.includes('/service/stripe/') || /\/Stripe[^/]*\.java$/.test(p));
}

export function isCopilotArgFile(path) {
  const p = normalize(path);
  return (
    p.includes('/service/copilot/') ||
    p.endsWith('/AiCopilotController.java') ||
    p.endsWith('/AiCopilotService.java') ||
    p.endsWith('/AiChatRequest.java')
  ) && p.includes('/src/main/java/') && p.endsWith('.java');
}

export function evaluateAmenazas(changedFiles) {
  const touched = changedFiles.filter(isSuperficieSeguridad);
  if (!touched.length) return { ok: true, reason: 'ninguna superficie de auth, tenant, Stripe o copilot' };
  if (changedFiles.includes(AMENAZAS_DOC)) {
    return { ok: true, reason: `amenazas actualizadas (${touched.length} archivos)` };
  }
  return {
    ok: false,
    reason: `cambiaron ${touched.length} archivos de auth, tenant, Stripe o copilot sin ${AMENAZAS_DOC}`,
  };
}

export function evaluateStripeTests({ changedFiles, testFiles }) {
  const touched = changedFiles.filter(isStripeMain);
  if (!touched.length) return { ok: true, reason: 'Stripe no cambió' };
  const hasTest = testFiles.some((file) => /Stripe.*Test|Webhook.*Test/i.test(file));
  if (!hasTest) {
    return { ok: false, reason: 'cambió Stripe y no hay *Stripe*Test* ni *Webhook*Test*' };
  }
  return { ok: true, reason: 'hay test nominal de Stripe o webhook' };
}

export function scanCopilotTenantArgs(files) {
  const hits = [];
  for (const file of files) {
    const lines = String(file.text).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (TENANT_ARG.test(line)) hits.push(`${file.path}:${index + 1}`);
    });
  }
  if (!hits.length) return { ok: true, reason: 'el copilot no declara empresaId en argumentos' };
  return { ok: false, reason: `argumento de tenant en tool o request: ${hits.join(', ')}` };
}

export function evaluatePentest(text, now = new Date()) {
  const fields = parsePentest(text);
  if (fields.estado === 'pendiente') {
    return { ok: true, reason: 'pentest pendiente: no bloquea el merge. Un release de estas superficies exige vigente' };
  }
  if (fields.estado !== 'vigente') {
    return { ok: false, reason: 'estado debe ser pendiente o vigente' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.fecha || '')) {
    return { ok: false, reason: 'vigente exige fecha YYYY-MM-DD' };
  }
  const fecha = new Date(`${fields.fecha}T00:00:00Z`);
  const ageDays = (now.getTime() - fecha.getTime()) / 86_400_000;
  if (Number.isNaN(fecha.getTime()) || ageDays < 0) return { ok: false, reason: 'fecha de pentest inválida' };
  if (ageDays > PENTEST_MAX_AGE_DAYS) return { ok: false, reason: 'la pasada tiene más de 180 días' };
  const alcance = (fields.alcance || '').toLowerCase();
  const missing = PENTEST_ALCANCE.filter((item) => !alcance.includes(item));
  if (missing.length) return { ok: false, reason: `alcance incompleto: ${missing.join(', ')}` };
  if (fields['altos-abiertos'] !== '0') return { ok: false, reason: 'vigente exige altos-abiertos: 0' };
  return { ok: true, reason: `pentest vigente ${fields.fecha}` };
}

export function parsePentest(text) {
  const fields = {};
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.match(/^(estado|fecha|alcance|altos-abiertos):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

export function evaluateSeguridadMerge({ changedFiles, testFiles, pentestText, copilotFiles, skip }) {
  if (skip) return { ok: true, reason: `label ${SKIP_LABEL}` };
  const checks = [
    evaluateAmenazas(changedFiles),
    evaluateStripeTests({ changedFiles, testFiles }),
    scanCopilotTenantArgs(copilotFiles),
    evaluatePentest(pentestText),
  ];
  const failed = checks.find((check) => !check.ok);
  if (failed) return failed;
  return { ok: true, reason: checks.map((check) => check.reason).join(' | ') };
}

function normalize(path) {
  return String(path).replaceAll('\\', '/');
}

function readCopilotFiles() {
  return listFiles('Hot_click_outlet/src/main/java', (file) => isCopilotArgFile(file)).map((file) => ({
    path: file,
    text: readFileSync(file, 'utf8'),
  }));
}

function main() {
  const labels = parseLabels(process.env.PR_LABELS);
  const skip = labels.includes(SKIP_LABEL);
  const base = process.env.BASE_SHA || '';
  const head = process.env.HEAD_SHA || '';
  const noRange = !base || !head || /^0+$/.test(base);
  const changedFiles = noRange ? [] : gitChangedFiles(base, head);
  const testFiles = listFiles('Hot_click_outlet/src/test', (file) => file.endsWith('.java'));
  const verdict = evaluateSeguridadMerge({
    changedFiles,
    testFiles,
    pentestText: readFileSync(PENTEST_DOC, 'utf8'),
    copilotFiles: readCopilotFiles(),
    skip,
  });
  if (noRange && !skip) {
    console.log('Sin rango de diff: se omite la lista de amenazas y el test de Stripe.');
  }
  console.log(`Seguridad al merge: ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
  appendGithubOutput({ ok: verdict.ok ? 'true' : 'false', reason: verdict.reason });
  process.exit(verdict.ok ? 0 : 1);
}

const isDirectRun = process.argv[1] && normalize(process.argv[1]).endsWith('seguridad-merge.mjs');
if (isDirectRun) main();
