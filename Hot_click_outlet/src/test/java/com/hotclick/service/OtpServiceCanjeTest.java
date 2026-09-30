package com.hotclick.service;

import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.repository.CodigoOtpRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Paso 3 de recuperar contraseña: el OTP verificado solo se canjea con el mismo código,
 * una vez y con límite de intentos.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("OtpService — canje de OTP verificado (reset-password)")
class OtpServiceCanjeTest {

    private static final String TIPO = Constants.OTP_TIPO_RESET_PASSWORD;
    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder(4);

    @Mock private CodigoOtpRepository repo;

    private final OtpService service = new OtpService();
    private final Usuario usuario = new Usuario();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "codigoOtpRepository", repo);
        ReflectionTestUtils.setField(service, "passwordEncoder", ENCODER);
    }

    private CodigoOtp otpVerificado(String codigo, int attempts) {
        CodigoOtp otp = new CodigoOtp();
        otp.setIdOtpCode(7L);
        otp.setCodigoHash(ENCODER.encode(codigo));
        otp.setUsedAt(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        otp.setActiveFlag(false);
        otp.setAttempts(attempts);
        return otp;
    }

    private void conVerificados(List<CodigoOtp> lista) {
        when(repo.findVerificadosSinCanjear(eq(usuario), eq(TIPO), eq(Constants.ESTADO_ACTIVO), any())).thenReturn(lista);
    }

    @Test
    @DisplayName("Sin código verificado previo no se puede cambiar la contraseña")
    void sinVerificacionPrevia() {
        conVerificados(List.of());
        assertThat(service.canjearOtpVerificado(usuario, TIPO, "123456")).isFalse();
    }

    @Test
    @DisplayName("Con el código correcto canjea una vez y da de baja los demás")
    void codigoCorrecto() {
        conVerificados(List.of(otpVerificado("123456", 0)));
        when(repo.canjear(7L, Constants.ESTADO_ACTIVO, Constants.ESTADO_INACTIVO)).thenReturn(1);

        assertThat(service.canjearOtpVerificado(usuario, TIPO, "123456")).isTrue();
        verify(repo).darDeBajaVerificados(usuario, TIPO, Constants.ESTADO_ACTIVO, Constants.ESTADO_INACTIVO);
    }

    @Test
    @DisplayName("Solo saber el correo no alcanza: con otro código falla y suma un intento")
    void codigoIncorrecto() {
        conVerificados(List.of(otpVerificado("123456", 0)));

        assertThat(service.canjearOtpVerificado(usuario, TIPO, "654321")).isFalse();
        verify(repo).incrementarAttempts(7L);
        verify(repo, never()).canjear(anyLong(), anyInt(), anyInt());
    }

    @Test
    @DisplayName("Sin código (cliente viejo) falla")
    void sinCodigo() {
        conVerificados(List.of(otpVerificado("123456", 0)));
        assertThat(service.canjearOtpVerificado(usuario, TIPO, null)).isFalse();
    }

    @Test
    @DisplayName("Con los intentos agotados falla aunque el código sea correcto")
    void intentosAgotados() {
        conVerificados(List.of(otpVerificado("123456", Constants.OTP_MAX_INTENTOS)));
        assertThat(service.canjearOtpVerificado(usuario, TIPO, "123456")).isFalse();
        verify(repo, never()).canjear(anyLong(), anyInt(), anyInt());
    }

    @Test
    @DisplayName("Si otra petición ya lo canjeó (carrera), el segundo canje falla")
    void canjeConcurrente() {
        conVerificados(List.of(otpVerificado("123456", 0)));
        when(repo.canjear(7L, Constants.ESTADO_ACTIVO, Constants.ESTADO_INACTIVO)).thenReturn(0);

        assertThat(service.canjearOtpVerificado(usuario, TIPO, "123456")).isFalse();
        verify(repo, never()).darDeBajaVerificados(any(), any(), any(), any());
    }
}
