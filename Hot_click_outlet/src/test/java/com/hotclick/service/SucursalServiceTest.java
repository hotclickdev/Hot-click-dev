package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Sucursal;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SucursalRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SucursalService")
class SucursalServiceTest {

    @Mock private SucursalRepository sucursalRepository;
    @Mock private EmpresaRepository empresaRepository;
    @Mock private CompanyScope companyScope;
    @Mock private InputSanitizer sanitizer;

    @InjectMocks private SucursalService sucursalService;

    @Test
    @DisplayName("listar filtra por empresa cuando hay tenant")
    void listarConEmpresa() {
        Sucursal s = sucursal(1L, "Centro", "Av. Central", 10L);
        when(sucursalRepository.findByEmpresaIdAndEstado(10L, Constants.ESTADO_ACTIVO))
            .thenReturn(List.of(s));

        List<Map<String, Object>> out = sucursalService.listar(10L);

        assertThat(out).hasSize(1);
        assertThat(out.get(0).get("nombre")).isEqualTo("Centro");
        assertThat(out.get(0).get("ubicacion")).isEqualTo("Av. Central");
        assertThat(out.get(0).get("ventasMes")).isEqualTo(0);
        assertThat(out.get(0).get("activo")).isEqualTo(true);
    }

    @Test
    @DisplayName("crear exige empresa, nombre y ubicación")
    void crearValidaciones() {
        assertThatThrownBy(() -> sucursalService.crear("X", "Y", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("empresa");
        assertThatThrownBy(() -> sucursalService.crear("  ", "Y", 1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("nombre");
        when(sanitizer.cleanWithLimit(eq("X"), eq(SucursalService.MAX_NOMBRE))).thenReturn("X");
        assertThatThrownBy(() -> sucursalService.crear("X", "  ", 1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("ubicación");
    }

    @Test
    @DisplayName("crear persiste sucursal activa con ubicación")
    void crearOk() {
        Empresa empresa = new Empresa();
        empresa.setId(7L);
        when(empresaRepository.findById(7L)).thenReturn(Optional.of(empresa));
        when(sanitizer.cleanWithLimit("Heredia Plaza", SucursalService.MAX_NOMBRE))
            .thenReturn("Heredia Plaza");
        when(sanitizer.cleanWithLimit("Heredia, Centro Comercial", SucursalService.MAX_UBICACION))
            .thenReturn("Heredia, Centro Comercial");
        when(sucursalRepository.save(any(Sucursal.class))).thenAnswer(inv -> {
            Sucursal saved = inv.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        Map<String, Object> dto = sucursalService.crear(
            "Heredia Plaza",
            "Heredia, Centro Comercial",
            7L
        );

        ArgumentCaptor<Sucursal> cap = ArgumentCaptor.forClass(Sucursal.class);
        verify(sucursalRepository).save(cap.capture());
        assertThat(cap.getValue().getNombre()).isEqualTo("Heredia Plaza");
        assertThat(cap.getValue().getUbicacion()).isEqualTo("Heredia, Centro Comercial");
        assertThat(cap.getValue().getEstado()).isEqualTo(Constants.ESTADO_ACTIVO);
        assertThat(dto.get("id")).isEqualTo(99L);
        assertThat(dto.get("empresaId")).isEqualTo(7L);
        assertThat(dto.get("ubicacion")).isEqualTo("Heredia, Centro Comercial");
    }

    @Test
    @DisplayName("crear falla si empresa no existe")
    void crearEmpresaAusente() {
        when(sanitizer.cleanWithLimit(eq("X"), eq(SucursalService.MAX_NOMBRE))).thenReturn("X");
        when(sanitizer.cleanWithLimit(eq("Y"), eq(SucursalService.MAX_UBICACION))).thenReturn("Y");
        when(empresaRepository.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> sucursalService.crear("X", "Y", 1L))
            .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    @DisplayName("renombrar actualiza nombre con CompanyScope")
    void renombrarOk() {
        Sucursal s = sucursal(5L, "Viejo", "Cartago", 3L);
        when(sucursalRepository.findById(5L)).thenReturn(Optional.of(s));
        doNothing().when(companyScope).assertCanAccess(3L);
        when(sanitizer.cleanWithLimit("Nuevo nombre", SucursalService.MAX_NOMBRE))
            .thenReturn("Nuevo nombre");
        when(sucursalRepository.save(any(Sucursal.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> dto = sucursalService.renombrar(5L, "Nuevo nombre");

        assertThat(dto.get("nombre")).isEqualTo("Nuevo nombre");
        assertThat(dto.get("ubicacion")).isEqualTo("Cartago");
        assertThat(dto.get("activo")).isEqualTo(true);
        verify(companyScope).assertCanAccess(3L);
    }

    @Test
    @DisplayName("renombrar exige nombre")
    void renombrarSinNombre() {
        Sucursal s = sucursal(5L, "Viejo", "Cartago", 3L);
        when(sucursalRepository.findById(5L)).thenReturn(Optional.of(s));
        doNothing().when(companyScope).assertCanAccess(3L);
        assertThatThrownBy(() -> sucursalService.renombrar(5L, "  "))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("nombre");
    }

    @Test
    @DisplayName("desactivar marca estado inactivo")
    void desactivarOk() {
        Sucursal s = sucursal(8L, "Escazú", "San Rafael", 2L);
        when(sucursalRepository.findById(8L)).thenReturn(Optional.of(s));
        doNothing().when(companyScope).assertCanAccess(2L);
        when(sucursalRepository.save(any(Sucursal.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> dto = sucursalService.desactivar(8L);

        ArgumentCaptor<Sucursal> cap = ArgumentCaptor.forClass(Sucursal.class);
        verify(sucursalRepository).save(cap.capture());
        assertThat(cap.getValue().getEstado()).isEqualTo(Constants.ESTADO_INACTIVO);
        assertThat(dto.get("activo")).isEqualTo(false);
        verify(companyScope).assertCanAccess(2L);
    }

    @Test
    @DisplayName("desactivar falla si ya está inactiva")
    void desactivarInactiva() {
        Sucursal s = sucursal(8L, "Escazú", "San Rafael", 2L);
        s.setEstado(Constants.ESTADO_INACTIVO);
        when(sucursalRepository.findById(8L)).thenReturn(Optional.of(s));
        doNothing().when(companyScope).assertCanAccess(2L);
        assertThatThrownBy(() -> sucursalService.desactivar(8L))
            .isInstanceOf(RecursoNoEncontradoException.class);
    }

    private static Sucursal sucursal(Long id, String nombre, String ubicacion, Long empresaId) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        Sucursal s = new Sucursal();
        s.setId(id);
        s.setNombre(nombre);
        s.setUbicacion(ubicacion);
        s.setEmpresa(e);
        s.setEstado(Constants.ESTADO_ACTIVO);
        return s;
    }
}
