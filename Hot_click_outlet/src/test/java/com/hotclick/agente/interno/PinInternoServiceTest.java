package com.hotclick.agente.interno;

import com.hotclick.agente.interno.InternoTestSupport.Equipo;
import com.hotclick.agente.interno.InternoTestSupport.RelojMutable;
import com.hotclick.agente.interno.InternoTestSupport.RepoMemoria;
import com.hotclick.agente.interno.PinInternoService.Resultado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

class PinInternoServiceTest {

    private static final long EMPRESA = 7L;
    private static final long USUARIO = 100L;
    private static final String PIN_OK = "4827";
    private static final String PIN_MAL = "7391";

    private RelojMutable reloj;
    private RepoMemoria memoria;
    private PasswordEncoder encoder;
    private PinInternoService pins;
    private Long idVinculacion;

    @BeforeEach
    void init() {
        reloj = new RelojMutable();
        memoria = new RepoMemoria(reloj);
        Equipo equipo = new Equipo().con(USUARIO, EMPRESA);
        encoder = spy(new BCryptPasswordEncoder(4));
        HasherInterno hasher = new HasherInterno("llave-de-prueba");
        VinculacionInternaService vinc = new VinculacionInternaService(memoria.repo, equipo.usuarios, hasher, reloj);
        pins = new PinInternoService(memoria.repo, vinc, encoder, reloj);
        pins.definir(USUARIO, EMPRESA, PIN_OK);
        idVinculacion = memoria.filas.get(0).getId();
    }

    @Test
    void elPinSeGuardaSoloConHash() {
        AgenteVinculacion v = memoria.filas.get(0);
        assertThat(v.getPinHash()).isNotEqualTo(PIN_OK).startsWith("$2");
        assertThat(encoder.matches(PIN_OK, v.getPinHash())).isTrue();
        assertThat(v.toString()).doesNotContain(PIN_OK).doesNotContain(v.getPinHash());
    }

    @Test
    void formatoYPinDebilesSeRechazan() {
        assertThatThrownBy(() -> pins.definir(USUARIO, EMPRESA, "123")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> pins.definir(USUARIO, EMPRESA, "1234567")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> pins.definir(USUARIO, EMPRESA, "12ab")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> pins.definir(USUARIO, EMPRESA, "1111")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> pins.definir(USUARIO, EMPRESA, "123456")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> pins.definir(USUARIO, EMPRESA, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void pinCorrectoAbreSesionDe15MinutosQueVence() {
        assertThat(pins.verificar(idVinculacion, PIN_OK).resultado()).isEqualTo(Resultado.OK);
        AgenteVinculacion v = memoria.filas.get(0);
        assertThat(v.pinVigente(reloj.instant())).isTrue();
        reloj.avanzar(Duration.ofMinutes(14));
        assertThat(v.pinVigente(reloj.instant())).isTrue();
        reloj.avanzar(Duration.ofMinutes(2));
        assertThat(v.pinVigente(reloj.instant())).isFalse();
    }

    @Test
    void cincoFallosBloquean15MinutosAunConPinCorrecto() {
        for (int i = 1; i <= 4; i++) {
            PinInternoService.Verificacion r = pins.verificar(idVinculacion, PIN_MAL);
            assertThat(r.resultado()).isEqualTo(Resultado.INCORRECTO);
            assertThat(r.intentosRestantes()).isEqualTo(5 - i);
        }
        assertThat(pins.verificar(idVinculacion, PIN_MAL).resultado()).isEqualTo(Resultado.BLOQUEADO);
        // Bloqueado: ni el PIN correcto entra, y no abre sesión.
        assertThat(pins.verificar(idVinculacion, PIN_OK).resultado()).isEqualTo(Resultado.BLOQUEADO);
        assertThat(memoria.filas.get(0).pinVigente(reloj.instant())).isFalse();
        reloj.avanzar(Duration.ofMinutes(14));
        assertThat(pins.verificar(idVinculacion, PIN_OK).resultado()).isEqualTo(Resultado.BLOQUEADO);
        reloj.avanzar(Duration.ofMinutes(2));
        assertThat(pins.verificar(idVinculacion, PIN_OK).resultado()).isEqualTo(Resultado.OK);
    }

    @Test
    void unAciertoReiniciaLaCuentaDeFallos() {
        pins.verificar(idVinculacion, PIN_MAL);
        pins.verificar(idVinculacion, PIN_MAL);
        assertThat(pins.verificar(idVinculacion, PIN_OK).resultado()).isEqualTo(Resultado.OK);
        assertThat(memoria.filas.get(0).getPinIntentosFallidos()).isZero();
        assertThat(pins.verificar(idVinculacion, PIN_MAL).intentosRestantes()).isEqualTo(4);
    }

    @Test
    void sinPinSeComparaContraUnHashDeRellenoParaNoDelatarloPorTiempo() {
        memoria.filas.get(0).setPinHash(null);
        org.mockito.Mockito.clearInvocations(encoder);
        assertThat(pins.verificar(idVinculacion, PIN_OK).resultado()).isEqualTo(Resultado.SIN_PIN);
        verify(encoder, atLeastOnce()).matches(any(), any()); // misma operación costosa que con PIN
    }

    @Test
    void laComparacionUsaElEncoderNoIgualdadDeTexto() {
        pins.verificar(idVinculacion, PIN_MAL);
        verify(encoder, atLeastOnce()).matches(PIN_MAL, memoria.filas.get(0).getPinHash());
        assertThat(HasherInterno.iguales("abc", "abc")).isTrue();
        assertThat(HasherInterno.iguales("abc", "abd")).isFalse();
        assertThat(HasherInterno.iguales(null, "abc")).isFalse();
    }

    @Test
    void elPinNoApareceEnElObjetoDeLaPeticion() {
        assertThat(new com.hotclick.agente.interno.AgenteInternoController.PinRequest(PIN_OK).toString())
            .doesNotContain(PIN_OK);
    }
}
