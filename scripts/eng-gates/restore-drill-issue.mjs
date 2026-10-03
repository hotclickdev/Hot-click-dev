#!/usr/bin/env node
/** Abre/actualiza Issue P0 cuando S8 restore-drill falla. */

import { upsertIssue } from './ola2-github.mjs';

const runUrl = process.env.RUN_URL || '';
const body = [
  '## S8 P0 — Restore drill falló',
  '',
  'El restore contra Postgres **throwaway** en GitHub Actions no pasó.',
  'Esto no escribió a producción. El backup sin restore verificado es un DR incompleto (`DISASTER_RECOVERY_PLAN.md`).',
  '',
  runUrl ? `Corrida: ${runUrl}` : 'Corrida: (sin URL)',
  '',
  '### Qué revisar',
  '- El mecanismo en GitHub usa solo el fixture sintético. No baja dumps de producción.',
  '- ¿El job de frescura S3 pudo hacer SSH y ver un objeto `db/*.dump` reciente?',
  '- Secrets (nombres, sin valores): `LIGHTSAIL_SSH_HOST`, `LIGHTSAIL_SSH_USER`, `LIGHTSAIL_SSH_PRIVATE_KEY`, `LIGHTSAIL_SSH_KNOWN_HOSTS`.',
  '- En el host, ¿existe `$HOME/.config/hotclick/backup.env` y el bucket privado?',
  '- Restore real: `scripts/backup/RESTORE.md` (en Lightsail, no en este runner).',
  '',
  'No apuntar `DATABASE_URL` de S8 a un host de producción. El workflow ya lo rechaza.',
].join('\n');

upsertIssue({
  title: '[P0][S8] Restore drill falló',
  marker: 'hotclick-s8-restore-p0',
  labels: ['eng-agent', 'p0', 'restore-drill'],
  body,
});
