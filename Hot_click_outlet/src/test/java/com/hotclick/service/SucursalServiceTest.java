package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Sucursal;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SucursalRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SucursalService")
class SucursalServiceTest {

    @Mock private SucursalRepository sucursalRepository;
    @Mock private EmpresaRepository empresaRepository;
    @Mock private InputSanitizer sanitizer;

    @InjectMocks private SucursalService sucursalService;

    @Test
    @DisplayName("listar filtra por empresa cuando hay tenant")
    void listarConEmpresa() {
        Sucursal s = sucursal(1L, "Centro", 10L);
        when(sucursalRepository.findByEmpresaIdAndEstado(10L, Constants.ESTADO_ACTIVO))
            .thenReturn(List.of(s));

        List<Map<String, Object>> out = sucursalService.listar(10L);

        assertThat(out).hasSize(1);
        assertThat(out.get(0).get("nombre")).isEqualTo("Centro");
        assertThat(out.get(0).get("ventasMes")).isEqualTo(0);
        assertThat(out.get(0).get("activo")).isEqualTo(true);
    }

    @Test
    @DisplayName("crear exige empresa y nombre")
    void crearValidaciones() {
        assertThatThrownBy(() -> sucursalService.crear("X", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("empresa");
        assertThatThrownBy(() -> sucursalService.crear("  ", 1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("nombre");
    }

    @Test
    @DisplayName("crear persiste sucursal activa")
    void crearOk() {
        Empresa empresa = new Empresa();
        empresa.setId(7L);
        when(empresaRepository.findById(7L)).thenReturn(Optional.of(empresa));
        when(sanitizer.cleanWithLimit("Heredia Plaza", 120)).thenReturn("Heredia Plaza");
        when(sucursalRepository.save(any(Sucursal.class))).thenAnswer(inv -> {
            Sucursal saved = inv.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        Map<String, Object> dto = sucursalService.crear("Heredia Plaza", 7L);

        ArgumentCaptor<Sucursal> cap = ArgumentCaptor.forClass(Sucursal.class);
        verify(sucursalRepository).save(cap.capture());
        assertThat(cap.getValue().getNombre()).isEqualTo("Heredia Plaza");
        assertThat(cap.getValue().getEstado()).isEqualTo(Constants.ESTADO_ACTIVO);
        assertThat(dto.get("id")).isEqualTo(99L);
        assertThat(dto.get("empresaId")).isEqualTo(7L);
    }

    @Test
    @DisplayName("crear falla si empresa no existe")
    void crearEmpresaAusente() {
        when(sanitizer.cleanWithLimit("X", 120)).thenReturn("X");
        when(empresaRepository.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> sucursalService.crear("X", 1L))
            .isInstanceOf(RecursoNoEncontradoException.class);
    }

    private static Sucursal sucursal(Long id, String nombre, Long empresaId) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        Sucursal s = new Sucursal();
        s.setId(id);
        s.setNombre(nombre);
        s.setEmpresa(e);
        s.setEstado(Constants.ESTADO_ACTIVO);
        return s;
    }
}
