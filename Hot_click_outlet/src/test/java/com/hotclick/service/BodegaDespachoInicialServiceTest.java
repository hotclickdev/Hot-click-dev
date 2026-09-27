package com.hotclick.service;

import com.hotclick.dto.UbicacionDespachoAlta;
import com.hotclick.exception.PlanLimitException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BodegaDespachoInicialService")
class BodegaDespachoInicialServiceTest {

    @Mock BodegaRepository  bodegaRepository;
    @Mock EmpresaRepository empresaRepository;
    @Mock TenantService     tenantService;

    private BodegaDespachoInicialService service;

    @BeforeEach
    void setUp() {
        service = new BodegaDespachoInicialService(
            bodegaRepository, empresaRepository, tenantService, new InputSanitizer());
    }

    @Test
    @DisplayName("Sin ningún campo de ubicación → vacío (payload viejo)")
    void normalizar_sinCampos_vacio() {
        assertThat(service.normalizar(null)).isEmpty();
        assertThat(service.normalizar(new UbicacionDespachoAlta(null, " ", "", true))).isEmpty();
    }

    @Test
    @DisplayName("Normaliza provincia y cantón como BodegaController y limpia HTML de la dirección")
    void normalizar_completa_normaliza() {
        Optional<UbicacionDespachoAlta> r = service.normalizar(new UbicacionDespachoAlta(
            " San José ", "Pérez Zeledón", "<b>200 m norte</b> de la iglesia", null));

        assertThat(r).isPresent();
        assertThat(r.get().provincia()).isEqualTo("SAN JOSE");
        assertThat(r.get().canton()).isEqualTo("PEREZ ZELEDON");
        assertThat(r.get().direccionExacta()).isEqualTo("200 m norte de la iglesia");
        assertThat(r.get().permiteRetiroCliente()).isFalse();
    }

    @Test
    @DisplayName("Ubicación a medias → IllegalArgumentException")
    void normalizar_aMedias_rechaza() {
        var sinCanton = new UbicacionDespachoAlta("Heredia", "", "Del parque 100 m sur", false);
        assertThatThrownBy(() -> service.normalizar(sinCanton))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(BodegaDespachoInicialService.MENSAJE_UBICACION_INCOMPLETA);
    }

    @Test
    @DisplayName("Provincia de más de 50 o dirección de más de 255 caracteres → rechaza")
    void normalizar_largos_rechaza() {
        var provinciaLarga = new UbicacionDespachoAlta("P".repeat(51), "Belén", "Centro", false);
        var direccionLarga = new UbicacionDespachoAlta("Heredia", "Belén", "d".repeat(256), false);

        assertThatThrownBy(() -> service.normalizar(provinciaLarga))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("50");
        assertThatThrownBy(() -> service.normalizar(direccionLarga))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("255");
    }

    @Test
    @DisplayName("crear guarda la bodega con nombre, teléfono del negocio y la liga como venta online")
    void crear_ligaBodegaVentaOnline() {
        Empresa empresa = empresa("Tienda Tica", "22223333");
        Usuario admin = new Usuario();
        admin.setTelefono("88887777");
        when(bodegaRepository.save(any(Bodega.class))).thenAnswer(inv -> inv.getArgument(0));

        Bodega b = service.crear(empresa, admin,
            new UbicacionDespachoAlta("HEREDIA", "BELEN", "Centro", true));

        verify(tenantService).verificarLimiteBodegas(7L);
        assertThat(b.getNombreBodega()).isEqualTo("Despacho Tienda Tica");
        assertThat(b.getTelefono()).isEqualTo("22223333");
        assertThat(b.getPermiteRetiroCliente()).isTrue();
        assertThat(b.getEstado()).isEqualTo(Constants.ESTADO_ACTIVO);
        assertThat(b.getAdminCliente()).isSameAs(admin);
        assertThat(empresa.getBodegaVentaOnline()).isSameAs(b);
        verify(empresaRepository).save(empresa);
    }

    @Test
    @DisplayName("Sin teléfono del negocio usa el del propietario")
    void crear_sinTelefonoNegocio_usaDelPropietario() {
        Usuario admin = new Usuario();
        admin.setTelefono("88887777");
        when(bodegaRepository.save(any(Bodega.class))).thenAnswer(inv -> inv.getArgument(0));

        Bodega b = service.crear(empresa("Tienda", null), admin,
            new UbicacionDespachoAlta("HEREDIA", "BELEN", "Centro", false));

        assertThat(b.getTelefono()).isEqualTo("88887777");
    }

    @Test
    @DisplayName("Si el plan no admite más bodegas no guarda nada")
    void crear_limitePlan_noGuarda() {
        doThrow(new PlanLimitException("límite", "bodegas", "upgrade"))
            .when(tenantService).verificarLimiteBodegas(7L);
        var ubicacion = new UbicacionDespachoAlta("HEREDIA", "BELEN", "Centro", false);
        Empresa empresa = empresa("Tienda", "22223333");

        assertThatThrownBy(() -> service.crear(empresa, new Usuario(), ubicacion))
            .isInstanceOf(PlanLimitException.class);
        verify(bodegaRepository, never()).save(any());
    }

    private static Empresa empresa(String nombreComercial, String telefono) {
        Empresa e = new Empresa();
        e.setId(7L);
        e.setNombreEmpresa(nombreComercial + " S.A.");
        e.setNombreComercial(nombreComercial);
        e.setTelefonoEmpresa(telefono);
        return e;
    }
}
