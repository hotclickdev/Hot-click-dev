package com.hotclick.service.invitacion;

import com.hotclick.dto.AceptarInvitacionRequest;
import com.hotclick.dto.AuthResponse;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.InvitacionPropietario;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionPropietarioRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.OtpService;
import com.hotclick.service.UsuarioService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Invitación de propietario")
class InvitacionPropietarioServiceTest {

    @Mock InvitacionPropietarioRepository invitacionRepository;
    @Mock EmpresaRepository empresaRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    @Mock RolRepository rolRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuthSupport authSupport;
    @Mock UsuarioService usuarioService;
    @Mock OtpService otpService;
    @Mock NotificacionEmailService notificacionEmailService;
    @Mock AuditoriaAdminRegistroService auditoriaAdminRegistroService;
    @Mock InputSanitizer sanitizer;

    @InjectMocks InvitacionPropietarioService service;

    private Empresa empresa;

    @BeforeEach
    void empresa() {
        empresa = new Empresa();
        empresa.setId(9L);
        empresa.setNombreEmpresa("Taller Luna");
        empresa.setNombreComercial("Taller Luna");
        empresa.setSlug("taller-luna");
        empresa.setPlanSaas("PYME");
    }

    @Test
    @DisplayName("el enlace guarda solo el hash y sigue aunque el correo falle")
    void generarNoGuardaTokenYToleraCorreo() {
        when(empresaRepository.findById(9L)).thenReturn(Optional.of(empresa));
        when(invitacionRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RuntimeException("smtp caído"))
            .when(notificacionEmailService).enviarInvitacionPropietario(anyString(), anyString(), anyString());

        var data = service.generar(9L, "DUEÑO@correo.com", "8888-7777", 1L);

        ArgumentCaptor<InvitacionPropietario> captor = ArgumentCaptor.forClass(InvitacionPropietario.class);
        verify(invitacionRepository).saveAndFlush(captor.capture());
        InvitacionPropietario guardada = captor.getValue();
        String url = data.get("url").toString();
        String token = url.substring(url.lastIndexOf('/') + 1);
        assertThat(url).startsWith("https://hotclick.lat/invitacion/");
        assertThat(guardada.getTokenHash()).isEqualTo(InvitacionTokens.hash(token));
        assertThat(guardada.getTokenHash()).isNotEqualTo(token);
        assertThat(guardada.getTokenHash()).hasSize(64);
        assertThat(guardada.getCorreoDestino()).isEqualTo("dueño@correo.com");
        assertThat(guardada.getTelefonoDestino()).isEqualTo("88887777");
        assertThat(guardada.getExpiraEn()).isAfter(LocalDateTime.now(Constants.ZONA_CR).plusDays(6));
        verify(invitacionRepository).revocarActivas(eq(9L), any());
    }

    @Test
    @DisplayName("un enlace vencido y uno desconocido dicen lo mismo")
    void vencidoYDesconocidoMismoMensaje() {
        when(invitacionRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.verPublica("no-existe"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(InvitacionPropietarioService.MSG_NO_DISPONIBLE);

        InvitacionPropietario vencida = invitacion(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        when(invitacionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(vencida));
        assertThatThrownBy(() -> service.verPublica("vencido"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(InvitacionPropietarioService.MSG_NO_DISPONIBLE);
    }

    @Test
    @DisplayName("revocar no toca otra empresa")
    void revocarSoloLaEmpresaPedida() {
        when(empresaRepository.existsById(9L)).thenReturn(true);
        service.revocar(9L);
        verify(invitacionRepository).revocarActivas(eq(9L), any());
        verify(invitacionRepository, never()).revocarActivas(eq(3L), any());
    }

    @Test
    @DisplayName("empresa inexistente no genera enlace")
    void generarEmpresaAjena() {
        when(empresaRepository.findById(3L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.generar(3L, null, null, 1L))
            .isInstanceOf(RecursoNoEncontradoException.class);
        verify(invitacionRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("usuario nuevo queda como PROPIETARIO con rol EMPRENDEDOR")
    void registroAsignaPropietario() {
        InvitacionPropietario inv = invitacion(LocalDateTime.now(Constants.ZONA_CR).plusDays(2));
        when(invitacionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(inv));
        when(sanitizer.cleanWithLimit(anyString(), anyInt())).thenAnswer(i -> i.getArgument(0));
        when(usuarioRepository.existsByCorreo("ana@hotclick.cr")).thenReturn(false);
        when(usuarioRepository.existsByIdentificacion(anyString())).thenReturn(false);
        when(authSupport.esContrasenaValida("Clave1234")).thenReturn(true);
        when(passwordEncoder.encode("Clave1234")).thenReturn("hash");
        when(usuarioRepository.save(any())).thenAnswer(i -> {
            Usuario u = i.getArgument(0);
            if (u.getId() == null) u.setId(8L);
            return u;
        });
        when(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(8L, 9L)).thenReturn(Optional.empty());
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(8L)).thenReturn(0L);
        when(invitacionRepository.reclamarSiActiva(anyLong(), any(), eq(8L))).thenReturn(1);
        when(empresaRepository.findById(9L)).thenReturn(Optional.of(empresa));
        when(usuarioRepository.findById(8L)).thenAnswer(i -> {
            Usuario u = new Usuario();
            u.setId(8L);
            u.setCorreo("ana@hotclick.cr");
            u.setNombre("Ana");
            return Optional.of(u);
        });
        Rol rol = new Rol();
        rol.setNombreRol(Constants.ROL_EMPRENDEDOR);
        when(rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)).thenReturn(Optional.of(rol));
        when(authSupport.buildAuthResponse(any())).thenReturn(
            new AuthResponse("access", "refresh", 8L, "ana@hotclick.cr", Constants.ROL_EMPRENDEDOR, "Ana"));

        AceptarInvitacionRequest body = new AceptarInvitacionRequest();
        body.setModo("registro");
        body.setNombre("Ana");
        body.setCorreo("ana@hotclick.cr");
        body.setPassword("Clave1234");

        var data = service.aceptar("token-publico", body, null);

        ArgumentCaptor<MiembroEmpresa> miembro = ArgumentCaptor.forClass(MiembroEmpresa.class);
        verify(miembroEmpresaRepository).save(miembro.capture());
        assertThat(miembro.getValue().getRolEnEmpresa()).isEqualTo("PROPIETARIO");
        assertThat(miembro.getValue().getEmpresa().getId()).isEqualTo(9L);
        assertThat(data.get("plan")).isEqualTo("PYME");
        assertThat(data.get("empresaId")).isEqualTo(9L);
        assertThat(data.get("otpPendiente")).isEqualTo(true);

        ArgumentCaptor<Usuario> usuario = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository, times(2)).save(usuario.capture());
        assertThat(usuario.getAllValues().get(1).getRoles())
            .extracting(Rol::getNombreRol)
            .contains(Constants.ROL_EMPRENDEDOR);
    }

    @Test
    @DisplayName("dos aceptaciones a la vez: solo una gana el enlace")
    void unSoloUsoConcurrente() throws Exception {
        InvitacionPropietario inv = invitacion(LocalDateTime.now(Constants.ZONA_CR).plusDays(2));
        Usuario usuario = new Usuario();
        usuario.setId(4L);
        usuario.setCorreo("leo@hotclick.cr");
        usuario.setNombre("Leo");
        usuario.setContrasenaHash("hash");
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.setTwoFactorEnabled(false);

        when(invitacionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(inv));
        when(usuarioRepository.findByCorreo("leo@hotclick.cr")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("Clave1234", "hash")).thenReturn(true);
        when(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(4L, 9L)).thenReturn(Optional.empty());
        when(miembroEmpresaRepository.countEmpresasByUsuarioId(4L)).thenReturn(0L);
        AtomicInteger ganadores = new AtomicInteger();
        when(invitacionRepository.reclamarSiActiva(anyLong(), any(), eq(4L)))
            .thenAnswer(i -> ganadores.getAndIncrement() == 0 ? 1 : 0);
        when(empresaRepository.findById(9L)).thenReturn(Optional.of(empresa));
        when(usuarioRepository.findById(4L)).thenReturn(Optional.of(usuario));
        when(rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)).thenReturn(Optional.empty());
        when(usuarioRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(authSupport.buildAuthResponse(any())).thenReturn(
            new AuthResponse("access", "refresh", 4L, "leo@hotclick.cr", Constants.ROL_EMPRENDEDOR, "Leo"));

        AceptarInvitacionRequest body = new AceptarInvitacionRequest();
        body.setModo("login");
        body.setCorreo("leo@hotclick.cr");
        body.setPassword("Clave1234");

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch listos = new CountDownLatch(2);
        CountDownLatch salida = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger();
        AtomicInteger fallo = new AtomicInteger();
        for (int i = 0; i < 2; i++) {
            pool.submit(() -> {
                listos.countDown();
                try {
                    salida.await();
                    service.aceptar("token-publico", body, null);
                    ok.incrementAndGet();
                } catch (IllegalArgumentException e) {
                    assertThat(e.getMessage()).isEqualTo(InvitacionPropietarioService.MSG_NO_DISPONIBLE);
                    fallo.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        assertThat(listos.await(5, TimeUnit.SECONDS)).isTrue();
        salida.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        assertThat(ok.get()).isEqualTo(1);
        assertThat(fallo.get()).isEqualTo(1);
        verify(miembroEmpresaRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("el OTP fallido no borra la aceptación")
    void otpNoRevierte() {
        doThrow(new IllegalStateException("sin tipo")).when(otpService).enviarOtp(any(), anyString());
        Usuario usuario = new Usuario();
        usuario.setId(8L);
        when(usuarioRepository.findById(8L)).thenReturn(Optional.of(usuario));
        var data = new java.util.LinkedHashMap<String, Object>();
        data.put("id", 8L);
        data.put("otpPendiente", true);

        service.completarOtp(data);

        assertThat(data.get("otpEnviado")).isEqualTo(false);
        assertThat(data).doesNotContainKey("otpPendiente");
    }

    private InvitacionPropietario invitacion(LocalDateTime expira) {
        InvitacionPropietario inv = new InvitacionPropietario();
        inv.setId(3L);
        inv.setEmpresa(empresa);
        inv.setExpiraEn(expira);
        return inv;
    }

    private static int anyInt() {
        return org.mockito.ArgumentMatchers.anyInt();
    }
}
