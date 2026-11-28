import { useEffect, useState } from 'react'
import { contadorService, datos, type Borrador, type EsteMes, type Evento } from '@/services/contadorService'
import { colones, cuentaRegresiva, textoBorrador } from './contador'
import { BarraProgreso, BotonCopiar, EtiquetaVerificar } from './ContadorPiezas'
import { Aviso, Carga, Chip, TARJETA, TITULO } from './piezas'

function Fila({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-hc-n-100 py-2 last:border-0">
      <span className="text-sm text-hc-n-600">
        {etiqueta}
        {nota && <span className="block text-[11px] text-hc-n-600">{nota}</span>}
      </span>
      <span className="whitespace-nowrap font-semibold text-hc-n-900">{valor}</span>
    </div>
  )
}

function Vencimiento({ evento }: { evento: Evento | null }) {
  if (!evento) return null
  return (
    <article className={`${TARJETA} flex flex-wrap items-center justify-between gap-2`}>
      <div>
        <p className="text-xs font-semibold text-hc-n-600">Próximo vencimiento</p>
        <p className="font-semibold text-hc-n-900">{evento.titulo}</p>
        <p className="text-xs text-hc-n-600">{evento.fecha}{evento.corridoPorFinDeSemana ? ' (corrido por fin de semana)' : ''}</p>
      </div>
      <div className="flex items-center gap-2">
        <Chip tono={evento.diasRestantes <= 3 ? 'alerta' : 'azul'}>{cuentaRegresiva(evento.diasRestantes)}</Chip>
        {evento.verificar && <EtiquetaVerificar />}
      </div>
    </article>
  )
}

/** Pestaña «Este mes»: lo que corresponde al régimen activo, más renta. */
export function ContadorEsteMes() {
  const [d, setD] = useState<EsteMes | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    contadorService.esteMes()
      .then((r) => setD(datos<EsteMes>(r)))
      .catch((err: unknown) => { console.error(err); setError(true) })
  }, [])

  if (error) return <Aviso>No se pudieron cargar las cifras del mes.</Aviso>
  if (!d) return <Carga />
  const r = d.renta
  return (
    <div className="flex flex-col gap-4">
      <Vencimiento evento={d.proximoVencimiento} />
      {!d.comprasConDatos && (
        <Aviso>Todavía no hay facturas de los negocios registradas: las compras y el crédito de IVA salen en cero.</Aviso>
      )}
      {d.rts && (
        <section className={`${TARJETA} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={TITULO}>Régimen Simplificado</h2>
            <EtiquetaVerificar />
          </div>
          <BarraProgreso
            pct={d.rts.progresoTope.pct}
            etiqueta={`Compras del año ${colones(d.rts.comprasAnio)} de ${colones(d.rts.progresoTope.tope)} (186 salarios base, IVA incluido)`}
            superado={d.rts.progresoTope.superado}
          />
          {[d.rts.trimestreADeclarar, d.rts.trimestreEnCurso].map((t, i) => (
            <div key={`${t.anio}-${t.trimestre}`} className="rounded-xl bg-hc-n-50 p-3">
              <p className="text-sm font-semibold text-hc-n-900">
                {i === 0 ? 'Trimestre a declarar' : 'Trimestre en curso'}: {t.anio} T{t.trimestre}
              </p>
              <Fila etiqueta="Compras del trimestre (IVA incluido)" valor={colones(t.compras)} />
              {t.mensaje ? (
                <p className="mt-2 text-sm font-semibold text-hc-primary">{t.mensaje}</p>
              ) : (
                <>
                  <Fila etiqueta="Cuota de IVA" valor={colones(t.cuotaIva)} />
                  <Fila etiqueta="Cuota de renta" valor={colones(t.cuotaRenta)} />
                  <Fila etiqueta="Total del trimestre" valor={colones(t.cuotaTotal)} />
                </>
              )}
            </div>
          ))}
          <p className="text-xs text-hc-n-600">
            Formulario: {d.rts.formulario || 'por confirmar (D-105 u otro)'} · vence en los primeros 15 días de enero, abril, julio y octubre.
          </p>
        </section>
      )}
      {d.iva && (
        <section className={`${TARJETA} flex flex-col gap-1`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={TITULO}>IVA de {d.iva.periodo} (formulario 150)</h2>
            <EtiquetaVerificar />
          </div>
          <Fila etiqueta="Ventas gravadas" valor={colones(d.iva.ventasBase)} nota="Casilla a confirmar en el instructivo TRIBU-CR" />
          <Fila etiqueta="IVA cobrado" valor={colones(d.iva.ivaVentas)} nota="Casilla a confirmar en el instructivo TRIBU-CR" />
          <Fila etiqueta="Compras con crédito" valor={colones(d.iva.comprasConCredito)} />
          <Fila etiqueta="Compras sin crédito" valor={colones(d.iva.comprasSinCredito)} />
          <Fila etiqueta="Crédito de IVA" valor={colones(d.iva.ivaAcreditable)} nota="Casilla a confirmar en el instructivo TRIBU-CR" />
          <Fila etiqueta="IVA a pagar" valor={colones(d.iva.ivaAPagar)} nota="Casilla a confirmar en el instructivo TRIBU-CR" />
          {d.iva.saldoAFavor > 0 && <Fila etiqueta="Saldo a favor" valor={colones(d.iva.saldoAFavor)} />}
          <Fila
            etiqueta={`Recargo del ${String(d.iva.recargoPct).replace('.', ',')} % cobrado`}
            valor={d.iva.recargoCobrado == null ? 'Sin registro todavía' : colones(d.iva.recargoCobrado)}
            nota={d.iva.recargoCubreIvaPct == null ? undefined : `Cubre el ${d.iva.recargoCubreIvaPct} % del IVA a pagar`}
          />
        </section>
      )}
      <section className={`${TARJETA} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={TITULO}>Renta {d.anio}</h2>
          <EtiquetaVerificar />
        </div>
        <BarraProgreso
          pct={r.progreso.pct}
          etiqueta={`Ingresos brutos ${colones(r.ingresosBrutosAnio)} de ${colones(r.umbral)}`}
          superado={r.progreso.superado}
        />
        <p className="text-xs text-hc-n-600">
          Persona {r.tipoPersona === 'FISICA' ? 'física' : 'jurídica'} · período {r.periodoFiscal === 'ENE_DIC' ? 'enero a diciembre' : 'octubre a setiembre'} · Decreto 45333-H
        </p>
        <ul className="grid gap-1 text-sm">
          {r.tramosDetalle.map((t, i) => (
            <li key={`${t.hasta ?? 'max'}-${i}`} className="flex justify-between rounded-lg bg-hc-n-50 px-3 py-1.5">
              <span>{t.hasta == null ? 'Exceso' : `Hasta ${colones(t.hasta)}`}</span>
              <span className="font-semibold">{t.tasaPct} %</span>
            </li>
          ))}
        </ul>
        {r.superaUmbral && (
          <p className="text-sm font-semibold text-hc-primary">
            Los ingresos brutos superan el umbral: aplica la tarifa de {r.tasaSobreUmbralPct} %.
          </p>
        )}
      </section>
    </div>
  )
}

/** Pestaña de borradores: formulario 150 (tradicional) o declaración trimestral del RTS. Nunca presenta nada. */
export function ContadorBorrador({ regimen }: { regimen: string }) {
  const [b, setB] = useState<Borrador | null>(null)
  const [error, setError] = useState(false)
  const tradicional = regimen === 'TRADICIONAL'

  useEffect(() => {
    const pedido = tradicional ? contadorService.borradorIva() : contadorService.borradorRts()
    pedido.then((r) => setB(datos<Borrador>(r))).catch((err: unknown) => { console.error(err); setError(true) })
  }, [tradicional])

  if (error) return <Aviso>No se pudo armar el borrador.</Aviso>
  if (!b) return <Carga />
  return (
    <section className={`${TARJETA} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={TITULO}>
          {b.tipo === 'IVA_150' ? `Borrador del formulario 150 · ${b.periodo}` : `Borrador de la declaración del RTS · ${b.periodo}`}
        </h2>
        <BotonCopiar texto={textoBorrador(b.cajas)} etiqueta="Copiar todo" />
      </div>
      {b.formulario && <p className="text-sm text-hc-n-600">Formulario: {b.formulario} <EtiquetaVerificar /></p>}
      {b.mensaje && <p className="text-sm font-semibold text-hc-primary">{b.mensaje}</p>}
      <ul className="flex flex-col">
        {b.cajas.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-hc-n-100 py-2 last:border-0">
            <span className="text-sm text-hc-n-900">
              {c.etiqueta}
              <span className="block text-[11px] text-hc-n-600">{c.nota}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="font-semibold">{colones(c.valor)}</span>
              {c.valor != null && <BotonCopiar texto={String(c.valor)} />}
            </span>
          </li>
        ))}
      </ul>
      {b.avisos.map((a) => <p key={a} className="text-xs text-hc-n-600">{a}</p>)}
    </section>
  )
}
