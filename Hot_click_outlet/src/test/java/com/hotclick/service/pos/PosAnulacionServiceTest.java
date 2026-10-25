package com.hotclick.service.pos;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.StockService;
import com.hotclick.service.TurnoCajaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** A3: matriz de permisos de anulación/devolución POS por rol y estado del turno. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PosAnulacionServiceTest {

    @Mock CompanyScope companyScope;
    @Mock PropietarioGuard propietarioGuard;
    @Mock MiembroEmpresaRepository miembros;
    @Mock PedidoRepository pedidoRepository;
    @Mock PosVentaTurnoRepository ventaTurnoRepository;
    @Mock PosQrSesionRepository qrSesionRepository;
    @Mock TurnoCajaRepository turnoCajaRepository;
    @Mock TurnoCajaService turnoCajaService;
    @Mock StockService stockService;
    @Mock PosAnulacionRepository anulacionRepository;

    PosAnulacionService service;
    Empresa empresa;
    Usuario actor;
    Pedido venta;
    TurnoCaja turno;

    static final Long EMP = 1L;
    static final Long PEDIDO = 50L;

    @BeforeEach
    void setUp() {
        service = new PosAnulacionService(companyScope, propietarioGuard, miembros, pedidoRepository,
            ventaTurnoRepository, qrSesionRepository, turnoCajaRepository, turnoCajaService, stockService,
            anulacionRepository);
        empresa = new Empresa();
        empresa.setId(EMP);
        actor = new Usuario();
        actor.setId(7L);
        actor.setCorreo("caja@test.cr");
        when(companyScope.getCurrentUser()).thenReturn(actor);

        Producto prod = new Producto();
        prod.setId(10L);
        PedidoItem item = new PedidoItem();
        item.setProducto(prod);
        item.setCantidad(2);
        venta = new Pedido();
        venta.setId(PEDIDO);
        venta.setEmpresa(empresa);
        venta.setOrigen(OrigenPedido.POS.codigo());
        venta.setEstadoPedido("ENTREGADO");
        venta.setMetodoPago("EFECTIVO");
        venta.setTotalPedido(3000);
        venta.setNumeroPedido("POS-1");
        venta.setItems(List.of(item));
        when(pedidoRepository.findById(PEDIDO)).thenReturn(Optional.of(venta));

        turno = new TurnoCaja();
        turno.setId(77L);
        turno.setEmpresa(empresa);
        turno.setUsuario(actor);
        turno.setEstado("ABIERTO");
        when(ventaTurnoRepository.findByPedidoId(PEDIDO)).thenReturn(Optional.of(new PosVentaTurno(PEDIDO, 77L)));
        when(turnoCajaRepository.findById(77L)).thenReturn(Optional.of(turno));
        when(anulacionRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private void comoRolDeEquipo(String rol) {
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(7L, EMP, 1))
            .thenReturn(Optional.of(new MiembroEmpresa(actor, empresa, rol)));
    }

    private void comoPropietario() {
        when(propietarioGuard.esPropietario(actor, EMP)).thenReturn(true);
    }

    @Test
    @DisplayName("CAJERO anula venta de su turno ABIERTO → permitido, revierte turno y stock")
    void cajero_turnoAbierto_permitido() {
        comoRolDeEquipo("CAJERO");
        PosAnulacion r = service.anular(PEDIDO, EMP, "  cliente se arrepintió ");
        assertThat(r.getTipo()).isEqualTo("ANULACION");
        assertThat(venta.getEstadoPedido()).isEqualTo("ANULADO");
        verify(turnoCajaService).revertirTotales(77L, "EFECTIVO", 3000);
        verify(stockService).ajustarEntrada(eq(10L), eq(2), contains("POS-1"), eq("caja@test.cr"));
    }

    @Test
    @DisplayName("Registro de auditoría con usuario, motivo, hora, rol y turno")
    void auditoria_registrada() {
        comoRolDeEquipo("CAJERO");
        LocalDateTime antes = LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR).minusSeconds(1);
        service.anular(PEDIDO, EMP, "error de digitación");
        ArgumentCaptor<PosAnulacion> cap = ArgumentCaptor.forClass(PosAnulacion.class);
        verify(anulacionRepository).save(cap.capture());
        PosAnulacion a = cap.getValue();
        assertThat(a.getUsuarioId()).isEqualTo(7L);
        assertThat(a.getMotivo()).isEqualTo("error de digitación");
        assertThat(a.getFecha()).isAfter(antes);
        assertThat(a.getRolActor()).isEqualTo("CAJERO");
        assertThat(a.getTurnoId()).isEqualTo(77L);
        assertThat(a.getEstadoTurno()).isEqualTo("ABIERTO");
        assertThat(a.getPedidoId()).isEqualTo(PEDIDO);
        assertThat(a.getEmpresaId()).isEqualTo(EMP);
        assertThat(a.getMonto()).isEqualTo(3000);
    }

    @Test
    @DisplayName("CAJERO anula venta de turno CERRADO → 403")
    void cajero_turnoCerrado_denegado() {
        comoRolDeEquipo("CAJERO");
        turno.setEstado("CERRADO");
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, "x")).isInstanceOf(SecurityException.class);
        verifySinEfectos();
    }

    @Test
    @DisplayName("CAJERO anula venta del turno abierto de OTRO cajero → 403")
    void cajero_turnoAjeno_denegado() {
        comoRolDeEquipo("CAJERO");
        Usuario otro = new Usuario();
        otro.setId(8L);
        turno.setUsuario(otro);
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, "x")).isInstanceOf(SecurityException.class);
        verifySinEfectos();
    }

    @Test
    @DisplayName("CAJERO con venta sin turno conocido (venta vieja) → 403 (fail-closed)")
    void cajero_sinTurno_denegado() {
        comoRolDeEquipo("CAJERO");
        when(ventaTurnoRepository.findByPedidoId(PEDIDO)).thenReturn(Optional.empty());
        when(qrSesionRepository.findByPedidoId(PEDIDO)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, "x")).isInstanceOf(SecurityException.class);
        verifySinEfectos();
    }

    @Test
    @DisplayName("CAJERO devuelve venta (aunque sea de su turno abierto) → 403, requiere dueño/ADMIN")
    void cajero_devolucion_denegada() {
        comoRolDeEquipo("CAJERO");
        assertThatThrownBy(() -> service.devolver(PEDIDO, EMP, "x"))
            .isInstanceOf(SecurityException.class).hasMessageContaining("dueño");
        verifySinEfectos();
    }

    @ParameterizedTest
    @ValueSource(strings = {"LECTOR", "EDITOR", "ADMIN", "MIEMBRO", "RARO"})
    @DisplayName("LECTOR, EDITOR y roles no CAJERO no anulan ni devuelven → 403")
    void otrosRoles_denegados(String rol) {
        comoRolDeEquipo(rol);
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, "x")).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> service.devolver(PEDIDO, EMP, "x")).isInstanceOf(SecurityException.class);
        verifySinEfectos();
    }

    @Test
    @DisplayName("Sin fila de miembro (rol desconocido) → 403")
    void sinMembresia_denegado() {
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(anyLong(), anyLong(), anyInt())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, "x")).isInstanceOf(SecurityException.class);
        verifySinEfectos();
    }

    @Test
    @DisplayName("CAJERO en sesión de soporte (impersonación) → 403")
    void impersonacion_denegada() {
        comoRolDeEquipo("CAJERO");
        when(companyScope.isImpersonating()).thenReturn(true);
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, "x")).isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Dueño anula venta de turno CERRADO y devuelve → permitido; turno cerrado no se toca")
    void propietario_permitido() {
        comoPropietario();
        turno.setEstado("CERRADO");
        PosAnulacion a = service.anular(PEDIDO, EMP, "cuadre");
        assertThat(a.getRolActor()).isEqualTo("PROPIETARIO");
        assertThat(a.getEstadoTurno()).isEqualTo("CERRADO");
        verify(turnoCajaService, never()).revertirTotales(any(), any(), any());

        venta.setEstadoPedido("ENTREGADO");
        PosAnulacion d = service.devolver(PEDIDO, EMP, "producto defectuoso");
        assertThat(d.getTipo()).isEqualTo("DEVOLUCION");
        assertThat(venta.getEstadoPedido()).isEqualTo("DEVUELTO");
    }

    @Test
    @DisplayName("ADMIN de plataforma devuelve y anula turno cerrado → permitido")
    void adminPlataforma_permitido() {
        when(companyScope.isAdminIT()).thenReturn(true);
        turno.setEstado("CERRADO");
        PosAnulacion d = service.devolver(PEDIDO, EMP, "reclamo");
        assertThat(d.getRolActor()).isEqualTo("ADMIN_PLATAFORMA");
        venta.setEstadoPedido("ENTREGADO");
        assertThat(service.anular(PEDIDO, EMP, "reclamo").getTipo()).isEqualTo("ANULACION");
    }

    @Test
    @DisplayName("Dueño en sesión de soporte no cuenta como dueño → 403")
    void propietarioImpersonado_denegado() {
        comoPropietario();
        when(companyScope.isImpersonating()).thenReturn(true);
        assertThatThrownBy(() -> service.devolver(PEDIDO, EMP, "x")).isInstanceOf(SecurityException.class);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("Motivo faltante o vacío → rechazado (400)")
    void motivoFaltante_rechazado(String motivo) {
        comoPropietario();
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, motivo)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.devolver(PEDIDO, EMP, motivo)).isInstanceOf(IllegalArgumentException.class);
        verifySinEfectos();
    }

    @Test
    @DisplayName("Motivo de más de 500 caracteres → rechazado")
    void motivoLargo_rechazado() {
        comoPropietario();
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, "a".repeat(501))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Sin negocio en la sesión ni en la venta → 403 (fail-closed)")
    void sinNegocio_denegado() {
        comoPropietario();
        venta.setEmpresa(null);
        assertThatThrownBy(() -> service.anular(PEDIDO, null, "x")).isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Venta de otro negocio → 404 sin efectos")
    void otroNegocio_noEncontrada() {
        comoPropietario();
        when(propietarioGuard.esPropietario(actor, 2L)).thenReturn(true);
        assertThatThrownBy(() -> service.anular(PEDIDO, 2L, "x"))
            .isInstanceOf(com.hotclick.exception.RecursoNoEncontradoException.class);
        verifySinEfectos();
    }

    @Test
    @DisplayName("Sin usuario en sesión → 403")
    void sinUsuario_denegado() {
        when(companyScope.getCurrentUser()).thenReturn(null);
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, "x")).isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Venta ya anulada → no se anula dos veces")
    void yaAnulada_rechazada() {
        comoPropietario();
        venta.setEstadoPedido("ANULADO");
        assertThatThrownBy(() -> service.devolver(PEDIDO, EMP, "x")).isInstanceOf(IllegalStateException.class);
        verify(anulacionRepository, never()).save(any());
        verify(stockService, never()).ajustarEntrada(any(), anyInt(), any(), any());
        assertThat(venta.getEstadoPedido()).isEqualTo("ANULADO");
    }

    @Test
    @DisplayName("Pedido que no es de caja (tienda online) → rechazado")
    void noPos_rechazado() {
        comoPropietario();
        venta.setOrigen("WEB");
        assertThatThrownBy(() -> service.anular(PEDIDO, EMP, "x")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Venta QR: el turno se toma de la sesión QR")
    void ventaQr_turnoDeSesion() {
        comoRolDeEquipo("CAJERO");
        when(ventaTurnoRepository.findByPedidoId(PEDIDO)).thenReturn(Optional.empty());
        PosQrSesion s = new PosQrSesion();
        s.setTurno(turno);
        when(qrSesionRepository.findByPedidoId(PEDIDO)).thenReturn(Optional.of(s));
        assertThat(service.anular(PEDIDO, EMP, "x").getTurnoId()).isEqualTo(77L);
    }

    private void verifySinEfectos() {
        verify(anulacionRepository, never()).save(any());
        verify(stockService, never()).ajustarEntrada(any(), anyInt(), any(), any());
        verify(turnoCajaService, never()).revertirTotales(any(), any(), any());
        assertThat(venta.getEstadoPedido()).isNotIn("ANULADO", "DEVUELTO");
    }
}
