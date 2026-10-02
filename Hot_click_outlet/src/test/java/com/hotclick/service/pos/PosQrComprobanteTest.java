package com.hotclick.service.pos;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PosQrSesionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QR de caja: info pública y comprobante")
class PosQrComprobanteTest {
    @Mock PosQrSesionRepository posQrRepo;
    @Mock BodegaRepository bodegaRepo;
    @InjectMocks PosQrSessionService service;

    @Test
    @DisplayName("Info pública manda métodos habilitados, número de cobro y caja")
    void infoPublica() {
        PosQrSesion s = PosQrMetodosTest.sesion("TARJETA", "TARJETA,SINPE");
        s.setId(77L);
        s.setBodegaId(5L);
        when(posQrRepo.findByToken("tok")).thenReturn(Optional.of(s));
        when(bodegaRepo.findById(5L)).thenReturn(Optional.of(PosQrMetodosTest.bodega(s.getEmpresa(), "Caja principal")));

        Map<String, Object> info = service.getInfoPublica("tok");

        assertThat(info).containsEntry("metodosHabilitados", List.of("TARJETA", "SINPE"));
        assertThat(info).containsEntry("numeroCobro", "P-77");
        assertThat(info).containsEntry("caja", "Caja principal");
    }

    @Test
    @DisplayName("Bodega de otro negocio no se muestra como caja")
    void cajaDeOtroNegocio() {
        PosQrSesion s = PosQrMetodosTest.sesion("SINPE", null);
        s.setBodegaId(5L);
        Empresa otra = new Empresa();
        otra.setId(99L);
        when(bodegaRepo.findById(5L)).thenReturn(Optional.of(PosQrMetodosTest.bodega(otra, "Ajena")));
        assertThat(service.nombreCaja(s)).isNull();
    }

    @Test
    @DisplayName("Comprobante solo con el cobro pagado")
    void comprobante() {
        PosQrSesion s = PosQrMetodosTest.sesion("SINPE", null);
        s.setId(12L);
        when(posQrRepo.findByToken("tok")).thenReturn(Optional.of(s));
        assertThatThrownBy(() -> service.getComprobante("tok")).isInstanceOf(IllegalStateException.class);

        s.setEstado("PAGADO");
        LocalDateTime pago = LocalDateTime.of(2026, 10, 2, 15, 30);
        s.setFechaPago(pago);
        Map<String, Object> c = service.getComprobante("tok");
        assertThat(c).containsEntry("numeroCobro", "P-12")
            .containsEntry("metodoPago", "SINPE")
            .containsEntry("total", 5000)
            .containsEntry("fechaPago", pago.toString())
            .containsEntry("referencia", "TOKQRCAJ");
        assertThat((List<?>) c.get("items")).hasSize(1);
    }
}
