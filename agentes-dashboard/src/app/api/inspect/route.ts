import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function runInspect(): Promise<{ code: number; stdout: string; stderr: string }> {
  const script = join(process.cwd(), 'scripts', 'inspect-agents.mjs');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, '--source', 'api', '--stdout'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c: Buffer) => {
      stdout += c.toString();
    });
    child.stderr.on('data', (c: Buffer) => {
      stderr += c.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function POST() {
  if (process.env.VERCEL === '1' && process.env.ALLOW_INSPECT !== '1') {
    return NextResponse.json(
      {
        error: 'I1 no corre el árbol completo en Vercel.',
        hint: 'En el PC: cd agentes-dashboard && npm run inspect. En GitHub: Actions → I1 — Inspect agentes.',
      },
      { status: 409 },
    );
  }
  const script = join(process.cwd(), 'scripts', 'inspect-agents.mjs');
  if (!existsSync(script)) {
    return NextResponse.json({ error: 'No está scripts/inspect-agents.mjs' }, { status: 500 });
  }
  try {
    const result = await runInspect();
    if (result.code !== 0) {
      return NextResponse.json(
        { error: result.stderr.trim() || 'I1 salió distinto de 0' },
        { status: 500 },
      );
    }
    const run = JSON.parse(result.stdout);
    return NextResponse.json({ ok: true, run });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'inspect falló';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
