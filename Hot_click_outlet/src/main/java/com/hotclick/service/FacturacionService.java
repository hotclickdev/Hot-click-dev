package com.hotclick.service;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Orquesta la emisión de comprobantes electrónicos a Hacienda CR.
 *
 * Flujo asíncrono:
 *   1. emitir(pedidoId, tipo) → crea ComprobanteFiscal en PENDIENTE, retorna inmediatamente
 *   2. @Async procesarAsync(id) → genera XML, firma, envía a Hacienda
 *   3. @Scheduled consultarPendientes() → hace polling a Hacienda para actualizar estado
 *
 * Esto evita que el controller espere hasta 30s por la respuesta de Hacienda.
 *
 * Separación de transacciones (crítico):
 *   - ConsecutivoFiscalService usa REQUIRES_NEW → commit inmediato del número
 *   - El call HTTP a Hacienda ocurre FUERA de cualquier transacción de BD
 *   - Si el envío falla, el comprobante queda en ERROR y el cron reintenta
 */
@Service
public class FacturacionService {

    private static final Logger log = LoggerFactory.getLogger(FacturacionService.class);
    private static final int MAX_INTENTOS = 5;

    private final ComprobanteFiscalRepository comprobanteRepo;
    private final PedidoRepository pedidoRepo;
    private final EmpresaRepository empresaRepo;
    private final ConsecutivoFiscalService consecutivoService;
    private final ClaveNumericaService claveService;
    private final XmlFacturaBuilder xmlBuilder;
    private final FirmaDigitalService firmaService;
    private final HaciendaApiClient haciendaClient;

    public FacturacionService(ComprobanteFiscalRepository comprobanteRepo,
                               PedidoRepository pedidoRepo,
                               EmpresaRepository empresaRepo,
                               ConsecutivoFiscalService consecutivoService,
                               ClaveNumericaService claveService,
                               XmlFacturaBuilder xmlBuilder,
                               FirmaDigitalService firmaService,
                               HaciendaApiClient haciendaClient) {
        this.comprobanteRepo    = comprobanteRepo;
        this.pedidoRepo         = pedidoRepo;
        this.empresaRepo        = empresaRepo;
        this.consecutivoService = consecutivoService;
        this.claveService       = claveService;
        this.xmlBuilder         = xmlBuilder;
        this.firmaService       = firmaService;
        this.haciendaClient     = haciendaClient;
    }

    /**
     * Inicia la emisión de un comprobante para un pedido.
     * Retorna inmediatamente después de crear el registro en BD.
     * El envío a Hacienda ocurre de forma asíncrona.
     *
     * @param pedidoId ID del pedido a facturar
     * @param tipo     '01'=Factura, '04'=Tiquete (default si null)
     * @return el comprobante creado (estado PENDIENTE)
     */
    @Transactional
    public ComprobanteFiscal emitir(Long pedidoId, String tipo) {
        Pedido pedido = pedidoRepo.findById(pedidoId)
            .orElseThrow(() -> new NoSuchElementException("Pedido no encontrado: " + pedidoId));

        Empresa empresa = pedido.getEmpresa();
        if (empresa == null) {
            throw new IllegalStateException("El pedido no tiene empresa asociada");
        }

        // Verificar que no existe ya un comprobante válido para este pedido
        if (comprobanteRepo.existsByPedidoIdAndEstadoIn(pedidoId,
                List.of(ComprobanteFiscal.ESTADO_PENDIENTE,
                        ComprobanteFiscal.ESTADO_ENVIADO,
                        ComprobanteFiscal.ESTADO_ACEPTADO))) {
            throw new IllegalStateException("Ya existe un comprobante activo para el pedido " + pedidoId);
        }

        String tipoFinal = (tipo != null && !tipo.isBlank()) ? tipo : ComprobanteFiscal.TIPO_TIQUETE;

        // Paso 1: obtener consecutivo (transacción corta e independiente, compatible PgBouncer)
        long numSeq = consecutivoService.siguienteNumero(empresa.getId(), tipoFinal);
        String numConsecutivo = ClaveNumericaService.buildNumeroConsecutivo(tipoFinal, numSeq);

        // Paso 2: generar clave numérica de 50 dígitos
        String cedulaEmisor = empresa.getCedulaJuridica() != null
            ? empresa.getCedulaJuridica() : "000000000000";
        String clave = claveService.generar(cedulaEmisor, numConsecutivo, LocalDateTime.now());

        // Paso 3: crear y persistir el comprobante en estado PENDIENTE
        ComprobanteFiscal cf = new ComprobanteFiscal();
        cf.setEmpresa(empresa);
        cf.setPedido(pedido);
        cf.setTipo(tipoFinal);
        cf.setClaveNumerica(clave);
        cf.setNumeroConsecutivo(numConsecutivo);
        cf.setEstado(ComprobanteFiscal.ESTADO_PENDIENTE);
        cf.setAmbiente(empresa.getAmbienteHacienda());
        cf.setTotalFactura(pedido.getTotalPedido());
        cf = comprobanteRepo.save(cf);

        log.info("[facturacion] Comprobante creado id={} clave={} tipo={} empresa={} ambiente={}",
            cf.getId(), clave, tipoFinal, empresa.getId(), empresa.getAmbienteHacienda());

        // Paso 4: disparar el envío async (fuera de esta transacción)
        Long comprobanteId = cf.getId();
        procesarAsync(comprobanteId);

        return cf;
    }

    /**
     * Envía el comprobante a Hacienda de forma asíncrona.
     * Ejecuta en el taskExecutor configurado en AsyncConfig (con TenantAwareTaskDecorator).
     */
    @Async("taskExecutor")
    @Transactional
    public void procesarAsync(Long comprobanteId) {
        try {
            procesarComprobante(comprobanteId);
        } catch (Exception e) {
            log.error("[facturacion] Error procesando async comprobante={}: {}", comprobanteId, e.getMessage());
        }
    }

    /**
     * Cron de polling para comprobantes en estado ENVIADO (esperando respuesta de Hacienda).
     * Hacienda puede tardar segundos o minutos en procesar.
     */
    @Scheduled(cron = "0 */5 * * * *")
    @SchedulerLock(name = "facturacion_polling", lockAtMostFor = "PT4M", lockAtLeastFor = "PT1M")
    @Transactional
    public void consultarPendientesHacienda() {
        for (var empresa : empresaRepo.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")) {
            try {
                consultarPendientesDeEmpresa(empresa.getId());
            } catch (Exception e) {
                log.error("[facturacion] Error empresa={}: {}", empresa.getId(), e.getMessage());
            }
        }
    }

    private void consultarPendientesDeEmpresa(Long empresaId) {
        List<ComprobanteFiscal> pendientes = comprobanteRepo.findPendientesDeConsulta(empresaId);
        if (pendientes.isEmpty()) return;

        log.info("[facturacion] Polling Hacienda empresa={}: {} comprobantes pendientes", empresaId, pendientes.size());

        for (ComprobanteFiscal cf : pendientes) {
            try {
                if (ComprobanteFiscal.ESTADO_PENDIENTE.equals(cf.getEstado())) {
                    procesarComprobante(cf.getId());
                } else if (ComprobanteFiscal.ESTADO_ENVIADO.equals(cf.getEstado())) {
                    actualizarEstadoDesdeHacienda(cf);
                }
            } catch (Exception e) {
                log.error("[facturacion] Error en polling comprobante={}: {}", cf.getId(), e.getMessage());
            }
        }
    }

    // ── privados ─────────────────────────────────────────────────────────────

    private void procesarComprobante(Long comprobanteId) {
        ComprobanteFiscal cf = comprobanteRepo.findById(comprobanteId).orElse(null);
        if (cf == null) return;

        // Idempotencia: si ya fue enviado previamente (estado != PENDIENTE), no re-enviar.
        // El scheduler que llama a este método distingue PENDIENTE (enviar) vs ENVIADO (polling).
        if (!ComprobanteFiscal.ESTADO_PENDIENTE.equals(cf.getEstado())) {
            log.warn("[facturacion] Comprobante={} ya en estado {} — skip envío duplicado",
                comprobanteId, cf.getEstado());
            return;
        }

        Empresa empresa = cf.getEmpresa();
        Pedido  pedido  = cf.getPedido();

        if (!empresa.isConfiguracionFiscalCompleta()) {
            log.warn("[facturacion] empresa={} sin config fiscal completa — stub mode", empresa.getId());
        }

        // Marcar intentos ANTES del HTTP call para que un fallo en save() posterior
        // no deje el estado PENDIENTE y provoque un reenvío duplicado en el próximo cron.
        cf.setIntentosEnvio(cf.getIntentosEnvio() + 1);
        cf.setEstado(ComprobanteFiscal.ESTADO_ENVIADO); // optimista — se revierte a ERROR si falla
        comprobanteRepo.save(cf);

        try {
            String xmlSinFirmar = xmlBuilder.construir(cf, empresa, pedido);
            String xmlFirmado   = firmaService.firmar(xmlSinFirmar, empresa);

            boolean enviado = haciendaClient.enviar(xmlFirmado, cf.getClaveNumerica(), empresa);

            if (!enviado) {
                cf.setEstado(ComprobanteFiscal.ESTADO_ERROR);
                comprobanteRepo.save(cf);
            }
        } catch (Exception e) {
            cf.setEstado(ComprobanteFiscal.ESTADO_ERROR);
            cf.setMensajeHacienda(e.getMessage());
            comprobanteRepo.save(cf);
            log.error("[facturacion] Error enviando comprobante={}: {}", comprobanteId, e.getMessage());
        }
    }

    private void actualizarEstadoDesdeHacienda(ComprobanteFiscal cf) {
        String estadoHacienda = haciendaClient.consultarEstado(cf.getClaveNumerica(), cf.getEmpresa());

        switch (estadoHacienda.toLowerCase()) {
            case "aceptado" -> {
                cf.setEstado(ComprobanteFiscal.ESTADO_ACEPTADO);
                cf.setFechaRespuesta(LocalDateTime.now());
                log.info("[facturacion] Comprobante ACEPTADO id={} clave={}", cf.getId(), cf.getClaveNumerica());
            }
            case "rechazado" -> {
                cf.setEstado(ComprobanteFiscal.ESTADO_RECHAZADO);
                cf.setFechaRespuesta(LocalDateTime.now());
                log.warn("[facturacion] Comprobante RECHAZADO id={} clave={}", cf.getId(), cf.getClaveNumerica());
            }
            case "en_procesamiento" -> log.debug("[facturacion] Comprobante en procesamiento id={}", cf.getId());
            default -> {
                cf.setIntentosEnvio(cf.getIntentosEnvio() + 1);
                if (cf.getIntentosEnvio() >= MAX_INTENTOS) {
                    cf.setEstado(ComprobanteFiscal.ESTADO_ERROR);
                    cf.setMensajeHacienda("Max intentos alcanzado. Último estado: " + estadoHacienda);
                }
            }
        }
        comprobanteRepo.save(cf);
    }
}
