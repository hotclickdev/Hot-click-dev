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
import com.hotclick.service.TilopayService;
import com.hotclick.service.payment.PaymentExpirationCleanupService;
import com.hotclick.service.payment.ReservaAntiBotService;
import com.hotclick.service.payment.ReservaSospechosaLiberador;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regla anti-bot de reservas (QA-CONC-4) de punta a punta: checkout de invitado real
 * (SINPE, sin pasarela externa) + scheduler de expiración con reloj controlable.
 */
@DisplayName("[QA-CONC-4] Regla anti-bot de reservas — checkout + liberación diferida")
// QA-CONC-4 mide la liberación diferida con pedidos de 5 u: se suben los topes de invitado de SEG-F (GuestCheckoutGuard,
// cubierto en GuestCheckoutGuardTest) para que no corten antes.
@org.springframework.test.context.TestPropertySource(properties = {
    "hotclick.checkout.invitado.max-unidades-por-producto=100",
    "hotclick.checkout.invitado.max-unidades-pendientes=1000"})
class ReservasAntiBotIntegrationTest extends BaseIntegrationTest {

    @Autowired private ReservaAntiBotService          reservaAntiBot;
    @Autowired private ReservaSospechosaLiberador     liberador;
    @Autowired private PaymentExpirationCleanupService cleanup;
    @Autowired private PagoRepository                 pagoRepository;
    @Autowired private PedidoRepository               pedidoRepository;
    @Autowired private ProductoRepository             productoRepository;
    @Autowired private EmpresaRepository              empresaRepository;
    @Autowired private CategoriaRepository            categoriaRepository;
    @Autowired private BodegaRepository               bodegaRepository;
    @Autowired private PlatformTransactionManager     txManager;
    // G1: SINPE ya no entra por el checkout público; se usa TILOPAY y la pasarela responde "no aprobada"
    // para que el liberador pueda cancelar (sin esto el modo mock aprobaría el cobro).
    @MockitoBean private TilopayService               tilopayService;

    private Empresa empresa;
    private Bodega bodega;
    private Categoria categoria;
    private Producto producto;
    private int correo;

    @BeforeEach
    void setUp() {
        reservaAntiBot.limpiar();
        reservaAntiBot.setClock(Clock.system(Constants.ZONA_CR));

        when(tilopayService.loginSdk()).thenReturn("sdk-token-test");
        when(tilopayService.consultarTransaccion(anyString()))
            .thenReturn(new TilopayService.ConsultaResultado(false, "0", "No aprobada", null));

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

    @Test
    @DisplayName("bajo el umbral (2×5 = 10 unidades) → las reservas siguen aunque pase el tiempo")
    void bajoUmbral_seMantiene() throws Exception {
        reservar("203.0.113.10", 5);
        reservar("203.0.113.10", 5);
        assertThat(reservado()).isEqualTo(10);
        // El TTL real de la pasarela (Tilopay) es de 30 min; la intención sigue siendo que una reserva
        // no marcada no se acorte a los 15 min de la regla anti-bot.
        assertThat(pagosPendientes()).allSatisfy(p ->
            assertThat(p.getFechaExpiracion()).isAfter(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(29)));

        avanzar(20);
        cleanup.ejecutar();

        assertThat(reservado()).isEqualTo(10);
        assertThat(pagosPendientes()).hasSize(2);
    }

    @Test
    @DisplayName("sobre el umbral (3×4 = 12) → se marcan, no se liberan antes de la demora y luego vuelve el stock")
    void sobreUmbral_seLiberaTrasLaDemora() throws Exception {
        reservar("203.0.113.20", 4);
        reservar("203.0.113.20", 4);
        reservar("198.51.100.30", 3); // otra persona, no se toca
        reservar("203.0.113.20", 4);
        assertThat(reservado()).isEqualTo(15);

        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        assertThat(pagosPendientes().stream().filter(p -> p.getFechaExpiracion().isBefore(ahora.plusMinutes(16))))
            .hasSize(3);

        avanzar(10);
        cleanup.ejecutar();
        assertThat(reservado()).isEqualTo(15);

        avanzar(16);
        cleanup.ejecutar();
        assertThat(reservado()).isEqualTo(3);
        assertThat(pagosPendientes()).hasSize(1);
        assertThat(pedidoRepository.findAll().stream()
            .filter(p -> Constants.PEDIDO_CANCELADO.equals(p.getEstadoPedido()))).hasSize(3);
        Producto p = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(p.getStockActual()).isEqualTo(50);

        // una corrida más no vuelve a restar (25 min: la reserva ajena de Tilopay vence a los 30 min, no a las 24 h de SINPE)
        avanzar(25);
        cleanup.ejecutar();
        assertThat(reservado()).isEqualTo(3);

        // pasados los 30 min de TTL de la pasarela, la reserva ajena también vence y no queda nada pendiente
        avanzar(31);
        cleanup.ejecutar();
        assertThat(reservado()).isEqualTo(0);
        assertThat(pagosPendientes()).isEmpty();
        assertThat(pedidoRepository.findAll().stream()
            .filter(x -> Constants.PEDIDO_CANCELADO.equals(x.getEstadoPedido()))).hasSize(4);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockActual()).isEqualTo(50);
    }

    @Test
    @DisplayName("dos liberaciones concurrentes → el stock se devuelve una sola vez")
    void liberacionConcurrente_noDobleLiberacion() throws Exception {
        reservar("198.51.100.40", 3); // ajena, debe seguir reservada
        for (int i = 0; i < 3; i++) reservar("203.0.113.40", 4);
        assertThat(reservado()).isEqualTo(15);

        LocalDateTime despues = LocalDateTime.now(Constants.ZONA_CR).plusMinutes(16);
        TransactionTemplate tx = new TransactionTemplate(txManager);
        CountDownLatch largada = new CountDownLatch(1);
        Callable<Integer> tarea = () -> {
            largada.await();
            return tx.execute(s -> liberador.liberarVencidas(empresa.getId(), despues));
        };
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> a = pool.submit(tarea);
            Future<Integer> b = pool.submit(tarea);
            largada.countDown();
            int total = a.get() + b.get();
            assertThat(total).isEqualTo(3);
        } finally {
            pool.shutdownNow();
        }
        assertThat(reservado()).isEqualTo(3);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void reservar(String ip, int unidades) throws Exception {
        String body = """
            {"bodegaId":%d,"metodoEnvio":"%s","provider":"TILOPAY","guestEmail":"bot%d@test.cr",
             "guestPhone":"8888%04d","items":[{"productoId":%d,"cantidad":%d}]}
            """.formatted(bodega.getId(), Constants.ENVIO_RETIRO, ++correo, correo, producto.getId(), unidades);
        mockMvc.perform(post("/api/payments/guest-checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", ip)
                .content(body))
            .andExpect(status().isOk());
    }

    private void avanzar(int minutos) {
        reservaAntiBot.setClock(Clock.offset(Clock.system(Constants.ZONA_CR), Duration.ofMinutes(minutos)));
    }

    private int reservado() {
        return productoRepository.findById(producto.getId()).orElseThrow().getStockReservado();
    }

    private List<Pago> pagosPendientes() {
        return pagoRepository.findAll().stream()
            .filter(p -> Constants.PAGO_PENDIENTE.equals(p.getEstadoPago())).toList();
    }
}
