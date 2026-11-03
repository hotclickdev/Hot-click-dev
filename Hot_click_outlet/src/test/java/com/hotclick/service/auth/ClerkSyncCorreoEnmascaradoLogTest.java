package com.hotclick.service.auth;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** BAJO: ClerkSyncService no deja el correo completo en los logs (login, alta OAuth, cuenta elevada). Datos ficticios. */
@DisplayName("[BAJO] ClerkSync enmascara el correo en los logs")
class ClerkSyncCorreoEnmascaradoLogTest {

    private static final String CORREO = "ana.ficticia@test.cr";
    private ListAppender<ILoggingEvent> appender;
    private Logger logger;
    private UsuarioRepository repo;
    private ClerkSyncService s;

    @BeforeEach
    void preparar() {
        logger = (Logger) LoggerFactory.getLogger(ClerkSyncService.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        repo = mock(UsuarioRepository.class);
        when(repo.findByClerkUserId(anyString())).thenReturn(Optional.empty());
        when(repo.findAllByCorreoIgnoreCase(anyString())).thenReturn(List.of());
        s = new ClerkSyncService();
        ReflectionTestUtils.setField(s, "usuarioRepository", repo);
        ReflectionTestUtils.setField(s, "rolRepository", mock(RolRepository.class));
        ReflectionTestUtils.setField(s, "passwordEncoder", mock(PasswordEncoder.class));
        ReflectionTestUtils.setField(s, "authSupport", mock(AuthSupport.class));
    }

    @AfterEach
    void quitar() { logger.detachAppender(appender); }

    private String logs() {
        return appender.list.stream().map(ILoggingEvent::getFormattedMessage).collect(Collectors.joining("\n"));
    }

    @Test
    @DisplayName("Alta OAuth y login exitoso: solo el correo enmascarado")
    void altaYLogin() {
        Usuario[] guardado = new Usuario[1];
        when(repo.findByCorreo(CORREO)).thenAnswer(i -> Optional.ofNullable(guardado[0]));
        when(repo.save(any(Usuario.class))).thenAnswer(i -> { Usuario u = i.getArgument(0); u.setId(1L); guardado[0] = u; return u; });

        s.sync("user_fict1", CORREO, "Ana", "Ficticia", "", true);

        assertThat(logs()).contains("Nuevo usuario OAuth creado: a***@test.cr")
            .contains("Login social exitoso: a***@test.cr").doesNotContain(CORREO).doesNotContain("ana.ficticia");
    }

    @Test
    @DisplayName("Cuenta elevada bloqueada: solo el correo enmascarado")
    void cuentaElevada() {
        Usuario admin = new Usuario();
        admin.setId(2L);
        admin.setCorreo(CORREO);
        admin.setEstado(1);
        Rol rol = new Rol();
        rol.setNombreRol(Constants.ROL_ADMIN);
        admin.setRoles(new ArrayList<>(List.of(rol)));
        when(repo.findByCorreo(CORREO)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> s.sync("user_fict2", CORREO, "Ana", "", "", true)).isInstanceOf(SecurityException.class);

        assertThat(logs()).contains("email=a***@test.cr").doesNotContain(CORREO).doesNotContain("ana.ficticia");
    }
}
