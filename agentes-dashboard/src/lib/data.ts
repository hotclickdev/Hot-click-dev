import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CatalogFile, InspectionsFile, OlasFile } from './types';

const dataDir = () => join(process.cwd(), 'data');

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(dataDir(), name), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function loadCatalog(): CatalogFile {
  return readJson<CatalogFile>('agents.json', {
    repo: 'hotclickdev/Hot-click-dev',
    generatedFrom: [],
    agents: [],
  });
}

export function loadOlas(): OlasFile {
  return readJson<OlasFile>('olas.json', {
    totalOlas: 7,
    onMaster: 0,
    headline: '',
    note: '',
    olas: [],
  });
}

export function loadInspections(): InspectionsFile {
  return readJson<InspectionsFile>('inspections.json', { runs: [] });
}
