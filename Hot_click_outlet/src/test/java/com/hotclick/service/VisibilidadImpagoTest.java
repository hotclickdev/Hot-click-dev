package com.hotclick.service;

import com.hotclick.exception.ReactivacionSinPagoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.SancionPlataforma;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SancionPlataformaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.consola.SancionPlataformaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Impago: ni cerrar sanción, ni el dueño, ni el convenio del admin reactivan/publican sin pago ONVO. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Visibilidad y plan no se tocan con la tienda en impago")
class VisibilidadImpagoTest {

    @Mock EmpresaRepository empresaRepository;
    @Mock SancionPlataformaRepository sancionRepo;
    @Mock PlanRepository planRepository;
    @Mock AuditoriaAdminRegistroService auditoria;
    @Mock CompanyScope companyScope;
    @Mock SupabaseStorageService supabaseStorageService;

    @InjectMocks EmpresaPerfilService perfil;
    @InjectMocks EmpresaAdminService admin;

    Empresa empresa(String estado, boolean visible) {
        Empresa e = new Empresa();
        e.setId(9L);
        e.setEstadoEmpresa(estado);
        e.setVisibilidadPublica(visible);
        return e;
    }

    /** Carrera: la lectura sin lock vería ACTIVO; la bloqueada ya ve el impago que puso el job. */
    Empresa carrera(String estado) {
        when(empresaRepository.findById(9L)).thenReturn(Optional.of(empresa("ACTIVO", true)));
        Empresa fresca = empresa(estado, false);
        when(empresaRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(fresca));
        return fresca;
    }

    SancionPlataformaService sanciones() {
        return new SancionPlataformaService(sancionRepo, empresaRepository, auditoria, companyScope);
    }

    SancionPlataforma vencida() {
        SancionPlataforma f = new SancionPlataforma();
        f.setEmpresaId(9L);
        f.setActiva(true);
        f.setRestituirVisibilidad(true);
        f.setFin(LocalDateTime.now().minusDays(1));
        return f;
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUSPENDIDO_IMPAGO", "EXTENSION_IMPAGO"})
    void cerrarSancionEnImpagoCierraPeroSigueOculta(String estado) {
        SancionPlataforma f = vencida();
        when(sancionRepo.findByActivaTrue()).thenReturn(List.of(f));
        Empresa e = carrera(estado);
        sanciones().cerrarVencidas();
        assertFalse(f.isActiva());
        verify(sancionRepo).save(f);
        assertFalse(e.getVisibilidadPublica());
        verify(empresaRepository, never()).save(any());
        verify(empresaRepository, never()).findById(anyLong());
    }

    @Test
    void cerrarSancionActivaRestituyeVisibilidad() {
        SancionPlataforma f = vencida();
        when(sancionRepo.findByActivaTrue()).thenReturn(List.of(f));
        Empresa e = empresa("ACTIVO", false);
        when(empresaRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(e));
        sanciones().cerrarVencidas();
        assertTrue(e.getVisibilidadPublica());
        verify(empresaRepository).save(e);
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUSPENDIDO_IMPAGO", "EXTENSION_IMPAGO"})
    void duenoNoPublicaEnImpago(String estado) {
        Empresa e = carrera(estado);
        assertThrows(ReactivacionSinPagoException.class, () -> perfil.toggleVisibilidad(9L, true));
        assertThrows(ReactivacionSinPagoException.class, () -> perfil.toggleVisibilidad(9L, false));
        assertFalse(e.getVisibilidadPublica());
        verify(empresaRepository, never()).save(any());
        verify(empresaRepository, never()).findById(anyLong());
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUSPENDIDO_IMPAGO", "EXTENSION_IMPAGO"})
    void convenioAdminNoCambiaPlanEnImpago(String estado) {
        Plan p = new Plan();
        p.setNombre("PYME");
        when(planRepository.findByNombre("PYME")).thenReturn(Optional.of(p));
        Empresa e = carrera(estado);
        assertThrows(ReactivacionSinPagoException.class, () -> admin.cambiarPlan(9L, "PYME"));
        assertEquals(estado, e.getEstadoEmpresa());
        assertFalse(e.getVisibilidadPublica());
        assertEquals("GRATUITO", e.getPlanSaas());
        assertNull(e.getPlan());
        verify(empresaRepository, never()).save(any());
        verifyNoInteractions(auditoria);
    }

    @Test
    void cambiarEstadoDeDosArgumentosEliminadoYLocksTransaccionales() throws Exception {
        assertThrows(NoSuchMethodException.class,
            () -> EmpresaAdminService.class.getMethod("cambiarEstado", Long.class, String.class));
        Class<org.springframework.transaction.annotation.Transactional> tx =
            org.springframework.transaction.annotation.Transactional.class;
        assertTrue(EmpresaAdminService.class.getMethod("cambiarPlan", Long.class, String.class).isAnnotationPresent(tx));
        assertTrue(EmpresaPerfilService.class.getMethod("toggleVisibilidad", Long.class, Object.class).isAnnotationPresent(tx));
        assertTrue(SancionPlataformaService.class.getMethod("cerrarVencidas").isAnnotationPresent(tx));
    }
}
