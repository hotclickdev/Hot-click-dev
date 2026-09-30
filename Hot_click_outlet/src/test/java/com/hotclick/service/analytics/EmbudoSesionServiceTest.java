package com.hotclick.service.analytics;

import com.hotclick.dto.EmbudoRegistroRequest;
import com.hotclick.model.EmbudoSesion;
import com.hotclick.repository.CarritoAbandonadoRepository;
import com.hotclick.repository.EmbudoSesionRepository;
import com.hotclick.repository.PedidoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmbudoSesionService — el paso no retrocede")
class EmbudoSesionServiceTest {

    private static final String CLAVE = "11111111-1111-4111-8111-111111111111";

    @Mock EmbudoSesionRepository embudoRepo;
    @Mock PedidoRepository pedidoRepo;
    @Mock CarritoAbandonadoRepository carritoRepo;

    private EmbudoSesionService service;

    @BeforeEach
    void setUp() {
        service = new EmbudoSesionService(embudoRepo, pedidoRepo, carritoRepo);
    }

    @Test
    @DisplayName("crea la sesión en el paso que llega")
    void creaEnElPaso() {
        when(embudoRepo.findBySessionKey(CLAVE)).thenReturn(Optional.empty());

        service.registrar(new EmbudoRegistroRequest(CLAVE, "PRODUCTO", null, null));

        ArgumentCaptor<EmbudoSesion> captor = ArgumentCaptor.forClass(EmbudoSesion.class);
        verify(embudoRepo).save(captor.capture());
        assertThat(captor.getValue().getPaso()).isEqualTo("PRODUCTO");
        assertThat(captor.getValue().getSessionKey()).isEqualTo(CLAVE);
    }

    @Test
    @DisplayName("un paso anterior no pisa el avance ni el motivo")
    void noRetrocede() {
        EmbudoSesion sesion = sesion("CARRITO", null);
        when(embudoRepo.findBySessionKey(CLAVE)).thenReturn(Optional.of(sesion));

        service.registrar(new EmbudoRegistroRequest(CLAVE, "VISITA", "BUSQUEDA_VACIA", null));

        verify(embudoRepo, never()).save(org.mockito.ArgumentMatchers.any());
        assertThat(sesion.getPaso()).isEqualTo("CARRITO");
        assertThat(sesion.getMotivo()).isNull();
    }

    @Test
    @DisplayName("al avanzar se limpia el motivo del paso anterior")
    void avanzarLimpiaMotivo() {
        EmbudoSesion sesion = sesion("CHECKOUT", "ERROR_DATOS");
        when(embudoRepo.findBySessionKey(CLAVE)).thenReturn(Optional.of(sesion));

        service.registrar(new EmbudoRegistroRequest(CLAVE, "PAGO_INTENTO", null, 12000));

        assertThat(sesion.getPaso()).isEqualTo("PAGO_INTENTO");
        assertThat(sesion.getMotivo()).isNull();
        assertThat(sesion.getMontoCarrito()).isEqualTo(12000);
        verify(embudoRepo).save(sesion);
    }

    @Test
    @DisplayName("en el mismo paso el motivo sí se actualiza")
    void motivoEnElMismoPaso() {
        EmbudoSesion sesion = sesion("CHECKOUT", "ERROR_DATOS");
        when(embudoRepo.findBySessionKey(CLAVE)).thenReturn(Optional.of(sesion));

        service.registrar(new EmbudoRegistroRequest(CLAVE, "CHECKOUT", "ERROR_ENTREGA", null));

        assertThat(sesion.getPaso()).isEqualTo("CHECKOUT");
        assertThat(sesion.getMotivo()).isEqualTo("ERROR_ENTREGA");
    }

    @Test
    @DisplayName("rechaza una clave que no es UUID")
    void rechazaClaveInvalida() {
        assertThatThrownBy(() -> service.registrar(new EmbudoRegistroRequest("no-es-uuid", "VISITA", null, null)))
            .isInstanceOf(IllegalArgumentException.class);
        verify(embudoRepo, never()).findBySessionKey(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("rechaza un correo como clave de sesión")
    void rechazaCorreo() {
        assertThatThrownBy(() -> service.registrar(
            new EmbudoRegistroRequest("ana@hotclick.com", "VISITA", null, null)))
            .isInstanceOf(IllegalArgumentException.class);
        verify(embudoRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private static EmbudoSesion sesion(String paso, String motivo) {
        EmbudoSesion sesion = new EmbudoSesion();
        sesion.setId(4L);
        sesion.setSessionKey(CLAVE);
        sesion.setPaso(paso);
        sesion.setMotivo(motivo);
        return sesion;
    }
}
