package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.TiendaRapida;
import com.hotclick.model.Usuario;
import com.hotclick.repository.*;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.auth.ClerkSyncService;
import com.hotclick.service.consola.TiendaRapidaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * BAJO correo-normalizado: Clerk y Tienda rápida ya normalizaban el correo de entrada, pero buscaban la cuenta
 * con igualdad exacta. Una cuenta antigua guardada con mayúsculas no se encontraba: Clerk creaba un duplicado y
 * Tienda rápida dejaba pasar el correo. Datos ficticios.
 */
@DisplayName("[BAJO] Correo normalizado encuentra cuentas antiguas con mayúsculas (Clerk, Tienda rápida)")
class CorreoCuentaAntiguaMayusculasTest {

    private static final String GUARDADO = "Cliente.Antiguo@Test.CR";
    private static final String ENTRADA = "  CLIENTE.antiguo@test.cr ";

    private static Usuario antigua() {
        Usuario u = new Usuario();
        u.setId(5L);
        u.setCorreo(GUARDADO);
        u.setEstado(1);
        u.setRoles(new ArrayList<>());
        return u;
    }

    @Test
    @DisplayName("ClerkSync vincula la cuenta antigua con mayúsculas en vez de crear un duplicado")
    void clerkVinculaCuentaAntigua() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario vieja = antigua();
        when(repo.findByClerkUserId(anyString())).thenReturn(Optional.empty());
        when(repo.findByCorreo(anyString())).thenReturn(Optional.empty());
        when(repo.findByCorreo(GUARDADO)).thenReturn(Optional.of(vieja));
        when(repo.findAllByCorreoIgnoreCase("cliente.antiguo@test.cr")).thenReturn(List.of(vieja));
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        ClerkSyncService s = new ClerkSyncService();
        ReflectionTestUtils.setField(s, "usuarioRepository", repo);
        ReflectionTestUtils.setField(s, "rolRepository", mock(RolRepository.class));
        ReflectionTestUtils.setField(s, "passwordEncoder", mock(PasswordEncoder.class));
        ReflectionTestUtils.setField(s, "authSupport", mock(AuthSupport.class));

        s.sync("user_fict999", ENTRADA, "Cliente", "Antiguo", "", true);

        verify(repo, never()).save(argThat(u -> u.getId() == null));
        assertThat(vieja.getClerkUserId()).isEqualTo("user_fict999");
    }

    @Test
    @DisplayName("Tienda rápida rechaza un correo que ya existe con mayúsculas en una cuenta antigua")
    void tiendaRapidaDetectaCuentaAntigua() {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(usuarios.findAllByCorreoIgnoreCase("cliente.antiguo@test.cr")).thenReturn(List.of(antigua()));
        TiendaRapidaService svc = new TiendaRapidaService(mock(TiendaRapidaRepository.class), empresas, usuarios,
            mock(MiembroEmpresaRepository.class), mock(RolRepository.class), mock(PlanRepository.class),
            mock(PasswordEncoder.class));
        TiendaRapida fila = new TiendaRapida();
        Usuario interno = new Usuario();
        interno.setCorreo("rapida-tmp@hotclick.interno");
        fila.setUsuario(interno);
        fila.setEmpresa(new Empresa());

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(svc, "aplicarDatos", fila,
                "Cliente Antiguo", "1-2345-6789", ENTRADA, "8888-0000"))
            .hasMessage("Ese correo no está disponible. Usá otro.");
    }

    @Test
    @DisplayName("Tienda rápida rechaza un correo que ya existe con mayúsculas en una tienda antigua")
    void tiendaRapidaDetectaTiendaAntigua() {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(usuarios.findAllByCorreoIgnoreCase(anyString())).thenReturn(List.of());
        when(empresas.existsByCorreoEmpresaIgnoreCase("cliente.antiguo@test.cr")).thenReturn(true);
        TiendaRapidaService svc = new TiendaRapidaService(mock(TiendaRapidaRepository.class), empresas, usuarios,
            mock(MiembroEmpresaRepository.class), mock(RolRepository.class), mock(PlanRepository.class),
            mock(PasswordEncoder.class));
        TiendaRapida fila = new TiendaRapida();
        Usuario interno = new Usuario();
        interno.setCorreo("rapida-tmp@hotclick.interno");
        fila.setUsuario(interno);
        Empresa e = new Empresa();
        e.setCorreoEmpresa("rapida-tmp@hotclick.interno");
        fila.setEmpresa(e);

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(svc, "aplicarDatos", fila,
                "Cliente Antiguo", "1-2345-6789", ENTRADA, "8888-0000"))
            .hasMessage("Ese correo no está disponible. Usá otro.");
    }

    @Test
    @DisplayName("Seguridad #469: con una eliminada más vieja y una activa (distintas mayúsculas), vincula la activa")
    void clerkVinculaLaActivaNoLaEliminadaMasVieja() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario eliminada = antigua();
        eliminada.setId(3L);
        eliminada.setEstado(3);
        eliminada.setCorreo("CLIENTE.ANTIGUO@test.cr");
        Usuario activa = antigua();
        activa.setId(9L);
        activa.setCorreo("cliente.antiguo@test.cr");
        when(repo.findByClerkUserId(anyString())).thenReturn(Optional.empty());
        when(repo.findByCorreo(anyString())).thenReturn(Optional.empty());
        when(repo.findByCorreo("CLIENTE.ANTIGUO@test.cr")).thenReturn(Optional.of(eliminada));
        when(repo.findByCorreo("cliente.antiguo@test.cr")).thenReturn(Optional.of(activa));
        when(repo.findAllByCorreoIgnoreCase("cliente.antiguo@test.cr")).thenReturn(List.of(eliminada, activa));
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        ClerkSyncService s = new ClerkSyncService();
        ReflectionTestUtils.setField(s, "usuarioRepository", repo);
        ReflectionTestUtils.setField(s, "rolRepository", mock(RolRepository.class));
        ReflectionTestUtils.setField(s, "passwordEncoder", mock(PasswordEncoder.class));
        ReflectionTestUtils.setField(s, "authSupport", mock(AuthSupport.class));

        s.sync("user_fict777", ENTRADA, "Cliente", "Antiguo", "", true);

        assertThat(activa.getClerkUserId()).isEqualTo("user_fict777");
        assertThat(eliminada.getClerkUserId()).isNull();
        verify(repo, never()).save(argThat(u -> u.getId() == null));
    }

    @Test
    @DisplayName("Seguridad #469: un token sin email_verified no da correo (se rechaza el login social)")
    void tokenSinEmailVerificadoSeRechaza() throws Exception {
        java.lang.reflect.Method m = com.hotclick.controller.ClerkSyncController.class
            .getDeclaredMethod("emailVerificado", org.springframework.security.oauth2.jwt.Jwt.class);
        m.setAccessible(true);
        var sinClaim = org.springframework.security.oauth2.jwt.Jwt.withTokenValue("t").header("alg", "none")
            .claim("sub", "user_fict1").claim("email", "Cliente.Antiguo@Test.CR").build();
        var falso = org.springframework.security.oauth2.jwt.Jwt.withTokenValue("t").header("alg", "none")
            .claim("sub", "user_fict1").claim("email", "Cliente.Antiguo@Test.CR").claim("email_verified", false).build();
        var verificado = org.springframework.security.oauth2.jwt.Jwt.withTokenValue("t").header("alg", "none")
            .claim("sub", "user_fict1").claim("email", "Cliente.Antiguo@Test.CR").claim("email_verified", true).build();
        assertThat(m.invoke(null, sinClaim)).isNull();
        assertThat(m.invoke(null, falso)).isNull();
        assertThat(m.invoke(null, verificado)).isEqualTo("cliente.antiguo@test.cr");
    }
}
