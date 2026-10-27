package com.hotclick.utils;

import com.hotclick.exception.RecursoNoEncontradoException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ESC-3 | mensajes de error públicos")
class ErrorPublicoTest {

    @Test
    void validacionesPropiasSeMuestran() {
        assertThat(ErrorPublico.mensaje(new IllegalArgumentException("El correo ya está registrado"))).isEqualTo("El correo ya está registrado");
        assertThat(ErrorPublico.mensaje(new RecursoNoEncontradoException("Pedido no encontrado"))).isEqualTo("Pedido no encontrado");
    }

    @Test
    void internosSonGenericos() {
        assertThat(ErrorPublico.mensaje(new DataIntegrityViolationException("insert into hot_click_usuario_tb ..."))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new RuntimeException("NullPointer en X"))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new IllegalStateException("could not execute statement; SQL [n/a]"))).isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(null)).isEqualTo(ErrorPublico.GENERICO);
    }

    // ── L3: lista blanca por origen ──────────────────────────────────────────

    @Test
    void iaeDeLibreriaOJdkEsGenerica() {
        // NumberFormatException (IAE) lanzada por el JDK: su texto lleva el valor recibido
        RuntimeException nfe = null;
        try { Long.parseLong("tabla_usuarios_clientes"); } catch (NumberFormatException e) { nfe = e; }
        assertThat(ErrorPublico.mensaje(nfe)).isEqualTo(ErrorPublico.GENERICO);
        // IAE de Spring Assert
        RuntimeException spring = null;
        try { org.springframework.util.Assert.notNull(null, "campo interno_x requerido"); } catch (IllegalArgumentException e) { spring = e; }
        assertThat(ErrorPublico.mensaje(spring)).isEqualTo(ErrorPublico.GENERICO);
    }

    @Test
    void iaeSinTrazaFallaCerrado() {
        IllegalArgumentException sinTraza = new IllegalArgumentException("Texto que parece válido");
        sinTraza.setStackTrace(new StackTraceElement[0]);
        assertThat(ErrorPublico.mensaje(sinTraza)).isEqualTo(ErrorPublico.GENERICO);
    }

    @Test
    void iaeLanzadaDesdeLibreriaConTrazaAjenaEsGenerica() {
        IllegalStateException ajena = new IllegalStateException("Texto que parece válido");
        ajena.setStackTrace(new StackTraceElement[]{new StackTraceElement("org.hibernate.Algo", "m", "A.java", 1)});
        assertThat(ErrorPublico.mensaje(ajena)).isEqualTo(ErrorPublico.GENERICO);
    }

    @Test
    void excepcionPropiaMarcadaOEnPaqueteExceptionSeMuestra() {
        assertThat(ErrorPublico.mensaje(new com.hotclick.exception.TenantAccessDeniedException("No es de tu negocio")))
            .isEqualTo("No es de tu negocio");
        assertThat(ErrorPublico.mensaje(new com.hotclick.service.producto.ProductoAltaService.ContenidoNoPermitidoException()))
            .isNotEqualTo(ErrorPublico.GENERICO);
    }

    @Test
    void propiaPeroConTextoInternoOLargoEsGenerica() {
        assertThat(ErrorPublico.mensaje(new com.hotclick.exception.TenantAccessDeniedException("SELECT x FROM hot_click_t")))
            .isEqualTo(ErrorPublico.GENERICO);
        assertThat(ErrorPublico.mensaje(new IllegalArgumentException("a".repeat(301)))).isEqualTo(ErrorPublico.GENERICO);
    }
}
