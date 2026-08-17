package com.hotclick.service;

import com.hotclick.model.Suscripcion;
import com.hotclick.service.suscripcion.SuscripcionBillingService;
import com.hotclick.service.suscripcion.SuscripcionQueryService;
import com.hotclick.service.suscripcion.SuscripcionRenewalService;
import com.hotclick.service.suscripcion.SuscripcionWebhookService;
import com.stripe.exception.StripeException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class SuscripcionService {

    @Autowired private SuscripcionBillingService  billingService;
    @Autowired private SuscripcionWebhookService  webhookService;
    @Autowired private SuscripcionQueryService  queryService;
    @Autowired private SuscripcionRenewalService renewalService;

    @Transactional
    public Suscripcion iniciarTrial(Long empresaId) {
        return billingService.iniciarTrial(empresaId);
    }

    public String crearCheckoutUrl(Long empresaId, Long planId) throws StripeException {
        return billingService.crearCheckoutUrl(empresaId, planId);
    }

    @Transactional(readOnly = true)
    public String[] leerDatosParaCheckout(Long empresaId, Long planId) {
        return billingService.leerDatosParaCheckout(empresaId, planId);
    }

    @Transactional
    public Long guardarClienteYSuscripcion(Long empresaId, Long planId, String customerId, String priceId) {
        return billingService.guardarClienteYSuscripcion(empresaId, planId, customerId, priceId);
    }

    public void cancelar(Long empresaId, boolean inmediata) throws StripeException {
        billingService.cancelar(empresaId, inmediata);
    }

    @Transactional(readOnly = true)
    public String leerStripeSubId(Long empresaId) {
        return billingService.leerStripeSubId(empresaId);
    }

    @Transactional
    public void aplicarCancelacion(Long empresaId, boolean inmediata) {
        billingService.aplicarCancelacion(empresaId, inmediata);
    }

    public String crearPortalUrl(Long empresaId) throws StripeException {
        return billingService.crearPortalUrl(empresaId);
    }

    @Transactional
    public boolean marcarEventoRecibido(String eventId, String tipo) {
        return webhookService.marcarEventoRecibido(eventId, tipo);
    }

    @Transactional
    public void marcarEventoProcesado(String eventId, boolean ok, String error) {
        webhookService.marcarEventoProcesado(eventId, ok, error);
    }

    @Transactional
    public void procesarFacturaPagada(String stripeSubId, String stripeInvoiceId,
                                      String stripePaymentIntent, Long empresaId,
                                      int montoCentavos, String moneda,
                                      LocalDate periodoInicio, LocalDate periodoFin,
                                      String urlPdf) {
        webhookService.procesarFacturaPagada(stripeSubId, stripeInvoiceId, stripePaymentIntent,
            empresaId, montoCentavos, moneda, periodoInicio, periodoFin, urlPdf);
    }

    @Transactional
    public void procesarFacturaFallida(String stripeSubId, String stripeInvoiceId) {
        webhookService.procesarFacturaFallida(stripeSubId, stripeInvoiceId);
    }

    @Transactional
    public void procesarSuscripcionEliminada(String stripeSubId) {
        webhookService.procesarSuscripcionEliminada(stripeSubId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSuscripcionInfo(Long empresaId) {
        return queryService.getSuscripcionInfo(empresaId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFacturas(Long empresaId, int pagina) {
        return queryService.getFacturas(empresaId, pagina);
    }

    @Transactional
    public int expirarTrialsVencidos() {
        return renewalService.expirarTrialsVencidos();
    }

    @Transactional
    public int expirarPastDueVencidos() {
        return renewalService.expirarPastDueVencidos();
    }
}
