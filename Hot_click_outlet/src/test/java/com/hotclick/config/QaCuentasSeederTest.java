package com.hotclick.config;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QaCuentasSeeder — sin contraseña fija")
class QaCuentasSeederTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock EmpresaRepository empresaRepository;
    @Mock RolRepository rolRepository;
    @Mock PlanRepository planRepository;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock Environment environment;

    private QaCuentasSeeder seeder;
    private final Map<String, String> env = new HashMap<>();

    @BeforeEach
    void setUp() {
        seeder = new QaCuentasSeeder(usuarioRepository, empresaRepository, rolRepository,
            planRepository, miembroEmpresaRepository, passwordEncoder, environment);
        seeder.setEntorno(env::get);
        when(environment.getActiveProfiles()).thenReturn(new String[] {"dev"});
    }

    @Test
    @DisplayName("Contra producción no toca ninguna cuenta")
    void noCorreEnProduccion() {
        seeder.setAppUrl("https://hotclick.lat");

        seeder.run(mock(ApplicationArguments.class));

        verifyNoInteractions(usuarioRepository, empresaRepository, passwordEncoder);
    }

    @Test
    @DisplayName("Sin QA_DEFAULT_PASSWORD no crea cuentas")
    void sinVariableNoCreaCuentas() {
        seeder.setAppUrl("http://localhost:8080");

        seeder.run(mock(ApplicationArguments.class));

        verify(empresaRepository, never()).save(any());
        verify(usuarioRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(anyString());
    }
}
