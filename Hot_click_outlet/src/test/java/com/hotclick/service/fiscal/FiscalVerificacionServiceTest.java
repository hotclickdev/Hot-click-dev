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
        empresa.setCedulaFiscal("3111111111");
        when(repo.findById(5L)).thenReturn(Optional.of(empresa));
        when(scope.isAdminIT()).thenReturn(true);
        when(scope.isImpersonating()).thenReturn(false);
        when(scope.idActorAuditoria()).thenReturn(1L);
        empresa.setFechaSituacionFiscal(java.time.LocalDateTime.of(2026, 11, 1, 10, 0));
        // El UPDATE dirigido de la reconsulta aplica solo si cédula y fecha de declaración siguen iguales.
        when(repo.actualizarVerifAutoFiscal(anyLong(), any(), any(), any(), any(), any())).thenAnswer(inv -> {
            if (!java.util.Objects.equals(inv.getArgument(1), empresa.getCedulaFiscal())
                || !java.util.Objects.equals(inv.getArgument(2), empresa.getFechaSituacionFiscal())) return 0;
            empresa.setFiscalVerifAuto(inv.getArgument(3));
            empresa.setFiscalVerifAutoDetalle(inv.getArgument(4));
            return 1;
        });
    }

    private String hu() {
        return FiscalVerificacionService.huella(empresa);
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
        when(auto.comprobar("3111111111", SituacionFiscal.INSCRITO, "Mi Negocio SA", "Venta de ropa"))
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
        Map<String, Object> r = svc.verificar(5L, true, "Coincide con Hacienda", hu());
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
        svc.verificar(5L, false, null, hu());
        assertThat(empresa.getSituacionFiscal()).isEqualTo("NO_INSCRITO");
        assertThat(empresa.isFiscalVerificado()).isFalse();
        assertThat(comision.porcentajeEfectivo(empresa)).isEqualByComparingTo("23.00");
        verify(auditoria).registrar(eq("FISCAL_VERIFICACION"), eq("EMPRESA"), eq(5L), eq(5L), eq("RECHAZAR"));
    }

    @Test
    @DisplayName("La auditoría no lleva cédula ni correo")
    void auditoriaSinPii() {
        empresa.setCorreoFacturacion("facturas@example.com");
        svc.verificar(5L, true, null, hu());
        verify(auditoria).registrar(any(), any(), anyLong(), anyLong(), eq("APROBAR"));
    }

    @Test
    @DisplayName("Quien no es ADMIN (un negocio) no puede verificarse a sí mismo")
    void negocioNoSeVerificaSolo() {
        when(scope.isAdminIT()).thenReturn(false);
        assertThatThrownBy(() -> svc.verificar(5L, true, null, hu())).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> svc.detalle(5L)).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> new FiscalPendientesService(repo, scope).pendientes()).isInstanceOf(TenantAccessDeniedException.class);
        verify(repo, never()).save(any());
        assertThat(empresa.isFiscalVerificado()).isFalse();
    }

    @Test
    @DisplayName("Un ADMIN dentro de una sesión de soporte (ver como el negocio) tampoco verifica")
    void impersonacionNoVerifica() {
        when(scope.isImpersonating()).thenReturn(true);
        assertThatThrownBy(() -> svc.verificar(5L, true, null, hu())).isInstanceOf(TenantAccessDeniedException.class);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Sin inscripción pendiente (NO_INSCRITO, sin datos o ya verificada) no hay nada que verificar")
    void sinPendiente() {
        empresa.setSituacionFiscal("NO_INSCRITO");
        assertThatThrownBy(() -> svc.verificar(5L, true, null, hu())).isInstanceOf(IllegalStateException.class);
        empresa.setSituacionFiscal("INSCRITO");
        empresa.setCedulaFiscal(null);
        assertThatThrownBy(() -> svc.verificar(5L, true, null, hu())).isInstanceOf(IllegalStateException.class);
        empresa.setCedulaFiscal("3111111111");
        empresa.setFiscalVerificado(true);
        assertThatThrownBy(() -> svc.verificar(5L, false, null, hu())).isInstanceOf(IllegalStateException.class);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("El motivo se limpia y se acota")
    void motivo() {
        assertThat(FiscalVerificacionService.motivoLimpio("<b>no</b>\nmatch")).doesNotContain("<").doesNotContain("\n");
        assertThat(FiscalVerificacionService.motivoLimpio("x".repeat(500))).hasSize(200);
        assertThat(FiscalVerificacionService.motivoLimpio(null)).isEmpty();
    }

    @Test
    @DisplayName("M2: si el negocio cambió sus datos desde que el ADMIN los vio, verificar da 409 y no guarda")
    void huellaDesactualizada() {
        String vista = hu();
        empresa.setNombreFiscal("Nombre nuevo enviado después");
        assertThatThrownBy(() -> svc.verificar(5L, true, null, vista))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("cambió sus datos");
        assertThatThrownBy(() -> svc.verificar(5L, true, null, null)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> svc.verificar(5L, true, null, "otra")).isInstanceOf(IllegalStateException.class);
        verify(repo, never()).save(any());
        assertThat(empresa.isFiscalVerificado()).isFalse();
        // con la huella nueva sí pasa
        svc.verificar(5L, true, null, hu());
        assertThat(empresa.isFiscalVerificado()).isTrue();
    }

    @Test
    @DisplayName("La huella cambia con cédula, nombre, actividad, correo, situación y fecha de la declaración")
    void huellaCubreLoDeclarado() {
        String base = hu();
        empresa.setCedulaFiscal("3999999999");
        assertThat(hu()).isNotEqualTo(base);
        empresa.setCedulaFiscal("3111111111");
        assertThat(hu()).isEqualTo(base);
        empresa.setActividadFiscal("otra");
        assertThat(hu()).isNotEqualTo(base);
        empresa.setActividadFiscal(null);
        empresa.setCorreoFacturacion("x@example.com");
        assertThat(hu()).isNotEqualTo(base);
        empresa.setCorreoFacturacion(null);
        empresa.setFechaSituacionFiscal(empresa.getFechaSituacionFiscal().plusMinutes(1));
        assertThat(hu()).isNotEqualTo(base);
        assertThat(hu()).hasSize(64);
    }

    @Test
    @DisplayName("M1: el detalle marca la cédula repetida en otros negocios y la compara con la cédula conocida de la cuenta")
    void cedulaAjena() {
        when(repo.idsConMismaCedulaFiscal(eq("3111111111"), eq(5L), any())).thenReturn(java.util.List.of(8L, 9L));
        empresa.setCedulaJuridica("3222222222");
        Map<String, Object> d = svc.detalle(5L);
        assertThat(d.get("cedulaFiscalDuplicada")).isEqualTo(true);
        assertThat(d.get("otrosNegociosMismaCedula")).isEqualTo(java.util.List.of(8L, 9L));
        assertThat(d.get("cedulaCuenta")).isEqualTo("3222222222");
        assertThat(d.get("cedulaCoincideConCuenta")).isEqualTo(false);
        empresa.setCedulaJuridica("3-111-111111");
        assertThat(svc.detalle(5L).get("cedulaCoincideConCuenta")).isEqualTo(true);
        empresa.setCedulaJuridica("3111111111");
        assertThat(svc.detalle(5L).get("cedulaCoincideConCuenta")).isEqualTo(true);
    }

    @Test
    @DisplayName("Sin cédula conocida en la cuenta no se marca coincidencia; sin repetidas no hay duplicado")
    void sinCedulaDeCuenta() {
        when(repo.idsConMismaCedulaFiscal(any(), anyLong(), any())).thenReturn(java.util.List.of());
        Map<String, Object> d = svc.detalle(5L);
        assertThat(d.get("cedulaFiscalDuplicada")).isEqualTo(false);
        assertThat(d.get("cedulaCuenta")).isNull();
        assertThat(d.get("cedulaCoincideConCuenta")).isNull();
    }

    @Test
    @DisplayName("B1: reconsultar escribe con UPDATE dirigido; si el negocio cambió sus datos mientras tanto, 409 sin pisar")
    void reconsultarSinPisar() {
        empresa.setNombreFiscal("Negocio de Prueba");
        empresa.setActividadFiscal("Venta de ropa");
        when(auto.comprobar(any(), any(), any(), any())).thenAnswer(inv -> {
            // el negocio reenvía sus datos mientras la consulta a Hacienda está en curso
            empresa.setFechaSituacionFiscal(empresa.getFechaSituacionFiscal().plusMinutes(5));
            return new FiscalVerificacionAuto.Resultado("COINCIDE", "{}");
        });
        assertThatThrownBy(() -> svc.reconsultar(5L)).isInstanceOf(IllegalStateException.class);
        verify(repo, never()).save(any());
        assertThat(empresa.getFiscalVerifAuto()).isNull();
    }

    @Test
    @DisplayName("M1d: la lista de pendientes marca las cédulas declaradas por más de un negocio")
    void pendientesMarcanDuplicadas() {
        Empresa otra = new Empresa();
        otra.setId(6L);
        otra.setSituacionFiscal("INSCRITO");
        otra.setCedulaFiscal("3999999999");
        when(repo.findFiscalPendientes(any())).thenReturn(java.util.List.of(empresa, otra));
        when(repo.cedulasFiscalesRepetidas(any())).thenReturn(java.util.List.of("3111111111"));
        var filas = new FiscalPendientesService(repo, scope).pendientes();
        assertThat(filas.get(0).get("cedulaDuplicada")).isEqualTo(true);
        assertThat(filas.get(1).get("cedulaDuplicada")).isEqualTo(false);
    }
}
