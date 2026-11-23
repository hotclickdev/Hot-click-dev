package com.hotclick.service.telegram;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoRetiroToken;
import com.hotclick.model.Producto;
import com.hotclick.model.TelegramCompradorSesion;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PedidoRetiroTokenRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TelegramCompradorSesionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PedidoService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.service.retiro.PedidoRetiroTokenService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Defensas en profundidad del comprador por Telegram que los flujos de integración no alcanzan a ejercitar. */
@DisplayName("Comprador Telegram: defensas en profundidad (mutaciones M4d, M7b, M9, M11, preparar)")
class TelegramCompradorEndurecimientoTest {

    // ── M9: el flag manda aunque ONVO sea sandbox ────────────────────────────

    @Test
    @DisplayName("flag apagado + sandbox: pagosPermitidos() es false e iniciarPago no crea pedido")
    void flagApagadoConSandboxNoPermitePagos() {
        var onvo = mock(OnvoService.class);
        when(onvo.esSandbox()).thenReturn(true);
        var pedidos = mock(PedidoRepository.class);
        var servicio = new TelegramCompradorPedidoService();
        ReflectionTestUtils.setField(servicio, "onvoService", onvo);
        ReflectionTestUtils.setField(servicio, "pedidoRepository", pedidos);
        ReflectionTestUtils.setField(servicio, "habilitado", false);
        assertThat(servicio.pagosPermitidos()).isFalse();

        var ctx = new TelegramCompradorCtx();
        ctx.carrito.put(1L, 1);
        var s = new TelegramCompradorSesion();
        s.setEmpresaId(10L);
        assertThat(servicio.iniciarPago(s, ctx).ok()).isFalse();
        verifyNoInteractions(pedidos);

        ReflectionTestUtils.setField(servicio, "habilitado", true);
        assertThat(servicio.pagosPermitidos()).isTrue();
    }

    // ── M4d: el checkout revalida contra la empresa de la SESIÓN ─────────────

    @Test
    @DisplayName("revisarCarrito rechaza un producto de otra tienda puesto a mano en el carrito")
    void revisarCarritoUsaLaEmpresaDeLaSesion() {
        long propia = 10L, ajena = 20L, productoAjeno = 99L;
        var productos = mock(ProductoRepository.class);
        var enAjena = new Producto();
        enAjena.setId(productoAjeno);
        enAjena.setEstado(Constants.ESTADO_ACTIVO); // válido y con stock: solo la empresa lo vuelve inaceptable
        enAjena.setVisibleCatalogo(true);
        enAjena.setStockActual(5);
        var empAjena = new Empresa();
        empAjena.setId(ajena);
        empAjena.setEstadoEmpresa("ACTIVO");
        empAjena.setVisibilidadPublica(true);
        enAjena.setEmpresa(empAjena);
        enAjena.setNombreProducto("Camisa Ajena");
        when(productos.findByIdAndEmpresaId(productoAjeno, ajena)).thenReturn(Optional.of(enAjena));
        when(productos.findByIdAndEmpresaId(productoAjeno, propia)).thenReturn(Optional.empty());
        when(productos.findEmpresaIdByProductoId(productoAjeno)).thenReturn(Optional.of(ajena));
        var servicio = new TelegramCompradorPedidoService();
        ReflectionTestUtils.setField(servicio, "productoRepository", productos);
        var empresas = mock(com.hotclick.repository.EmpresaRepository.class);
        for (long id : new long[] {propia, ajena}) {
            var apta = new Empresa();
            apta.setId(id);
            apta.setEstadoEmpresa("ACTIVO");
            apta.setVisibilidadPublica(true);
            when(empresas.findById(id)).thenReturn(Optional.of(apta));
        }
        ReflectionTestUtils.setField(servicio, "empresaRepository", empresas);

        var ctx = new TelegramCompradorCtx();
        ctx.carrito.put(productoAjeno, 1);
        // El producto es válido en su tienda: si se buscara por la empresa del producto, pasaría.
        assertThat(servicio.revisarCarrito(ajena, ctx)).isNull();
        // Contra la empresa de la SESIÓN debe rechazarse (M4d: findEmpresaIdByProductoId dejaría pasar).
        assertThat(servicio.revisarCarrito(propia, ctx)).isEqualTo("Alguno de los productos ya no está disponible. Revisá tu carrito.");
        org.mockito.Mockito.verify(productos, org.mockito.Mockito.atLeastOnce()).findByIdAndEmpresaId(productoAjeno, propia);
        org.mockito.Mockito.verify(productos, org.mockito.Mockito.never()).findEmpresaIdByProductoId(org.mockito.ArgumentMatchers.any());
    }

    // ── tiendaApta (vía revisarCarrito / iniciarPago), aislado del contexto de integración ──

    private static Empresa empresaConEstado(long id, boolean esPrueba, boolean visible, String estado) {
        var e = new Empresa();
        e.setId(id);
        e.setEstadoEmpresa(estado);
        e.setVisibilidadPublica(visible);
        e.setEsPrueba(esPrueba);
        return e;
    }

    private static TelegramCompradorPedidoService servicioConEmpresa(Optional<Empresa> empresa,
            ProductoRepository productos, PedidoRepository pedidos) {
        var empresas = mock(com.hotclick.repository.EmpresaRepository.class);
        when(empresas.findById(anyLong())).thenReturn(empresa);
        var onvo = mock(OnvoService.class);
        when(onvo.esSandbox()).thenReturn(true);
        var servicio = new TelegramCompradorPedidoService();
        ReflectionTestUtils.setField(servicio, "empresaRepository", empresas);
        ReflectionTestUtils.setField(servicio, "productoRepository", productos);
        ReflectionTestUtils.setField(servicio, "pedidoRepository", pedidos);
        ReflectionTestUtils.setField(servicio, "onvoService", onvo);
        ReflectionTestUtils.setField(servicio, "habilitado", true);
        return servicio;
    }

    @Test
    @DisplayName("tiendaApta: empresa inexistente, es_prueba, no pública o inactiva → mensaje genérico y sin pedido")
    void tiendaNoAptaDaMensajeGenericoYNoCreaPedido() {
        var casos = java.util.List.of(
            Optional.<Empresa>empty(),
            Optional.of(empresaConEstado(10L, true, true, "ACTIVO")),    // es_prueba
            Optional.of(empresaConEstado(10L, false, false, "ACTIVO")),  // no pública
            Optional.of(empresaConEstado(10L, false, true, "INACTIVO")));
        for (Optional<Empresa> caso : casos) {
            var productos = mock(ProductoRepository.class);
            var pedidos = mock(PedidoRepository.class);
            var servicio = servicioConEmpresa(caso, productos, pedidos);
            var ctx = new TelegramCompradorCtx();
            ctx.carrito.put(1L, 1);

            assertThat(servicio.revisarCarrito(10L, ctx)).isEqualTo(TelegramCompradorPedidoService.MSG_TIENDA_NO_DISPONIBLE);

            var s = new TelegramCompradorSesion();
            s.setEmpresaId(10L);
            var inicio = servicio.iniciarPago(s, ctx);
            assertThat(inicio.ok()).isFalse();
            verifyNoInteractions(productos, pedidos);
        }
        // empresaId nulo tampoco es apta (no consulta la base).
        var servicio = servicioConEmpresa(Optional.empty(), mock(ProductoRepository.class), mock(PedidoRepository.class));
        var ctx = new TelegramCompradorCtx();
        ctx.carrito.put(1L, 1);
        assertThat(servicio.revisarCarrito(null, ctx)).isEqualTo(TelegramCompradorPedidoService.MSG_TIENDA_NO_DISPONIBLE);
    }

    @Test
    @DisplayName("tiendaApta: una tienda pública y activa sí pasa a revisar los productos")
    void tiendaAptaContinuaConLosProductos() {
        var productos = mock(ProductoRepository.class);
        var servicio = servicioConEmpresa(Optional.of(empresaConEstado(10L, false, true, "ACTIVO")), productos, mock(PedidoRepository.class));
        var ctx = new TelegramCompradorCtx();
        ctx.carrito.put(1L, 1);
        servicio.revisarCarrito(10L, ctx);
        verify(productos).contarDeTiendasPausadas(any());
    }

    // ── M7b: el canje revalida la empresa del pedido ─────────────────────────

    @Test
    @DisplayName("canjear: si el pedido apunta a otra empresa que el token, lanza (revierte) y no entrega")
    void canjeConPedidoDeOtraEmpresaRevierte() {
        long empresaToken = 10L;
        String token = "A".repeat(43);
        var tokens = mock(PedidoRetiroTokenRepository.class);
        var pedidos = mock(PedidoRepository.class);
        var pedidoService = mock(PedidoService.class);
        var t = new PedidoRetiroToken();
        t.setToken(token);
        t.setPedidoId(5L);
        t.setEmpresaId(empresaToken);
        var otra = new Empresa();
        otra.setId(20L);
        var pedido = new Pedido();
        pedido.setId(5L);
        pedido.setEmpresa(otra);
        when(tokens.canjear(eq(token), eq(empresaToken), any(), any())).thenReturn(1);
        when(tokens.findByToken(token)).thenReturn(Optional.of(t));
        when(pedidos.findById(5L)).thenReturn(Optional.of(pedido));
        var servicio = new PedidoRetiroTokenService();
        ReflectionTestUtils.setField(servicio, "tokenRepository", tokens);
        ReflectionTestUtils.setField(servicio, "pedidoRepository", pedidos);
        ReflectionTestUtils.setField(servicio, "pedidoService", pedidoService);

        assertThatThrownBy(() -> servicio.canjear(token, empresaToken, 1L)).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(pedidoService);
    }

    // ── M11 y «pedido pagado»: preparar() de los avisos ──────────────────────

    private static final class Avisos {
        final TelegramCompradorAvisos servicio = new TelegramCompradorAvisos();
        final TelegramCompradorSesionRepository sesiones = mock(TelegramCompradorSesionRepository.class);
        final PedidoRepository pedidos = mock(PedidoRepository.class);
        final PedidoGrupoService grupos = mock(PedidoGrupoService.class);
        final PedidoRetiroTokenService retiro = mock(PedidoRetiroTokenService.class);
        final TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        final com.hotclick.repository.PedidoEntregaRepository entregas = mock(com.hotclick.repository.PedidoEntregaRepository.class);
        final TelegramNotificacionClienteService negocio = mock(TelegramNotificacionClienteService.class);

        Avisos(String estadoPedido, int filasCambiarPaso) {
            var s = mock(TelegramCompradorSesion.class);
            when(s.getId()).thenReturn(1L);
            when(s.getChatId()).thenReturn(77L);
            when(s.getPaso()).thenReturn(TelegramCompradorService.ESPERANDO_PAGO);
            var pedido = new Pedido();
            pedido.setId(5L);
            pedido.setEstadoPedido(estadoPedido);
            when(sesiones.findFirstByPedidoId(5L)).thenReturn(Optional.of(s));
            when(sesiones.cambiarPaso(eq(1L), eq(TelegramCompradorService.ESPERANDO_PAGO),
                eq(TelegramCompradorService.PAGADO), any(LocalDateTime.class))).thenReturn(filasCambiarPaso);
            when(pedidos.findById(5L)).thenReturn(Optional.of(pedido));
            ReflectionTestUtils.setField(servicio, "sesionRepository", sesiones);
            ReflectionTestUtils.setField(servicio, "pedidoRepository", pedidos);
            ReflectionTestUtils.setField(servicio, "pedidoGrupoService", grupos);
            ReflectionTestUtils.setField(servicio, "retiroService", retiro);
            ReflectionTestUtils.setField(servicio, "entregaRepository", entregas);
            ReflectionTestUtils.setField(servicio, "bot", bot);
            ReflectionTestUtils.setField(servicio, "notificacionNegocio", negocio);
            ReflectionTestUtils.setField(servicio, "transactionManager", mock(PlatformTransactionManager.class));
        }

        void verificarSinAvisos() {
            verifyNoInteractions(bot, negocio, retiro);
        }
    }

    @Test
    @DisplayName("alPagar: si la transición a PAGADO no la gana este llamado (0 filas), no hay QR ni avisos")
    void alPagarSinGanarLaTransicionNoAvisa() {
        var a = new Avisos(Constants.PEDIDO_PAGADO, 0);
        a.servicio.alPagar(5L);
        a.verificarSinAvisos();
        verify(a.sesiones).cambiarPaso(anyLong(), anyString(), anyString(), any());
        // M11 cambia «!= 1» por «< 0»: con 0 filas seguiría y llamaría a delGrupo / emitir QR.
        verifyNoInteractions(a.grupos);
        verify(a.retiro, never()).emitirGrupo(any());
    }

    @Test
    @DisplayName("alPagar: con el pedido aún PENDIENTE (sin pago confirmado) no emite QR, no avisa y no toca la sesión")
    void alPagarConPedidoNoPagadoNoAvisa() {
        var a = new Avisos(Constants.PEDIDO_PENDIENTE, 1);
        a.servicio.alPagar(5L);
        a.verificarSinAvisos();
        verify(a.sesiones, never()).cambiarPaso(anyLong(), anyString(), anyString(), any());
    }
}
