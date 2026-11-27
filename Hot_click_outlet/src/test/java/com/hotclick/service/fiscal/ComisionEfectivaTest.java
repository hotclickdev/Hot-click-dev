package com.hotclick.service.fiscal;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Base fiscal: comisión efectiva = plan + extra si NO_INSCRITO")
class ComisionEfectivaTest {

    private static final BigDecimal EXTRA = new BigDecimal("14.00");

    @Test
    @DisplayName("NO_INSCRITO suma el extra al plan")
    void noInscrito() {
        var d = ComisionEfectiva.calcular(new BigDecimal("9"), SituacionFiscal.NO_INSCRITO, EXTRA);
        assertThat(d.efectivaPct()).isEqualByComparingTo("23.00");
        assertThat(d.extraPct()).isEqualByComparingTo("14.00");
        assertThat(d.planPct()).isEqualByComparingTo("9.00");
    }

    @Test
    @DisplayName("Sin declarar paga plan + extra, igual que NO_INSCRITO")
    void sinDeclararPagaExtra() {
        var d = ComisionEfectiva.calcular(new BigDecimal("7.5"), null, true, EXTRA);
        assertThat(d.efectivaPct()).isEqualByComparingTo("21.50");
        assertThat(d.extraPct()).isEqualByComparingTo("14.00");
    }

    @Test
    @DisplayName("INSCRITO y REGIMEN_SIMPLIFICADO sin verificar siguen pagando el extra")
    void declaradoSinVerificarPagaExtra() {
        for (SituacionFiscal s : new SituacionFiscal[] {SituacionFiscal.INSCRITO, SituacionFiscal.REGIMEN_SIMPLIFICADO}) {
            assertThat(ComisionEfectiva.calcular(new BigDecimal("7.5"), s, false, EXTRA).efectivaPct()).isEqualByComparingTo("21.50");
            assertThat(ComisionEfectiva.calcular(new BigDecimal("7.5"), s, EXTRA).efectivaPct()).isEqualByComparingTo("21.50");
        }
    }

    @Test
    @DisplayName("Solo INSCRITO o REGIMEN_SIMPLIFICADO verificado paga el plan")
    void verificadoSoloPlan() {
        for (SituacionFiscal s : new SituacionFiscal[] {SituacionFiscal.INSCRITO, SituacionFiscal.REGIMEN_SIMPLIFICADO}) {
            var d = ComisionEfectiva.calcular(new BigDecimal("7.5"), s, true, EXTRA);
            assertThat(d.efectivaPct()).isEqualByComparingTo("7.50");
            assertThat(d.extraPct()).isEqualByComparingTo("0");
        }
        assertThat(ComisionEfectiva.calcular(new BigDecimal("7.5"), SituacionFiscal.NO_INSCRITO, true, EXTRA).efectivaPct())
            .isEqualByComparingTo("21.50");
    }

    @Test
    @DisplayName("Plan nulo cuenta como 0 y el extra es configurable")
    void planNuloYExtraConfigurable() {
        assertThat(ComisionEfectiva.calcular(null, SituacionFiscal.NO_INSCRITO, new BigDecimal("12.5")).efectivaPct())
            .isEqualByComparingTo("12.50");
    }

    @Test
    @DisplayName("El servicio toma plan y situación de la empresa y el extra de las reglas")
    void servicio() {
        ConfiguracionFiscalService config = mock(ConfiguracionFiscalService.class);
        when(config.reglas()).thenReturn(ConfiguracionFiscalService.DEFAULTS);
        ComisionEfectivaService svc = new ComisionEfectivaService(config);
        Plan plan = new Plan();
        plan.setComisionPorcentaje(new BigDecimal("6"));
        Empresa e = new Empresa();
        e.setPlan(plan);
        assertThat(svc.porcentajeEfectivo(e)).isEqualByComparingTo("20.00");
        e.setSituacionFiscal("NO_INSCRITO");
        assertThat(svc.porcentajeEfectivo(e)).isEqualByComparingTo("20.00");
        e.setSituacionFiscal("INSCRITO");
        assertThat(svc.porcentajeEfectivo(e)).isEqualByComparingTo("20.00");
        e.setFiscalVerificado(true);
        assertThat(svc.porcentajeEfectivo(e)).isEqualByComparingTo("6.00");
        e.setSituacionFiscal("basura");
        assertThat(svc.porcentajeEfectivo(e)).isEqualByComparingTo("20.00");
    }
}
