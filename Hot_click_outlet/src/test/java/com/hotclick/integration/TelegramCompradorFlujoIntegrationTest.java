package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.PaymentService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.retiro.PedidoRetiroTokenService;
import com.hotclick.service.telegram.TelegramCompradorAvisos;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pedido del COMPRADOR por Telegram, de punta a punta contra H2: webhook → catálogo → carrito → entrega → datos →
 * pago ONVO (modo simulado de test = sandbox) con reserva de stock → pago confirmado → QR de retiro → canje en caja.
 * Los envíos de Telegram se capturan sobre el mock del bot; no se toca ninguna API real.
 */
@TestPropertySource(properties = "telegram.comprador.habilitado=true")
class TelegramCompradorFlujoIntegrationTest extends BaseIntegrationTest {

    private static final String TOKEN_WEBHOOK = "test-webhook-secret";
    private static final long CHAT = 700_001L;

    @MockitoBean TelegramClienteBotService bot;
    @MockitoBean TelegramNotificacionClienteService notificacionNegocio;
    /** El límite de 3 msg/s por chat es de producción (y ya tiene sus tests); acá el test dispara updates sin pausa. */
    @MockitoBean com.hotclick.service.telegram.TelegramRateLimitService rateLimit;

    @Autowired EmpresaRepository empresaRepository;
    @Autowired ProductoRepository productoRepository;
    @Autowired CategoriaRepository categoriaRepository;
    @Autowired BodegaRepository bodegaRepository;
    @Autowired PedidoRepository pedidoRepository;
    @Autowired PagoRepository pagoRepository;
    @Autowired MovimientoStockRepository movimientoStockRepository;
    @Autowired TelegramCompradorSesionRepository sesionRepository;
    @Autowired PedidoRetiroTokenRepository tokenRepository;
    @Autowired PedidoEntregaRepository entregaRepository;
    @Autowired PaymentService paymentService;
    @Autowired PedidoRetiroTokenService retiroService;
    @Autowired TelegramCompradorAvisos avisos;
    @Autowired PlatformTransactionManager tm;
    @Autowired com.hotclick.service.payment.GuestCancelTokenService cancelTokens;
    @Autowired com.hotclick.service.telegram.TelegramCompradorPedidoService pedidoServicioComprador;

    private Empresa empresa;
    private Empresa ajena;
    private Producto producto;
    private Producto productoAjeno;
    /** update_id únicos entre tests: el bot deduplica por update_id en BD y el contexto de Spring se reutiliza. */
    private static final java.util.concurrent.atomic.AtomicLong UPDATES = new java.util.concurrent.atomic.AtomicLong(1_000);

    @BeforeEach
    void setUp() {
        when(bot.isConfigured()).thenReturn(true);
        when(bot.validarSecret(TOKEN_WEBHOOK)).thenReturn(true);
        when(rateLimit.permitidoPorRateLimit(anyLong())).thenReturn(true);
        empresa = crearEmpresa("Tienda Comprador", "tienda-comprador");
        ajena = crearEmpresa("Tienda Ajena", "tienda-ajena");
        Categoria cat = new Categoria();
        cat.setNombreCategoria("Cat TG");
        cat.setEstado(Constants.ESTADO_ACTIVO);
        cat.setAdminCliente(adminUser);
        cat = categoriaRepository.saveAndFlush(cat);
        producto = crearProducto(cat, empresa, "Camisa Roja", 5);
        productoAjeno = crearProducto(cat, ajena, "Camisa Ajena", 5);
    }

    @AfterEach
    void limpiar() {
        tokenRepository.deleteAll();
        entregaRepository.deleteAll();
        sesionRepository.deleteAll();
        pagoRepository.deleteAll();
        jdbcTemplate.execute("DELETE FROM hot_click_pedido_item_tb");
        pedidoRepository.deleteAll();
        movimientoStockRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── Entrada por /start t_{slug} ──────────────────────────────────────────

    @Test
    @DisplayName("/start t_{slug} abre el catálogo de ESA tienda y no filtra los productos de otra")
    void startAbreCatalogoDeEsaTienda() throws Exception {
        texto("/start t_tienda-comprador");
        assertThat(sesionRepository.findByChatId(CHAT)).get().satisfies(s -> {
            assertThat(s.getEmpresaId()).isEqualTo(empresa.getId());
            assertThat(s.getPaso()).isEqualTo("CATALOGO");
        });
        String todo = todosLosMensajes();
        assertThat(todo).contains("c:a:" + producto.getId()).doesNotContain("c:a:" + productoAjeno.getId());
    }

    @Test
    @DisplayName("slug inexistente o tienda no pública: mensaje genérico, sin sesión ni datos de otras tiendas")
    void slugInvalidoOTiendaNoPublica() throws Exception {
        texto("/start t_no-existe");
        ajena.setVisibilidadPublica(false);
        empresaRepository.saveAndFlush(ajena);
        texto("/start t_tienda-ajena");
        assertThat(sesionRepository.findByChatId(CHAT)).isEmpty();
        verify(bot, times(2)).enviarMensaje(eq(CHAT), contains("No encontré esa tienda"));
        assertThat(todosLosMensajes()).doesNotContain("Camisa");
    }

    @Test
    @DisplayName("IDOR: un botón con el producto de OTRA empresa no entra al carrito")
    void callbackDeOtraEmpresaSeRechaza() throws Exception {
        texto("/start t_tienda-comprador");
        callback("c:q:" + productoAjeno.getId() + ":1");
        callback("c:a:" + productoAjeno.getId());
        var ctx = sesionRepository.findByChatId(CHAT).orElseThrow().getContexto();
        assertThat(ctx == null || !ctx.contains(String.valueOf(productoAjeno.getId()))).isTrue();
    }

    // ── Retiro: pago, QR y canje ─────────────────────────────────────────────

    @Test
    @DisplayName("retiro: reserva al pagar, consume al confirmar sin doble descuento, QR sin PII, un solo uso")
    void retiroDePuntaAPunta() throws Exception {
        long pedidoId = armarPedidoRetiroHastaPago();

        // Reserva de stock al iniciar el pago: stockActual intacto, stockReservado = 2.
        Producto p = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(p.getStockActual()).isEqualTo(5);
        assertThat(p.getStockReservado()).isEqualTo(2);
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(pedido.getOrigen()).isEqualTo("ONLINE");
        assertThat(pedido.getMetodoEnvio()).isEqualTo(Constants.ENVIO_RETIRO);
        assertThat(pedido.getClienteNombre()).isEqualTo("María Mora");
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getContexto()).isNull(); // no quedan datos en el chat

        // Pago confirmado (mismo camino que el webhook de ONVO): consume la reserva UNA vez.
        confirmarPago(pedidoId);
        confirmarPago(pedidoId); // reentrega del webhook: idempotente
        p = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(p.getStockActual()).isEqualTo(3);
        assertThat(p.getStockReservado()).isEqualTo(0);

        // QR: token opaco con una URL /r/{token}; nada de nombre, teléfono, productos ni precios.
        PedidoRetiroToken t = tokenRepository.findByPedidoId(pedidoId).orElseThrow();
        assertThat(t.getEstado()).isEqualTo(PedidoRetiroToken.PENDIENTE);
        assertThat(t.getToken()).matches("[A-Za-z0-9_-]{43}");
        assertThat(t.getExpira()).isBetween(LocalDateTime.now(Constants.ZONA_CR).plusHours(3).plusMinutes(55),
            LocalDateTime.now(Constants.ZONA_CR).plusHours(4).plusMinutes(1));
        String url = retiroService.urlPublica(t.getToken());
        assertThat(url).endsWith("/r/" + t.getToken());
        assertThat(url).doesNotContain("Mar").doesNotContain("Camisa").doesNotContain("00000001").doesNotContain("comprador@");
        verify(bot, atLeastOnce()).enviarMensaje(eq(CHAT), contains("Pago recibido"), anyList());
        verify(notificacionNegocio).notificarVenta(eq(empresa.getId()), eq(pedido.getNumeroPedido()), anyInt(),
            contains("ONVO"), eq("María Mora"), eq("ONLINE"), contains("retiro"));

        // Otra empresa no puede redimir: respuesta inválida, sin ítems, y el QR sigue vigente.
        var ajeno = retiroService.canjear(t.getToken(), ajena.getId(), adminUser.getId());
        assertThat(ajeno.valido()).isFalse();
        assertThat(ajeno.items()).isEmpty();
        assertThat(tokenRepository.findByToken(t.getToken()).orElseThrow().getEstado()).isEqualTo(PedidoRetiroToken.PENDIENTE);

        // La caja de la misma empresa: primer canje entrega, el segundo no reentrega el carrito ni descuenta otra vez.
        var ok = retiroService.canjear(url, empresa.getId(), adminUser.getId()); // acepta la URL completa del QR
        assertThat(ok.valido()).isTrue();
        assertThat(ok.items()).extracting(l -> l.producto() + "x" + l.cantidad()).containsExactly("Camisa Rojax2");
        assertThat(pedidoRepository.findById(pedidoId).orElseThrow().getEstadoPedido()).isEqualTo(Constants.PEDIDO_ENTREGADO);
        var segundo = retiroService.canjear(t.getToken(), empresa.getId(), adminUser.getId());
        assertThat(segundo.valido()).isFalse();
        assertThat(segundo.items()).isEmpty();
        p = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(p.getStockActual()).isEqualTo(3);
    }

    @Test
    @DisplayName("canje concurrente: dos cajas escanean a la vez y solo una entrega el pedido")
    void canjeConcurrenteSoloUnoGana() throws Exception {
        long pedidoId = armarPedidoRetiroHastaPago();
        confirmarPago(pedidoId);
        String token = tokenRepository.findByPedidoId(pedidoId).orElseThrow().getToken();
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        var listos = new java.util.concurrent.CountDownLatch(1);
        List<java.util.concurrent.Future<Boolean>> res = new java.util.ArrayList<>();
        for (int i = 0; i < 2; i++) {
            res.add(pool.submit(() -> {
                listos.await();
                try {
                    return retiroService.canjear(token, empresa.getId(), adminUser.getId()).valido();
                } catch (RuntimeException e) {
                    return false; // el perdedor puede fallar por el lock; nunca entrega
                }
            }));
        }
        listos.countDown();
        int ganadores = 0;
        for (var f : res) if (f.get(30, java.util.concurrent.TimeUnit.SECONDS)) ganadores++;
        pool.shutdown();
        assertThat(ganadores).isEqualTo(1);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockActual()).isEqualTo(3);
    }

    @Test
    @DisplayName("QR vencido (más de 4 h) falla y el barrido lo marca VENCIDO")
    void tokenVencidoFalla() throws Exception {
        long pedidoId = armarPedidoRetiroHastaPago();
        confirmarPago(pedidoId);
        PedidoRetiroToken t = tokenRepository.findByPedidoId(pedidoId).orElseThrow();
        t.setExpira(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        tokenRepository.saveAndFlush(t);

        assertThat(retiroService.canjear(t.getToken(), empresa.getId(), adminUser.getId()).valido()).isFalse();
        assertThat(retiroService.infoPublica(t.getToken()).estado()).isEqualTo("VENCIDO");
        assertThat(retiroService.marcarVencidos(LocalDateTime.now(Constants.ZONA_CR))).isEqualTo(1);
        assertThat(tokenRepository.findByToken(t.getToken()).orElseThrow().getEstado()).isEqualTo(PedidoRetiroToken.VENCIDO);
        // El stock ya cobrado NO se libera por vencer el QR.
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockActual()).isEqualTo(3);
    }

    // ── Sin pago: se libera ──────────────────────────────────────────────────

    @Test
    @DisplayName("cancelar antes de pagar libera la reserva y deja el pedido CANCELADO")
    void cancelarAntesDePagarLiberaStock() throws Exception {
        long pedidoId = armarPedidoRetiroHastaPago();
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockReservado()).isEqualTo(2);
        callback("c:x");
        assertThat(pedidoRepository.findById(pedidoId).orElseThrow().getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        Producto p = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(p.getStockReservado()).isEqualTo(0);
        assertThat(p.getStockActual()).isEqualTo(5);
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getPaso()).isEqualTo("CATALOGO");
    }

    @Test
    @DisplayName("si el pedido venció sin pagarse, la reconciliación avisa al comprador y vuelve al catálogo; sin QR")
    void vencimientoSinPagoAvisaYNoEmiteQr() throws Exception {
        long pedidoId = armarPedidoRetiroHastaPago();
        paymentService.cancelarAnon(pedidoRepository.findById(pedidoId).orElseThrow().getNumeroPedido(), tokenDeCancelacion(pedidoId));
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockReservado()).isEqualTo(0);

        assertThat(avisos.reconciliar(LocalDateTime.now(Constants.ZONA_CR))).isEqualTo(1);
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getPaso()).isEqualTo("CATALOGO");
        verify(bot).enviarMensaje(eq(CHAT), contains("venció"), anyList());
        assertThat(tokenRepository.findByPedidoId(pedidoId)).isEmpty();
    }

    // ── Domicilio ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("domicilio con señas: guarda fuente TEXTO, cobra envío y avisa al negocio con la dirección")
    void domicilioConSenas() throws Exception {
        texto("/start t_tienda-comprador");
        callback("c:q:" + producto.getId() + ":1");
        callback("c:go");
        callback("c:e:D");
        datosComprador();
        callback("c:pv:3"); // Heredia
        texto("Belén");
        texto("Del Pali de la Rivera 200 metros norte casa blanca");
        callback("c:u:s");
        callback("c:pay");
        Pedido pedido = pedidoRepository.findAll().get(0);
        assertThat(pedido.getDireccionEntrega()).contains("Del Pali").contains("Belén").contains("Heredia");
        assertThat(pedido.getCostoEnvio()).isPositive();
        PedidoEntrega e = entregaRepository.findByPedidoId(pedido.getId()).orElseThrow();
        assertThat(e.getFuente()).isEqualTo("TEXTO");
        assertThat(e.getLat()).isNull();
        confirmarPago(pedido.getId());
        assertThat(tokenRepository.findByPedidoId(pedido.getId())).isEmpty(); // domicilio: sin QR de retiro
        verify(notificacionNegocio).notificarVenta(eq(empresa.getId()), anyString(), anyInt(), anyString(), anyString(),
            eq("ONLINE"), contains("Del Pali"));
    }

    @Test
    @DisplayName("la ubicación de Telegram solo se acepta en el paso de entrega")
    void ubicacionSoloEnElPasoDeEntrega() throws Exception {
        texto("/start t_tienda-comprador");
        ubicacion(9.93, -84.08); // aún en CATALOGO: se ignora
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getContexto() == null
            || !sesionRepository.findByChatId(CHAT).orElseThrow().getContexto().contains("9.93")).isTrue();

        callback("c:q:" + producto.getId() + ":1");
        callback("c:go");
        callback("c:e:D");
        datosComprador();
        callback("c:pv:3");
        texto("Belén");
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getPaso()).isEqualTo("UBICACION");
        ubicacion(9.93, -84.08);
        var s = sesionRepository.findByChatId(CHAT).orElseThrow();
        assertThat(s.getPaso()).isEqualTo("CONFIRMA_UBI");
        assertThat(s.getContexto()).contains("TELEGRAM");
        callback("c:u:s");
        callback("c:pay");
        Pedido pedido = pedidoRepository.findAll().get(0);
        PedidoEntrega e = entregaRepository.findByPedidoId(pedido.getId()).orElseThrow();
        assertThat(e.getFuente()).isEqualTo("TELEGRAM");
        assertThat(e.getLat()).isEqualTo(9.93);
        assertThat(e.getLng()).isEqualTo(-84.08);
    }

    @Test
    @DisplayName("enlace ajeno o javascript: en el paso de ubicación se rechaza; uno de Maps se acepta")
    void enlacesEnElPasoDeUbicacion() throws Exception {
        texto("/start t_tienda-comprador");
        callback("c:q:" + producto.getId() + ":1");
        callback("c:go");
        callback("c:e:D");
        datosComprador();
        callback("c:pv:3");
        texto("Belén");
        texto("javascript:alert(1)");
        texto("https://evil.example.com/x");
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getPaso()).isEqualTo("UBICACION");
        texto("https://www.google.com/maps/place/x/@9.9876543,-84.1823456,17z");
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getPaso()).isEqualTo("CONFIRMA_UBI");
    }

    // ── Fail-closed de entorno ───────────────────────────────────────────────

    @Test
    @DisplayName("sin sandbox no se crea ningún pedido ni reserva (fail-closed)")
    void sinSandboxNoCobra() throws Exception {
        var onvo = org.mockito.Mockito.mock(com.hotclick.service.OnvoService.class);
        when(onvo.esSandbox()).thenReturn(false);
        var servicio = new com.hotclick.service.telegram.TelegramCompradorPedidoService();
        org.springframework.test.util.ReflectionTestUtils.setField(servicio, "onvoService", onvo);
        org.springframework.test.util.ReflectionTestUtils.setField(servicio, "habilitado", true);
        assertThat(servicio.pagosPermitidos()).isFalse();
        var ctx = new com.hotclick.service.telegram.TelegramCompradorCtx();
        ctx.carrito.put(producto.getId(), 1);
        var s = new TelegramCompradorSesion();
        s.setEmpresaId(empresa.getId());
        var r = servicio.iniciarPago(s, ctx);
        assertThat(r.ok()).isFalse();
        assertThat(pedidoRepository.count()).isZero();
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockReservado()).isZero();
    }


    // ── Endurecimiento (revisión de seguridad PR #594) ───────────────────────

    @Test
    @DisplayName("B2: tienda de prueba (esPrueba) no abre sesión aunque sea pública y activa")
    void tiendaDePruebaNoAbreSesion() throws Exception {
        empresa.setEsPrueba(true);
        empresaRepository.saveAndFlush(empresa);
        texto("/start t_tienda-comprador");
        assertThat(sesionRepository.findByChatId(CHAT)).isEmpty();
        verify(bot).enviarMensaje(eq(CHAT), contains("No encontré esa tienda"));
        assertThat(todosLosMensajes()).doesNotContain("Camisa");
    }

    @Test
    @DisplayName("M10b: tienda que requiere membresía no abre sesión")
    void tiendaSinMembresiaNoAbreSesion() throws Exception {
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        empresaRepository.saveAndFlush(empresa);
        texto("/start t_tienda-comprador");
        assertThat(sesionRepository.findByChatId(CHAT)).isEmpty();
        verify(bot).enviarMensaje(eq(CHAT), contains("No encontré esa tienda"));
    }

    @Test
    @DisplayName("M13: con un pedido esperando pago, /start de otra tienda no pisa la sesión ni abre la otra tienda")
    void unSoloPedidoPendientePorChat() throws Exception {
        long pedidoId = armarPedidoRetiroHastaPago();
        texto("/start t_tienda-ajena");
        var s = sesionRepository.findByChatId(CHAT).orElseThrow();
        assertThat(s.getEmpresaId()).isEqualTo(empresa.getId());
        assertThat(s.getPaso()).isEqualTo("ESPERANDO_PAGO");
        assertThat(s.getPedidoId()).isEqualTo(pedidoId);
        verify(bot).enviarMensaje(eq(CHAT), contains("Ya tenés un pedido esperando pago"));
        assertThat(todosLosMensajes()).doesNotContain("Camisa Ajena");
    }

    @Test
    @DisplayName("alPagar sin pago confirmado (pedido PENDIENTE): ni QR ni aviso, la sesión sigue esperando")
    void alPagarSinPagoConfirmadoNoAvisa() throws Exception {
        long pedidoId = armarPedidoRetiroHastaPago();
        avisos.alPagar(pedidoId);
        assertThat(tokenRepository.findByPedidoId(pedidoId)).isEmpty();
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getPaso()).isEqualTo("ESPERANDO_PAGO");
        verify(bot, never()).enviarMensaje(eq(CHAT), contains("Pago recibido"), anyList());
        verifyNoInteractions(notificacionNegocio);
    }

    @Test
    @DisplayName("B1: con el flag apagado una sesión abierta no junta datos, carrito ni ubicación; /cancelar sigue")
    void flagApagadoCortaSesionesAbiertas() throws Exception {
        // Sesión abierta con el flag encendido: carrito + datos hasta el paso TELEFONO.
        texto("/start t_tienda-comprador");
        callback("c:q:" + producto.getId() + ":1");
        callback("c:go");
        callback("c:e:R");
        texto("María Mora");
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getPaso()).isEqualTo("TELEFONO");
        String ctxAntes = sesionRepository.findByChatId(CHAT).orElseThrow().getContexto();

        Object bean = org.springframework.test.util.AopTestUtils.getUltimateTargetObject(pedidoServicioComprador);
        org.springframework.test.util.ReflectionTestUtils.setField(bean, "habilitado", false);
        try {
            texto("0000 0001");
            texto("comprador@test.cr");
            callback("c:q:" + producto.getId() + ":1");
            callback("c:pay");
            ubicacion(9.93, -84.08);
            var s = sesionRepository.findByChatId(CHAT).orElseThrow();
            assertThat(s.getPaso()).isEqualTo("TELEFONO");
            assertThat(s.getContexto()).isEqualTo(ctxAntes);
            assertThat(s.getContexto()).doesNotContain("0000").doesNotContain("comprador@").doesNotContain("9.93");
            verify(bot, atLeast(4)).enviarMensaje(eq(CHAT), contains("todavía no están disponibles"));

            texto("/cancelar"); // cancelar no junta datos: sigue permitido
            var cerrada = sesionRepository.findByChatId(CHAT).orElseThrow();
            assertThat(cerrada.getPaso()).isEqualTo("CATALOGO");
            assertThat(cerrada.getContexto()).isNull();
        } finally {
            org.springframework.test.util.ReflectionTestUtils.setField(bean, "habilitado", true);
        }
    }

    @Test
    @DisplayName("B1: con el flag apagado la ubicación de Telegram en el paso UBICACION no se guarda ni avanza")
    void flagApagadoIgnoraUbicacion() throws Exception {
        texto("/start t_tienda-comprador");
        callback("c:q:" + producto.getId() + ":1");
        callback("c:go");
        callback("c:e:D");
        datosComprador();
        callback("c:pv:3");
        texto("Belén");
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getPaso()).isEqualTo("UBICACION");
        Object bean = org.springframework.test.util.AopTestUtils.getUltimateTargetObject(pedidoServicioComprador);
        org.springframework.test.util.ReflectionTestUtils.setField(bean, "habilitado", false);
        try {
            ubicacion(9.93, -84.08);
            var s = sesionRepository.findByChatId(CHAT).orElseThrow();
            assertThat(s.getPaso()).isEqualTo("UBICACION");
            assertThat(s.getContexto()).doesNotContain("9.93").doesNotContain("TELEGRAM");
        } finally {
            org.springframework.test.util.ReflectionTestUtils.setField(bean, "habilitado", true);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private long armarPedidoRetiroHastaPago() throws Exception {
        texto("/start t_tienda-comprador");
        callback("c:q:" + producto.getId() + ":2");
        callback("c:go");
        callback("c:e:R");
        datosComprador();
        assertThat(sesionRepository.findByChatId(CHAT).orElseThrow().getPaso()).isEqualTo("RESUMEN");
        callback("c:pay");
        TelegramCompradorSesion s = sesionRepository.findByChatId(CHAT).orElseThrow();
        assertThat(s.getPaso()).isEqualTo("ESPERANDO_PAGO");
        return s.getPedidoId();
    }

    private void datosComprador() throws Exception {
        texto("María Mora");
        texto("0000 0001");
        texto("comprador@test.cr");
    }

    private void confirmarPago(long pedidoId) {
        new TransactionTemplate(tm).executeWithoutResult(st -> {
            Pago pago = pagoRepository.findTopByPedidoId(pedidoId).orElseThrow();
            pago.setEstadoPago(Constants.PAGO_CAPTURADO); // como lo deja OnvoCapturaService antes de confirmar
            pagoRepository.save(pago);
            paymentService.confirmarPedido(pago);
        });
    }

    private String tokenDeCancelacion(long pedidoId) {
        return cancelTokens.emitir(
            pedidoRepository.findById(pedidoId).orElseThrow().getNumeroPedido());
    }

    @SuppressWarnings("unchecked")
    private String todosLosMensajes() {
        ArgumentCaptor<String> txt = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<List<List<Map<String, Object>>>> kb = ArgumentCaptor.forClass(List.class);
        verify(bot, atLeast(0)).enviarMensaje(eq(CHAT), txt.capture(), kb.capture());
        verify(bot, atLeast(0)).enviarMensaje(eq(CHAT), txt.capture());
        return String.join("\n", txt.getAllValues()) + "\n" + kb.getAllValues();
    }

    private static long nuevoUpdate() { return UPDATES.incrementAndGet(); }

    private void texto(String t) throws Exception {
        enviar("{\"update_id\":%d,\"message\":{\"message_id\":%d,\"chat\":{\"id\":%d,\"type\":\"private\"},\"from\":{\"username\":\"comprador\"},\"text\":\"%s\"}}"
            .formatted(nuevoUpdate(), nuevoUpdate(), CHAT, t));
    }

    private void callback(String data) throws Exception {
        enviar("{\"update_id\":%d,\"callback_query\":{\"id\":\"cb-%d\",\"data\":\"%s\",\"message\":{\"message_id\":1,\"chat\":{\"id\":%d,\"type\":\"private\"}}}}"
            .formatted(nuevoUpdate(), nuevoUpdate(), data, CHAT));
    }

    private void ubicacion(double lat, double lng) throws Exception {
        enviar("{\"update_id\":%d,\"message\":{\"message_id\":%d,\"chat\":{\"id\":%d,\"type\":\"private\"},\"location\":{\"latitude\":%s,\"longitude\":%s}}}"
            .formatted(nuevoUpdate(), nuevoUpdate(), CHAT, lat, lng));
    }

    private void enviar(String body) throws Exception {
        mockMvc.perform(post("/api/webhooks/telegram")
                .header("X-Telegram-Bot-Api-Secret-Token", TOKEN_WEBHOOK)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());
    }

    private Empresa crearEmpresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega " + slug);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("00000006");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(e);
        b.setPermiteRetiroCliente(true);
        b.setEstado(Constants.ESTADO_ACTIVO);
        bodegaRepository.saveAndFlush(b);
        return e;
    }

    private Producto crearProducto(Categoria cat, Empresa e, String nombre, int stock) {
        Bodega b = bodegaRepository.findByEmpresaIdAndEstado(e.getId(), Constants.ESTADO_ACTIVO).get(0);
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku("SKU-" + nombre.replaceAll("\\s", "-").toUpperCase());
        p.setPrecioVenta(10_000);
        p.setPrecioCompra(6_000);
        p.setStockActual(stock);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setCategoria(cat);
        p.setEmpresa(e);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }
}
