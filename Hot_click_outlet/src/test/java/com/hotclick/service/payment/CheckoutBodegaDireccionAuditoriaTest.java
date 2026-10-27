package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Auditoría fb9ef78e P-06 y P-08 (C1). */
class CheckoutBodegaDireccionAuditoriaTest {

    private static PaymentCheckoutRequest req(String metodo, String direccion) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setMetodoEnvio(metodo);
        r.setDireccionEntrega(direccion);
        return r;
    }

    @Test
    @DisplayName("P-06 | envío sin dirección (null, vacía o solo espacios) → 400")
    void envioSinDireccion() {
        for (String d : new String[]{null, "", "   \n\t"}) {
            assertThatThrownBy(() -> CheckoutValidator.exigirDireccionSiHayEnvio(req("ENVIO_NORMAL_GAM", d)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Ingresá la dirección de entrega para el envío.");
        }
    }

    @Test
    @DisplayName("P-06 | un paquete con envío en envios[] también exige dirección")
    void envioPorPaqueteSinDireccion() {
        PaymentCheckoutRequest r = req(Constants.ENVIO_RETIRO, null);
        PaymentCheckoutRequest.EnvioPaqueteDTO e = new PaymentCheckoutRequest.EnvioPaqueteDTO();
        e.setMetodoEnvio(Constants.ENVIO_ENCOMIENDA);
        r.setEnvios(List.of(e));
        assertThatThrownBy(() -> CheckoutValidator.exigirDireccionSiHayEnvio(r))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("P-06 | retiro sin dirección y envío con dirección pasan")
    void casosValidos() {
        assertThatCode(() -> CheckoutValidator.exigirDireccionSiHayEnvio(req(Constants.ENVIO_RETIRO, null))).doesNotThrowAnyException();
        assertThatCode(() -> CheckoutValidator.exigirDireccionSiHayEnvio(req(null, null))).doesNotThrowAnyException();
        assertThatCode(() -> CheckoutValidator.exigirDireccionSiHayEnvio(req("ENVIO_RAPIDO", "Barrio Escalante, casa 12")))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("P-08 | sin bodegaId no se consulta la id 1 fija: se usa la primera activa del negocio")
    void sinBodegaIdNoUsaIdFija() {
        BodegaRepository repo = mock(BodegaRepository.class);
        CheckoutValidator v = new CheckoutValidator();
        ReflectionTestUtils.setField(v, "bodegaRepository", repo);
        Bodega b = new Bodega(); b.setId(40L);
        when(repo.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(Constants.EMPRESA_PLATAFORMA_ID, Constants.ESTADO_ACTIVO))
            .thenReturn(List.of(b));
        assertThat(v.resolverBodegaDefault(null)).isSameAs(b);
        verify(repo, never()).findById(Constants.BODEGA_DEFAULT_ID);
    }
}
