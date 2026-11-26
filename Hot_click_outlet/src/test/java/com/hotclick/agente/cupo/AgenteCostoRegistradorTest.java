package com.hotclick.agente.cupo;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.ResendEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static com.hotclick.agente.cupo.CupoTestSupport.empresa;
import static com.hotclick.agente.cupo.CupoTestSupport.plan;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Costo de IA por negocio y avisos al 80 % y 100 % (AG-29)")
class AgenteCostoRegistradorTest {

    private AgenteUsoRepositorio uso;
    private ResendEmailService correo;
    private AgenteCupoConfig config;
    private AgenteCostoRegistrador registrador;

    @BeforeEach
    void init() {
        uso = new AgenteUsoRepositorio(CupoTestSupport.baseH2());
        correo = mock(ResendEmailService.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(empresas.findByIdWithPlan(7L)).thenReturn(Optional.of(empresa(plan("EMPRENDEDOR", true, 100), "dueno@negocio.cr")));
        config = new AgenteCupoConfig(new BigDecimal("3.00"), new BigDecimal("10.00"), new BigDecimal("30.00"),
            CupoTestSupport.RELOJ);
        registrador = new AgenteCostoRegistrador(uso, config, empresas, correo);
    }

    @Test
    @DisplayName("suma el costo de cada llamada al mes del negocio")
    void sumaElCosto() {
        registrador.costo(7L, 0.25);
        registrador.costo(7L, 0.50);
        assertThat(uso.leer(7L, config.mesActual()).costoUsd()).isEqualByComparingTo("0.75");
        assertThat(uso.leer(8L, config.mesActual()).costoUsd()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("HotClick acumula costo pero no recibe avisos")
    void hotClickSinAvisos() {
        registrador.costo(null, 50.0);
        assertThat(uso.leer(null, config.mesActual()).costoUsd()).isEqualByComparingTo("50");
        verify(correo, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("avisa una sola vez al llegar al 80 % y una sola vez al 100 % en el mes")
    void avisosUnaVezPorMes() {
        registrador.costo(7L, 1.0);
        verify(correo, never()).send(any(), any(), any());
        registrador.costo(7L, 1.5); // 2.50 >= 2.40 (80 % de 3.00)
        registrador.costo(7L, 0.1); // 2.60: no repite el 80 %
        registrador.costo(7L, 0.1);
        verify(correo, times(1)).send(eq("dueno@negocio.cr"), contains("80 %"), any());
        registrador.costo(7L, 0.5); // 3.10 >= 3.00
        registrador.costo(7L, 0.5); // no repite el 100 %
        verify(correo, times(1)).send(eq("dueno@negocio.cr"), contains("detuvo"), any());
        verify(correo, times(2)).send(any(), any(), any());
    }

    @Test
    @DisplayName("si el gasto salta directo al 100 % solo sale el aviso del 100 %")
    void saltoDirectoAl100() {
        registrador.costo(7L, 4.0);
        registrador.costo(7L, 1.0);
        verify(correo, times(1)).send(any(), any(), any());
        verify(correo).send(eq("dueno@negocio.cr"), contains("detuvo"), any());
    }

    @Test
    @DisplayName("un costo no positivo o un fallo del correo no rompen al motor")
    void robusto() {
        registrador.costo(7L, 0.0);
        registrador.costo(7L, -1.0);
        org.mockito.Mockito.doThrow(new IllegalStateException("smtp")).when(correo).send(any(), any(), any());
        registrador.costo(7L, 3.5);
        assertThat(uso.leer(7L, config.mesActual()).costoUsd()).isEqualByComparingTo("3.5");
    }
}
