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
 * <p>QA7-B1 ALTO: también reconsulta los pagos ONVO FALLIDO/CANCELADO recientes (ventana
 * {@code hotclick.pagos.onvo.respaldo.cerrados-ventana-horas}). Si ONVO los cobró igual (webhook perdido),
 * el mismo camino verificado los deja REEMBOLSO_PENDIENTE con el aviso de reembolso al admin. No reembolsa
 * solo ni resucita el pedido; un NO_PAGADO o un fallo de ONVO no cambia nada.
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
    private final int cerradosVentanaHoras;
    /** BAJO: minutos mínimos entre dos reconsultas del mismo pago CANCELADO (antes: cada corrida, 2 min). */
    private int canceladoReintentoMinutos = 60;

    /** Sin ventana explícita: 24 h (tests y llamadas existentes). */
    public OnvoPendientesReconsultaService(PagoRepository pagoRepository, OnvoService onvoService,
                                           OnvoPaymentProvider onvoPaymentProvider,
                                           OnvoRechazoService onvoRechazoService,
                                           PlatformTransactionManager txManager,
                                           int lote, int antiguedadMinMinutos, int loteMax) {
        this(pagoRepository, onvoService, onvoPaymentProvider, onvoRechazoService, txManager,
            lote, antiguedadMinMinutos, loteMax, 24);
    }

    @Autowired
    public OnvoPendientesReconsultaService(PagoRepository pagoRepository, OnvoService onvoService,
                                           @Lazy OnvoPaymentProvider onvoPaymentProvider,
                                           OnvoRechazoService onvoRechazoService,
                                           PlatformTransactionManager txManager,
                                           @Value("${hotclick.pagos.onvo.respaldo.lote}") int lote,
                                           @Value("${hotclick.pagos.onvo.respaldo.antiguedad-min-minutos}") int antiguedadMinMinutos,
                                           @Value("${hotclick.pagos.onvo.respaldo.lote-max}") int loteMax,
                                           @Value("${hotclick.pagos.onvo.respaldo.cerrados-ventana-horas:24}") int cerradosVentanaHoras) {
        if (cerradosVentanaHoras < 0) {
            throw new IllegalStateException("hotclick.pagos.onvo.respaldo.cerrados-ventana-horas debe ser >= 0");
        }
        this.cerradosVentanaHoras = cerradosVentanaHoras;
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
    }

    /** Resultado de una corrida (para logs y tests). */
    public record Resumen(int revisados, int capturados, int fallidos, int sinCambio) { }

    public Resumen ejecutar() {
        if (!onvoService.isPagosDisponibles()) {
            return new Resumen(0, 0, 0, 0);
        }
        LocalDateTime limite = LocalDateTime.now(Constants.ZONA_CR).minusMinutes(antiguedadMinMinutos);
        List<Pago> reclamados = tx.execute(s -> pagoRepository
            .reclamarPendientesParaReconsulta(Constants.PROVEEDOR_ONVO, limite, PageRequest.of(0, lote)));
        List<Pago> pagos = reclamados == null ? List.of() : reclamados;
        int capturados = 0;
        int fallidos = 0;
        int sinCambio = 0;
        for (Pago pago : pagos) {
            switch (revisar(pago)) {
                case CAPTURADO -> capturados++;
                case FALLIDO -> fallidos++;
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
     * QA7-B1: pagos ONVO ya cerrados localmente que ONVO pudo cobrar igual (pedido cancelado y webhook perdido).
     * Solo cuenta como hallazgo COBRADO_SOBRE_CANCELADO (el pago queda REEMBOLSO_PENDIENTE con aviso al admin).
     * Nunca llama a {@link OnvoRechazoService}: el pago ya está cerrado.
     */
    public ResumenCerrados revisarCerrados() {
        if (cerradosVentanaHoras == 0 || !onvoService.isPagosDisponibles()) {
            return new ResumenCerrados(0, 0);
        }
        LocalDateTime desde = LocalDateTime.now(Constants.ZONA_CR).minusHours(cerradosVentanaHoras);
        // BAJO QA7-B1 (b): se marca la revisión dentro del mismo reclamo (filas bloqueadas), así la próxima
        // pasada toma los que llevan más tiempo sin revisar y los viejos de la ventana no se quedan afuera.
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        List<Pago> reclamados = tx.execute(s -> {
            List<Pago> filas = pagoRepository
                .reclamarCerradosParaReconsulta(Constants.PROVEEDOR_ONVO, desde,
                    ahora.minusMinutes(canceladoReintentoMinutos), PageRequest.of(0, lote));
            marcarRevision(filas, ahora);
            return filas;
        });
        List<Pago> pagos = reclamados == null ? List.of() : reclamados;
        int reembolso = 0;
        for (Pago pago : pagos) {
            try {
                OnvoPaymentProvider.Verificacion v = onvoPaymentProvider.procesarPagoVerificado(pago.getMerchantToken(), ORIGEN);
                if (v == OnvoPaymentProvider.Verificacion.NO_PAGADO || v == OnvoPaymentProvider.Verificacion.NO_ENCONTRADO) {
                    // MEDIO limpieza (compensación del cobro tardío): la sesión puede quedar expired/unpaid o dar 404
                    // con el intent ya cobrado. Decide el intent (guardado si hace falta); si cobró, la captura sobre
                    // el pedido cancelado lo deja REEMBOLSO_PENDIENTE. Solo GET; no resucita el pedido.
                    if (onvoPaymentProvider.revisarCobroAntesDeCancelar(pago.getMerchantToken(), ORIGEN)
                            == OnvoPaymentProvider.CobroIntent.REEMBOLSO_PENDIENTE) {
                        v = OnvoPaymentProvider.Verificacion.COBRADO_SOBRE_CANCELADO;
                    }
                }
                if (v == OnvoPaymentProvider.Verificacion.COBRADO_SOBRE_CANCELADO) {
                    reembolso++;
                    log.error("[ALERTA-PAGO] Respaldo: ONVO cobró el pago cerrado id={}; queda REEMBOLSO_PENDIENTE", pago.getId());
                }
            } catch (RuntimeException e) {
                log.warn("[onvo] Respaldo cerrados: no se pudo reconsultar pago id={} ({})", pago.getId(),
                    e.getClass().getSimpleName());
            }
        }
        if (reembolso > 0) {
            log.info("[onvo] Respaldo cerrados: revisados={} reembolsoPendiente={}", pagos.size(), reembolso);
        }
        return new ResumenCerrados(pagos.size(), reembolso);
    }

    @Autowired(required = false)
    void setCanceladoReintentoMinutos(
            @Value("${hotclick.pagos.onvo.respaldo.cancelado-reintento-minutos:60}") int minutos) {
        if (minutos < 0) {
            throw new IllegalStateException("hotclick.pagos.onvo.respaldo.cancelado-reintento-minutos debe ser >= 0");
        }
        this.canceladoReintentoMinutos = minutos;
    }

    private enum Efecto { CAPTURADO, FALLIDO, NADA }

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
                if (c != OnvoPaymentProvider.CobroIntent.SIN_COBRO) return Efecto.NADA;
            }
            if (v == OnvoPaymentProvider.Verificacion.NO_PAGADO
                    && onvoRechazoService.cerrarSiRechazado(pago.getId(), sesion)) {
                return Efecto.FALLIDO;
            }
            return Efecto.NADA;
        } catch (RuntimeException e) {
            // Fail-closed: ONVO caído, timeout o respuesta rara → el pago queda como estaba.
            log.warn("[onvo] Respaldo webhook: no se pudo reconsultar pago id={} ({})", pago.getId(),
                e.getClass().getSimpleName());
            return Efecto.NADA;
        }
    }

    /** Entidades gestionadas dentro del reclamo: el dirty checking escribe la marca al cerrar la transacción. */
    private static void marcarRevision(List<Pago> filas, LocalDateTime ahora) {
        if (filas == null) return;
        for (Pago p : filas) p.setReconsultaCerradoEn(ahora);
    }
}
