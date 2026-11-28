package com.hotclick.controller;

import com.hotclick.dto.contador.AjustesContadorRequest;
import com.hotclick.dto.contador.HaciendaEstadoRequest;
import com.hotclick.dto.contador.NormativaContadorRequest;
import com.hotclick.dto.contador.ParametrosContadorRequest;
import com.hotclick.dto.contador.PreguntaContadorRequest;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.contador.ContadorAcceso;
import com.hotclick.service.contador.ContadorAjustesService;
import com.hotclick.service.contador.ContadorAvisosService;
import com.hotclick.service.contador.ContadorChatService;
import com.hotclick.service.contador.ContadorFiscalService;
import com.hotclick.service.contador.ContadorHaciendaService;
import com.hotclick.service.contador.ContadorNormativaService;
import com.hotclick.service.contador.ContadorParametrosService;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DisplayName("Contador IA: autorización y validación de los endpoints")
class AdminContadorControllerTest {

    private CompanyScope scope;
    private ContadorFiscalService fiscal;
    private ContadorChatService chat;
    private ContadorParametrosService parametros;
    private ContadorHaciendaService hacienda;
    private ContadorNormativaService normativa;
    private ContadorAjustesService ajustes;
    private AuditoriaAdminRegistroService auditoria;
    private AdminContadorController ctrl;

    @BeforeEach
    void setUp() {
        scope = mock(CompanyScope.class);
        when(scope.isAdminIT()).thenReturn(true);
        when(scope.isImpersonating()).thenReturn(false);
        fiscal = mock(ContadorFiscalService.class);
        chat = mock(ContadorChatService.class);
        parametros = mock(ContadorParametrosService.class);
        hacienda = mock(ContadorHaciendaService.class);
        normativa = mock(ContadorNormativaService.class);
        ajustes = mock(ContadorAjustesService.class);
        when(ajustes.ajustes()).thenReturn(ContadorAjustesService.DEFAULTS);
        auditoria = mock(AuditoriaAdminRegistroService.class);
        ConfiguracionFiscalService reglas = mock(ConfiguracionFiscalService.class);
        when(reglas.reglas()).thenReturn(ConfiguracionFiscalService.DEFAULTS);
        ctrl = new AdminContadorController(new ContadorAcceso(scope), fiscal, chat, ajustes, parametros, normativa, hacienda,
            mock(ContadorAvisosService.class), reglas, auditoria);
    }

    @Test
    @DisplayName("Todos los endpoints exigen rol ADMIN")
    void preAuthorizeAdmin() {
        int revisados = 0;
        for (Method m : AdminContadorController.class.getDeclaredMethods()) {
            if (!Modifier.isPublic(m.getModifiers()) || Modifier.isStatic(m.getModifiers())) continue;
            PreAuthorize pa = m.getAnnotation(PreAuthorize.class);
            assertThat(pa).as(m.getName()).isNotNull();
            assertThat(pa.value()).isEqualTo("hasRole('ADMIN')");
            revisados++;
        }
        assertThat(revisados).isEqualTo(16);
    }

    @Test
    @DisplayName("Impersonando (sesión de soporte) se rechaza y no se toca ningún servicio")
    void impersonando() {
        when(scope.isImpersonating()).thenReturn(true);
        assertThatThrownBy(ctrl::esteMes).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> ctrl.preguntar(new PreguntaContadorRequest("hola"))).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> ctrl.guardarParametros(new ParametrosContadorRequest(Map.of("TIPO_PERSONA", "FISICA"))))
            .isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> ctrl.borradorHacienda("FEC_NO_INSCRITOS")).isInstanceOf(TenantAccessDeniedException.class);
        verifyNoInteractions(fiscal, chat, parametros, hacienda, normativa, auditoria);
    }

    @Test
    @DisplayName("Un staff que no es ADMIN de plataforma también se rechaza")
    void noAdmin() {
        when(scope.isAdminIT()).thenReturn(false);
        assertThatThrownBy(ctrl::calendario).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> ctrl.calculadora(10_000, "RTS", null)).isInstanceOf(TenantAccessDeniedException.class);
        verifyNoInteractions(fiscal, chat);
    }

    @Test
    @DisplayName("Calculadora por HTTP: tipo de vendedor inválido responde 400")
    void calculadoraHttp() {
        assertThat(ctrl.calculadora(11_300, "NO_INSCRITO", null).getStatusCode().value()).isEqualTo(200);
        assertThat(ctrl.calculadora(11_300, "OTRO", null).getStatusCode().value()).isEqualTo(400);
        assertThat(ctrl.calculadora(-5, "RTS", null).getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("Parámetro desconocido: 400 y sin auditoría")
    void parametroDesconocido() {
        when(parametros.actualizar(anyMap())).thenThrow(new IllegalArgumentException("parametro desconocido"));
        assertThat(ctrl.guardarParametros(new ParametrosContadorRequest(Map.of("OTRO", "x"))).getStatusCode().value()).isEqualTo(400);
        verifyNoInteractions(auditoria);
    }

    @Test
    @DisplayName("La regla de autorización explícita existe antes del catch-all de /api/admin/**")
    void reglaExplicita() throws Exception {
        String reglas = Files.readString(Path.of("src/main/java/com/hotclick/security/config/SecurityAuthorizationRules.java"));
        int contador = reglas.indexOf("\"/api/admin/contador/**\"");
        assertThat(contador).isPositive();
        assertThat(contador).isLessThan(reglas.indexOf(".requestMatchers(\"/api/admin/**\")"));
    }

    @Test
    @DisplayName("Bean Validation de los cuerpos")
    void validacion() {
        Validator v = Validation.buildDefaultValidatorFactory().getValidator();
        assertThat(v.validate(new PreguntaContadorRequest("¿Cuánto IVA pago?"))).isEmpty();
        assertThat(v.validate(new PreguntaContadorRequest(" "))).isNotEmpty();
        assertThat(v.validate(new PreguntaContadorRequest("x".repeat(601)))).isNotEmpty();
        assertThat(v.validate(new AjustesContadorRequest(462_200, new BigDecimal("20.00"), 30))).isEmpty();
        assertThat(v.validate(new AjustesContadorRequest(10, new BigDecimal("20.00"), 30))).isNotEmpty();
        assertThat(v.validate(new AjustesContadorRequest(462_200, new BigDecimal("-1"), 30))).isNotEmpty();
        assertThat(v.validate(new AjustesContadorRequest(462_200, new BigDecimal("20.00"), 0))).isNotEmpty();
        assertThat(v.validate(new ParametrosContadorRequest(Map.of()))).isNotEmpty();
        assertThat(v.validate(new NormativaContadorRequest("Ley", "Sitio oficial", "corto"))).isNotEmpty();
        assertThat(v.validate(new NormativaContadorRequest("Ley", "Sitio oficial", "texto suficientemente largo para guardar"))).isEmpty();
        assertThat(v.validate(new HaciendaEstadoRequest(null))).isNotEmpty();
    }
}
