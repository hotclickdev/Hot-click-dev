'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { InspectionRun } from '@/lib/types';

type Props = { canRunLocal: boolean };

export function InspectButton({ canRunLocal }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<'ok' | 'err'>('ok');

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/inspect', { method: 'POST' });
      const body = (await res.json()) as { error?: string; run?: InspectionRun; hint?: string };
      if (!res.ok) {
        setKind('err');
        setMsg(body.error ?? `HTTP ${res.status}`);
        if (body.hint) setMsg(`${body.error ?? ''} ${body.hint}`.trim());
        return;
      }
      setKind('ok');
      const s = body.run?.summary;
      setMsg(
        s
          ? `Listo. al día ${s.al_dia} · activar ${s.activar} · actualizar ${s.actualizar} · mejorar ${s.mejorar}.`
          : 'Inspección terminada.',
      );
      router.refresh();
    } catch (err) {
      setKind('err');
      setMsg(err instanceof Error ? err.message : 'Falló el POST');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <button type="button" className="chip" onClick={() => void run()} disabled={busy}>
          {busy ? 'Inspeccionando…' : 'Correr I1 ahora'}
        </button>
        <a className="chip" href="https://github.com/hotclickdev/Hot-click-dev/actions/workflows/inspect-agents.yml">
          Workflow (pausado)
        </a>
      </div>
      {!canRunLocal ? (
        <p className="fine">
          En Vercel el filesystem del repo completo no viaja. El botón declara el límite; la corrida durable es
          `npm run inspect` en el clone o el Action de los lunes.
        </p>
      ) : null}
      {msg ? <p className={`flash ${kind}`}>{msg}</p> : null}
    </div>
  );
}
