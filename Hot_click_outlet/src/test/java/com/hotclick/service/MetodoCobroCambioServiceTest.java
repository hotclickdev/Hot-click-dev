package com.hotclick.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hotclick.dto.MetodoCobroCambioPendienteDto;
import com.hotclick.dto.MetodoCobroCambioSnapshot;
import com.hotclick.dto.MetodoCobroCreateRequest;
import com.hotclick.model.Empresa;
import com.hotclick.model.MetodoCobro;
import com.hotclick.model.SolicitudAprobacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MetodoCobroCambioService")
class MetodoCobroCambioServiceTest {

    @Mock MetodoCobroRepository metodoRepo;
    @Mock SolicitudAprobacionRepository solicitudRepo;
    @Mock CompanyScope companyScope;
    @Mock InputSanitizer sanitizer;
    @Spy ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    @Mock MetodoCobroNotificacionService notificacionService;
    @Mock ModeracionAvisoService moderacionAvisoService;
    @InjectMocks MetodoCobroCambioService service;

    private Empresa empresa;
    private Usuario usuario;
    private MetodoCobro metodo;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(9L);
        empresa.setNombreEmpresa("Taller CR");
        usuario = new Usuario();
        usuario.setId(4L);
        usuario.setNombre("Ana");
        usuario.setTelefono("88887777");
        metodo = new MetodoCobro();
        metodo.setId(2L);
        metodo.setEmpresa(empresa);
        metodo.setTipo(MetodoCobro.TIPO_SINPE);
        metodo.setDestino("88880000");
        metodo.setMascara("••••-0000");
        metodo.setActivo(true);
    }

    @Test
    @DisplayName("solicitar cambio crea solicitud y no muta el destino vigente")
    void solicitar_crea_solicitud_sin_mutar_destino() throws Exception {
        when(sanitizer.cleanWithLimit(any(), anyInt())).thenAnswer(inv -> inv.getArgument(0));
        when(metodoRepo.findActivoById(2L)).thenReturn(Optional.of(metodo));
        when(companyScope.getCurrentUser()).thenReturn(usuario);
        when(solicitudRepo.existsByTipoEntidadAndIdEntidadAndEstadoSolicitud(
                MetodoCobro.TIPO_SOLICITUD, 2L, "PENDIENTE")).thenReturn(false);
        when(metodoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MetodoCobroCreateRequest req = new MetodoCobroCreateRequest();
        req.setTipo("sinpe");
        req.setDato("8888-1111");

        var dto = service.solicitarCambio(2L, req);

        verify(companyScope).assertCanAccess(9L);
        assertThat(metodo.getDestino()).isEqualTo("88880000");
        assertThat(metodo.isEnRevision()).isTrue();
        assertThat(dto.getMascara()).isEqualTo("••••-0000");
        assertThat(dto.isEnRevision()).isTrue();

        ArgumentCaptor<SolicitudAprobacion> cap = ArgumentCaptor.forClass(SolicitudAprobacion.class);
        verify(solicitudRepo).save(cap.capture());
        SolicitudAprobacion sol = cap.getValue();
        assertThat(sol.getTipoEntidad()).isEqualTo(MetodoCobro.TIPO_SOLICITUD);
        assertThat(sol.getAccionSolicitada()).isEqualTo(MetodoCobro.ACCION_CAMBIO);
        assertThat(sol.getIdEntidad()).isEqualTo(2L);
        MetodoCobroCambioSnapshot snap = objectMapper.readValue(
                sol.getDatosSnapshot(), MetodoCobroCambioSnapshot.class);
        assertThat(snap.getDestinoNuevo()).isEqualTo("88881111");
        assertThat(snap.getMascaraNueva()).isEqualTo("••••-1111");
        verify(notificacionService).avisarCambioPendiente(eq(empresa), eq(usuario), eq("SINPE Móvil"), eq("••••-1111"));
        verify(metodoRepo, never()).delete(any());
    }

    @Test
    @DisplayName("listado de pendientes no expone el destino nuevo")
    void listar_pendientes_solo_mascara() throws Exception {
        SolicitudAprobacion sol = new SolicitudAprobacion();
        sol.setId(11L);
        sol.setEmpresa(empresa);
        sol.setUsuarioPide(usuario);
        MetodoCobroCambioSnapshot snap = new MetodoCobroCambioSnapshot();
        snap.setTipo("SINPE");
        snap.setDestinoNuevo("88881111");
        snap.setMascaraNueva("••••-1111");
        snap.setMascaraActual("••••-0000");
        sol.setDatosSnapshot(objectMapper.writeValueAsString(snap));
        when(solicitudRepo.findPendientesConEmpresa("PENDIENTE", MetodoCobro.TIPO_SOLICITUD))
                .thenReturn(List.of(sol));

        List<MetodoCobroCambioPendienteDto> lista = service.listarPendientes();

        assertThat(lista).hasSize(1);
        assertThat(lista.get(0).getMascaraNueva()).isEqualTo("••••-1111");
        assertThat(lista.get(0).getMascaraActual()).isEqualTo("••••-0000");
        String json = objectMapper.writeValueAsString(lista.get(0));
        assertThat(json).doesNotContain("88881111");
        assertThat(json).doesNotContain("destinoNuevo");
    }

    @Test
    @DisplayName("aprobar aplica el destino nuevo y sale de revisión")
    void aprobar_aplica_destino() throws Exception {
        SolicitudAprobacion sol = solicitudPendiente();
        MetodoCobroCambioSnapshot snap = new MetodoCobroCambioSnapshot();
        snap.setTipo("SINPE");
        snap.setDestinoNuevo("88881111");
        snap.setMascaraNueva("••••-1111");
        sol.setDatosSnapshot(objectMapper.writeValueAsString(snap));
        when(solicitudRepo.findById(11L)).thenReturn(Optional.of(sol));
        when(metodoRepo.findActivoById(2L)).thenReturn(Optional.of(metodo));
        when(metodoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.aprobar(11L);

        assertThat(metodo.getDestino()).isEqualTo("88881111");
        assertThat(metodo.getMascara()).isEqualTo("••••-1111");
        assertThat(metodo.isEnRevision()).isFalse();
        assertThat(sol.getEstadoSolicitud()).isEqualTo("APROBADO");
        // aprobar() ya no llama assertCanAccess: SolicitudAdminGuard (ADMIN o TRUST vía
        // global.approvals) ya autorizó antes de llegar acá — llamarlo de nuevo bloqueaba
        // a TRUST, que no pertenece al tenant. Ver comentario en MetodoCobroCambioService.
        verify(companyScope, never()).assertCanAccess(9L);
    }

    @Test
    @DisplayName("rechazar no cambia el destino vigente")
    void rechazar_no_muta_destino() {
        SolicitudAprobacion sol = solicitudPendiente();
        when(solicitudRepo.findById(11L)).thenReturn(Optional.of(sol));
        when(metodoRepo.findActivoById(2L)).thenReturn(Optional.of(metodo));
        when(metodoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.rechazar(11L, "dato no coincide");

        assertThat(metodo.getDestino()).isEqualTo("88880000");
        assertThat(metodo.isEnRevision()).isFalse();
        assertThat(sol.getEstadoSolicitud()).isEqualTo("RECHAZADO");
    }

    @Test
    @DisplayName("tarjeta legacy no se edita")
    void tarjeta_no_editable() {
        metodo.setTipo(MetodoCobro.TIPO_TARJETA);
        metodo.setDestino("4412");
        when(metodoRepo.findActivoById(2L)).thenReturn(Optional.of(metodo));

        MetodoCobroCreateRequest req = new MetodoCobroCreateRequest();
        req.setTipo("tarjeta");
        req.setDato("4412");

        assertThatThrownBy(() -> service.solicitarCambio(2L, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("tarjeta");
        verify(solicitudRepo, never()).save(any());
    }

    private SolicitudAprobacion solicitudPendiente() {
        SolicitudAprobacion sol = new SolicitudAprobacion();
        sol.setId(11L);
        sol.setTipoEntidad(MetodoCobro.TIPO_SOLICITUD);
        sol.setEstadoSolicitud("PENDIENTE");
        sol.setIdEntidad(2L);
        sol.setEmpresa(empresa);
        return sol;
    }
}
