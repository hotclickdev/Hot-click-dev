package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.PagoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;

/**
 * QA5 MEDIO: respaldo del webhook. Reconsulta a ONVO los pagos PENDIENTE con al menos
 * {@code hotclick.pagos.onvo.respaldo.antiguedad-min-minutos} de antigüedad, de a lotes de
 * {@code hotclick.pagos.onvo.respaldo.lote} (ambos configurables). Las filas se reclaman con FOR UPDATE SKIP LOCKED
 * en una transacción corta (no se mantiene el lock mientras se llama a ONVO). Cada pago:
 * <ul>
 *   <li>cobrado → {@link OnvoPaymentProvider#procesarPagoVerificado} (mismo camino verificado del webhook);</li>
 *   <li>rechazado → {@link OnvoRechazoService#cerrarSiRechazado} (FALLIDO + liberación de stock, una sola vez);</li>
 *   <li>cualquier otra respuesta o fallo de ONVO → no se toca (fail-closed).</li>
 * </ul>
 * Idempotente: el cierre re-bloquea el pago y exige PENDIENTE, así una segunda corrida no repite efectos.
 * <p>QA7-B1 ALTO + fix2 (conciliación durable): también reconsulta los pagos ONVO FALLIDO/CANCELADO hasta que
 * quedan resueltos, sin corte por antigüedad. Si ONVO los cobró igual (webhook perdido), el mismo camino verificado
 * los deja REEMBOLSO_PENDIENTE con el aviso de reembolso al admin (salen solos de la consulta). Resuelto sin cobro
 * definitivo = intent {@code canceled} en ONVO ({@code conciliacion_resuelta_en}). El resto se reagenda con backoff
 * exponencial con tope ({@code conciliacion_proxima_en}, {@code conciliacion_intentos}, V238), agendado ANTES de
 * llamar a ONVO dentro del reclamo: tras un reinicio cada pago vuelve a salir cuando le toca. No reembolsa solo, no
 * resucita el pedido y solo hace GET a ONVO.
 */
@Service
public class OnvoPendientesReconsultaService {

    private static final Logger log = LoggerFactory.getLogger(OnvoPendientesReconsultaService.class);
    static final String ORIGEN = "respaldo";

    private final PagoRepository pagoRepository;
    private final OnvoService onvoService;
    private final OnvoPaymentProvider onvoPaymentProvider;
    private final OnvoRechazoService onvoRechazoService;
    private final TransactionTemplate tx;
    private final int lote;
    private final int antiguedadMinMinutos;
    private final boolean cerradosHabilitado;
    /** fix2: backoff de la conciliación de cerrados (minutos): base * 2^(intentos-1), con tope. */
    private int backoffBaseMinutos = 2;
    private int backoffMaxMinutos = 1440;
    /** fix2: a los N intentos sin resolver se deja UNA alerta para revisión manual (no se deja de reconsultar). */
    private int alertaIntentos = 30;
    /** fix2 (fairness): tope de cerrados por corrida; hasta la mitad para recientes, el resto para históricos. */
    private int loteConciliacion = 10;
    /** fix2 (fairness): edad que separa recientes de históricos. Solo prioridad; no abandona nada. */
    private int recienteHoras = 72;
    /** fix2 (backlog): alerta cuando los cerrados vencidos o nunca agendados superan este número. */
    private long backlogAlerta = 1000;
    /** fix2: a lo sumo una alerta de backlog cada N minutos POR INSTANCIA (en memoria; no persistente). */
    private int backlogAlertaCadaMinutos = 60;
    private volatile LocalDateTime ultimaAlertaBacklog;
    private final int loteMax;

    /** Conciliación de cerrados habilitada (tests y llamadas existentes). */
    public OnvoPendientesReconsultaService(PagoRepository pagoRepository, OnvoService onvoService,
                                           OnvoPaymentProvider onvoPaymentProvider,
                                           OnvoRechazoService onvoRechazoService,
                                           PlatformTransactionManager txManager,
                                           int lote, int antiguedadMinMinutos, int loteMax) {
        this(pagoRepository, onvoService, onvoPaymentProvider, onvoRechazoService, txManager,
            lote, antiguedadMinMinutos, loteMax, true);
    }

    @Autowired
    public OnvoPendientesReconsultaService(PagoRepository pagoRepository, OnvoService onvoService,
                                           @Lazy OnvoPaymentProvider onvoPaymentProvider,
                                           OnvoRechazoService onvoRechazoService,
                                           PlatformTransactionManager txManager,
                                           @Value("${hotclick.pagos.onvo.respaldo.lote}") int lote,
                                           @Value("${hotclick.pagos.onvo.respaldo.antiguedad-min-minutos}") int antiguedadMinMinutos,
                                           @Value("${hotclick.pagos.onvo.respaldo.lote-max}") int loteMax,
                                           @Value("${hotclick.pagos.onvo.respaldo.cerrados-habilitado:true}") boolean cerradosHabilitado) {
        this.cerradosHabilitado = cerradosHabilitado;
        if (lote <= 0 || antiguedadMinMinutos < 0) {
            throw new IllegalStateException("hotclick.pagos.onvo.respaldo.lote debe ser > 0 y antiguedad-min-minutos >= 0");
        }
        // BAJO Seguridad: tope validado del lote (cuántas filas se bloquean y cuántas llamadas a ONVO por corrida).
        if (loteMax <= 0 || lote > loteMax) {
            throw new IllegalStateException("hotclick.pagos.onvo.respaldo.lote debe ser <= lote-max (y lote-max > 0)");
        }
        this.pagoRepository = pagoRepository;
        this.onvoService = onvoService;
        this.onvoPaymentProvider = onvoPaymentProvider;
        this.onvoRechazoService = onvoRechazoService;
        this.tx = new TransactionTemplate(txManager);
        this.lote = lote;
        this.antiguedadMinMinutos = antiguedadMinMinutos;
        this.loteMax = loteMax;
        this.loteConciliacion = Math.min(10, loteMax);
    }

    /** Resultado de una corrida (para logs y tests). */
    public record Resumen(int revisados, int capturados, int fallidos, int sinCambio) { }

    public Resumen ejecutar() {
        if (!onvoService.isPagosDisponibles()) {
            return new Resumen(0, 0, 0, 0);
        }
        LocalDateTime ahoraPend = LocalDateTime.now(Constants.ZONA_CR);
        LocalDateTime limite = ahoraPend.minusMinutes(antiguedadMinMinutos);
        List<Pago> reclamados = tx.execute(s -> pagoRepository
            .reclamarPendientesParaReconsulta(Constants.PROVEEDOR_ONVO, limite, ahoraPend, PageRequest.of(0, lote)));
        List<Pago> pagos = reclamados == null ? List.of() : reclamados;
        int capturados = 0;
        int fallidos = 0;
        int sinCambio = 0;
        for (Pago pago : pagos) {
            switch (revisar(pago)) {
                case CAPTURADO -> capturados++;
                case FALLIDO -> fallidos++;
                case EN_DUDA -> {
                    // fix2: en duda (404 sin referencia, en proceso, error) → backoff persistente; no ocupa el lote
                    // de cada corrida ni repite consultas/alertas cada 2 min.
                    sinCambio++;
                    agendarEnDuda(pago.getId());
                }
                default -> sinCambio++;
            }
        }
        if (!pagos.isEmpty()) {
            log.info("[onvo] Respaldo webhook: revisados={} capturados={} fallidos={} sinCambio={}",
                pagos.size(), capturados, fallidos, sinCambio);
        }
        revisarCerrados();
        return new Resumen(pagos.size(), capturados, fallidos, sinCambio);
    }

    /** Resultado de la pasada sobre FALLIDO/CANCELADO (QA7-B1). */
    public record ResumenCerrados(int revisados, int reembolsoPendiente) { }

    /**
     * QA7-B1 + fix2: pagos ONVO ya cerrados localmente que ONVO pudo cobrar igual (pedido cancelado y webhook perdido).
     * Solo cuenta como hallazgo COBRADO_SOBRE_CANCELADO (el pago queda REEMBOLSO_PENDIENTE con aviso al admin).
     * Nunca llama a {@link OnvoRechazoService}: el pago ya está cerrado. Sin ventana por antigüedad (conciliación
     * durable): cada pago se reagenda con backoff hasta quedar resuelto.
     */
    public ResumenCerrados revisarCerrados() {
        if (!cerradosHabilitado || !onvoService.isPagosDisponibles()) {
            return new ResumenCerrados(0, 0);
        }
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        LocalDateTime corte = ahora.minusHours(recienteHoras);
        // Reclamo corto con FOR UPDATE SKIP LOCKED; se agenda la próxima reconsulta (lease) antes de llamar a ONVO.
        // fix2 (fairness): recientes primero hasta la mitad del lote; lo que sobra va a históricos (mitad vencidos,
        // mitad nunca agendados). Un atraso histórico grande no desplaza a los recientes y siempre avanza.
        List<Pago> reclamados = tx.execute(s -> {
            List<Pago> filas = new java.util.ArrayList<>();
            int cuotaRecientes = Math.min(loteConciliacion, Math.max(1, (loteConciliacion + 1) / 2));
            reclamar(filas, pagoRepository.reclamarCerradosRecientes(Constants.PROVEEDOR_ONVO, ahora, corte,
                PageRequest.of(0, cuotaRecientes)), ahora);
            int cuotaVencidos = (loteConciliacion - filas.size() + 1) / 2;
            if (cuotaVencidos > 0) {
                reclamar(filas, pagoRepository.reclamarCerradosParaReconsulta(Constants.PROVEEDOR_ONVO, ahora, corte,
                    PageRequest.of(0, cuotaVencidos)), ahora);
            }
            int cuotaNuevos = loteConciliacion - filas.size();
            if (cuotaNuevos > 0) {
                reclamar(filas, pagoRepository.reclamarCerradosNuevos(Constants.PROVEEDOR_ONVO, corte,
                    PageRequest.of(0, cuotaNuevos)), ahora);
            }
            // Relleno: si los históricos no usaron su parte, más recientes. Los ya reclamados quedaron agendados
            // (próxima futura) en esta misma transacción, así que no vuelven a salir.
            int relleno = loteConciliacion - filas.size();
            if (relleno > 0) {
                reclamar(filas, pagoRepository.reclamarCerradosRecientes(Constants.PROVEEDOR_ONVO, ahora, corte,
                    PageRequest.of(0, relleno)), ahora);
            }
            return filas;
        });
        List<Pago> pagos = reclamados == null ? List.of() : reclamados;
        int reembolso = 0;
        int sinReferenciaNuevos = 0;
        for (Pago pago : pagos) {
            try {
                OnvoPaymentProvider.Verificacion v = onvoPaymentProvider.procesarPagoVerificado(pago.getMerchantToken(), ORIGEN);
                if (v == OnvoPaymentProvider.Verificacion.NO_PAGADO || v == OnvoPaymentProvider.Verificacion.NO_ENCONTRADO) {
                    // MEDIO limpieza (compensación del cobro tardío): la sesión puede quedar expired/unpaid o dar 404
                    // con el intent ya cobrado. Decide el intent (guardado si hace falta); si cobró, la captura sobre
                    // el pedido cancelado lo deja REEMBOLSO_PENDIENTE. Solo GET; no resucita el pedido.
                    OnvoPaymentProvider.RevisionCobro r = onvoPaymentProvider.revisarCobro(pago.getMerchantToken(), ORIGEN, true);
                    OnvoPaymentProvider.CobroIntent c = r == null ? OnvoPaymentProvider.CobroIntent.EN_DUDA : r.cobro();
                    if (c == OnvoPaymentProvider.CobroIntent.REEMBOLSO_PENDIENTE) {
                        v = OnvoPaymentProvider.Verificacion.COBRADO_SOBRE_CANCELADO;
                    } else if (c == OnvoPaymentProvider.CobroIntent.SIN_COBRO && "canceled".equals(r.estadoIntent())) {
                        // Único cierre definitivo sin cobro: ONVO no reutiliza un intent canceled.
                        tx.executeWithoutResult(s -> pagoRepository.marcarConciliacionResuelta(pago.getId(), LocalDateTime.now(Constants.ZONA_CR)));
                        continue;
                    } else if (r != null && r.sinReferencia()) {
                        // Sin referencia (404 sin intent): no tiene sentido reintentar seguido; tope directo.
                        if (r.sinReferenciaNueva()) sinReferenciaNuevos++;
                        // El reclamo ya contó el intento: reagenda sin contar otro y sin adelantar una próxima mayor.
                        tx.executeWithoutResult(s -> pagoRepository.reagendarSinContar(pago.getId(),
                            ahora.plusMinutes(backoffMaxMinutos)));
                    }
                }
                if (v == OnvoPaymentProvider.Verificacion.COBRADO_SOBRE_CANCELADO) {
                    reembolso++;
                    log.error("[ALERTA-PAGO] Respaldo: ONVO cobró el pago cerrado id={}; queda REEMBOLSO_PENDIENTE", pago.getId());
                    continue;
                }
                alertarSiCorresponde(pago);
            } catch (RuntimeException e) {
                log.warn("[onvo] Respaldo cerrados: no se pudo reconsultar pago id={} ({})", pago.getId(),
                    e.getClass().getSimpleName());
                alertarSiCorresponde(pago);
            }
        }
        if (sinReferenciaNuevos > 0) {
            // Una sola alerta por corrida (no una por pago): típico del primer barrido de históricos sin intent.
            log.error("[ALERTA-PAGO] Conciliación ONVO: {} pago(s) cerrado(s) sin referencia nuevos (sesión 404 sin intent "
                + "guardado); quedan con reconsulta diaria y revisión manual en el panel de ONVO", sinReferenciaNuevos);
        }
        if (reembolso > 0) {
            log.info("[onvo] Respaldo cerrados: revisados={} reembolsoPendiente={}", pagos.size(), reembolso);
        }
        alertarBacklog(ahora);
        return new ResumenCerrados(pagos.size(), reembolso);
    }

    /**
     * fix2: reagenda un pago en duda (pendiente o vencido) con backoff persistente. Sin referencia → directo al tope.
     * Transacción corta propia; nunca se llama con un lock de pedido tomado.
     */
    public void agendarEnDuda(Long pagoId) {
        if (pagoId == null) return;
        try {
            tx.executeWithoutResult(s -> {
                int intentos = pagoRepository.conciliacionIntentosEnBase(pagoId).orElse(0) + 1;
                boolean sinRef = pagoRepository.sinReferenciaEnBase(pagoId).isPresent();
                LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
                long espera = sinRef ? backoffMaxMinutos : esperaMinutos(intentos);
                // Nunca adelanta una próxima reconsulta ya más lejana (GREATEST en el UPDATE).
                pagoRepository.agendarSinAdelantar(pagoId, ahora.plusMinutes(espera));
            });
        } catch (RuntimeException e) {
            log.warn("[onvo] No se pudo agendar la reconsulta del pago id={} ({})", pagoId, e.getClass().getSimpleName());
        }
    }

    /**
     * Agrega lo reclamado y lo agenda YA (lease): la próxima reconsulta queda escrita antes de llamar a ONVO, así otro
     * reclamo de esta transacción u otra instancia (tras el commit) no lo vuelve a tomar.
     */
    private void reclamar(List<Pago> destino, List<Pago> filas, LocalDateTime ahora) {
        if (filas == null) return;
        for (Pago p : filas) {
            if (destino.stream().anyMatch(d -> d.getId() != null && d.getId().equals(p.getId()))) continue;
            int intentos = (p.getConciliacionIntentos() == null ? 0 : p.getConciliacionIntentos()) + 1;
            long espera = p.getConciliacionSinReferenciaEn() != null ? backoffMaxMinutos : esperaMinutos(intentos);
            pagoRepository.agendarConciliacion(p.getId(), ahora, ahora.plusMinutes(espera));
            p.setConciliacionIntentos(intentos);
            destino.add(p);
        }
    }

    /** Backlog = cerrados sin resolver vencidos o nunca agendados. Una alerta por ventana, por instancia. */
    private void alertarBacklog(LocalDateTime ahora) {
        try {
            long backlog = pagoRepository.contarBacklogConciliacion(Constants.PROVEEDOR_ONVO, ahora);
            if (backlog < backlogAlerta) return;
            LocalDateTime ultima = ultimaAlertaBacklog;
            if (ultima != null && ultima.plusMinutes(backlogAlertaCadaMinutos).isAfter(ahora)) return;
            ultimaAlertaBacklog = ahora;
            log.error("[ALERTA-PAGO] Conciliación ONVO atrasada: {} pago(s) cerrado(s) esperando reconsulta (umbral {}); "
                + "se drenan de a {} por corrida, recientes primero", backlog, backlogAlerta, loteConciliacion);
        } catch (RuntimeException e) {
            log.warn("[onvo] No se pudo medir el backlog de conciliación ({})", e.getClass().getSimpleName());
        }
    }

    @Autowired(required = false)
    void setFairness(@Value("${hotclick.pagos.onvo.respaldo.conciliacion-reciente-horas:72}") int recienteHoras,
                     @Value("${hotclick.pagos.onvo.respaldo.conciliacion-backlog-alerta:1000}") long backlogAlerta,
                     @Value("${hotclick.pagos.onvo.respaldo.conciliacion-backlog-alerta-cada-minutos:60}") int cadaMinutos) {
        if (recienteHoras <= 0 || backlogAlerta <= 0 || cadaMinutos <= 0) {
            throw new IllegalStateException("conciliación ONVO: reciente-horas, backlog-alerta y backlog-alerta-cada-minutos > 0");
        }
        this.recienteHoras = recienteHoras;
        this.backlogAlerta = backlogAlerta;
        this.backlogAlertaCadaMinutos = cadaMinutos;
    }

    @Autowired(required = false)
    void setLoteConciliacion(@Value("${hotclick.pagos.onvo.respaldo.conciliacion-lote:10}") int loteConciliacion) {
        if (loteConciliacion < 1 || loteConciliacion > loteMax) {
            throw new IllegalStateException("hotclick.pagos.onvo.respaldo.conciliacion-lote debe estar entre 1 y lote-max");
        }
        this.loteConciliacion = loteConciliacion;
    }

    /** Minutos hasta la próxima reconsulta: base * 2^(intentos-1), con tope. Nunca 0 ni negativo. */
    long esperaMinutos(int intentos) {
        int exp = Math.max(0, Math.min(intentos - 1, 20));
        long espera = (long) backoffBaseMinutos << exp;
        return Math.max(1L, Math.min(espera, backoffMaxMinutos));
    }

    private void alertarSiCorresponde(Pago pago) {
        Integer n = pago.getConciliacionIntentos();
        if (n != null && n == alertaIntentos) {
            log.error("[ALERTA-PAGO] Conciliación ONVO sin resolver tras {} reconsultas: pago id={} (sigue con backoff; "
                + "revisión manual en el panel de ONVO)", n, pago.getId());
        }
    }

    @Autowired(required = false)
    void setBackoff(@Value("${hotclick.pagos.onvo.respaldo.conciliacion-backoff-base-minutos:2}") int baseMinutos,
                    @Value("${hotclick.pagos.onvo.respaldo.conciliacion-backoff-max-minutos:1440}") int maxMinutos,
                    @Value("${hotclick.pagos.onvo.respaldo.conciliacion-alerta-intentos:30}") int alerta) {
        if (baseMinutos <= 0 || maxMinutos < baseMinutos || alerta <= 0) {
            throw new IllegalStateException("conciliación ONVO: backoff-base > 0, backoff-max >= base y alerta-intentos > 0");
        }
        this.backoffBaseMinutos = baseMinutos;
        this.backoffMaxMinutos = maxMinutos;
        this.alertaIntentos = alerta;
    }

    private enum Efecto { CAPTURADO, FALLIDO, EN_DUDA, NADA }

    private Efecto revisar(Pago pago) {
        String sesion = pago.getMerchantToken();
        try {
            OnvoPaymentProvider.Verificacion v = onvoPaymentProvider.procesarPagoVerificado(sesion, ORIGEN);
            if (v == OnvoPaymentProvider.Verificacion.OK) {
                return Efecto.CAPTURADO;
            }
            if (v == OnvoPaymentProvider.Verificacion.NO_PAGADO || v == OnvoPaymentProvider.Verificacion.NO_ENCONTRADO) {
                // MEDIO limpieza: el intent decide (sesión expired/unpaid o 404 con cobro). Solo con SIN_COBRO se
                // evalúa el rechazo, que además exige el intent rechazado por GET.
                OnvoPaymentProvider.CobroIntent c = onvoPaymentProvider.revisarCobroAntesDeCancelar(sesion, ORIGEN);
                if (c == OnvoPaymentProvider.CobroIntent.CONFIRMADO) return Efecto.CAPTURADO;
                // fix2: con la sesión abierta el rechazo igual se evalúa: cerrarSiRechazado expira y vuelve a exigir
                // SIN_COBRO antes de liberar.
                if (c != OnvoPaymentProvider.CobroIntent.SIN_COBRO
                        && c != OnvoPaymentProvider.CobroIntent.SIN_COBRO_SESION_ABIERTA) {
                    return (c == null || c == OnvoPaymentProvider.CobroIntent.EN_DUDA
                        || c == OnvoPaymentProvider.CobroIntent.DATOS_DISTINTOS) ? Efecto.EN_DUDA : Efecto.NADA;
                }
            }
            if (v == OnvoPaymentProvider.Verificacion.NO_PAGADO
                    && onvoRechazoService.cerrarSiRechazado(pago.getId(), sesion)) {
                return Efecto.FALLIDO;
            }
            if (v == OnvoPaymentProvider.Verificacion.EN_PROCESO || v == OnvoPaymentProvider.Verificacion.DATOS_DISTINTOS) {
                return Efecto.EN_DUDA;
            }
            return Efecto.NADA;
        } catch (RuntimeException e) {
            // Fail-closed: ONVO caído, timeout o respuesta rara → el pago queda como estaba (y se espacia).
            log.warn("[onvo] Respaldo webhook: no se pudo reconsultar pago id={} ({})", pago.getId(),
                e.getClass().getSimpleName());
            return Efecto.EN_DUDA;
        }
    }
}
