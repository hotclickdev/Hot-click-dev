package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.EmpresaRequeridaException;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.alta.AltaFasesService;
import com.hotclick.service.onvo.cuenta.CuentaOnvoService;
import com.hotclick.service.reintegro.ReintegroPlataformaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.authorization.method.AuthorizationManagerBeforeMethodInterceptor;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Alta por fases: sin IDOR en el panel del dueño; endpoints admin solo ADMIN")
class AltaFasesSeguridadTest {

    CompanyScope scope = mock(CompanyScope.class);
    PropietarioGuard guard = mock(PropietarioGuard.class);
    AltaFasesService altaFases = mock(AltaFasesService.class);
    CuentaOnvoService cuentaOnvo = mock(CuentaOnvoService.class);

    @AfterEach
    void limpiar() { SecurityContextHolder.clearContext(); }

    @Test
    @DisplayName("El dueño de A solo ve el estado de A: la empresa sale del token, nunca de la petición")
    void estadoSoloDeSuEmpresa() {
        when(scope.requireEmpresaId()).thenReturn(1L);
        when(altaFases.estadoDe(1L)).thenReturn(Map.of("fase", "ONVO"));
        AltaNegocioController c = new AltaNegocioController(scope, guard, altaFases, cuentaOnvo);
        ResponseEntity<ResponseDTO> r = c.estado();
        assertThat(r.getStatusCode().is2xxSuccessful()).isTrue();
        verify(altaFases).estadoDe(1L);
        verify(altaFases, never()).estadoDe(2L);
        // la firma no recibe ningún id de negocio
        assertThat(AltaNegocioController.class.getMethods()).filteredOn(m -> m.getDeclaringClass() == AltaNegocioController.class)
            .allMatch(m -> m.getParameterCount() == 0);
    }

    @Test
    @DisplayName("Sin empresa en el token (comprador o vendedor sin negocio) → 403, no se consulta nada")
    void sinEmpresa() {
        when(scope.requireEmpresaId()).thenThrow(new EmpresaRequeridaException());
        AltaNegocioController c = new AltaNegocioController(scope, guard, altaFases, cuentaOnvo);
        assertThatThrownBy(c::estado).isInstanceOf(EmpresaRequeridaException.class);
        assertThatThrownBy(c::enlaceOnvo).isInstanceOf(EmpresaRequeridaException.class);
        verifyNoInteractions(altaFases, cuentaOnvo);
    }

    @Test
    @DisplayName("El enlace de ONVO solo lo pide el propietario: un miembro del equipo recibe 403 y no se regenera nada")
    void enlaceSoloPropietario() {
        when(scope.requireEmpresaId()).thenReturn(1L);
        doThrow(new AccessDeniedException(PropietarioGuard.MSG)).when(guard).exigirGestionEmpresa(1L);
        AltaNegocioController c = new AltaNegocioController(scope, guard, altaFases, cuentaOnvo);
        assertThatThrownBy(c::enlaceOnvo).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(cuentaOnvo);
    }

    @Test
    @DisplayName("El propietario recibe el enlace de SU negocio (y mensaje claro si no hay)")
    void enlaceDelPropietario() {
        when(scope.requireEmpresaId()).thenReturn(1L);
        when(cuentaOnvo.onboardingUrlParaDueno(1L)).thenReturn(Optional.of("https://onvopay.com/setup/a"), Optional.empty());
        AltaNegocioController c = new AltaNegocioController(scope, guard, altaFases, cuentaOnvo);
        assertThat(c.enlaceOnvo().getBody().getData().toString()).contains("https://onvopay.com/setup/a");
        assertThat(c.enlaceOnvo().getBody().getData().toString()).contains("url=null");
        verify(cuentaOnvo, never()).onboardingUrlParaDueno(2L);
    }

    @ParameterizedTest(name = "{0} → 403 en reintegros")
    @ValueSource(strings = {"ROLE_EMPRENDEDOR", "ROLE_CLIENTE", "ROLE_MIEMBRO", "ROLE_VENDEDOR", "ROLE_FINANCE", "ROLE_SUPPORT"})
    void reintegrosSoloAdmin(String rol) {
        ProxyFactory f = new ProxyFactory(new AdminReintegrosController(mock(ReintegroPlataformaService.class)));
        f.setProxyTargetClass(true);
        f.addAdvisor(AuthorizationManagerBeforeMethodInterceptor.preAuthorize());
        AdminReintegrosController proxy = (AdminReintegrosController) f.getProxy();
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("u", "p", rol));
        assertThatThrownBy(proxy::listar).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> proxy.marcarPago(1L, null, null)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> proxy.marcarNegocio(1L, null, null)).isInstanceOf(AccessDeniedException.class);
    }

    @ParameterizedTest(name = "{0} → 403 en cola de revisión")
    @ValueSource(strings = {"ROLE_EMPRENDEDOR", "ROLE_CLIENTE", "ROLE_MIEMBRO", "ROLE_FINANCE"})
    void revisionSoloAdmin(String rol) {
        ProxyFactory f = new ProxyFactory(new AdminAltaFasesController(mock(EmpresaCuentaOnvoRepository.class), altaFases, mock(com.hotclick.service.alta.AltaFasesColaService.class)));
        f.setProxyTargetClass(true);
        f.addAdvisor(AuthorizationManagerBeforeMethodInterceptor.preAuthorize());
        AdminAltaFasesController proxy = (AdminAltaFasesController) f.getProxy();
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("u", "p", rol));
        assertThatThrownBy(proxy::revision).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> proxy.estado(1L)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("ADMIN sí entra a reintegros y marca idempotente")
    void adminEntra() {
        ReintegroPlataformaService svc = mock(ReintegroPlataformaService.class);
        when(svc.marcarReintegrado(eq(5L), any(), any())).thenReturn(ReintegroPlataformaService.Resultado.YA_REINTEGRADO);
        ProxyFactory f = new ProxyFactory(new AdminReintegrosController(svc));
        f.setProxyTargetClass(true);
        f.addAdvisor(AuthorizationManagerBeforeMethodInterceptor.preAuthorize());
        AdminReintegrosController proxy = (AdminReintegrosController) f.getProxy();
        TestingAuthenticationToken admin = new TestingAuthenticationToken("admin@test.invalid", "p", "ROLE_ADMIN");
        SecurityContextHolder.getContext().setAuthentication(admin);
        assertThat(proxy.marcarPago(5L, new AdminReintegrosController.MarcarRequest("ref"), admin).getStatusCode().value()).isEqualTo(200);
        when(svc.marcarReintegrado(eq(6L), any(), any())).thenReturn(ReintegroPlataformaService.Resultado.NO_APLICA);
        assertThat(proxy.marcarPago(6L, null, admin).getStatusCode().value()).isEqualTo(409);
    }
}
