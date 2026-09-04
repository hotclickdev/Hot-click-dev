package com.hotclick.service.suscripcion;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.billing.BillingLedgerWriter;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class SuscripcionWebhookService {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionWebhookService.class);

    @Autowired private SuscripcionRepository suscripcionRepo;
    @Autowired private FacturaSaasRepository facturaRepo;
    @Autowired private StripeEventoRepository  eventoRepo;
    @Autowired private EmpresaRepository       empresaRepo;
    @Autowired private SuscripcionPlanSupport  planSupport;
    @Autowired private BillingLedgerWriter     ledgerWriter;

    /**
     * Idempotencia: retorna true si el evento ya fue procesado.
     * Registra el evento en la tabla de idempotencia.
     */
    @Transactional
    public boolean marcarEventoRecibido(String eventId, String tipo) {
        if (eventId == null || eventId.isBlank()) {
            log.warn("[stripe-webhook] marcarEventoRecibido llamado con eventId nulo/vacío — ignorando");
            return true;
        }
        // PESSIMISTIC_WRITE serializa reintentos concurrentes del mismo evento:
        // dos threads que lean procesadoOk=false simultáneamente no pueden
        // entrar a despachar al mismo tiempo — el segundo bloquea hasta que
        // el primero confirme (procesadoOk=true) o falle (procesadoOk=false).
        return eventoRepo.findByIdForUpdate(eventId).map(existing -> {
            if (Boolean.TRUE.equals(existing.getProcesadoOk())) {
                log.info("[stripe-webhook] Evento procesado exitosamente — ignorando reintento: {}", eventId);
                return true;
            }
            log.info("[stripe-webhook] Reintentando evento fallido: {}", eventId);
            return false;
        }).orElseGet(() -> {
            StripeEvento ev = new StripeEvento();
            ev.setStripeEventId(eventId);
            ev.setTipo(tipo);
            eventoRepo.save(ev);
            return false;
        });
    }

    @Transactional
    public void marcarEventoProcesado(String eventId, boolean ok, String error) {
        eventoRepo.findById(eventId).ifPresent(ev -> {
            ev.setProcesadoOk(ok);
            ev.setFechaProcesado(LocalDateTime.now(Constants.ZONA_CR));
            ev.setError(error);
            eventoRepo.save(ev);
        });
    }

    /**
     * invoice.payment_succeeded → activa la suscripción, extiende vigencia, registra factura.
     */
    @Transactional
    @CacheEvict(value = "tenantInfo", allEntries = false, key = "#empresaId")
    public void procesarFacturaPagada(String stripeSubId, String stripeInvoiceId,
                               String stripePaymentIntent, Long empresaId,
                               int montoCentavos, String moneda,
                               LocalDate periodoInicio, LocalDate periodoFin,
                               String urlPdf) {
        Suscripcion sub = suscripcionRepo.findByStripeSubscriptionId(stripeSubId)
            .orElseGet(() -> {
                // Puede ser la primera factura antes de tener stripeSubId local
                if (empresaId == null) return null;
                return suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
            });

        if (sub != null) {
            sub.setStripeSubscriptionId(stripeSubId);
            sub.setEstado("ACTIVO");
            sub.setFechaFin(periodoFin);
            suscripcionRepo.save(sub);

            Empresa empresa = sub.getEmpresa();
            empresa.setEstadoPlan("ACTIVO");
            empresa.setFechaVencPlan(periodoFin);
            empresa.setPlan(sub.getPlan());
            empresaRepo.save(empresa);
        }

        // Registrar/actualizar factura (idempotente por stripeInvoiceId)
        FacturaSaas factura = facturaRepo.findByStripeInvoiceId(stripeInvoiceId)
            .orElseGet(FacturaSaas::new);
        factura.setStripeInvoiceId(stripeInvoiceId);
        factura.setStripePaymentIntent(stripePaymentIntent);
        factura.setMontoCentavos(montoCentavos);
        factura.setMoneda(moneda);
        factura.setEstado("PAGADO");
        factura.setPeriodoInicio(periodoInicio);
        factura.setPeriodoFin(periodoFin);
        factura.setUrlPdf(urlPdf);
        if (sub != null) {
            factura.setSuscripcion(sub);
            if (factura.getEmpresa() == null) factura.setEmpresa(sub.getEmpresa());
        } else if (empresaId != null && factura.getEmpresa() == null) {
            empresaRepo.findById(empresaId).ifPresent(factura::setEmpresa);
        }
        facturaRepo.save(factura);

        if (sub != null) {
            ledgerWriter.registrar(sub.getEmpresa(), sub, BillingLedger.TIPO_COBRO_OK,
                BillingLedger.PROVEEDOR_STRIPE, stripeInvoiceId, montoCentavos, moneda,
                "Factura Stripe pagada");
        }

        log.info("[billing] Factura pagada stripeInvoiceId={} monto={} {}", stripeInvoiceId, montoCentavos, moneda);
    }

    /**
     * invoice.payment_failed → marca PAST_DUE.
     */
    @Transactional
    public void procesarFacturaFallida(String stripeSubId, String stripeInvoiceId) {
        suscripcionRepo.findByStripeSubscriptionId(stripeSubId).ifPresent(sub -> {
            sub.setEstado("PAST_DUE");
            suscripcionRepo.save(sub);

            Empresa empresa = sub.getEmpresa();
            empresa.setEstadoPlan("PAST_DUE");
            empresaRepo.save(empresa);
            ledgerWriter.registrar(empresa, sub, BillingLedger.TIPO_COBRO_FALLIDO,
                BillingLedger.PROVEEDOR_STRIPE, stripeInvoiceId, null, null,
                "Pago Stripe fallido");
            log.warn("[billing] Pago fallido empresa={} stripeSubId={}", empresa.getId(), stripeSubId);
        });

        facturaRepo.findByStripeInvoiceId(stripeInvoiceId).ifPresent(f -> {
            f.setEstado("FALLIDO");
            facturaRepo.save(f);
        });
    }

    /**
     * customer.subscription.deleted → cancela y degrada a FREE.
     */
    @Transactional
    public void procesarSuscripcionEliminada(String stripeSubId) {
        suscripcionRepo.findByStripeSubscriptionId(stripeSubId).ifPresent(sub -> {
            sub.setEstado("CANCELADO");
            sub.setFechaCancelacion(LocalDate.now(Constants.ZONA_CR));
            suscripcionRepo.save(sub);
            planSupport.degradarAFree(sub.getEmpresa());
            ledgerWriter.registrar(sub.getEmpresa(), sub, BillingLedger.TIPO_CANCELACION,
                BillingLedger.PROVEEDOR_STRIPE, stripeSubId, null, null,
                "Suscripción Stripe cancelada");
            log.info("[billing] Suscripción eliminada empresa={}", sub.getEmpresa().getId());
        });
    }
}
