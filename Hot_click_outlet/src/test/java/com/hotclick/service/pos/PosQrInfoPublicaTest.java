package com.hotclick.service.pos;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Info pública del QR POS")
class PosQrInfoPublicaTest {

    @Mock PosQrSesionRepository posQrRepo;
    @InjectMocks PosQrSessionService service;

    @Test
    @DisplayName("Sesión QR sin empresa no se muestra al público")
    void sesionSinEmpresaNoSeMuestra() {
        String token = "token-prueba-qr-pos-01";
        PosQrSesion sesion = sesionPendiente(token);
        sesion.setEmpresa(null);
        when(posQrRepo.findByToken(token)).thenReturn(Optional.of(sesion));

        assertThatThrownBy(() -> service.getInfoPublica(token))
            .isInstanceOf(RecursoNoEncontradoException.class)
            .hasMessageContaining("Empresa de la sesión QR");
    }

    @Test
    @DisplayName("Con empresa, arma el nombre comercial para el cliente")
    void conEmpresaMuestraNombreComercial() {
        String token = "token-prueba-qr-pos-02";
        Empresa empresa = new Empresa();
        empresa.setNombreComercial("Café Luna");
        PosQrSesion sesion = sesionPendiente(token);
        sesion.setEmpresa(empresa);
        when(posQrRepo.findByToken(token)).thenReturn(Optional.of(sesion));

        var info = service.getInfoPublica(token);

        assertThat(info.get("empresaNombre")).isEqualTo("Café Luna");
    }

    private static PosQrSesion sesionPendiente(String token) {
        PosQrSesion sesion = new PosQrSesion();
        sesion.setToken(token);
        sesion.setEstado("PENDIENTE");
        sesion.setTotal(1000);
        sesion.setMetodoPago("SINPE");
        sesion.setItemsJson("[]");
        sesion.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        return sesion;
    }
}
