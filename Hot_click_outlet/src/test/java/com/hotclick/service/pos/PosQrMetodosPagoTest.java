package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QR de caja: pago con pasarela sin pasarela conectada")
class PosQrMetodosPagoTest {
    @Mock PosQrSesionRepository posQrRepo;
    @Mock PosQrSessionService sessionService;
    @Mock PosQrVentaCompletionService completionService;
    @InjectMocks PosQrVentaService service;

    @Test
    @DisplayName("Sin pasarela: tarjeta o SINPE por pasarela se rechaza con mensaje claro")
    void sinPasarela() {
        PosQrSesion s = PosQrMetodosTest.sesion("SINPE", "SINPE");
        when(sessionService.findSesionActiva("tok")).thenReturn(s);
        assertThatThrownBy(() -> service.iniciarPagoPasarela("tok", "SINPE"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage(PosQrVentaService.MENSAJE_SIN_PASARELA);
    }

    @Test
    @DisplayName("El método elegido sigue respetando los habilitados por la caja")
    void elegirMetodoRespetaHabilitados() {
        PosQrSesion mixto = PosQrMetodosTest.sesion("TARJETA", "TARJETA,SINPE");
        PosQrVentaService.elegirMetodo(mixto, "SINPE");
        assertThat(mixto.getMetodoPago()).isEqualTo("SINPE");
        PosQrSesion soloTarjeta = PosQrMetodosTest.sesion("TARJETA", "TARJETA");
        PosQrVentaService.elegirMetodo(soloTarjeta, "SINPE");
        assertThat(soloTarjeta.getMetodoPago()).isEqualTo("TARJETA");
    }
}
