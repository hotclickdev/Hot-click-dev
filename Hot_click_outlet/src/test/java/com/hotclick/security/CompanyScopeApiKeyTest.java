package com.hotclick.security;

import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * F35-01 — CompanyScope: API key auth retorna empresaId desde TenantContext.
 *
 * Cuando el principal es un String (API key auth), getCurrentEmpresaId()
 * debe leer de TenantContext en lugar de retornar null.
 */
@DisplayName("F35-01 — CompanyScope: API key auth usa TenantContext")
class CompanyScopeApiKeyTest {

    private CompanyScope companyScope;

    @BeforeEach
    void setUp() {
        UsuarioRepository mockRepo = mock(UsuarioRepository.class);
        JwtUtil mockJwtUtil = mock(JwtUtil.class);
        companyScope = new CompanyScope();
        // Inject mocks via reflection (fields @Autowired)
        setField(companyScope, "usuarioRepository", mockRepo);
        setField(companyScope, "jwtUtil", mockJwtUtil);
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    // ── Caso feliz: API key auth → TenantContext ──────────────────────────────

    @Test
    @DisplayName("Principal String (API key) + TenantContext=42 → getCurrentEmpresaId() = 42")
    void apiKeyAuth_returnsEmpresaIdFromTenantContext() {
        // Simular API key auth: principal es String (email empresa), no UserDetails
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            "empresa@hotclick.cr",   // ← String, no UserDetails
            null,
            List.of(new SimpleGrantedAuthority("ROLE_EMPRENDEDOR"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        // TenantFilter ya cargó el empresaId
        TenantContext.set(42L);

        Long empresaId = companyScope.getCurrentEmpresaId();

        assertThat(empresaId).isEqualTo(42L);
    }

    @Test
    @DisplayName("Principal String + TenantContext null → getCurrentEmpresaId() = null")
    void apiKeyAuth_noTenantContext_returnsNull() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            "empresa@hotclick.cr", null,
            List.of(new SimpleGrantedAuthority("ROLE_EMPRENDEDOR"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        // TenantContext no seteado
        TenantContext.clear();

        Long empresaId = companyScope.getCurrentEmpresaId();

        assertThat(empresaId).isNull();
    }

    @Test
    @DisplayName("Sin autenticación → getCurrentEmpresaId() = null")
    void noAuth_returnsNull() {
        SecurityContextHolder.clearContext();

        Long empresaId = companyScope.getCurrentEmpresaId();

        assertThat(empresaId).isNull();
    }

    // ── Caso: ADMIN_IT con JWT → null (puede ver todo) ────────────────────────

    @Test
    @DisplayName("getCurrentUser() retorna null cuando principal es String (no UserDetails)")
    void apiKeyPrincipal_getCurrentUserReturnsNull() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            "empresa@test.cr", null,
            List.of(new SimpleGrantedAuthority("ROLE_EMPRENDEDOR"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        Usuario user = companyScope.getCurrentUser();

        // Principal es String → no es Usuario ni UserDetails → retorna null
        assertThat(user).isNull();
    }

    // ── Caso: Usuario real con JWT → empresaId del usuario ───────────────────

    @Test
    @DisplayName("Principal Usuario (JWT) con empresa.id=10 → getCurrentEmpresaId() = 10")
    void jwtAuth_usuarioPrincipal_returnsEmpresaId() {
        // getEmpresaId() se computa desde empresa.getId(), no es campo directo
        com.hotclick.model.Empresa emp = new com.hotclick.model.Empresa();
        emp.setId(10L);

        Usuario usuarioConEmpresa = new Usuario();
        usuarioConEmpresa.setId(5L);
        usuarioConEmpresa.setCorreo("emprendedor@test.cr");
        usuarioConEmpresa.setEmpresa(emp);
        Rol rolEmprendedor = new Rol();
        rolEmprendedor.setNombreRol("EMPRENDEDOR");
        usuarioConEmpresa.setRoles(java.util.Arrays.asList(rolEmprendedor));

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            usuarioConEmpresa, null,   // ← Usuario como principal (JWT auth)
            List.of(new SimpleGrantedAuthority("ROLE_EMPRENDEDOR"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        Long empresaId = companyScope.getCurrentEmpresaId();

        assertThat(empresaId).isEqualTo(10L);
    }

    // ── Helper: reflection inject ─────────────────────────────────────────────

    private static void setField(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field f = target.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            f.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException("Cannot inject field " + fieldName, e);
        }
    }
}
