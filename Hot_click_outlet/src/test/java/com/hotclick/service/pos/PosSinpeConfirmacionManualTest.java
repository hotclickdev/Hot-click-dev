package com.hotclick.service.pos;

import com.hotclick.exception.AutoconfirmacionSinpeException;
import com.hotclick.model.PosQrSesion;
import com.hotclick.model.PosSinpeConfirmacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PosSinpeConfirmacionRepository;
import jakarta.persistence.Column;
import org.hibernate.annotations.Immutable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("POS: confirmación manual de SINPE (referencia, inmutable, cuatro ojos)")
class PosSinpeConfirmacionManualTest {

    // (a) referencia
    @ParameterizedTest
    @CsvSource({"' abc123 ',ABC123", "123456789012,123456789012", "FT26102200001X,FT26102200001X"})
    void referenciaValidaSeNormaliza(String cruda, String esperada) {
        assertThat(ReferenciaSinpe.validar(cruda)).isEqualTo(esperada);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "12345", "12 3456", "ref-123456", "pagado por sinpe hoy",
        "<script>1</script>", "1234567890123456789012345678901", "ÁBC1234"})
    void referenciaInvalidaMensajeFijoSinEco(String cruda) {
        assertThatThrownBy(() -> ReferenciaSinpe.validar(cruda))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(ReferenciaSinpe.MSG_INVALIDA);
    }

    @Test
    void referenciaNulaONoTextoSeRechaza() {
        assertThatThrownBy(() -> ReferenciaSinpe.validar(null)).hasMessage(ReferenciaSinpe.MSG_INVALIDA);
        assertThatThrownBy(() -> ReferenciaSinpe.validar(12345678)).hasMessage(ReferenciaSinpe.MSG_INVALIDA);
    }

    // (b) inmutable
    @Test
    @DisplayName("El registro es @Immutable y ninguna columna es actualizable")
    void registroInmutable() {
        assertThat(PosSinpeConfirmacion.class.isAnnotationPresent(Immutable.class)).isTrue();
        for (Field f : PosSinpeConfirmacion.class.getDeclaredFields()) {
            Column c = f.getAnnotation(Column.class);
            assertThat(c).as(f.getName()).isNotNull();
            assertThat(c.updatable()).as(f.getName()).isFalse();
        }
        assertThat(Arrays.stream(PosSinpeConfirmacion.class.getMethods()).map(Method::getName))
            .noneMatch(n -> n.startsWith("set"));
    }

    @Test
    @DisplayName("El repositorio no expone delete ni update")
    void repositorioSoloAltaYLectura() {
        assertThat(Arrays.stream(PosSinpeConfirmacionRepository.class.getMethods()).map(Method::getName))
            .noneMatch(n -> n.startsWith("delete") || n.startsWith("update") || n.equals("saveAll"));
    }

    // (c) cuatro ojos
    @Test
    void quienGeneroNoPuedeConfirmar() {
        ConfirmadorDistintoGuard guard = new ConfirmadorDistintoGuard();
        PosQrSesion s = sesionDe(7L);
        assertThatThrownBy(() -> guard.exigirConfirmadorDistinto(s, 7L))
            .isInstanceOf(AutoconfirmacionSinpeException.class);
        guard.exigirConfirmadorDistinto(s, 8L);
    }

    @Test
    @DisplayName("Fail-closed: sin autor o sin confirmador, se rechaza")
    void sinAutorOConfirmadorSeRechaza() {
        ConfirmadorDistintoGuard guard = new ConfirmadorDistintoGuard();
        assertThatThrownBy(() -> guard.exigirConfirmadorDistinto(new PosQrSesion(), 8L))
            .isInstanceOf(AutoconfirmacionSinpeException.class);
        assertThatThrownBy(() -> guard.exigirConfirmadorDistinto(sesionDe(7L), null))
            .isInstanceOf(AutoconfirmacionSinpeException.class);
    }

    private static PosQrSesion sesionDe(Long usuarioId) {
        Usuario u = new Usuario();
        u.setId(usuarioId);
        PosQrSesion s = new PosQrSesion();
        s.setUsuario(u);
        return s;
    }
}
