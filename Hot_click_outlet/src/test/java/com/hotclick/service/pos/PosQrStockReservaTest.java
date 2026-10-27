package com.hotclick.service.pos;

import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.PosQrSesion;
import com.hotclick.model.Producto;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ALTO 2: reserva de stock del QR del POS")
class PosQrStockReservaTest {

    @Mock ProductoRepository productoRepo;
    @Mock PosQrSesionRepository posQrRepo;
    @InjectMocks PosQrStockReserva reserva;

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 1, 1, 10, 0);

    private static Producto producto(int actual, int reservado) {
        Producto p = new Producto();
        p.setId(10L);
        p.setNombreProducto("Mouse");
        p.setStockActual(actual);
        p.setStockReservado(reservado);
        com.hotclick.model.Empresa e = new com.hotclick.model.Empresa();
        e.setId(7L); // mismo negocio que sesionEmpresa(): MEDIO-2 (#428) valida el dueño al reservar
        p.setEmpresa(e);
        return p;
    }

    private static List<Map<String, Object>> items(int cantidad) {
        return List.of(Map.of("productoId", 10, "cantidad", cantidad));
    }

    @Test
    @DisplayName("Generar el QR reserva las unidades y fija la expiración configurada")
    void reservaAlGenerar() {
        reserva.setReservaMinutosParaTest("15");
        reserva.setMaxPendientesParaTest("3");
        Producto p = producto(5, 1);
        when(productoRepo.findAllByIdsForUpdate(List.of(10L))).thenReturn(List.of(p));
        PosQrSesion s = sesionEmpresa();
        reserva.reservar(s, items(2), AHORA);
        assertThat(p.getStockReservado()).isEqualTo(3);
        assertThat(s.isStockReservado()).isTrue();
        assertThat(s.getReservaExpira()).isEqualTo(AHORA.plusMinutes(15));
    }

    @Test
    @DisplayName("Sin stock disponible (contando reservas ajenas) no se genera el QR")
    void sinStockNoReserva() {
        reserva.setReservaMinutosParaTest("15");
        reserva.setMaxPendientesParaTest("3");
        when(productoRepo.findAllByIdsForUpdate(List.of(10L))).thenReturn(List.of(producto(3, 2)));
        PosQrSesion s = sesionEmpresa();
        assertThatThrownBy(() -> reserva.reservar(s, items(2), AHORA)).isInstanceOf(StockInsuficienteException.class);
        assertThat(s.isStockReservado()).isFalse();
    }

    @Test
    @DisplayName("Expiración no configurada = fail-closed")
    void sinConfigFallaCerrado() {
        for (String v : new String[]{null, "", "abc", "0", "-5"}) {
            reserva.setReservaMinutosParaTest(v);
            assertThatThrownBy(() -> reserva.reservar(new PosQrSesion(), items(1), AHORA))
                .isInstanceOf(IllegalStateException.class).hasMessage(PosQrStockReserva.MSG_NO_CONFIGURADA);
        }
        verify(productoRepo, never()).findAllByIdsForUpdate(any());
    }

    @Test
    @DisplayName("Liberar devuelve las unidades una sola vez y nunca deja el contador negativo")
    void liberaUnaVez() {
        Producto p = producto(5, 1);
        PosQrSesion s = sesionEmpresa();
        s.setId(7L);
        s.setStockReservado(true);
        when(posQrRepo.soltarReserva(7L)).thenReturn(1, 0);
        when(productoRepo.findAllByIdsForUpdate(List.of(10L))).thenReturn(List.of(p));
        assertThat(reserva.liberar(s, items(2))).isTrue();
        assertThat(p.getStockReservado()).isZero();
        assertThat(s.isStockReservado()).isFalse();
        assertThat(reserva.liberar(s, items(2))).isFalse();
        assertThat(p.getStockReservado()).isZero();
    }

    @Test
    @DisplayName("El barrido libera las reservas vencidas o de sesiones cerradas sin venta")
    void barridoLibera() {
        PosQrSesion s = sesionEmpresa();
        s.setId(8L);
        s.setStockReservado(true);
        s.setItemsJson("[{\"productoId\":10,\"cantidad\":2}]");
        Producto p = producto(5, 2);
        when(posQrRepo.reservasALiberar(AHORA)).thenReturn(List.of(s));
        when(posQrRepo.soltarReserva(8L)).thenReturn(1);
        when(productoRepo.findAllByIdsForUpdate(List.of(10L))).thenReturn(List.of(p));
        assertThat(reserva.barrerVencidas(AHORA)).isEqualTo(1);
        assertThat(p.getStockReservado()).isZero();
    }

    private static PosQrSesion sesionEmpresa() {
        com.hotclick.model.Empresa e = new com.hotclick.model.Empresa();
        e.setId(7L);
        PosQrSesion s = new PosQrSesion();
        s.setEmpresa(e);
        return s;
    }

    @Test
    @DisplayName("MEDIO 3: con el tope de QR pendientes alcanzado no se reserva ni se bloquea stock")
    void topePendientes() {
        reserva.setReservaMinutosParaTest("15");
        reserva.setMaxPendientesParaTest("3");
        when(posQrRepo.contarPendientesConReserva(7L)).thenReturn(3L);
        PosQrSesion s = sesionEmpresa();
        assertThatThrownBy(() -> reserva.reservar(s, items(1), AHORA))
            .isInstanceOf(IllegalStateException.class).hasMessage(PosQrStockReserva.MSG_TOPE_PENDIENTES);
        assertThat(s.isStockReservado()).isFalse();
        verify(productoRepo, never()).findAllByIdsForUpdate(any());
    }

    @Test
    @DisplayName("MEDIO 3: tope no configurado o sin empresa = fail-closed")
    void topeFailClosed() {
        reserva.setReservaMinutosParaTest("15");
        for (String v : new String[]{null, "", "x", "0", "-1"}) {
            reserva.setMaxPendientesParaTest(v);
            assertThatThrownBy(() -> reserva.reservar(sesionEmpresa(), items(1), AHORA))
                .isInstanceOf(IllegalStateException.class).hasMessage(PosQrStockReserva.MSG_NO_CONFIGURADA);
        }
        reserva.setMaxPendientesParaTest("3");
        assertThatThrownBy(() -> reserva.reservar(new PosQrSesion(), items(1), AHORA))
            .isInstanceOf(IllegalStateException.class).hasMessage(PosQrStockReserva.MSG_TOPE_PENDIENTES);
        verify(productoRepo, never()).findAllByIdsForUpdate(any());
    }

    @Test
    @DisplayName("MEDIO-2 (#428): reservar un producto de otro negocio o inexistente da el mismo 404 de texto fijo, sin id")
    void reservarNoRevelaAjenoNiInexistente() {
        reserva.setReservaMinutosParaTest("15");
        reserva.setMaxPendientesParaTest("3");
        Producto ajeno = producto(5, 0);
        ajeno.getEmpresa().setId(99L);
        when(productoRepo.findAllByIdsForUpdate(List.of(10L))).thenReturn(List.of(ajeno));
        Throwable a = org.assertj.core.api.Assertions.catchThrowable(() -> reserva.reservar(sesionEmpresa(), items(1), AHORA));
        when(productoRepo.findAllByIdsForUpdate(List.of(10L))).thenReturn(List.of());
        Throwable n = org.assertj.core.api.Assertions.catchThrowable(() -> reserva.reservar(sesionEmpresa(), items(1), AHORA));
        assertThat(a).isInstanceOf(com.hotclick.exception.RecursoNoEncontradoException.class).hasMessage("Producto no encontrado");
        assertThat(n).isInstanceOf(a.getClass()).hasMessage(a.getMessage());
        assertThat(a.getMessage()).doesNotContain("10");
        assertThat(ajeno.getStockReservado()).isZero();
    }
}
