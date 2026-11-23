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

    @Test
    @DisplayName("Base recién migrada (HOTCLICK id=1, secuencia sin avanzar): alinea la secuencia y las empresas QA quedan con id > 1")
    void alineaSecuenciaAntesDeInsertar() {
        seeder.setAppUrl("http://localhost:8080");
        env.put("QA_DEFAULT_PASSWORD", "Qf23-Clave-Solo-Test-1");
        var plan = new com.hotclick.model.Plan();
        plan.setNombre("EMPRENDEDOR");
        when(planRepository.findByNombre(anyString())).thenReturn(java.util.Optional.of(plan));
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(usuarioRepository.findByCorreo(anyString())).thenReturn(java.util.Optional.empty());
        when(usuarioRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(rolRepository.findByNombreRol(anyString())).thenReturn(java.util.Optional.empty());

        // Simula Postgres: la secuencia arranca en 1 aunque id=1 ya existe; save() falla hasta que se alinea.
        long[] siguiente = {1};
        when(empresaRepository.alinearSecuenciaId()).thenAnswer(i -> { siguiente[0] = 2; return 2L; });
        java.util.List<Long> ids = new java.util.ArrayList<>();
        when(empresaRepository.save(any())).thenAnswer(i -> {
            if (siguiente[0] == 1) throw new IllegalStateException("duplicate key id_empresa=1");
            com.hotclick.model.Empresa e = i.getArgument(0);
            e.setId(siguiente[0]++);
            ids.add(e.getId());
            return e;
        });

        org.junit.jupiter.api.Assertions.assertDoesNotThrow(() -> seeder.run(mock(ApplicationArguments.class)));

        org.assertj.core.api.Assertions.assertThat(ids).hasSize(6).allMatch(id -> id > 1);
        verify(empresaRepository, org.mockito.Mockito.times(6)).alinearSecuenciaId();
    }
}
