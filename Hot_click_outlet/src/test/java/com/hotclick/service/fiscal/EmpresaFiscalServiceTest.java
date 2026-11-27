package com.hotclick.service.fiscal;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.fiscal.EmpresaFiscalService.Inscripcion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Base fiscal: Ya me inscribí y aislamiento por empresa")
class EmpresaFiscalServiceTest {

    private EmpresaRepository repo;
    private CompanyScope scope;
    private AuditoriaAdminRegistroService auditoria;
    private EmpresaFiscalService svc;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        repo = mock(EmpresaRepository.class);
        scope = mock(CompanyScope.class);
        auditoria = mock(AuditoriaAdminRegistroService.class);
        ConfiguracionFiscalService config = mock(ConfiguracionFiscalService.class);
        when(config.reglas()).thenReturn(ConfiguracionFiscalService.DEFAULTS);
        svc = new EmpresaFiscalService(repo, scope, new ComisionEfectivaService(config), config, auditoria);
        Plan plan = new Plan();
        plan.setComisionPorcentaje(new BigDecimal("9"));
        empresa = new Empresa();
        empresa.setId(5L);
        empresa.setPlan(plan);
        empresa.setSituacionFiscal("NO_INSCRITO");
        when(repo.findById(5L)).thenReturn(Optional.of(empresa));
    }

    private static Inscripcion datos(String cedula) {
        return new Inscripcion("INSCRITO", cedula, "Mi Negocio SA", "Venta de ropa", "Facturas@Negocio.cr");
    }

    private void rechaza(Inscripcion in) {
        assertThatThrownBy(() -> svc.registrarInscripcion(5L, in)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Inscripción válida: guarda datos, pasa a INSCRITO y la comisión vuelve a la del plan")
    void inscripcionOk() {
        assertThat((BigDecimal) svc.obtener(5L).get("comisionEfectivaPct")).isEqualByComparingTo("23.00");
        Map<String, Object> r = svc.registrarInscripcion(5L, datos("3-101-123456"));
        assertThat(empresa.getSituacionFiscal()).isEqualTo("INSCRITO");
        assertThat(empresa.getCedulaFiscal()).isEqualTo("3101123456");
        assertThat(empresa.getCorreoFacturacion()).isEqualTo("facturas@negocio.cr");
        assertThat(empresa.getFechaSituacionFiscal()).isNotNull();
        assertThat((BigDecimal) r.get("comisionEfectivaPct")).isEqualByComparingTo("9.00");
        verify(repo).save(empresa);
        verify(auditoria).registrar(eq("FISCAL_INSCRIPCION"), eq("EMPRESA"), eq(5L), eq(5L), eq("INSCRITO"));
    }

    @Test
    @DisplayName("Otra empresa: 403 y no se guarda nada")
    void otraEmpresa() {
        doThrow(new TenantAccessDeniedException("otra empresa")).when(scope).assertCanAccess(5L);
        assertThatThrownBy(() -> svc.registrarInscripcion(5L, datos("101230456"))).isInstanceOf(TenantAccessDeniedException.class);
        verify(repo, never()).save(any());
        assertThat(empresa.getSituacionFiscal()).isEqualTo("NO_INSCRITO");
    }

    @Test
    @DisplayName("Cédula: 9 (física), 10 (jurídica), 11-12 (DIMEX) dígitos; el resto se rechaza")
    void validaCedula() {
        for (String ok : new String[] {"101230456", "3101123456", "15500012345", "155000123456"}) {
            svc.registrarInscripcion(5L, datos(ok));
        }
        for (String mal : new String[] {"12345678", "1234567890123", "ABC123456", "", null, "1-2345"}) {
            rechaza(datos(mal));
        }
    }

    @Test
    @DisplayName("Situación inválida, correo inválido y nombre vacío se rechazan")
    void validaResto() {
        rechaza(new Inscripcion("NO_INSCRITO", "101230456", "Ana", "Ventas", "a@b.cr"));
        rechaza(new Inscripcion("INSCRITO", "101230456", "Ana", "Ventas", "no-es-correo"));
        rechaza(new Inscripcion("INSCRITO", "101230456", " ", "Ventas", "a@b.cr"));
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Declarar solo se permite la primera vez")
    void declararUnaVez() {
        assertThatThrownBy(() -> svc.declarar(5L, "INSCRITO")).isInstanceOf(IllegalStateException.class);
        empresa.setSituacionFiscal(null);
        svc.declarar(5L, "NO_INSCRITO");
        assertThat(empresa.getSituacionFiscal()).isEqualTo("NO_INSCRITO");
        empresa.setSituacionFiscal(null);
        assertThatThrownBy(() -> svc.declarar(5L, "XX")).isInstanceOf(IllegalArgumentException.class);
    }
}
