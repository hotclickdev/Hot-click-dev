// P como DATOS de una fuente fijada: commit cuyo árbol contiene EXACTAMENTE un fichero
// (`e4-policy.json`, modo 100644). Eso excluye por construcción el head, master u otro árbol
// arbitrario. Se registran commit + blob; el cierre exige que coincidan con su P fijado.
import { gitData } from './head-data.mjs';
import { createHash } from 'node:crypto';

export const POLICY_FILE = 'e4-policy.json';
const SHA40 = /^[0-9a-f]{40}$/;

export function loadPolicyAsData(gitDir, commit, { head, base } = {}) {
  if (!SHA40.test(commit ?? '')) throw new Error('P: commit no es SHA-1 completo');
  let t; try { t = gitData(gitDir, ['cat-file', '-t', commit], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { throw new Error('P: commit inexistente'); }
  if (t !== 'commit') throw new Error('P: no es commit');
  if (commit === head || commit === base) throw new Error('P: no puede ser el head ni la base');
  const ls = gitData(gitDir, ['ls-tree', '-z', '--full-tree', commit]).toString().split('\0').filter(Boolean);
  if (ls.length !== 1) throw new Error(`P: el árbol debe contener solo ${POLICY_FILE} (tiene ${ls.length} entradas)`);
  const [meta, name] = ls[0].split('\t'); const [mode, type, blob] = meta.split(' ');
  if (name !== POLICY_FILE || mode !== '100644' || type !== 'blob') throw new Error('P: entrada inesperada');
  const raw = gitData(gitDir, ['cat-file', 'blob', blob]);
  let policy; try { policy = JSON.parse(raw.toString('utf8')); } catch { throw new Error('P: JSON inválido'); }
  return { commit, blob, sha256: createHash('sha256').update(raw).digest('hex'), raw, policy };
}
