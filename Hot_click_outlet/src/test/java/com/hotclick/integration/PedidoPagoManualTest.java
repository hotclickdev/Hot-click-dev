package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.AggregatorService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * SEC-05 / SEC-06 — {@code PUT /api/pedidos/{id}/estado}.
 *
 * <p>Ataques del reporte de Seguridad: el vendedor marcaba PAGADO un pedido sin cobro (también de
 * tarjeta), sin referencia, sin sincronizar el Pago ni la billetera y sin auditoría; y cualquier
 * texto de estado o salto de estado se aceptaba. Casos legítimos: SINPE con referencia o con
 * comprobante, efectivo con referencia, flujo normal después del pago.
 */
@DisplayName("[SEC-05/06] Pago manual y máquina de estados del pedido")
class PedidoPagoManualTest extends BaseIntegrationTest {

    @MockitoBean private AggregatorService aggregatorService;

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private ComprobanteSinpeRepository comprobanteRepository;
    @Autowired private AuditoriaAdminRepository auditoriaRepository;
    @Autowired private com.hotclick.service.TelegramFlujoService telegramFlujoService;

    private Empresa empresa;
    private Empresa empresaOtra;
    private Usuario emprendedor;
    private String tokenEmp;
    private Bodega bodega;
    private int secuencia;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresa = crearEmpresa("Pago Manual", "pago-manual-test", "pm@test.cr");
        empresaOtra = crearEmpresa("Otra Pago", "otra-pago-test", "op@test.cr");
        emprendedor = crearUsuario("vend-pm@test.cr", "Vendedor PM", rolEmp);
        emprendedor.setEmpresa(empresa);
        emprendedor = usuarioRepository.saveAndFlush(emprendedor);
        tokenEmp = tokenPara(emprendedor, Constants.ROL_EMPRENDEDOR);
        bodega = crearBodega(empresa);
        auditoriaRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        auditoriaRepository.deleteAll();
        comprobanteRepository.deleteAll();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── SEC-05: ataques ──────────────────────────────────────────────────────

    @Test
    @DisplayName("Ataque: pedido de Tilopay con Pago pendiente → PAGADO a mano (aun con referencia) = 400, nada cambia")
    void tilopay_conPago_noSeMarcaPagado() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE, Constants.PROVEEDOR_TILOPAY);
        Pago pago = crearPago(p, Constants.PROVEEDOR_TILOPAY);

        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\",\"referencia\":\"TX-falsa\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("pasarela")));

        assertEstado(p, Constants.PEDIDO_PENDIENTE);
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verifyNoInteractions(aggregatorService);
        assertThat(auditorias("PEDIDO_PAGO_MANUAL")).isEmpty();
    }

    @Test
    @DisplayName("Ataque: pedido de tarjeta sin Pago (TILOPAY/STRIPE) → PAGADO a mano = 400")
    void metodoTarjeta_sinPago_noSeMarcaPagado() throws Exception {
        Pedido tilopay = crearPedido(empresa, Constants.PEDIDO_PENDIENTE, "tilopay");
        Pedido stripe = crearPedido(empresa, Constants.PEDIDO_PENDIENTE, Constants.PROVEEDOR_STRIPE);

        cambiar(tokenEmp, tilopay, "{\"estado\":\"PAGADO\",\"referencia\":\"123\"}").andExpect(status().isBadRequest());
        cambiar(tokenEmp, stripe, "{\"estado\":\"PAGADO\",\"referencia\":\"123\"}").andExpect(status().isBadRequest());

        assertEstado(tilopay, Constants.PEDIDO_PENDIENTE);
        assertEstado(stripe, Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("Ataque: SINPE → PAGADO sin referencia ni comprobante = 400, el Pago sigue pendiente")
    void sinpe_sinReferencia_400() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "SINPE");
        Pago pago = crearPago(p, Constants.PROVEEDOR_SINPE);

        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\"}").andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("referencia")));
        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\",\"referencia\":\"   \"}").andExpect(status().isBadRequest());

        assertEstado(p, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
    }

    @Test
    @DisplayName("Ataque: referencia de más de 100 caracteres = 400")
    void referenciaLarga_400() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE, "EFECTIVO");
        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\",\"referencia\":\"" + "x".repeat(101) + "\"}")
            .andExpect(status().isBadRequest());
        assertEstado(p, Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("Ataque: pago SINPE de un grupo con pedidos de otro negocio → el vendedor no lo confirma (400); ADMIN sí")
    void grupoMultinegocio_soloAdmin() throws Exception {
        Pedido propio = crearPedido(empresa, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "SINPE");
        Pedido ajeno = crearPedido(empresaOtra, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "SINPE");
        propio.setGrupoPago("GRP-" + UUID.randomUUID());
        ajeno.setGrupoPago(propio.getGrupoPago());
        pedidoRepository.saveAndFlush(propio);
        pedidoRepository.saveAndFlush(ajeno);
        Pago pago = crearPago(propio, Constants.PROVEEDOR_SINPE);

        cambiar(tokenEmp, propio, "{\"estado\":\"PAGADO\",\"referencia\":\"SINPE 555\"}")
            .andExpect(status().isBadRequest());
        assertEstado(propio, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertEstado(ajeno, Constants.PEDIDO_PENDIENTE_COMPROBANTE);

        cambiar(adminToken, propio, "{\"estado\":\"PAGADO\",\"referencia\":\"SINPE 555\"}")
            .andExpect(status().isOk());
        assertEstado(propio, Constants.PEDIDO_PAGADO);
        assertEstado(ajeno, Constants.PEDIDO_PAGADO);
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
    }

    // ── SEC-05: casos legítimos ──────────────────────────────────────────────

    @Test
    @DisplayName("Legítimo: SINPE con referencia → PAGADO, Pago CAPTURADO, billetera acreditada y auditoría del EMPRENDEDOR")
    void sinpe_conReferencia_sincronizaYAudita() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "SINPE");
        Pago pago = crearPago(p, Constants.PROVEEDOR_SINPE);

        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\",\"referencia\":\"SINPE 87654321\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estadoPedido").value("PAGADO"));

        assertEstado(p, Constants.PEDIDO_PAGADO);
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        verify(aggregatorService).acreditarVentaEnTransaccion(argThat(x -> p.getId().equals(x.getId())));

        List<AuditoriaAdmin> auditoria = auditorias("PEDIDO_PAGO_MANUAL");
        assertThat(auditoria).hasSize(1);
        AuditoriaAdmin a = auditoria.get(0);
        assertThat(a.getAdminId()).isEqualTo(emprendedor.getId());
        assertThat(a.getAdminEmail()).isEqualTo("vend-pm@test.cr");
        assertThat(a.getEmpresaId()).isEqualTo(empresa.getId());
        assertThat(a.getEntidadId()).isEqualTo(p.getId());
        assertThat(a.getDetalle()).contains("PENDIENTE_COMPROBANTE", "PAGADO", "SINPE", "SINPE 87654321");
        assertThat(auditorias("PEDIDO_CAMBIO_ESTADO")).hasSize(1);
    }

    @Test
    @DisplayName("Legítimo: SINPE en revisión con comprobante y sin referencia → PAGADO y comprobante APROBADO")
    void sinpe_conComprobante_sinReferencia() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE_APROBACION, "SINPE");
        Pago pago = crearPago(p, Constants.PROVEEDOR_SINPE);
        ComprobanteSinpe c = new ComprobanteSinpe();
        c.setPedido(p);
        c.setUrlComprobante("https://example.test/c.png");
        c.setNombreRemitente("Cliente");
        c.setFechaSubida(LocalDateTime.now());
        c = comprobanteRepository.saveAndFlush(c);

        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\"}").andExpect(status().isOk());

        assertEstado(p, Constants.PEDIDO_PAGADO);
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        ComprobanteSinpe actualizado = comprobanteRepository.findById(c.getId()).orElseThrow();
        assertThat(actualizado.getEstado()).isEqualTo(Constants.COMPROBANTE_APROBADO);
        assertThat(actualizado.getAdminEmail()).isEqualTo("vend-pm@test.cr");
        assertThat(auditorias("PEDIDO_PAGO_MANUAL").get(0).getDetalle()).contains("comprobante SINPE #" + c.getId());
    }

    @Test
    @DisplayName("Legítimo: venta manual en efectivo (sin Pago) con referencia → PAGADO y auditoría")
    void efectivo_sinPago_conReferencia() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE, "efectivo");

        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\",\"referencia\":\"Recibido por Ana en tienda\"}")
            .andExpect(status().isOk());

        assertEstado(p, Constants.PEDIDO_PAGADO);
        assertThat(auditorias("PEDIDO_PAGO_MANUAL")).singleElement()
            .satisfies(a -> assertThat(a.getDetalle()).contains("EFECTIVO", "Recibido por Ana en tienda"));
    }

    @Test
    @DisplayName("QA-B02-5: si falla la acreditación de la billetera se revierte todo (pedido, Pago, comprobante, auditoría)")
    void falloBilletera_revierteTodo() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "SINPE");
        Pago pago = crearPago(p, Constants.PROVEEDOR_SINPE);
        doThrow(new IllegalStateException("No se pudo acreditar la billetera"))
            .when(aggregatorService).acreditarVentaEnTransaccion(any());

        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\",\"referencia\":\"SINPE 999\"}")
            .andExpect(status().isBadRequest());

        assertEstado(p, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(auditorias("PEDIDO_PAGO_MANUAL")).isEmpty();
    }

    // ── SEC-06: máquina de estados ───────────────────────────────────────────

    @ParameterizedTest(name = "Ataque: estado inventado «{0}» = 400")
    @CsvSource({"HACKEADO", "pagado_ya", "REEMBOLSADO", "'<script>'"})
    void estadoInventado_400(String estado) throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PAGADO, "SINPE");
        cambiar(tokenEmp, p, "{\"estado\":\"" + estado + "\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.startsWith("Estado de pedido no válido")));
        assertEstado(p, Constants.PEDIDO_PAGADO);
    }

    @ParameterizedTest(name = "Ataque: transición {0} → {1} = 400")
    @CsvSource({
        "PENDIENTE,EN_PREPARACION", "PENDIENTE,LISTO_RETIRO", "PENDIENTE,ENTREGADO", "PENDIENTE,CONFIRMADO",
        "PENDIENTE_COMPROBANTE,COMPLETADO", "CANCELADO,PAGADO", "CANCELADO,PENDIENTE", "ENTREGADO,PENDIENTE",
        "COMPLETADO,EN_PREPARACION", "ENVIADO,EN_PREPARACION", "PAGADO,PENDIENTE"
    })
    void transicionInvalida_400(String desde, String hacia) throws Exception {
        Pedido p = crearPedido(empresa, desde, "EFECTIVO");
        cambiar(tokenEmp, p, "{\"estado\":\"" + hacia + "\",\"referencia\":\"ref\"}")
            .andExpect(status().isBadRequest());
        assertEstado(p, desde);
    }

    @ParameterizedTest(name = "Legítimo: transición {0} → {1} = 200")
    @CsvSource({
        "PAGADO,EN_PREPARACION", "EN_PREPARACION,LISTO_RETIRO", "LISTO_RETIRO,ENTREGADO",
        "ENTREGADO,COMPLETADO", "PENDIENTE,CANCELADO", "PAGADO,CANCELADO", "ENVIADO,ENTREGADO", "PAGADO,PAGADO"
    })
    void transicionValida_200(String desde, String hacia) throws Exception {
        Pedido p = crearPedido(empresa, desde, "SINPE");
        if (!desde.startsWith("PENDIENTE")) crearPago(p, Constants.PROVEEDOR_SINPE, Constants.PAGO_CAPTURADO);
        cambiar(tokenEmp, p, "{\"estado\":\"" + hacia + "\"}").andExpect(status().isOk());
        assertEstado(p, hacia);
    }

    @Test
    @DisplayName("Legítimo: el estado se normaliza (trim + mayúsculas) y el cambio queda auditado")
    void normalizaYAudita() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PAGADO, "SINPE");
        cambiar(tokenEmp, p, "{\"estado\":\" en_preparacion \"}").andExpect(status().isOk());
        assertEstado(p, Constants.PEDIDO_EN_PREPARACION);
        assertThat(auditorias("PEDIDO_CAMBIO_ESTADO")).singleElement().satisfies(a -> {
            assertThat(a.getAdminEmail()).isEqualTo("vend-pm@test.cr");
            assertThat(a.getEmpresaId()).isEqualTo(empresa.getId());
            assertThat(a.getDetalle()).isEqualTo("Estado PAGADO → EN_PREPARACION");
        });
    }

    // ── QA-B02-1/2/3: saltos para despachar o entregar sin pago ──────────────

    @ParameterizedTest(name = "QA-B02-1: sin pago → {0} y después /guia → 400 y 409, sin aviso al cliente")
    @CsvSource({"EN_PREPARACION", "LISTO_RETIRO", "PREPARANDO", "XYZ", "CONFIRMADO"})
    void qaB02_1_estadoIntermedioNoHabilitaGuia(String intermedio) throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "SINPE");
        crearPago(p, Constants.PROVEEDOR_SINPE);

        cambiar(tokenEmp, p, "{\"estado\":\"" + intermedio + "\"}").andExpect(status().isBadRequest());
        guia(tokenEmp, p, "RR100000001CR").andExpect(status().isConflict());

        Pedido despues = pedidoRepository.findById(p.getId()).orElseThrow();
        assertThat(despues.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertThat(despues.getNumeroGuia()).isNull();
        verify(notificacionEmailService, never()).enviarNotificacionGuia(any());
    }

    @ParameterizedTest(name = "QA-B02-2: {0} + {1} sin pago → ENTREGADO = 400")
    @CsvSource({"TILOPAY,ENVIO_A_DOMICILIO", "TILOPAY,RETIRO_EN_TIENDA", "EFECTIVO,ENVIO_A_DOMICILIO", "SINPE,RETIRO_EN_TIENDA"})
    void qaB02_2_entregadoSinPago(String metodo, String envio) throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE, metodo);
        p.setMetodoEnvio(envio);
        pedidoRepository.saveAndFlush(p);
        if (Constants.PROVEEDOR_TILOPAY.equals(metodo)) crearPago(p, Constants.PROVEEDOR_TILOPAY);

        cambiar(tokenEmp, p, "{\"estado\":\"ENTREGADO\"}").andExpect(status().isBadRequest());
        assertEstado(p, Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("QA-B02-3: CANCELADO es final: no vuelve a PAGADO (ni con referencia, ni como ADMIN) y /guia sigue en 409")
    void qaB02_3_canceladoEsFinal() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_CANCELADO, "SINPE");

        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\",\"referencia\":\"SINPE 1\"}").andExpect(status().isBadRequest());
        cambiar(adminToken, p, "{\"estado\":\"PAGADO\",\"referencia\":\"SINPE 1\"}").andExpect(status().isBadRequest());
        guia(tokenEmp, p, "RR100000002CR").andExpect(status().isConflict());
        assertEstado(p, Constants.PEDIDO_CANCELADO);
    }

    // ── SEC-09: el despacho mira el Pago, no el estado del pedido ─────────────

    @Test
    @DisplayName("SEC-09: pedido de Tilopay con estado PAGADO forzado y Pago PENDIENTE → guía, envío, ENVIADO y ENTREGADO = 409")
    void sec09_estadoPagadoForzado_tilopayPendiente() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PAGADO, Constants.PROVEEDOR_TILOPAY);
        p.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        pedidoRepository.saveAndFlush(p);
        crearPago(p, Constants.PROVEEDOR_TILOPAY);

        guia(tokenEmp, p, "RR1").andExpect(status().isConflict());
        mockMvc.perform(put("/api/pedidos/" + p.getId() + "/envio").header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON).content("{\"guia\":\"RR1\"}"))
            .andExpect(status().isConflict());
        cambiar(tokenEmp, p, "{\"estado\":\"ENVIADO\"}").andExpect(status().isConflict());
        cambiar(tokenEmp, p, "{\"estado\":\"ENTREGADO\"}").andExpect(status().isConflict());
        cambiar(adminToken, p, "{\"estado\":\"ENVIADO\"}").andExpect(status().isConflict());
        assertEstado(p, Constants.PEDIDO_PAGADO);
        verify(notificacionEmailService, never()).enviarNotificacionGuia(any());
    }

    @Test
    @DisplayName("SEC-09: con Pago CAPTURADO la guía se asigna (200) aunque sea el mismo pedido")
    void sec09_pagoCapturado_despacha() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PAGADO, Constants.PROVEEDOR_TILOPAY);
        crearPago(p, Constants.PROVEEDOR_TILOPAY, Constants.PAGO_CAPTURADO);
        guia(tokenEmp, p, "RR100000003CR").andExpect(status().isOk());
        assertEstado(p, Constants.PEDIDO_ENVIADO);
    }

    @Test
    @DisplayName("SEC-09: PAGADO manual (efectivo, sin Pago previo) deja un Pago MANUAL CAPTURADO y después se despacha")
    void sec09_pagoManual_creaPagoYDespacha() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE, "EFECTIVO");
        p.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        pedidoRepository.saveAndFlush(p);
        guia(tokenEmp, p, "RR1").andExpect(status().isConflict());

        cambiar(tokenEmp, p, "{\"estado\":\"PAGADO\",\"referencia\":\"Cobrado por el mensajero\"}")
            .andExpect(status().isOk());
        Pago manual = pagoRepository.findTopByPedidoId(p.getId()).orElseThrow();
        assertThat(manual.getProveedor()).isEqualTo(Constants.PROVEEDOR_MANUAL);
        assertThat(manual.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(manual.getMetodoPagoTipo()).isEqualTo("EFECTIVO");
        assertThat(manual.getMonto()).isEqualTo(p.getTotalPedido());

        guia(tokenEmp, p, "RR100000004CR").andExpect(status().isOk());
        assertEstado(p, Constants.PEDIDO_ENVIADO);
    }

    @Test
    @DisplayName("SEC-09: camino de Telegram (mismo PedidoService): sin pago no asigna guía ni salta estados")
    void sec09_telegram() {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "SINPE");
        crearPago(p, Constants.PROVEEDOR_SINPE);
        Pedido forzado = crearPedido(empresa, Constants.PEDIDO_PAGADO, Constants.PROVEEDOR_TILOPAY);
        crearPago(forzado, Constants.PROVEEDOR_TILOPAY);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> telegramFlujoService.asignarGuiaTx(p.getId(), "RR1"))
            .isInstanceOf(com.hotclick.exception.PedidoNoDespachableException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> telegramFlujoService.cambiarEstadoPedidoTx(p.getId(), "EN_PREPARACION", null))
            .isInstanceOf(IllegalArgumentException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> telegramFlujoService.cambiarEstadoPedidoTx(p.getId(), "PAGADO", null))
            .isInstanceOf(IllegalArgumentException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> telegramFlujoService.asignarGuiaTx(forzado.getId(), "RR1"))
            .isInstanceOf(com.hotclick.exception.PedidoNoDespachableException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> telegramFlujoService.cambiarEstadoPedidoTx(forzado.getId(), "ENVIADO", null))
            .isInstanceOf(com.hotclick.exception.PedidoNoDespachableException.class);
        assertEstado(p, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertEstado(forzado, Constants.PEDIDO_PAGADO);
    }

    // ── Regresiones que no se pueden romper ──────────────────────────────────

    @Test
    @DisplayName("Regresión: efectivo + retiro (checkout con Pago pendiente) → ENTREGADO sin PAGADO previo; registra cobro, Pago y auditoría")
    void efectivoRetiro_conPago_entregado() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "EFECTIVO");
        Pago pago = crearPago(p, Constants.PROVEEDOR_SINPE); // así lo deja /api/sinpe/checkout con provider EFECTIVO

        cambiar(tokenEmp, p, "{\"estado\":\"ENTREGADO\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estadoPedido").value("ENTREGADO"));

        assertEstado(p, Constants.PEDIDO_ENTREGADO);
        Pago capturado = pagoRepository.findById(pago.getId()).orElseThrow();
        assertThat(capturado.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(capturado.getMetodoPagoTipo()).isEqualTo("EFECTIVO");
        verify(aggregatorService).acreditarVentaEnTransaccion(argThat(x -> p.getId().equals(x.getId())));
        assertThat(auditorias("PEDIDO_PAGO_MANUAL")).singleElement().satisfies(a -> {
            assertThat(a.getAdminEmail()).isEqualTo("vend-pm@test.cr");
            assertThat(a.getFecha()).isNotNull();
            assertThat(a.getDetalle()).contains("PENDIENTE_COMPROBANTE", "ENTREGADO", "EFECTIVO", "cobro en efectivo al retirar");
        });
    }

    @Test
    @DisplayName("Efectivo + retiro desde PENDIENTE (venta manual sin cobro registrado) → ENTREGADO = 400: primero PAGADO")
    void efectivoRetiro_desdePendiente_400() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE, "EFECTIVO");
        cambiar(tokenEmp, p, "{\"estado\":\"ENTREGADO\"}").andExpect(status().isBadRequest());
        assertEstado(p, Constants.PEDIDO_PENDIENTE);
    }

    @ParameterizedTest(name = "PENDIENTE_COMPROBANTE → ENTREGADO con {0} + {1} = 400 (solo efectivo + retiro)")
    @CsvSource({"TILOPAY,RETIRO_EN_TIENDA", "SINPE,RETIRO_EN_TIENDA", "EFECTIVO,ENVIO_A_DOMICILIO", "CONTRA_ENTREGA,RETIRO_EN_TIENDA"})
    void entregadoDesdeComprobante_otrosMetodos_400(String metodo, String envio) throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE_COMPROBANTE, metodo);
        p.setMetodoEnvio(envio);
        pedidoRepository.saveAndFlush(p);
        Pago pago = crearPago(p, Constants.PROVEEDOR_TILOPAY.equals(metodo) ? Constants.PROVEEDOR_TILOPAY : Constants.PROVEEDOR_SINPE);

        cambiar(tokenEmp, p, "{\"estado\":\"ENTREGADO\"}").andExpect(status().isBadRequest());
        assertEstado(p, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verifyNoInteractions(aggregatorService);
    }

    @Test
    @DisplayName("Efectivo + retiro de otra empresa: el vendedor ajeno recibe 403 y no se registra nada")
    void efectivoRetiro_otraEmpresa_403() throws Exception {
        Pedido p = crearPedido(empresaOtra, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "EFECTIVO");
        Pago pago = crearPago(p, Constants.PROVEEDOR_SINPE);

        cambiar(tokenEmp, p, "{\"estado\":\"ENTREGADO\"}").andExpect(status().isForbidden());
        assertEstado(p, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(auditorias("PEDIDO_PAGO_MANUAL")).isEmpty();
    }

    @Test
    @DisplayName("Regresión: corregir la guía de un pedido ya ENVIADO sigue en 200")
    void corregirGuiaEnviado_200() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_ENVIADO, "SINPE");
        p.setNumeroGuia("RR000000001CR");
        pedidoRepository.saveAndFlush(p);

        guia(tokenEmp, p, "RR000000009CR").andExpect(status().isOk());
        Pedido despues = pedidoRepository.findById(p.getId()).orElseThrow();
        assertThat(despues.getNumeroGuia()).isEqualTo("RR000000009CR");
        assertThat(despues.getEstadoPedido()).isEqualTo(Constants.PEDIDO_ENVIADO);
        cambiar(tokenEmp, p, "{\"estado\":\"ENVIADO\"}").andExpect(status().isOk());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private org.springframework.test.web.servlet.ResultActions cambiar(String token, Pedido p, String json) throws Exception {
        return mockMvc.perform(put("/api/pedidos/" + p.getId() + "/estado")
            .header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json));
    }

    private org.springframework.test.web.servlet.ResultActions guia(String token, Pedido p, String guia) throws Exception {
        return mockMvc.perform(put("/api/pedidos/" + p.getId() + "/guia")
            .header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"numeroGuia\":\"" + guia + "\"}"));
    }

    private void assertEstado(Pedido p, String esperado) {
        assertThat(pedidoRepository.findById(p.getId()).orElseThrow().getEstadoPedido()).isEqualTo(esperado);
    }

    private List<AuditoriaAdmin> auditorias(String accion) {
        return auditoriaRepository.findAll().stream().filter(a -> accion.equals(a.getAccion())).toList();
    }

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Bodega crearBodega(Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega PM");
        b.setDireccionExacta("Calle PM 1");
        b.setTelefono("77770000");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Pedido crearPedido(Empresa empresa, String estado, String metodoPago) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-PM-" + (++secuencia));
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(15000);
        p.setTotalPedido(15000);
        p.setCostoTotalProductos(10000);
        p.setUtilidadBruta(5000);
        p.setMetodoPago(metodoPago);
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }

    private Pago crearPago(Pedido p, String proveedor) {
        return crearPago(p, proveedor, Constants.PAGO_PENDIENTE);
    }

    private Pago crearPago(Pedido p, String proveedor, String estadoPago) {
        Pago pago = new Pago();
        pago.setMerchantToken("tok-" + UUID.randomUUID());
        pago.setMonto(p.getTotalPedido());
        pago.setProveedor(proveedor);
        pago.setEstadoPago(estadoPago);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now());
        return pagoRepository.saveAndFlush(pago);
    }
}
