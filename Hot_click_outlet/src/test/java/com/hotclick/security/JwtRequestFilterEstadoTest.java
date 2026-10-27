package com.hotclick.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TokenRevocadoService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("JwtRequestFilter — una cuenta no activa no se autentica aunque el JWT sea válido")
class JwtRequestFilterEstadoTest {

    private JwtUtil jwtUtil;
    private UserDetailsService userDetailsService;
    private JwtRequestFilter filter;
    private final FilterChain chain = mock(FilterChain.class);

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtUtil = mock(JwtUtil.class);
        userDetailsService = mock(UserDetailsService.class);
        TokenRevocadoService revocados = mock(TokenRevocadoService.class);
        Cache<String, UserDetails> cache = Caffeine.newBuilder().build();
        when(jwtUtil.extractUsername("jwt")).thenReturn("estado@test.cr");
        when(jwtUtil.validateToken("jwt", "estado@test.cr")).thenReturn(true);
        when(revocados.estaRevocado(any())).thenReturn(false);
        filter = new JwtRequestFilter();
        ReflectionTestUtils.setField(filter, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(filter, "userDetailsService", userDetailsService);
        ReflectionTestUtils.setField(filter, "auditService", mock(SecurityAuditService.class));
        ReflectionTestUtils.setField(filter, "userDetailsCache", cache);
        ReflectionTestUtils.setField(filter, "tokenRevocadoService", revocados);
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private void pasarPorElFiltro() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/empresa/equipo");
        req.addHeader("Authorization", "Bearer jwt");
        filter.doFilter(req, new MockHttpServletResponse(), chain);
        verify(chain).doFilter(any(), any());
    }

    @Test
    @DisplayName("UserDetails deshabilitado (p. ej. ya cacheado) → sin autenticación")
    void userDetailsDeshabilitadoNoAutentica() throws Exception {
        when(userDetailsService.loadUserByUsername(anyString()))
            .thenReturn(new User("estado@test.cr", "x", false, true, true, true, List.of()));
        pasarPorElFiltro();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("el loader rechaza la cuenta (DisabledException) → sin autenticación")
    void loaderRechazaNoAutentica() throws Exception {
        when(userDetailsService.loadUserByUsername(anyString())).thenThrow(new DisabledException("Cuenta no activa"));
        pasarPorElFiltro();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("control: cuenta activa con JWT válido → autenticada")
    void activoAutentica() throws Exception {
        when(userDetailsService.loadUserByUsername(anyString()))
            .thenReturn(new User("estado@test.cr", "x", List.of()));
        pasarPorElFiltro();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }
}
