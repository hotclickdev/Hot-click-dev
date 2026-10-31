package com.hotclick.service;

import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.exception.CorreoYaRegistradoException;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/** BAJO: el alta de emprendedor exige la misma política de contraseña que el registro (esContrasenaValida). */
@ExtendWith(MockitoExtension.class)
class PoliticaContrasenaAltasTest {

    @Mock InputSanitizer sanitizer;
    @Mock UsuarioRepository usuarioRepository;
    @InjectMocks EmprendedorRegistroService servicio;

    private RegistroEmpresaDTO dto(String clave) {
        lenient().when(sanitizer.cleanWithLimit(anyString(), anyInt())).thenAnswer(i -> i.getArgument(0));
        RegistroEmpresaDTO d = new RegistroEmpresaDTO();
        d.setNombreEmpresa("Tienda Ana");
        d.setNombreAdmin("Ana");
        d.setCorreoAdmin("ana@test.cr");
        d.setPasswordAdmin(clave);
        return d;
    }

    @ParameterizedTest
    @ValueSource(strings = {"Abcdef1", "abcdefg1", "Abcdefgh", ""})
    void emprendedorRechazaClaveFueraDePolitica(String clave) {
        assertThatThrownBy(() -> servicio.registrar(dto(clave)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(AuthSupport.MENSAJE_POLITICA_CONTRASENA);
    }

    @Test
    void emprendedorAceptaClaveValidaYSigueAlChequeoDeCorreo() {
        when(usuarioRepository.existsByCorreo("ana@test.cr")).thenReturn(true);
        assertThatThrownBy(() -> servicio.registrar(dto("Abcdefg1")))
                .isInstanceOf(CorreoYaRegistradoException.class);
    }

    @Test
    void politicaEstaticaIgualQueEsContrasenaValida() {
        AuthSupport a = new AuthSupport();
        for (String c : new String[]{null, "Abcdef1", "abcdefg1", "Abcdefgh", "Abcdefg1"}) {
            assertThat(AuthSupport.cumplePoliticaContrasena(c)).isEqualTo(a.esContrasenaValida(c));
        }
        assertThat(AuthSupport.cumplePoliticaContrasena("Abcdefg1")).isTrue();
    }
}
