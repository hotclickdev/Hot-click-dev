package com.hotclick.service.negocio;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** POST /pago con el Checkout de ONVO mockeado: el monto es el precio del plan; solo URLs https. */
class MensualidadPagoMockTest {

    private MensualidadNegocioService servicio(MensualidadCheckoutClient c, int precio) {
        Plan plan = new Plan();
        plan.setNombre("PYME");
        plan.setPrecioMensual(precio);
        Empresa e = new Empresa();
        e.setPlan(plan);
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findById(7L)).thenReturn(Optional.of(e));
        return new MensualidadNegocioService(repo, c);
    }

    @Test
    void conLlaves_cobraElPrecioDelPlan() {
        MensualidadCheckoutClient c = mock(MensualidadCheckoutClient.class);
        when(c.configurado()).thenReturn(true);
        when(c.crearCheckout(7L, "PYME", 12900)).thenReturn("https://checkout.onvopay.com/abc");
        assertThat(servicio(c, 12900).pagar(7L)).containsEntry("url", "https://checkout.onvopay.com/abc");
        verify(c).crearCheckout(7L, "PYME", 12900);
    }

    @Test
    void urlNoHttps_failClosed() {
        MensualidadCheckoutClient c = mock(MensualidadCheckoutClient.class);
        when(c.configurado()).thenReturn(true);
        when(c.crearCheckout(anyLong(), anyString(), anyInt())).thenReturn("http://x");
        assertThatThrownBy(() -> servicio(c, 12900).pagar(7L))
            .isInstanceOf(MensualidadCheckoutClient.NoConfiguradoException.class);
    }
}
