package com.hotclick.security;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("CompanyScope — assertCanAccess entre empresas")
class CompanyScopeAccessTest {

    private CompanyScope companyScope;

    @BeforeEach
    void setUp() {
        companyScope = new CompanyScope();
        ReflectionTestUtils.setField(companyScope, "usuarioRepository", mock(UsuarioRepository.class));
        ReflectionTestUtils.setField(companyScope, "jwtUtil", mock(JwtUtil.class));
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("ADMIN accede a cualquier empresa")
    void adminAccedeACualquierEmpresa() {
        autenticar(usuarioConRol(Constants.ROL_ADMIN, 1L));

        assertThatCode(() -> companyScope.assertCanAccess(99L)).doesNotThrowAnyException();
        assertThatCode(() -> companyScope.assertCanAccessNullable(null)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("EMPRENDEDOR de A no accede al recurso de B")
    void emprendedorNoAccedeOtraEmpresa() {
        autenticar(usuarioConRol("EMPRENDEDOR", 10L));

        assertThatThrownBy(() -> companyScope.assertCanAccess(99L))
            .isInstanceOf(TenantAccessDeniedException.class)
            .hasMessageContaining("otra empresa");
    }

    @Test
    @DisplayName("EMPRENDEDOR accede a su propia empresa")
    void emprendedorAccedeSuEmpresa() {
        autenticar(usuarioConRol("EMPRENDEDOR", 10L));

        assertThatCode(() -> companyScope.assertCanAccess(10L)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("recurso sin empresa solo lo ve ADMIN")
    void recursoSinEmpresaNiegaNoAdmin() {
        autenticar(usuarioConRol("EMPRENDEDOR", 10L));

        assertThatThrownBy(() -> companyScope.assertCanAccessNullable(null))
            .isInstanceOf(TenantAccessDeniedException.class)
            .hasMessageContaining("sin empresa");
    }

    @Test
    @DisplayName("ADMIN OrOwn no cae a fk_id_empresa (plataforma sin negocio)")
    void adminOrOwnSinEmpresaPropia() {
        autenticar(usuarioConRol(Constants.ROL_ADMIN, 1L));

        assertThat(companyScope.getCurrentEmpresaIdOrOwn()).isNull();
        assertThat(companyScope.getCurrentEmpresaId()).isNull();
    }

    @Test
    @DisplayName("SUPPORT no tiene bypass de CompanyScope (a diferencia de ADMIN)")
    void supportSinBypassCompanyScope() {
        autenticar(usuarioConRol(Constants.ROL_SUPPORT, null));

        assertThatThrownBy(() -> companyScope.assertCanAccess(99L))
            .isInstanceOf(TenantAccessDeniedException.class)
            .hasMessageContaining("otra empresa");
        assertThatThrownBy(() -> companyScope.assertCanAccessNullable(null))
            .isInstanceOf(TenantAccessDeniedException.class)
            .hasMessageContaining("sin empresa");
    }

    @Test
    @DisplayName("FINANCE y TRUST tampoco bypassean assertCanAccess")
    void financeYTrustSinBypass() {
        autenticar(usuarioConRol(Constants.ROL_FINANCE, null));
        assertThatThrownBy(() -> companyScope.assertCanAccess(1L))
            .isInstanceOf(TenantAccessDeniedException.class);

        autenticar(usuarioConRol(Constants.ROL_TRUST, null));
        assertThatThrownBy(() -> companyScope.assertCanAccess(1L))
            .isInstanceOf(TenantAccessDeniedException.class);
    }

    @Test
    @DisplayName("hasAuthority reconoce permiso en el SecurityContext")
    void hasAuthorityReconocePermiso() {
        Usuario u = usuarioConRol(Constants.ROL_TRUST, null);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            u, null, List.of(
                new SimpleGrantedAuthority("ROLE_TRUST"),
                new SimpleGrantedAuthority(Constants.PERM_GLOBAL_APPROVALS)));
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThat(companyScope.hasAuthority(Constants.PERM_GLOBAL_APPROVALS)).isTrue();
        assertThat(companyScope.hasAuthority(Constants.PERM_GLOBAL_METRICS)).isFalse();
    }

    @Test
    @DisplayName("ADMIN impersonando solo ve el tenant A")
    void adminImpersonandoSoloVeTenantA() {
        JwtUtil jwt = mock(JwtUtil.class);
        ReflectionTestUtils.setField(companyScope, "jwtUtil", jwt);
        when(jwt.isImpersonating(anyString())).thenReturn(true);
        when(jwt.extractEmpresaId(anyString())).thenReturn(10L);

        autenticar(usuarioConRol(Constants.ROL_ADMIN, null));
        mockBearer("impersonation-token");

        assertThat(companyScope.isImpersonating()).isTrue();
        assertThat(companyScope.getCurrentEmpresaId()).isEqualTo(10L);
        assertThat(companyScope.getCurrentEmpresaIdOrOwn()).isEqualTo(10L);
        assertThatCode(() -> companyScope.assertCanAccess(10L)).doesNotThrowAnyException();
        assertThatThrownBy(() -> companyScope.assertCanAccess(99L))
            .isInstanceOf(TenantAccessDeniedException.class)
            .hasMessageContaining("otra empresa");
    }

    @Test
    @DisplayName("EMPRENDEDOR de A no ve recursos de B (aislamiento tenant)")
    void tenantANoVeTenantB() {
        autenticar(usuarioConRol("EMPRENDEDOR", 10L));

        assertThatThrownBy(() -> companyScope.assertCanAccess(20L))
            .isInstanceOf(TenantAccessDeniedException.class);
        assertThatCode(() -> companyScope.assertCanAccess(10L)).doesNotThrowAnyException();
    }

    private static void autenticar(Usuario usuario) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            usuario, null, List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getRoles().get(0).getNombreRol())));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private static void mockBearer(String token) {
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        RequestContextHolder.setRequestAttributes(
            new ServletRequestAttributes(request));
    }

    private static Usuario usuarioConRol(String rolNombre, Long empresaId) {
        Empresa emp = null;
        if (empresaId != null) {
            emp = new Empresa();
            emp.setId(empresaId);
        }
        Rol rol = new Rol();
        rol.setNombreRol(rolNombre);
        Usuario u = new Usuario();
        u.setId(5L);
        u.setCorreo("scope@test.cr");
        u.setEmpresa(emp);
        u.setRoles(List.of(rol));
        return u;
    }
}
