package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.PedidoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * QA5 MEDIO: PUT /pedidos/{id}/estado idempotente. Varios cambios simultáneos al mismo estado (doble clic,
 * reintento) producen UNA transición y UN correo; el pedido se lee con FOR UPDATE. Cancelar un cancelado no repite nada.
 */
@DisplayName("Cambio de estado del pedido: idempotente y sin efectos repetidos bajo concurrencia")
class PedidoEstadoIdempotenteConcurrenteTest extends BaseIntegrationTest {

    @Autowired private PedidoService pedidoService;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PedidoRepository pedidoRepository;

    private Long pedidoId;

    @BeforeEach
    void armar() {
        reset(notificacionEmailService);
        String slug = "estado-idem-" + System.nanoTime();
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("Estado idem");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);
        Bodega bodega = new Bodega();
        bodega.setNombreBodega("Bodega idem");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-IDEM-" + System.nanoTime() % 1_000_000);
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setOrigen("WEB");
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        pedidoId = pedidoRepository.saveAndFlush(p).getId();
    }

    @AfterEach
    void limpiar() {
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("cancelaciones simultáneas con nota → una transición, un correo")
    void cancelarConcurrenteUnCorreo() throws Exception {
        int hilos = 6;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger();
        List<Future<?>> fs = new ArrayList<>();
        for (int k = 0; k < hilos; k++) {
            fs.add(pool.submit(() -> {
                salida.await();
                try {
                    pedidoService.cambiarEstado(pedidoId, Constants.PEDIDO_CANCELADO, "Cancelado por la tienda");
                    ok.incrementAndGet();
                } catch (RuntimeException ignorado) {
                    // un timeout de lock deja el pedido intacto: no cuenta como efecto
                }
                return null;
            }));
        }
        salida.countDown();
        for (Future<?> f : fs) f.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(ok.get()).isGreaterThanOrEqualTo(1);
        assertThat(pedidoRepository.findById(pedidoId).orElseThrow().getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(notificacionEmailService, times(1)).enviarSeguimientoEstado(any(), anyString());

        // Repetir el PUT más tarde tampoco repite el correo.
        pedidoService.cambiarEstado(pedidoId, Constants.PEDIDO_CANCELADO, "Otra vez");
        verify(notificacionEmailService, times(1)).enviarSeguimientoEstado(any(), anyString());
    }
}
