package com.hotclick.config;

import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.EstadoRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("DataSeeder — admin sin contraseña fija")
class DataSeederAdminTest {

    @Mock RolRepository rolRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock BodegaRepository bodegaRepository;
    @Mock CategoriaRepository categoriaRepository;
    @Mock EstadoRepository estadoRepository;
    @Mock PlanRepository planRepository;
    @Mock EmpresaRepository empresaRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock Environment environment;

    @InjectMocks DataSeeder seeder;

    private final Map<String, String> env = new HashMap<>();

    @BeforeEach
    void setUp() {
        seeder.setEntorno(env::get);
        lenient().when(environment.getActiveProfiles()).thenReturn(new String[0]);
        lenient().when(passwordEncoder.encode(anyString())).thenAnswer(i -> "hash:" + i.getArgument(0));
    }

    private static String claveFuerte() {
        return "Zq9#" + UUID.randomUUID();
    }

    private Usuario adminGuardado() {
        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("Producción sin variable: no crea el admin")
    void produccionSinVariableNoCreaAdmin() {
        seeder.setAppUrl("https://hotclick.lat");
        when(usuarioRepository.existsByCorreo(Constants.CORREO_ADMIN)).thenReturn(false);

        seeder.run(mock(ApplicationArguments.class));

        verify(usuarioRepository, never()).save(argThat(u -> Constants.CORREO_ADMIN.equals(u.getCorreo())));
    }

    @Test
    @DisplayName("Producción con clave débil: no crea el admin")
    void produccionConClaveDebilNoCreaAdmin() {
        seeder.setAppUrl("https://hotclick.lat");
        env.put(ClaveSemilla.ENV_ADMIN, "Corta1!");
        when(usuarioRepository.existsByCorreo(Constants.CORREO_ADMIN)).thenReturn(false);

        seeder.run(mock(ApplicationArguments.class));

        verify(usuarioRepository, never()).save(argThat(u -> Constants.CORREO_ADMIN.equals(u.getCorreo())));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    @DisplayName("Producción con clave fuerte: crea el admin con esa clave")
    void produccionConClaveFuerteCreaAdmin() {
        seeder.setAppUrl("https://hotclick.lat");
        String clave = claveFuerte();
        env.put(ClaveSemilla.ENV_ADMIN, clave);
        when(usuarioRepository.existsByCorreo(Constants.CORREO_ADMIN)).thenReturn(false);

        seeder.run(mock(ApplicationArguments.class));

        Usuario admin = adminGuardado();
        assertThat(admin.getCorreo()).isEqualTo(Constants.CORREO_ADMIN);
        assertThat(admin.getContrasenaHash()).isEqualTo("hash:" + clave);
    }

    @Test
    @DisplayName("Dev sin variable: crea el admin con una clave aleatoria, nunca fija")
    void devSinVariableUsaClaveAleatoria() {
        seeder.setAppUrl("http://localhost:8080");
        when(usuarioRepository.existsByCorreo(Constants.CORREO_ADMIN)).thenReturn(false);

        seeder.run(mock(ApplicationArguments.class));
        String primera = adminGuardado().getContrasenaHash();

        assertThat(primera).startsWith("hash:").hasSizeGreaterThan(40);
    }

    @Test
    @DisplayName("Dev con la variable legada: la sigue aceptando")
    void devAceptaVariableLegada() {
        seeder.setAppUrl("http://localhost:8080");
        env.put(ClaveSemilla.ENV_ADMIN_LEGADO, "clave-local");
        when(usuarioRepository.existsByCorreo(Constants.CORREO_ADMIN)).thenReturn(false);

        seeder.run(mock(ApplicationArguments.class));

        assertThat(adminGuardado().getContrasenaHash()).isEqualTo("hash:clave-local");
    }

    @Test
    @DisplayName("Admin existente sin ADMIN_RESET_PASSWORD: la contraseña no se toca")
    void adminExistenteSinResetConservaClave() {
        seeder.setAppUrl("https://hotclick.lat");
        env.put(ClaveSemilla.ENV_ADMIN, claveFuerte());
        Usuario existente = new Usuario();
        existente.setCorreo(Constants.CORREO_ADMIN);
        existente.setContrasenaHash("hash-previo");
        when(usuarioRepository.existsByCorreo(Constants.CORREO_ADMIN)).thenReturn(true);
        when(usuarioRepository.findByCorreo(Constants.CORREO_ADMIN)).thenReturn(Optional.of(existente));

        seeder.run(mock(ApplicationArguments.class));

        assertThat(adminGuardado().getContrasenaHash()).isEqualTo("hash-previo");
        assertThat(existente.getSesionesInvalidadasEn()).isNull();
    }

    @Test
    @DisplayName("Reset en producción sin clave válida: la contraseña no se toca")
    void resetSinClaveValidaNoCambiaNada() {
        seeder.setAppUrl("https://hotclick.lat");
        env.put("ADMIN_RESET_PASSWORD", "true");
        env.put(ClaveSemilla.ENV_ADMIN, "Corta1!");
        Usuario existente = new Usuario();
        existente.setCorreo(Constants.CORREO_ADMIN);
        existente.setContrasenaHash("hash-previo");
        when(usuarioRepository.existsByCorreo(Constants.CORREO_ADMIN)).thenReturn(true);
        when(usuarioRepository.findByCorreo(Constants.CORREO_ADMIN)).thenReturn(Optional.of(existente));

        seeder.run(mock(ApplicationArguments.class));

        assertThat(adminGuardado().getContrasenaHash()).isEqualTo("hash-previo");
    }

    @Test
    @DisplayName("Reset con clave fuerte: cambia la contraseña e invalida las sesiones")
    void resetConClaveFuerteInvalidaSesiones() {
        seeder.setAppUrl("https://hotclick.lat");
        String clave = claveFuerte();
        env.put("ADMIN_RESET_PASSWORD", "true");
        env.put(ClaveSemilla.ENV_ADMIN, clave);
        Usuario existente = new Usuario();
        existente.setCorreo(Constants.CORREO_ADMIN);
        existente.setContrasenaHash("hash-previo");
        when(usuarioRepository.existsByCorreo(Constants.CORREO_ADMIN)).thenReturn(true);
        when(usuarioRepository.findByCorreo(Constants.CORREO_ADMIN)).thenReturn(Optional.of(existente));

        seeder.run(mock(ApplicationArguments.class));

        assertThat(adminGuardado().getContrasenaHash()).isEqualTo("hash:" + clave);
        assertThat(existente.getSesionesInvalidadasEn()).isNotNull();
    }
}
