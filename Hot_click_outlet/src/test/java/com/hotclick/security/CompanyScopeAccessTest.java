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
import org.springframework.mock.web.MockHttpServletRequest;
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
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        companyScope = new CompanyScope();
        jwtUtil = mock(JwtUtil.class);
        ReflectionTestUtils.setField(companyScope, "usuarioRepository", mock(UsuarioRepository.class));
        ReflectionTestUtils.setField(companyScope, "jwtUtil", jwtUtil);
        TenantContext.clear();
        RequestContextHolder.resetRequestAttributes();
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
    @DisplayName("SUPPORT legacy no tiene bypass de CompanyScope (V132)")
    void supportSinBypassDeTenant() {
        autenticar(usuarioConRol(Constants.ROL_SUPPORT, 1L));

        assertThatThrownBy(() -> companyScope.assertCanAccess(99L))
            .isInstanceOf(TenantAccessDeniedException.class)
            .hasMessageContaining("otra empresa");
        // Tras V132 ya no es "sin tenant": usa la empresa del usuario.
        assertThat(companyScope.getCurrentEmpresaId()).isEqualTo(1L);
        assertThat(companyScope.getCurrentEmpresaIdOrOwn()).isEqualTo(1L);
    }

    @Test
    @DisplayName("hasAuthority reconoce permiso global del SecurityContext")
    void hasAuthorityDePermisoGlobal() {
        Usuario u = usuarioConRol(Constants.ROL_FINANCE, null);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            u, null, List.of(
                new SimpleGrantedAuthority("ROLE_" + Constants.ROL_FINANCE),
                new SimpleGrantedAuthority(Constants.PERM_GLOBAL_METRICS)));
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThat(companyScope.hasAuthority(Constants.PERM_GLOBAL_METRICS)).isTrue();
        assertThat(companyScope.hasAuthority(Constants.PERM_GLOBAL_COMPANIES)).isFalse();
    }

    @Test
    @DisplayName("ADMIN impersonando usa tenant del JWT, sin bypass global")
    void adminImpersonandoUsaTenantDelJwt() {
        autenticar(usuarioConRol(Constants.ROL_ADMIN, null));
        mockImpersonationJwt(55L);

        assertThat(companyScope.isImpersonating()).isTrue();
        assertThat(companyScope.isAdminIT()).isFalse();
        assertThat(companyScope.getCurrentEmpresaId()).isEqualTo(55L);
        assertThat(companyScope.getCurrentEmpresaIdOrOwn()).isEqualTo(55L);
        assertThatCode(() -> companyScope.assertCanAccess(55L)).doesNotThrowAnyException();
        assertThatThrownBy(() -> companyScope.assertCanAccess(99L))
            .isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> companyScope.assertCanAccessNullable(null))
            .isInstanceOf(TenantAccessDeniedException.class);
    }

    private void mockImpersonationJwt(Long empresaId) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer fake.impersonation.jwt");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        when(jwtUtil.isImpersonationToken(anyString())).thenReturn(true);
        when(jwtUtil.extractEmpresaId(anyString())).thenReturn(empresaId);
    }

    private static void autenticar(Usuario usuario) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            usuario, null, List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getRoles().get(0).getNombreRol())));
        SecurityContextHolder.getContext().setAuthentication(auth);
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
