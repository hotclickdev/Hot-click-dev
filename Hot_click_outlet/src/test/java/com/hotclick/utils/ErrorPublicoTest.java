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
}
