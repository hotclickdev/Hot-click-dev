package com.hotclick.service;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.service.pedido.PedidoDespachoVerificador;
import com.hotclick.service.pedido.PedidoDetailMapper;
import com.hotclick.service.pedido.PedidoManualFactory;
import com.hotclick.service.pedido.PedidoNotificacionAppender;
import com.hotclick.service.pedido.PedidoPagoManualService;
import com.hotclick.service.producto.ProductoCacheEvictor;
import com.hotclick.service.producto.ProductoCatalogQueries;
import com.hotclick.service.producto.ProductoUpdater;
import com.hotclick.service.producto.ProductoWriteOperations;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * P-07 (riesgo BAJO de QA5-M-01): la clave SpEL del @CacheEvict de crearPedido y crearProducto
 * revisaba empresa != null pero no empresa.id != null. Con una empresa sin id el SpEL tiraba
 * después de guardar (operación hecha + error → reintentos duplicados). Debe usar 'global'.
 */
@SpringJUnitConfig(CacheEvictEmpresaSinIdTest.Config.class)
@DisplayName("P-07 | @CacheEvict con empresa sin id usa la clave 'global'")
class CacheEvictEmpresaSinIdTest {

    @Configuration
    @EnableCaching
    @Import({PedidoService.class, ProductoService.class})
    static class Config {
        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("dashboard-metricas");
        }
    }

    @MockitoBean PedidoRepository pedidoRepository;
    @MockitoBean NotificacionEmailService notificacionEmailService;
    @MockitoBean N8nWebhookService n8nWebhookService;
    @MockitoBean TelegramService telegramService;
    @MockitoBean TelegramNotificacionClienteService telegramNotificacionClienteService;
    @MockitoBean PedidoManualFactory pedidoManualFactory;
    @MockitoBean PedidoNotificacionAppender pedidoNotificacionAppender;
    @MockitoBean PedidoDetailMapper pedidoDetailMapper;
    @MockitoBean PedidoPagoManualService pedidoPagoManualService;
    @MockitoBean PedidoDespachoVerificador despachoVerificador;
    @MockitoBean StockReservationService stockReservationService;
    @MockitoBean ProductoRepository productoRepository;
    @MockitoBean ProductoCatalogQueries catalogQueries;
    @MockitoBean ProductoCacheEvictor cacheEvictor;
    @MockitoBean ProductoWriteOperations writeOperations;
    @MockitoBean ProductoUpdater productoUpdater;

    @Autowired PedidoService pedidoService;
    @Autowired ProductoService productoService;
    @Autowired CacheManager cacheManager;

    @BeforeEach
    void sembrarCache() {
        cacheManager.getCache("dashboard-metricas").clear();
        cacheManager.getCache("dashboard-metricas").put("global", "viejo");
    }

    @Test
    @DisplayName("crearPedido con empresa sin id → sin error y evicta 'global'")
    void crearPedidoEmpresaSinId() {
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> inv.getArgument(0));
        Pedido pedido = new Pedido();
        pedido.setEmpresa(new Empresa());

        assertThatCode(() -> pedidoService.crearPedido(pedido)).doesNotThrowAnyException();
        assertThat(cacheManager.getCache("dashboard-metricas").get("global")).isNull();
    }

    @Test
    @DisplayName("crearProducto con empresa sin id → sin error y evicta 'global'")
    void crearProductoEmpresaSinId() {
        Empresa empresa = new Empresa();
        when(writeOperations.crearProducto(any(), any(), eq("admin@test.cr"), eq(empresa))).thenReturn(new Producto());

        assertThatCode(() -> productoService.crearProducto(new ProductoRequestDTO(), "admin@test.cr", empresa))
            .doesNotThrowAnyException();
        assertThat(cacheManager.getCache("dashboard-metricas").get("global")).isNull();
    }
}
