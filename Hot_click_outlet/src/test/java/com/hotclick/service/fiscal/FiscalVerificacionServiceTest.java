package com.hotclick.service.fiscal;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Base fiscal: verificación de la inscripción por un ADMIN")
class FiscalVerificacionServiceTest {

    private EmpresaRepository repo;
    private CompanyScope scope;
    private AuditoriaAdminRegistroService auditoria;
    private FiscalVerificacionService svc;
    private ComisionEfectivaService comision;
    private FiscalVerificacionAuto auto;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        repo = mock(EmpresaRepository.class);
        scope = mock(CompanyScope.class);
        auditoria = mock(AuditoriaAdminRegistroService.class);
        ConfiguracionFiscalService config = mock(ConfiguracionFiscalService.class);
        when(config.reglas()).thenReturn(ConfiguracionFiscalService.DEFAULTS);
        comision = new ComisionEfectivaService(config);
        auto = mock(FiscalVerificacionAuto.class);
        svc = new FiscalVerificacionService(repo, scope, auditoria, auto);
        Plan plan = new Plan();
        plan.setComisionPorcentaje(new BigDecimal("9"));
        empresa = new Empresa();
        empresa.setId(5L);
        empresa.setPlan(plan);
        empresa.setSituacionFiscal("INSCRITO");
        empresa.setCedulaFiscal("3101123456");
        when(repo.findById(5L)).thenReturn(Optional.of(empresa));
        when(scope.isAdminIT()).thenReturn(true);
        when(scope.isImpersonating()).thenReturn(false);
        when(scope.idActorAuditoria()).thenReturn(1L);
    }

    @Test
    @DisplayName("Mientras no se verifica, el extra sigue")
    void extraSigueHastaVerificar() {
        assertThat(comision.porcentajeEfectivo(empresa)).isEqualByComparingTo("23.00");
        assertThat((Boolean) svc.detalle(5L).get("pendienteVerificacion")).isTrue();
    }

    @Test
    @DisplayName("Consultar Hacienda de nuevo guarda el resultado, no aprueba y no quita el extra")
    void reconsultar() {
        empresa.setNombreFiscal("Mi Negocio SA");
        empresa.setActividadFiscal("Venta de ropa");
        empresa.setFiscalVerifAuto("ERROR_CONSULTA");
        when(auto.comprobar("3101123456", SituacionFiscal.INSCRITO, "Mi Negocio SA", "Venta de ropa"))
            .thenReturn(new FiscalVerificacionAuto.Resultado("COINCIDE", "{\"nombre\":\"MI NEGOCIO S A\"}"));
        Map<String, Object> r = svc.reconsultar(5L);
        assertThat(empresa.getFiscalVerifAuto()).isEqualTo("COINCIDE");
        assertThat(r.get("verifAuto")).isEqualTo("COINCIDE");
        assertThat(((Map<?, ?>) r.get("hacienda")).get("nombre")).isEqualTo("MI NEGOCIO S A");
        assertThat(empresa.isFiscalVerificado()).isFalse();
        assertThat(comision.porcentajeEfectivo(empresa)).isEqualByComparingTo("23.00");
        verify(auditoria).registrar(eq("FISCAL_RECONSULTA"), eq("EMPRESA"), eq(5L), eq(5L), eq("COINCIDE"));
    }

    @Test
    @DisplayName("Reconsultar exige ADMIN y una inscripción declarada")
    void reconsultarRestricciones() {
        empresa.setSituacionFiscal("NO_INSCRITO");
        assertThatThrownBy(() -> svc.reconsultar(5L)).isInstanceOf(IllegalStateException.class);
        empresa.setSituacionFiscal("INSCRITO");
        when(scope.isAdminIT()).thenReturn(false);
        assertThatThrownBy(() -> svc.reconsultar(5L)).isInstanceOf(TenantAccessDeniedException.class);
        verifyNoInteractions(auto);
    }

    @Test
    @DisplayName("Aprobar quita el extra y deja quién y cuándo")
    void aprobar() {
        Map<String, Object> r = svc.verificar(5L, true, "Coincide con Hacienda");
        assertThat(empresa.isFiscalVerificado()).isTrue();
        assertThat(empresa.getFiscalVerificadoPor()).isEqualTo(1L);
        assertThat(empresa.getFechaFiscalVerificado()).isNotNull();
        assertThat(comision.porcentajeEfectivo(empresa)).isEqualByComparingTo("9.00");
        assertThat(r.get("fiscalVerificado")).isEqualTo(true);
        verify(repo).save(empresa);
        verify(auditoria).registrar(eq("FISCAL_VERIFICACION"), eq("EMPRESA"), eq(5L), eq(5L), eq("APROBAR: Coincide con Hacienda"));
    }

    @Test
    @DisplayName("Rechazar vuelve a NO_INSCRITO y mantiene el extra")
    void rechazar() {
        svc.verificar(5L, false, null);
        assertThat(empresa.getSituacionFiscal()).isEqualTo("NO_INSCRITO");
        assertThat(empresa.isFiscalVerificado()).isFalse();
        assertThat(comision.porcentajeEfectivo(empresa)).isEqualByComparingTo("23.00");
        verify(auditoria).registrar(eq("FISCAL_VERIFICACION"), eq("EMPRESA"), eq(5L), eq(5L), eq("RECHAZAR"));
    }

    @Test
    @DisplayName("La auditoría no lleva cédula ni correo")
    void auditoriaSinPii() {
        empresa.setCorreoFacturacion("facturas@negocio.cr");
        svc.verificar(5L, true, null);
        verify(auditoria).registrar(any(), any(), anyLong(), anyLong(), eq("APROBAR"));
    }

    @Test
    @DisplayName("Quien no es ADMIN (un negocio) no puede verificarse a sí mismo")
    void negocioNoSeVerificaSolo() {
        when(scope.isAdminIT()).thenReturn(false);
        assertThatThrownBy(() -> svc.verificar(5L, true, null)).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> svc.detalle(5L)).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> new FiscalPendientesService(repo, scope).pendientes()).isInstanceOf(TenantAccessDeniedException.class);
        verify(repo, never()).save(any());
        assertThat(empresa.isFiscalVerificado()).isFalse();
    }

    @Test
    @DisplayName("Un ADMIN dentro de una sesión de soporte (ver como el negocio) tampoco verifica")
    void impersonacionNoVerifica() {
        when(scope.isImpersonating()).thenReturn(true);
        assertThatThrownBy(() -> svc.verificar(5L, true, null)).isInstanceOf(TenantAccessDeniedException.class);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Sin inscripción pendiente (NO_INSCRITO, sin datos o ya verificada) no hay nada que verificar")
    void sinPendiente() {
        empresa.setSituacionFiscal("NO_INSCRITO");
        assertThatThrownBy(() -> svc.verificar(5L, true, null)).isInstanceOf(IllegalStateException.class);
        empresa.setSituacionFiscal("INSCRITO");
        empresa.setCedulaFiscal(null);
        assertThatThrownBy(() -> svc.verificar(5L, true, null)).isInstanceOf(IllegalStateException.class);
        empresa.setCedulaFiscal("3101123456");
        empresa.setFiscalVerificado(true);
        assertThatThrownBy(() -> svc.verificar(5L, false, null)).isInstanceOf(IllegalStateException.class);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("El motivo se limpia y se acota")
    void motivo() {
        assertThat(FiscalVerificacionService.motivoLimpio("<b>no</b>\nmatch")).doesNotContain("<").doesNotContain("\n");
        assertThat(FiscalVerificacionService.motivoLimpio("x".repeat(500))).hasSize(200);
        assertThat(FiscalVerificacionService.motivoLimpio(null)).isEmpty();
    }
}
