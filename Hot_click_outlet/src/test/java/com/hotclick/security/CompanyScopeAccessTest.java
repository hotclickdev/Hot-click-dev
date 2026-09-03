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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

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
