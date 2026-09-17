package com.hotclick.service.producto;

import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Visibilidad de SKU")
class SkuVisibilityTest {

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Anónimo y comprador no ven SKU")
    void anonimoYCompradorNoVen() {
        SecurityContextHolder.clearContext();
        assertThat(SkuVisibility.puedeVer()).isFalse();

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(
                "cliente@test.cr",
                "x",
                List.of(new SimpleGrantedAuthority("ROLE_" + Constants.ROL_USUARIO_FINAL))));
        assertThat(SkuVisibility.puedeVer()).isFalse();
    }

    @Test
    @DisplayName("Admin y dueño de negocio sí ven SKU")
    void adminYEmprendedorVen() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(
                "dueno@test.cr",
                "x",
                List.of(new SimpleGrantedAuthority("ROLE_" + Constants.ROL_EMPRENDEDOR))));
        assertThat(SkuVisibility.puedeVer()).isTrue();

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(
                "admin@hotclick.com",
                "x",
                List.of(new SimpleGrantedAuthority("ROLE_" + Constants.ROL_ADMIN))));
        assertThat(SkuVisibility.puedeVer()).isTrue();
    }

    @Test
    @DisplayName("Los mapas públicos no llevan SKU ni número local")
    void mapasPublicosSinInternos() {
        Map<String, Object> limpio = SkuVisibility.sinInternos(Map.of(
            "nombre_producto", "Lámpara",
            "sku", "E12-0004",
            "numeroLocal", 4,
            "precio_venta", 20000));
        assertThat(limpio).doesNotContainKeys("sku", "numeroLocal");
        assertThat(limpio).containsEntry("nombre_producto", "Lámpara");
    }
}
