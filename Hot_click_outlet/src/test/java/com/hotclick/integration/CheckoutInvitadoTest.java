package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.payment.PaymentExpirationCleanupService;
import com.hotclick.service.payment.ReservaAntiBotService;
import com.hotclick.service.payment.ReservaSospechosaLiberador;
import com.hotclick.utils.Constants;
import com.hotclick.service.TilopayService;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regla anti-bot de reservas (QA-CONC-4) de punta a punta: checkout de invitado real
 * (SINPE, sin pasarela externa) + scheduler de expiración con reloj controlable.
 */
@DisplayName("Checkout invitado: sin cuenta, sin SINPE manual, sin Tilopay => 503, tope por correo, sin IDOR")
class CheckoutInvitadoTest extends BaseIntegrationTest {

    @Autowired private ReservaAntiBotService          reservaAntiBot;
    @Autowired private PagoRepository                 pagoRepository;
    @Autowired private PedidoRepository               pedidoRepository;
    @Autowired private ProductoRepository             productoRepository;
    @Autowired private EmpresaRepository              empresaRepository;
    @Autowired private CategoriaRepository            categoriaRepository;
    @Autowired private BodegaRepository               bodegaRepository;
    @Autowired private TilopayService                 tilopayService;

    private Empresa empresa;
    private Bodega bodega;
    private Categoria categoria;
    private Producto producto;
    private int ip;

    @BeforeEach
    void setUp() {
        reservaAntiBot.limpiar();
        reservaAntiBot.setClock(Clock.system(Constants.ZONA_CR));

        empresa = new Empresa();
        empresa.setNombreEmpresa("AntiBot Inc");
        empresa.setSlug("antibot-" + System.nanoTime());
        empresa.setCorreoEmpresa("antibot" + System.nanoTime() + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        categoria = new Categoria();
        categoria.setNombreCategoria("Cat-AntiBot");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega AntiBot");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("88880000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega.setPermiteRetiroCliente(true);
        bodega = bodegaRepository.saveAndFlush(bodega);

        producto = new Producto();
        producto.setNombreProducto("Consola edición limitada");
        producto.setSku("SKU-AB-" + System.nanoTime());
        producto.setPrecioVenta(10000);
        producto.setPrecioCompra(7000);
        producto.setStockActual(50);
        producto.setStockReservado(0);
        producto.setStockMinimo(1);
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setVisibleCatalogo(true);
        producto.setCategoria(categoria);
        producto.setEmpresa(empresa);
        producto.setBodega(bodega);
        producto.setAdminCliente(adminUser);
        producto.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        producto = productoRepository.saveAndFlush(producto);
    }

    @AfterEach
    void tearDown() {
        ReflectionTestUtils.setField(tilopayService, "pagosDisponibles", true);
        reservaAntiBot.setClock(Clock.system(Constants.ZONA_CR));
        reservaAntiBot.limpiar();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private String cuerpo(String provider, String correo) {
        return """
            {"bodegaId":%d,"metodoEnvio":"%s","provider":"%s","guestEmail":"%s",
             "guestPhone":"88881234","items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(bodega.getId(), Constants.ENVIO_RETIRO, provider, correo, producto.getId());
    }

    private org.springframework.test.web.servlet.ResultActions checkout(String url, String provider, String correo) throws Exception {
        return mockMvc.perform(post(url)
            .contentType(MediaType.APPLICATION_JSON)
            .header("X-Forwarded-For", "10.9.0." + (++ip))
            .content(cuerpo(provider, correo)));
    }

    @Test
    void invitadoSinTokenCreaPedidoTilopay() throws Exception {
        checkout("/api/payments/guest-checkout", "TILOPAY", "invitado" + System.nanoTime() + "@test.cr")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroPedido").isNotEmpty())
            .andExpect(jsonPath("$.data.cancelToken").isNotEmpty());
    }

    @Test
    void sinpeManualRechazado400() throws Exception {
        long antes = pedidoRepository.count();
        checkout("/api/payments/guest-checkout", "SINPE", "s1" + System.nanoTime() + "@test.cr").andExpect(status().isBadRequest());
        checkout("/api/sinpe/guest-checkout", "SINPE", "s2" + System.nanoTime() + "@test.cr").andExpect(status().isBadRequest());
        assertThat(pedidoRepository.count()).isEqualTo(antes);
        assertThat(reservado()).isZero();
    }

    @Test
    void sinCredencialesTilopay503SinPedidoNiExitoSimulado() throws Exception {
        ReflectionTestUtils.setField(tilopayService, "pagosDisponibles", false);
        mockMvc.perform(get("/api/payments/disponibilidad"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tilopay").value(false));
        long antes = pedidoRepository.count();
        checkout("/api/payments/guest-checkout", "TILOPAY", "nt" + System.nanoTime() + "@test.cr")
            .andExpect(status().isServiceUnavailable());
        assertThat(pedidoRepository.count()).isEqualTo(antes);
        assertThat(pagoRepository.findAll()).noneMatch(p -> Constants.PAGO_CAPTURADO.equals(p.getEstadoPago()));
        assertThat(reservado()).isZero();
    }

    @Test
    void topePorCorreo429AunqueCambieLaIp() throws Exception {
        String correo = "tope" + System.nanoTime() + "@test.cr";
        for (int i = 0; i < 5; i++) {
            checkout("/api/payments/guest-checkout", "TILOPAY", correo).andExpect(status().isOk());
        }
        checkout("/api/payments/guest-checkout", "TILOPAY", correo.toUpperCase()).andExpect(status().isTooManyRequests());
    }

    @Test
    void idorPedidoAjenoNoSeExpone() throws Exception {
        mockMvc.perform(get("/api/payments/status/ORD-NOEXISTE0001")).andExpect(status().isNotFound());
        String numero = com.jayway.jsonpath.JsonPath.read(
            checkout("/api/payments/guest-checkout", "TILOPAY", "v" + System.nanoTime() + "@test.cr")
                .andReturn().getResponse().getContentAsString(), "$.data.numeroPedido");
        mockMvc.perform(post("/api/payments/guest/cancel/" + numero)
                .contentType(MediaType.APPLICATION_JSON).content("{\"cancelToken\":\"falso\"}"))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/payments/cancel/" + numero)).andExpect(status().isUnauthorized());
    }

    private int reservado() {
        return productoRepository.findById(producto.getId()).orElseThrow().getStockReservado();
    }
}
