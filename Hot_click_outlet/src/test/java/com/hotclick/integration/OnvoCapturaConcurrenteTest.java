package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.payment.OnvoPaymentProvider.Verificacion;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** C6: webhook y retorno ONVO a la vez sobre el mismo pago → una sola captura, la otra DUPLICADO, nunca 500. */
@DisplayName("[C6] Captura ONVO concurrente: lock de la fila del pago y UNIQUE mapeado a DUPLICADO")
class OnvoCapturaConcurrenteTest extends BaseIntegrationTest {

    private static final String SESION = "cs_c6_concurrente";
    private static final String INTENT = "pi_c6_concurrente";

    @MockitoBean private OnvoService onvoService;
    @MockitoBean private PaymentService paymentService;
    @MockitoBean private AggregatorService aggregatorService;

    @Autowired private OnvoPaymentProvider provider;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    @BeforeEach
    void armar() {
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("live");
        doReturn(Map.of("paymentStatus", "paid", "status", "complete", "paymentIntentId", INTENT, "mode", "live"))
            .when(onvoService).obtenerCheckoutSession(SESION);
        doReturn(Map.of("id", INTENT, "status", "succeeded", "amount", 1_000_000, "currency", "CRC", "mode", "live"))
            .when(onvoService).obtenerPaymentIntent(INTENT);

        String slug = "c6-" + System.nanoTime();
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("C6");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        Bodega bodega = new Bodega();
        bodega.setNombreBodega("Bodega C6");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setProvincia("San José");
        bodega.setCanton("Escazú");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);

        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-C6-" + (System.nanoTime() % 1_000_000));
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago(Constants.PROVEEDOR_ONVO);
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        p = pedidoRepository.saveAndFlush(p);

        Pago pago = new Pago();
        pago.setMerchantToken(SESION);
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.saveAndFlush(pago);
    }

    @AfterEach
    void limpiar() {
        webhookEventRepository.deleteAll();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Dos entregas simultáneas → exactamente una OK, la otra DUPLICADO; un evento y una confirmación")
    void dosEntregasUnaCaptura() throws Exception {
        int hilos = 2;
        CyclicBarrier largada = new CyclicBarrier(hilos);
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        try {
            List<Future<Verificacion>> resultados = new ArrayList<>();
            for (String origen : new String[]{"webhook", "retorno"}) {
                resultados.add(pool.submit(() -> {
                    largada.await(5, TimeUnit.SECONDS);
                    return provider.procesarPagoVerificado(SESION, origen);
                }));
            }
            List<Verificacion> vistos = new ArrayList<>();
            for (Future<Verificacion> f : resultados) vistos.add(f.get(30, TimeUnit.SECONDS));

            assertThat(vistos).containsExactlyInAnyOrder(Verificacion.OK, Verificacion.DUPLICADO);
        } finally {
            pool.shutdownNow();
        }
        assertThat(webhookEventRepository.findAll()).hasSize(1);
        assertThat(pagoRepository.findByMerchantToken(SESION).orElseThrow().getEstadoPago())
            .isEqualTo(Constants.PAGO_CAPTURADO);
        verify(paymentService, times(1)).confirmarPedido(any(Pago.class));
    }

    @Test
    @DisplayName("SCALE1 #301: llave de prueba → es_prueba persistido por dirty checking, sin save por pedido")
    void llaveDePrueba_persisteEsPruebaSinSave() {
        when(onvoService.modoEsperado()).thenReturn("test");
        doReturn(Map.of("paymentStatus", "paid", "status", "complete", "paymentIntentId", INTENT, "mode", "test"))
            .when(onvoService).obtenerCheckoutSession(SESION);
        doReturn(Map.of("id", INTENT, "status", "succeeded", "amount", 1_000_000, "currency", "CRC", "mode", "test"))
            .when(onvoService).obtenerPaymentIntent(INTENT);

        assertThat(provider.procesarPagoVerificado(SESION, "webhook")).isEqualTo(Verificacion.OK);
        Pedido recargado = pedidoRepository.findById(
            pagoRepository.findByMerchantToken(SESION).orElseThrow().getPedido().getId()).orElseThrow();
        assertThat(recargado.isEsPrueba()).isTrue();
    }

    @Test
    @DisplayName("Caso 3 QA: sesión paid+open → confirma una vez; la segunda entrega del evento sale DUPLICADO")
    void pagadaAbiertaConfirmaUnaSolaVez() {
        doReturn(Map.of("paymentStatus", "paid", "status", "open", "paymentIntentId", INTENT, "mode", "live"))
            .when(onvoService).obtenerCheckoutSession(SESION);

        assertThat(provider.procesarPagoVerificado(SESION, "webhook")).isEqualTo(Verificacion.OK);
        assertThat(provider.procesarPagoVerificado(SESION, "webhook")).isEqualTo(Verificacion.DUPLICADO);
        assertThat(provider.procesarPagoVerificado(SESION, "retorno")).isEqualTo(Verificacion.DUPLICADO);

        assertThat(webhookEventRepository.findAll()).hasSize(1);
        assertThat(pagoRepository.findByMerchantToken(SESION).orElseThrow().getEstadoPago())
            .isEqualTo(Constants.PAGO_CAPTURADO);
        verify(paymentService, times(1)).confirmarPedido(any(Pago.class));
    }

    @Test
    @DisplayName("Caso 3 QA: sesión paid+expired → no confirma ni registra evento")
    void pagadaVencidaNoConfirma() {
        doReturn(Map.of("paymentStatus", "paid", "status", "expired", "paymentIntentId", INTENT, "mode", "live"))
            .when(onvoService).obtenerCheckoutSession(SESION);
        assertThat(provider.procesarPagoVerificado(SESION, "webhook")).isEqualTo(Verificacion.NO_PAGADO);
        assertThat(webhookEventRepository.findAll()).isEmpty();
        verify(paymentService, times(0)).confirmarPedido(any(Pago.class));
    }
}
