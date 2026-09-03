package com.hotclick.service;

import com.hotclick.dto.RecoleccionCreateRequest;
import com.hotclick.dto.RecoleccionTarifaRequest;
import com.hotclick.model.Empresa;
import com.hotclick.model.SolicitudRecoleccion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SolicitudRecoleccionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.logistica.ZonaLogistica;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecoleccionService — GAM, tarifa admin")
class RecoleccionServiceTest {

    @Mock SolicitudRecoleccionRepository repo;
    @Mock EmpresaRepository empresaRepo;
    @Mock CompanyScope companyScope;
    @Mock InputSanitizer sanitizer;
    @Mock ModeracionAvisoService moderacionAvisoService;
    @Mock ModeracionAdminAvisoService moderacionAdminAvisoService;
    @InjectMocks RecoleccionService service;

    private Empresa empresa;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(9L);
        empresa.setNombreEmpresa("Taller CR");
    }

    @Test
    @DisplayName("crear rechaza zona fuera de la GAM")
    void crear_fueraGam_rechaza() {
        RecoleccionCreateRequest req = requestBase();
        req.setZona(ZonaLogistica.FUERA_GAM);

        assertThatThrownBy(() -> service.crear(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("GAM");
    }

    @Test
    @DisplayName("crear en GAM guarda pendiente sin tarifa")
    void crear_gam_pendiente() {
        when(sanitizer.cleanWithLimit(any(), anyInt())).thenAnswer(inv -> inv.getArgument(0));
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(9L);
        when(empresaRepo.findById(9L)).thenReturn(Optional.of(empresa));
        when(companyScope.getCurrentUser()).thenReturn(new Usuario());
        when(repo.save(any())).thenAnswer(inv -> {
            SolicitudRecoleccion s = inv.getArgument(0);
            s.setId(1L);
            return s;
        });

        var dto = service.crear(requestBase());

        assertThat(dto.getEstado()).isEqualTo(SolicitudRecoleccion.ESTADO_PENDIENTE);
        assertThat(dto.getTarifaColones()).isNull();
        ArgumentCaptor<SolicitudRecoleccion> cap = ArgumentCaptor.forClass(SolicitudRecoleccion.class);
        verify(repo).save(cap.capture());
        assertThat(cap.getValue().getZona()).isEqualTo(ZonaLogistica.GAM);
        assertThat(cap.getValue().getDireccionEntrega()).contains("Escazú");
        verify(moderacionAdminAvisoService).avisarRecoleccion(1L, "Taller CR");
    }

    @Test
    @DisplayName("cotizar tarifa solo si está pendiente y es admin IT")
    void cotizar_pendiente_ok() {
        when(sanitizer.cleanWithLimit(any(), anyInt())).thenAnswer(inv -> inv.getArgument(0));
        when(companyScope.isAdminIT()).thenReturn(true);
        SolicitudRecoleccion s = solicitudPendiente();
        when(repo.findByIdConEmpresa(1L)).thenReturn(Optional.of(s));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RecoleccionTarifaRequest tarifa = new RecoleccionTarifaRequest();
        tarifa.setTarifaColones(3500);
        tarifa.setNotasAdmin("Moto GAM");

        var dto = service.cotizarTarifa(1L, tarifa);

        assertThat(dto.getEstado()).isEqualTo(SolicitudRecoleccion.ESTADO_COTIZADA);
        assertThat(dto.getTarifaColones()).isEqualTo(3500);
    }

    @Test
    @DisplayName("vendedor no puede cotizar tarifa")
    void cotizar_noAdmin_rechaza() {
        when(companyScope.isAdminIT()).thenReturn(false);
        RecoleccionTarifaRequest tarifa = new RecoleccionTarifaRequest();
        tarifa.setTarifaColones(3500);

        assertThatThrownBy(() -> service.cotizarTarifa(1L, tarifa))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("HOTCLICK");
    }

    private RecoleccionCreateRequest requestBase() {
        RecoleccionCreateRequest req = new RecoleccionCreateRequest();
        req.setZona(ZonaLogistica.GAM);
        req.setDireccionRecoleccion("Bodega, San José centro");
        req.setContactoRecoleccion("Ana");
        req.setTelefonoRecoleccion("88881111");
        req.setDireccionEntrega("Cliente en Escazú");
        req.setContactoEntrega("Luis");
        req.setTelefonoEntrega("88882222");
        return req;
    }

    private SolicitudRecoleccion solicitudPendiente() {
        SolicitudRecoleccion s = new SolicitudRecoleccion();
        s.setId(1L);
        s.setEmpresa(empresa);
        s.setEstado(SolicitudRecoleccion.ESTADO_PENDIENTE);
        s.setZona(ZonaLogistica.GAM);
        s.setDireccionRecoleccion("Bodega");
        s.setContactoRecoleccion("Ana");
        s.setTelefonoRecoleccion("88881111");
        s.setDireccionEntrega("Cliente");
        s.setContactoEntrega("Luis");
        s.setTelefonoEntrega("88882222");
        return s;
    }
}
