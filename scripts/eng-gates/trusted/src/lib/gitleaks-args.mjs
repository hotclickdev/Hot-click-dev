// Construye la invocación de gitleaks con config/ignores FUERA del head.
// Sin --redact: el clasificador necesita sha256(secreto). El reporte vive solo en el
// runner efímero/tmp, nunca se sube ni se imprime; se conserva únicamente el sha256.
// El head se pasa solo como datos (directorio extraído o repo bare). Pins sin fijar -> lanza.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isUnset } from './common.mjs';

const sha256File = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

export function buildGitleaks({ binary, binarySha256, config, configSha256, emptyIgnoreDir, mode, target, logOpts, report }) {
  for (const [k, v] of Object.entries({ binary, binarySha256, config, configSha256, emptyIgnoreDir, mode, target, report })) {
    if (isUnset(v)) throw new Error(`gitleaks: ${k} sin fijar (fail-closed)`);
  }
  if (sha256File(binary) !== binarySha256) throw new Error('gitleaks: sha256 del binario no coincide');
  if (sha256File(config) !== configSha256) throw new Error('gitleaks: sha256 del config no coincide');
  if (!['git', 'dir'].includes(mode)) throw new Error('gitleaks: modo inválido');
  const argv = [mode, '--config', config, '--gitleaks-ignore-path', emptyIgnoreDir, '--ignore-gitleaks-allow',
    '--no-banner', '--report-format', 'json', '--report-path', report, '--exit-code', '0'];
  if (mode === 'git') { if (isUnset(logOpts)) throw new Error('gitleaks: logOpts (base..head) sin fijar'); argv.push('--log-opts', logOpts); }
  argv.push(target);
  // Entorno limpio: anula GITLEAKS_CONFIG/GITLEAKS_CONFIG_TOML heredados.
  const env = { PATH: '/usr/bin:/bin', HOME: '/nonexistent' };
  return { cmd: binary, argv, env };
}

// Normaliza el JSON de gitleaks (solo sha256 del secreto). dir: blob por ruta del árbol;
// git: blob = objeto commit:path resuelto con blobOf (datos), commit obligatorio.
export function normalizeGitleaks(report, { mode, target = '', treeByPath, blobOf }) {
  if (!Array.isArray(report)) throw new Error('gitleaks: reporte no es array (fail-closed)');
  return report.map((f) => {
    if (typeof f.Secret !== 'string' || typeof f.File !== 'string' || !f.RuleID) throw new Error('gitleaks: hallazgo incompleto');
    let path, blob, commit;
    if (mode === 'dir') {
      const pre = target.replace(/\/+$/, '') + '/';
      if (!f.File.startsWith(pre)) throw new Error(`gitleaks: ruta fuera del objetivo ${f.File}`);
      path = f.File.slice(pre.length); blob = treeByPath.get(path);
    } else if (mode === 'git') {
      commit = f.Commit; path = f.File;
      if (!/^[0-9a-f]{40}$/.test(commit ?? '')) throw new Error('gitleaks: hallazgo de rango sin commit');
      blob = blobOf(commit, path);
    } else throw new Error('gitleaks: modo inválido');
    if (!blob) throw new Error(`gitleaks: blob no resoluble ${path}`);
    return { tool: 'gitleaks', rule: f.RuleID, commit, path, blob, line: f.StartLine, column: f.StartColumn,
      secretSha256: createHash('sha256').update(f.Secret).digest('hex') };
  });
}
