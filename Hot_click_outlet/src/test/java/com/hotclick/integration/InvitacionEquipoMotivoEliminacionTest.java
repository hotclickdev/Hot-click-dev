package com.hotclick.integration;

import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.TipoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.model.WebAuthnCredential;
import com.hotclick.repository.CodigoOtpRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionEquipoRepository;
import com.hotclick.repository.TipoOtpRepository;
import com.hotclick.repository.WebAuthnCredentialRepository;
import com.hotclick.service.OtpService;
import com.hotclick.service.TwoFactorService;
import com.hotclick.utils.Constants;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Seguridad PR 583: una invitación solo reactiva cuentas ELIMINADAS por SALIDA_EQUIPO (fail-closed: NULL, ADMIN,
 * BORRADO_DATOS y cualquier otro valor no), y al reactivar se invalida todo lo que permita retomar la cuenta.
 */
@DisplayName("Reinvitar ELIMINADO: solo motivo SALIDA_EQUIPO (fail-closed) e invalidación de credenciales pendientes")
class InvitacionEquipoMotivoEliminacionTest extends BaseIntegrationTest {

    private static final String VIEJA = "Test1234!";
    private static final String NUEVA = "Nueva12345";
    private static final String CODIGO = "123456";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private InvitacionEquipoRepository invitaciones;
    @Autowired private CodigoOtpRepository codigoOtpRepository;
    @Autowired private TipoOtpRepository tipoOtpRepository;
    @Autowired private WebAuthnCredentialRepository webAuthnRepository;
    @Autowired private OtpService otpService;
    @Autowired private TwoFactorService twoFactorService;

    private Empresa emp;
    private Rol rol;
    private String tDueno;

    @BeforeEach
    void setUp() {
        rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        for (String t : new String[] {"RESET_PASSWORD", "REGISTRO", "2FA_LOGIN"}) {
            jdbcTemplate.update("INSERT INTO hot_click_tipo_otp_tb (nombre, tiempo_expiracion_seg, longitud_codigo, fk_id_estado) "
                + "SELECT ?, 600, 6, 1 WHERE NOT EXISTS (SELECT 1 FROM hot_click_tipo_otp_tb WHERE nombre = ?)", t, t);
        }
        Empresa e = new Empresa();
        e.setNombreEmpresa("motivo-a"); e.setNombreComercial("motivo-a"); e.setSlug("motivo-a");
        e.setCorreoEmpresa("motivo-a@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Usuario dueno = crearUsuario("motivo-dueno@test.cr", "Dueno", rol);
        dueno.setEmpresa(emp);
        dueno = usuarioRepository.saveAndFlush(dueno);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, emp, "PROPIETARIO"));
        tDueno = tokenPara(dueno, Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void limpiar() {
        webAuthnRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM hot_click_codigo_otp_tb");
        refreshTokenRepository.deleteAll();
        invitaciones.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Usuario miembro(String correo) {
        Usuario u = crearUsuario(correo, "Persona", rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, "LECTOR"));
        return u;
    }

    private Usuario recargar(Usuario u) { return usuarioRepository.findById(u.getId()).orElseThrow(); }

    private void invitar(String correo) throws Exception {
        mockMvc.perform(post("/api/empresa/equipo").header("Authorization", tDueno)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Invitada Prueba\",\"correo\":\"" + correo + "\",\"telefono\":\"00000000\",\"rolEnEmpresa\":\"EDITOR\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Invitación enviada"));
    }

    private int aceptarNueva(String token, String contrasena) throws Exception {
        return mockMvc.perform(post("/api/auth/equipo-invitacion/aceptar-cuenta-nueva")
                .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + token + "\",\"contrasena\":\"" + contrasena + "\"}"))
            .andReturn().getResponse().getStatus();
    }

    private int publicPost(String url, String json) throws Exception {
        return mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json))
            .andReturn().getResponse().getStatus();
    }

    private void salirDelEquipo(Usuario u) throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + u.getId()).header("Authorization", tDueno)).andExpect(status().isOk());
    }

    private void plantarOtp(Usuario u, String tipo, boolean verificadoSinCanjear) {
        TipoOtp t = tipoOtpRepository.findByNombre(tipo).orElseThrow();
        CodigoOtp o = new CodigoOtp();
        o.setUsuario(u);
        o.setTipoOtp(t);
        o.setCodigoHash(passwordEncoder.encode(CODIGO));
        o.setExpiresAt(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        o.setAttempts(0);
        o.setActiveFlag(!verificadoSinCanjear);
        if (verificadoSinCanjear) o.setUsedAt(LocalDateTime.now(Constants.ZONA_CR));
        codigoOtpRepository.saveAndFlush(o);
    }

    /** Fuerza la cuenta a ELIMINADA con un motivo dado (null = fila anterior a V240). */
    private Usuario eliminadaCon(String correo, String motivo) {
        Usuario u = miembro(correo);
        u.setEstado(Constants.ESTADO_ELIMINADO);
        u.setMotivoEliminacion(motivo);
        miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), emp.getId()).ifPresent(m -> {
            m.setEstado(0);
            miembroEmpresaRepository.saveAndFlush(m);
        });
        return usuarioRepository.saveAndFlush(u);
    }

    private void noSeReactiva(Usuario u, String motivoEsperado) throws Exception {
        invitar(u.getCorreo());
        assertThat(invitaciones.count()).as("sin token").isZero();
        verify(notificacionEmailService, never()).enviarInvitacionMiembro(eq(u.getCorreo()), any(), any(), any(), anyBoolean(), any());
        String plantado = "plantado-" + u.getId();
        jdbcTemplate.update("INSERT INTO hot_click_invitacion_equipo_tb (fk_id_empresa, correo, nombre, rol_en_empresa, token_hash, fecha_creacion, vence_en) VALUES (?,?,?,?,?,?,?)",
            emp.getId(), u.getCorreo(), "Plantado Prueba", "EDITOR",
            com.hotclick.service.InvitacionEquipoService.hashToken(plantado),
            LocalDateTime.now(Constants.ZONA_CR), LocalDateTime.now(Constants.ZONA_CR).plusDays(1));
        assertThat(aceptarNueva(plantado, NUEVA)).isEqualTo(410);
        Usuario r = recargar(u);
        assertThat(r.getEstado()).isEqualTo(Constants.ESTADO_ELIMINADO);
        assertThat(r.getMotivoEliminacion()).isEqualTo(motivoEsperado);
        assertThat(passwordEncoder.matches(VIEJA, r.getContrasenaHash())).isTrue();
        assertThat(passwordEncoder.matches(NUEVA, r.getContrasenaHash())).isFalse();
        invitaciones.deleteAll();
    }

    @Test
    @DisplayName("SALIDA_EQUIPO: salir del único negocio fija el motivo; reinvitar + aceptar reactiva y lo limpia")
    void salidaDeEquipoSeReactiva() throws Exception {
        Usuario u = miembro("motivo-salida@test.cr");
        salirDelEquipo(u);
        Usuario e = recargar(u);
        assertThat(e.getEstado()).isEqualTo(Constants.ESTADO_ELIMINADO);
        assertThat(e.getMotivoEliminacion()).isEqualTo("SALIDA_EQUIPO");

        invitar(u.getCorreo());
        assertThat(aceptarNueva(tokenInvitacionEnviadoA(u.getCorreo()), NUEVA)).isEqualTo(200);
        Usuario r = recargar(u);
        assertThat(r.getId()).isEqualTo(u.getId());
        assertThat(r.getEstado()).isEqualTo(Constants.ESTADO_ACTIVO);
        assertThat(r.getMotivoEliminacion()).isNull();
        assertThat(passwordEncoder.matches(NUEVA, r.getContrasenaHash())).isTrue();
        assertThat(miembroEmpresaRepository.countEmpresasByUsuarioId(u.getId())).isEqualTo(1);
    }

    @Test
    @DisplayName("motivo NULL (fila anterior a V240): misma respuesta, sin token ni correo; token plantado = 410; no cambia nada")
    void motivoNullNoSeReactiva() throws Exception {
        noSeReactiva(eliminadaCon("motivo-null@test.cr", null), null);
    }

    @Test
    @DisplayName("motivo ADMIN, BORRADO_DATOS y un valor desconocido: no se reactivan")
    void otrosMotivosNoSeReactivan() throws Exception {
        for (String m : new String[] {"ADMIN", "BORRADO_DATOS", "basura"}) {
            noSeReactiva(eliminadaCon("motivo-" + m.toLowerCase() + "@test.cr", m), m);
        }
    }

    @Test
    @DisplayName("reset de contraseña emitido ANTES de reactivar (activo y verificado sin canjear) da 400 DESPUÉS")
    void resetAnteriorNoSirve() throws Exception {
        Usuario u = miembro("motivo-reset@test.cr");
        plantarOtp(u, "RESET_PASSWORD", false);
        salirDelEquipo(u);
        plantarOtp(u, "RESET_PASSWORD", true);
        invitar(u.getCorreo());
        assertThat(aceptarNueva(tokenInvitacionEnviadoA(u.getCorreo()), NUEVA)).isEqualTo(200);

        assertThat(publicPost("/api/auth/verify-code", "{\"correo\":\"" + u.getCorreo() + "\",\"codigo\":\"" + CODIGO + "\"}"))
            .isEqualTo(400);
        assertThat(publicPost("/api/auth/reset-password",
            "{\"correo\":\"" + u.getCorreo() + "\",\"codigo\":\"" + CODIGO + "\",\"nuevaContrasena\":\"Otra12345Xy\"}"))
            .isEqualTo(400);
        assertThat(passwordEncoder.matches(NUEVA, recargar(u).getContrasenaHash())).isTrue();
        assertThat(codigoOtpRepository.findAll().stream().anyMatch(o -> Boolean.TRUE.equals(o.getActiveFlag()))).isFalse();
    }

    @Test
    @DisplayName("OTP de REGISTRO (verificación de correo) y de 2FA_LOGIN emitidos antes dejan de servir")
    void otpDeRegistroYDosFaAnterioresNoSirven() throws Exception {
        Usuario u = miembro("motivo-reg@test.cr");
        plantarOtp(u, "REGISTRO", false);
        plantarOtp(u, "2FA_LOGIN", false);
        salirDelEquipo(u);
        invitar(u.getCorreo());
        assertThat(aceptarNueva(tokenInvitacionEnviadoA(u.getCorreo()), NUEVA)).isEqualTo(200);
        Usuario r = recargar(u);
        assertThatThrownBy(() -> otpService.verificarOtp(r, "REGISTRO", CODIGO)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> otpService.verificarOtp(r, "2FA_LOGIN", CODIGO)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("2FA/TOTP: el secreto, los recovery codes y los métodos se borran; un código TOTP válido de antes ya no sirve")
    void totpSeApaga() throws Exception {
        Usuario u = miembro("motivo-totp@test.cr");
        String claro = twoFactorService.generateSecret();
        u.setTwoFactorSecret(twoFactorService.encryptForStorage(claro));
        u.setTwoFactorPendingSecret(twoFactorService.encryptForStorage(twoFactorService.generateSecret()));
        u.setRecoveryCodes("[\"x\"]");
        u.setTwoFactorMethods(Constants.METODO_2FA_TOTP); u.setTwoFactorEnabled(true);
        u.setTotpLastUsedOtp("000000");
        u.setTotpLastUsedAt(LocalDateTime.now(Constants.ZONA_CR));
        u = usuarioRepository.saveAndFlush(u);
        long t = new SystemTimeProvider().getTime() / 30;
        String codigo = new DefaultCodeGenerator().generate(claro, t);
        assertThat(twoFactorService.verifyCode(recargar(u).getTwoFactorSecret(), codigo)).as("válido antes").isTrue();

        salirDelEquipo(u);
        invitar(u.getCorreo());
        assertThat(aceptarNueva(tokenInvitacionEnviadoA(u.getCorreo()), NUEVA)).isEqualTo(200);

        Usuario r = recargar(u);
        assertThat(r.getTwoFactorEnabled()).isFalse();
        assertThat(r.getTwoFactorSecret()).isNull();
        assertThat(r.getTwoFactorPendingSecret()).isNull();
        assertThat(r.getRecoveryCodes()).isNull();
        assertThat(r.getTwoFactorMethods()).isNull();
        assertThat(r.getTotpLastUsedOtp()).isNull();
        assertThat(r.getTotpLastUsedAt()).isNull();
        assertThat(twoFactorService.verifyCode(r.getTwoFactorSecret(), codigo)).as("el código de antes ya no sirve").isFalse();
    }

    @Test
    @DisplayName("passkeys (WebAuthn) previas se borran al reactivar")
    void passkeysSeBorran() throws Exception {
        Usuario u = miembro("motivo-pk@test.cr");
        WebAuthnCredential c = new WebAuthnCredential();
        c.setUsuario(u); c.setCredentialId("cred-motivo-pk"); c.setPublicKeyCose("AAAA"); c.setSignCount(0);
        webAuthnRepository.saveAndFlush(c);
        salirDelEquipo(u);
        invitar(u.getCorreo());
        assertThat(aceptarNueva(tokenInvitacionEnviadoA(u.getCorreo()), NUEVA)).isEqualTo(200);
        assertThat(webAuthnRepository.findByUsuario_Id(u.getId())).isEmpty();
    }
}
