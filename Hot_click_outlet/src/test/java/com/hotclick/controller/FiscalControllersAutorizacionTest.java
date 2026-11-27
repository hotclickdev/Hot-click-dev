package com.hotclick.controller;

import com.hotclick.dto.fiscal.InscripcionFiscalRequest;
import com.hotclick.dto.fiscal.ReglasFiscalesRequest;
import com.hotclick.dto.fiscal.VerificarFiscalRequest;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.fiscal.EmpresaFiscalService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Base fiscal: autorización y validación de los endpoints")
class FiscalControllersAutorizacionTest {

    private static InscripcionFiscalRequest inscripcion() {
        return new InscripcionFiscalRequest("INSCRITO", "101230456", "Ana", "Ventas", "a@b.cr");
    }

    @Test
    @DisplayName("Las reglas fiscales (GET y PUT) exigen rol ADMIN")
    void soloAdmin() {
        int revisados = 0;
        for (Method m : AdminConfigFiscalController.class.getDeclaredMethods()) {
            if (!Modifier.isPublic(m.getModifiers())) continue;
            PreAuthorize pa = m.getAnnotation(PreAuthorize.class);
            assertThat(pa).as(m.getName()).isNotNull();
            assertThat(pa.value()).isEqualTo("hasRole('ADMIN')");
            revisados++;
        }
        assertThat(revisados).isEqualTo(2);
    }

    @Test
    @DisplayName("Los endpoints de verificación fiscal (lista, detalle y verificar) exigen rol ADMIN")
    void verificacionSoloAdmin() {
        int revisados = 0;
        for (Method m : AdminFiscalVerificacionController.class.getDeclaredMethods()) {
            if (!Modifier.isPublic(m.getModifiers())) continue;
            PreAuthorize pa = m.getAnnotation(PreAuthorize.class);
            assertThat(pa).as(m.getName()).isNotNull();
            assertThat(pa.value()).isEqualTo("hasRole('ADMIN')");
            revisados++;
        }
        assertThat(revisados).isEqualTo(4);
    }

    @Test
    @DisplayName("Quien no es propietario recibe 403 y el servicio no se toca")
    void noPropietario403() {
        CompanyScope scope = mock(CompanyScope.class);
        PropietarioGuard guard = mock(PropietarioGuard.class);
        EmpresaFiscalService svc = mock(EmpresaFiscalService.class);
        when(scope.requireEmpresaId()).thenReturn(5L);
        when(guard.puedeGestionarEmpresa(5L)).thenReturn(false);
        var r = new EmpresaFiscalController(scope, guard, svc).inscripcion(inscripcion());
        assertThat(r.getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(svc);
    }

    @Test
    @DisplayName("La empresa sale de la sesión, no del cuerpo")
    void empresaDeSesion() {
        CompanyScope scope = mock(CompanyScope.class);
        PropietarioGuard guard = mock(PropietarioGuard.class);
        EmpresaFiscalService svc = mock(EmpresaFiscalService.class);
        when(scope.requireEmpresaId()).thenReturn(5L);
        when(guard.puedeGestionarEmpresa(5L)).thenReturn(true);
        new EmpresaFiscalController(scope, guard, svc).inscripcion(inscripcion());
        verify(svc).registrarInscripcion(eq(5L), any());
    }

    @Test
    @DisplayName("Bean Validation de los cuerpos")
    void validacion() {
        Validator v = Validation.buildDefaultValidatorFactory().getValidator();
        assertThat(v.validate(new ReglasFiscalesRequest("SIMPLIFICADO", new BigDecimal("14.00"), 7, 20000, 0))).isEmpty();
        assertThat(v.validate(new ReglasFiscalesRequest("RARO", new BigDecimal("14.00"), 7, 20000, 0))).isNotEmpty();
        assertThat(v.validate(new ReglasFiscalesRequest("SIMPLIFICADO", new BigDecimal("51"), 7, 20000, 0))).isNotEmpty();
        assertThat(v.validate(new ReglasFiscalesRequest("SIMPLIFICADO", new BigDecimal("14.00"), 0, 20000, 0))).isNotEmpty();
        assertThat(v.validate(new ReglasFiscalesRequest("SIMPLIFICADO", null, 7, 20000, 0))).isNotEmpty();
        assertThat(v.validate(new InscripcionFiscalRequest("NO_INSCRITO", "101230456", "Ana", "Ventas", "a@b.cr"))).isNotEmpty();
        assertThat(v.validate(inscripcion())).isEmpty();
        assertThat(v.validate(new InscripcionFiscalRequest("INSCRITO", "101230456", "Ana", "Ventas", "no-es-correo"))).isNotEmpty();
        assertThat(v.validate(new InscripcionFiscalRequest("INSCRITO", "101230456", "Ana", "Ventas", "a@@b.cr"))).isNotEmpty();
        assertThat(v.validate(new VerificarFiscalRequest("APROBAR", "ok"))).isEmpty();
        assertThat(v.validate(new VerificarFiscalRequest("TAL VEZ", null))).isNotEmpty();
    }
}
