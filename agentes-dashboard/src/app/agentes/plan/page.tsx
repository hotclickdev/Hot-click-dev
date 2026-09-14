import type { Metadata } from 'next';
import { loadOlas } from '@/lib/data';
import { GITHUB } from '@/lib/labels';

export const metadata: Metadata = { title: 'Plan de olas' };
export const dynamic = 'force-dynamic';

export default function PlanPage() {
  const plan = loadOlas();
  return (
    <main>
      <h2>{plan.headline}</h2>
      <p className="lede">{plan.note}</p>
      <div className="kpi">
        <div>
          <b>
            {plan.onMaster}/{plan.totalOlas}
          </b>
          <span className="fine">olas en master</span>
        </div>
        <div>
          <b>PRs 55–61</b>
          <span className="fine">olas 1 a 7 mergeadas</span>
        </div>
      </div>
      <div className="grid-olas">
        {plan.olas.map((ola) => (
          <article key={ola.n} className={`ola ${ola.status}`}>
            <p className="kicker">{ola.status === 'en_master' ? 'en master' : 'pendiente'}</p>
            <h3>
              Ola {ola.n}
              {ola.pr ? (
                <>
                  {' '}
                  <a href={`${GITHUB}/pull/${ola.pr}`}>#{ola.pr}</a>
                </>
              ) : null}
            </h3>
            <p>{ola.title}</p>
            <p className="fine">{ola.summary}</p>
            {ola.doc ? (
              <p className="fine">
                <a href={`${GITHUB}/blob/master/${ola.doc}`}>{ola.doc}</a>
              </p>
            ) : (
              <p className="fine">Sin `docs/AGENTES_OLA7.md` en este commit.</p>
            )}
            <div className="ids">
              {ola.ids.map((id) => (
                <span key={id} className="badge">
                  {id}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
