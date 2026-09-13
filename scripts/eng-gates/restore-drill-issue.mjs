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
  '- ¿Existe un artifact `.sql.gz` de `Daily DB Backup`?',
  '- ¿`SUPABASE_BACKUP_URL` / `SUPABASE_DB_PASSWORD` están en el repo? (S8 no los inventa; si faltan, el dump diario falla)',
  '- ¿El dump menciona `hot_click_usuario_tb` / `pedido` / `producto`?',
  '- ¿`psql` en el contenedor local falló por extensiones/roles?',
  '',
  'No apuntar `DATABASE_URL` de S8 a Supabase/RDS. El workflow ya rechaza hosts de prod.',
].join('\n');

upsertIssue({
  title: '[P0][S8] Restore drill falló',
  marker: 'hotclick-s8-restore-p0',
  labels: ['eng-agent', 'p0', 'restore-drill'],
  body,
});
