package com.hotclick.service.fiscal;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.fiscal.EmpresaFiscalService.Inscripcion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Las cédulas de estas pruebas son ficticias (números repetidos); los correos usan example.com. */
@DisplayName("Base fiscal: Ya me inscribí y aislamiento por empresa")
class EmpresaFiscalServiceTest {

    private static final String JURIDICA = "3111111111";

    private EmpresaRepository repo;
    private CompanyScope scope;
    private AuditoriaAdminRegistroService auditoria;
    private EmpresaFiscalService svc;
    private Empresa empresa;
    private FiscalVerificacionAuto auto;
    private RateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        repo = mock(EmpresaRepository.class);
        scope = mock(CompanyScope.class);
        auditoria = mock(AuditoriaAdminRegistroService.class);
        ConfiguracionFiscalService config = mock(ConfiguracionFiscalService.class);
        when(config.reglas()).thenReturn(ConfiguracionFiscalService.DEFAULTS);
        auto = mock(FiscalVerificacionAuto.class);
        rateLimiter = mock(RateLimiter.class);
        when(rateLimiter.tryAcquireEstricto(anyString(), anyInt(), anyInt())).thenReturn(true);
        when(auto.comprobar(any(), any(), any(), any()))
            .thenReturn(new FiscalVerificacionAuto.Resultado(FiscalVerificacionAuto.COINCIDE, "{}"));
        svc = new EmpresaFiscalService(repo, scope, new ComisionEfectivaService(config), config, auditoria, auto, rateLimiter);
        Plan plan = new Plan();
        plan.setComisionPorcentaje(new BigDecimal("9"));
        empresa = new Empresa();
        empresa.setId(5L);
        empresa.setPlan(plan);
        empresa.setSituacionFiscal("NO_INSCRITO");
        when(repo.findByIdWithPlan(5L)).thenReturn(Optional.of(empresa));
        // El UPDATE dirigido aplica sobre la fila lo que el servicio le pasa (simula la base de datos).
        when(repo.actualizarInscripcionFiscal(anyLong(), anyString(), anyString(), anyString(), anyString(), anyString(),
            any(LocalDateTime.class), anyString(), anyString(), any())).thenAnswer(inv -> {
                empresa.setSituacionFiscal(inv.getArgument(1));
                empresa.setCedulaFiscal(inv.getArgument(2));
                empresa.setNombreFiscal(inv.getArgument(3));
                empresa.setActividadFiscal(inv.getArgument(4));
                empresa.setCorreoFacturacion(inv.getArgument(5));
                empresa.setFechaSituacionFiscal(inv.getArgument(6));
                empresa.setFiscalVerificado(false);
                empresa.setFiscalVerifAuto(inv.getArgument(7));
                empresa.setFiscalVerifAutoDetalle(inv.getArgument(8));
                empresa.setFiscalVerifAutoFecha(inv.getArgument(6));
                empresa.setFiscalDeclaracionFecha(inv.getArgument(6));
                empresa.setFiscalDeclaracionPor(inv.getArgument(9));
                return 1;
            });
    }

    private static Inscripcion datos(String cedula) {
        return new Inscripcion("INSCRITO", cedula, "Negocio de Prueba", "Venta de ropa", "Facturas@Example.com", true);
    }

    private void rechaza(Inscripcion in) {
        assertThatThrownBy(() -> svc.registrarInscripcion(5L, in)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Inscripción válida: guarda datos, queda pendiente de verificar y el extra sigue")
    void inscripcionOk() {
        assertThat((BigDecimal) svc.obtener(5L).get("comisionEfectivaPct")).isEqualByComparingTo("23.00");
        Map<String, Object> r = svc.registrarInscripcion(5L, datos("311-111-1111"));
        assertThat(empresa.getSituacionFiscal()).isEqualTo("INSCRITO");
        assertThat(empresa.getCedulaFiscal()).isEqualTo(JURIDICA);
        assertThat(empresa.getCorreoFacturacion()).isEqualTo("facturas@example.com");
        assertThat(empresa.getFechaSituacionFiscal()).isNotNull();
        assertThat((BigDecimal) r.get("comisionEfectivaPct")).isEqualByComparingTo("23.00");
        assertThat(r.get("pendienteVerificacion")).isEqualTo(true);
        assertThat(empresa.isFiscalVerificado()).isFalse();
        verify(auditoria).registrar(eq("FISCAL_INSCRIPCION"), eq("EMPRESA"), eq(5L), eq(5L), eq("INSCRITO"));
    }

    @Test
    @DisplayName("B1: consulta a Hacienda primero y después un UPDATE dirigido; nunca save() de la entidad entera")
    void sinLostUpdate() {
        svc.registrarInscripcion(5L, datos(JURIDICA));
        InOrder orden = inOrder(auto, repo);
        orden.verify(auto).comprobar(eq(JURIDICA), any(), any(), any());
        orden.verify(repo).actualizarInscripcionFiscal(eq(5L), eq("INSCRITO"), eq(JURIDICA), any(), any(), any(), any(), any(), any(), any());
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Coincide con Hacienda: queda guardado, pero el extra sigue hasta que un ADMIN apruebe")
    void coincideNoQuitaElExtra() {
        Map<String, Object> r = svc.registrarInscripcion(5L, datos(JURIDICA));
        assertThat(empresa.getFiscalVerifAuto()).isEqualTo("COINCIDE");
        assertThat(empresa.getFiscalVerifAutoFecha()).isNotNull();
        assertThat(r.get("verifAuto")).isEqualTo("COINCIDE");
        assertThat((BigDecimal) r.get("comisionEfectivaPct")).isEqualByComparingTo("23.00");
    }

    @Test
    @DisplayName("No coincide, no encontrado o error de la API: se guarda el resultado y el envío no se bloquea")
    void resultadosNoBloquean() {
        for (String estado : new String[] {"NO_COINCIDE", "NO_ENCONTRADO", "ERROR_CONSULTA"}) {
            when(auto.comprobar(any(), any(), any(), any())).thenReturn(new FiscalVerificacionAuto.Resultado(estado, "{}"));
            svc.registrarInscripcion(5L, datos(JURIDICA));
            assertThat(empresa.getFiscalVerifAuto()).isEqualTo(estado);
            assertThat(empresa.getSituacionFiscal()).isEqualTo("INSCRITO");
            assertThat(empresa.getCedulaFiscal()).isEqualTo(JURIDICA);
        }
    }

    @Test
    @DisplayName("El vendedor no recibe lo que respondió Hacienda, solo el estado")
    void vendedorSinDatosDeHacienda() {
        when(auto.comprobar(any(), any(), any(), any()))
            .thenReturn(new FiscalVerificacionAuto.Resultado("NO_COINCIDE", "{\"nombre\":\"OTRA PERSONA\"}"));
        Map<String, Object> r = svc.registrarInscripcion(5L, datos(JURIDICA));
        assertThat(r.toString()).doesNotContain("OTRA PERSONA");
        assertThat(r).doesNotContainKeys("hacienda", "verifAutoDetalle");
    }

    @Test
    @DisplayName("Límite de 5 envíos por día: el sexto da 429 y no consulta a Hacienda ni guarda")
    void limiteDeIntentos() {
        when(rateLimiter.tryAcquireEstricto(anyString(), anyInt(), anyInt()))
            .thenReturn(true, true, true, true, true, false);
        for (int i = 0; i < 5; i++) svc.registrarInscripcion(5L, datos(JURIDICA));
        verify(auto, times(5)).comprobar(any(), any(), any(), any());
        assertThatThrownBy(() -> svc.registrarInscripcion(5L, datos(JURIDICA))).isInstanceOf(LimiteIntentosFiscalException.class);
        verify(auto, times(5)).comprobar(any(), any(), any(), any());
        verify(rateLimiter, times(6)).tryAcquireEstricto(eq("empresa:5:fiscal:inscripcion"), eq(5), eq(86400));
    }

    @Test
    @DisplayName("Una cédula mal formada no gasta intentos ni llama a Hacienda")
    void cedulaInvalidaNoConsulta() {
        rechaza(datos("123"));
        verifyNoInteractions(auto);
        verify(rateLimiter, never()).tryAcquireEstricto(anyString(), anyInt(), anyInt());
    }

    @Test
    @DisplayName("Otra empresa: 403 y no se guarda nada")
    void otraEmpresa() {
        doThrow(new TenantAccessDeniedException("otra empresa")).when(scope).assertCanAccess(5L);
        assertThatThrownBy(() -> svc.registrarInscripcion(5L, datos(JURIDICA))).isInstanceOf(TenantAccessDeniedException.class);
        verify(repo, never()).actualizarInscripcionFiscal(anyLong(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        assertThat(empresa.getSituacionFiscal()).isEqualTo("NO_INSCRITO");
    }

    @Test
    @DisplayName("B2: física 9 dígitos sin 0 inicial, jurídica 10 con 3 inicial, DIMEX 11 o 12")
    void validaCedulaPorTipo() {
        for (String ok : new String[] {"111111111", "3111111111", "11111111111", "111111111111"}) {
            svc.registrarInscripcion(5L, datos(ok));
        }
        for (String mal : new String[] {"011111111", "1111111111", "2111111111", "12345678", "1111111111111",
            "ABC111111", "", null, "1-2345"}) {
            rechaza(datos(mal));
        }
    }

    @Test
    @DisplayName("B3: situación inválida, correo sin dominio con punto y nombre vacío se rechazan")
    void validaResto() {
        rechaza(new Inscripcion("NO_INSCRITO", JURIDICA, "Ana Prueba", "Ventas", "a@example.com", true));
        rechaza(new Inscripcion("INSCRITO", JURIDICA, "Ana Prueba", "Ventas", "no-es-correo", true));
        rechaza(new Inscripcion("INSCRITO", JURIDICA, "Ana Prueba", "Ventas", "a@b", true));
        rechaza(new Inscripcion("INSCRITO", JURIDICA, "Ana Prueba", "Ventas", "a@b.", true));
        rechaza(new Inscripcion("INSCRITO", JURIDICA, " ", "Ventas", "a@example.com", true));
        verify(repo, never()).actualizarInscripcionFiscal(anyLong(), any(), any(), any(), any(), any(), any(), any(), any(), any());
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

    @Test
    @DisplayName("Declaración jurada: sin aceptarla no se consulta, no se gasta intento y no se guarda (400)")
    void sinDeclaracionNoGuarda() {
        assertThatThrownBy(() -> svc.registrarInscripcion(5L,
            new Inscripcion("INSCRITO", JURIDICA, "Negocio de Prueba", "Venta de ropa", "a@example.com", false)))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("representante legal");
        verifyNoInteractions(auto);
        verify(rateLimiter, never()).tryAcquireEstricto(anyString(), anyInt(), anyInt());
        verify(repo, never()).actualizarInscripcionFiscal(anyLong(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Declaración jurada aceptada: queda la fecha y el id de usuario, sin IP")
    void declaracionQuedaRegistrada() {
        when(scope.getCurrentUserId()).thenReturn(77L);
        svc.registrarInscripcion(5L, datos(JURIDICA));
        assertThat(empresa.getFiscalDeclaracionFecha()).isNotNull();
        assertThat(empresa.getFiscalDeclaracionPor()).isEqualTo(77L);
    }

    @Test
    @DisplayName("En el registro, declarar INSCRITO o Régimen Simplificado exige la declaración; No inscrito o vacío, no")
    void registroExigeDeclaracion() {
        assertThatThrownBy(() -> DeclaracionFiscal.exigir("INSCRITO", null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DeclaracionFiscal.exigir("REGIMEN_SIMPLIFICADO", false)).isInstanceOf(IllegalArgumentException.class);
        DeclaracionFiscal.exigir("INSCRITO", true);
        DeclaracionFiscal.exigir("REGIMEN_SIMPLIFICADO", true);
        DeclaracionFiscal.exigir("NO_INSCRITO", null);
        DeclaracionFiscal.exigir(null, null);
        DeclaracionFiscal.exigir("", false);
    }
}
