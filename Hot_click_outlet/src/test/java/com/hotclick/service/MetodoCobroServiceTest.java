package com.hotclick.service;

import com.hotclick.dto.MetodoCobroCreateRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MetodoCobro;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MetodoCobroService — cuentas del vendedor")
class MetodoCobroServiceTest {

    @Mock MetodoCobroRepository repo;
    @Mock EmpresaRepository empresaRepo;
    @Mock CompanyScope companyScope;
    @Mock InputSanitizer sanitizer;
    @InjectMocks MetodoCobroService service;

    private Empresa empresa;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(9L);
        empresa.setNombreEmpresa("Taller CR");
    }

    @Test
    @DisplayName("crear SINPE válido queda predeterminado si es el primero")
    void crear_sinpe_primero_predeterminado() {
        when(sanitizer.cleanWithLimit(any(), anyInt())).thenAnswer(inv -> inv.getArgument(0));
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(9L);
        when(empresaRepo.findById(9L)).thenReturn(Optional.of(empresa));
        when(repo.countByEmpresa_IdAndActivoTrue(9L)).thenReturn(0L);
        when(repo.save(any())).thenAnswer(inv -> {
            MetodoCobro m = inv.getArgument(0);
            m.setId(1L);
            return m;
        });

        MetodoCobroCreateRequest req = new MetodoCobroCreateRequest();
        req.setTipo("sinpe");
        req.setDato("8888-0000");

        var dto = service.crear(req);

        assertThat(dto.getTipo()).isEqualTo("sinpe");
        assertThat(dto.getMascara()).isEqualTo("8888-0000");
        assertThat(dto.isPredeterminado()).isTrue();
        ArgumentCaptor<MetodoCobro> cap = ArgumentCaptor.forClass(MetodoCobro.class);
        verify(repo).save(cap.capture());
        assertThat(cap.getValue().getDestino()).isEqualTo("88880000");
        assertThat(cap.getValue().getTipo()).isEqualTo(MetodoCobro.TIPO_SINPE);
    }

    @Test
    @DisplayName("crear SINPE corto rechaza")
    void crear_sinpe_corto_rechaza() {
        when(sanitizer.cleanWithLimit(any(), anyInt())).thenAnswer(inv -> inv.getArgument(0));
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(9L);
        when(empresaRepo.findById(9L)).thenReturn(Optional.of(empresa));

        MetodoCobroCreateRequest req = new MetodoCobroCreateRequest();
        req.setTipo("sinpe");
        req.setDato("8888");

        assertThatThrownBy(() -> service.crear(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("8 dígitos");
    }

    @Test
    @DisplayName("marcar predeterminado limpia el anterior de la empresa")
    void marcar_predeterminado_ok() {
        MetodoCobro m = new MetodoCobro();
        m.setId(2L);
        m.setEmpresa(empresa);
        m.setTipo(MetodoCobro.TIPO_IBAN);
        m.setDestino("CR21000012344521");
        m.setMascara("CR21 **** 4521");
        m.setActivo(true);
        when(repo.findActivoById(2L)).thenReturn(Optional.of(m));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.marcarPredeterminado(2L);

        verify(companyScope).assertCanAccess(9L);
        verify(repo).clearPredeterminado(9L);
        assertThat(dto.isPredeterminado()).isTrue();
        assertThat(dto.getTipo()).isEqualTo("iban");
    }

    @Test
    @DisplayName("listar exige empresa asociada")
    void listar_sin_empresa_falla() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(null);
        assertThatThrownBy(() -> service.listar())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("negocio");
    }

    @Test
    @DisplayName("listar mapea DTOs activos")
    void listar_ok() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(9L);
        MetodoCobro m = new MetodoCobro();
        m.setId(1L);
        m.setEmpresa(empresa);
        m.setTipo(MetodoCobro.TIPO_SINPE);
        m.setDestino("88880000");
        m.setMascara("8888-0000");
        m.setPredeterminado(true);
        when(repo.findActivosByEmpresaId(9L)).thenReturn(List.of(m));

        var lista = service.listar();

        assertThat(lista).hasSize(1);
        assertThat(lista.get(0).getNombre()).isEqualTo("SINPE Móvil");
    }

    @Test
    @DisplayName("crear segundo método no queda predeterminado")
    void crear_segundo_no_predeterminado() {
        stubCrearOk();
        when(repo.countByEmpresa_IdAndActivoTrue(9L)).thenReturn(1L);

        MetodoCobroCreateRequest req = new MetodoCobroCreateRequest();
        req.setTipo("iban");
        req.setDato("CR21 0000 1234 4521");

        var dto = service.crear(req);

        assertThat(dto.isPredeterminado()).isFalse();
        ArgumentCaptor<MetodoCobro> cap = ArgumentCaptor.forClass(MetodoCobro.class);
        verify(repo).save(cap.capture());
        assertThat(cap.getValue().getTipo()).isEqualTo(MetodoCobro.TIPO_IBAN);
        assertThat(cap.getValue().getDestino()).isEqualTo("CR21000012344521");
        assertThat(cap.getValue().getMascara()).isEqualTo("CR21 **** 4521");
    }

    @Test
    @DisplayName("crear sin negocio asociado falla")
    void crear_sin_empresa_falla() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(null);

        MetodoCobroCreateRequest req = new MetodoCobroCreateRequest();
        req.setTipo("sinpe");
        req.setDato("88880000");

        assertThatThrownBy(() -> service.crear(req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("negocio");
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("crear falla si la empresa del scope no existe")
    void crear_empresa_inexistente() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(9L);
        when(empresaRepo.findById(9L)).thenReturn(Optional.empty());

        MetodoCobroCreateRequest req = new MetodoCobroCreateRequest();
        req.setTipo("sinpe");
        req.setDato("88880000");

        assertThatThrownBy(() -> service.crear(req))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("Empresa");
    }

    @Test
    @DisplayName("crear tipo inválido rechaza antes de guardar")
    void crear_tipo_invalido() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(9L);
        when(empresaRepo.findById(9L)).thenReturn(Optional.of(empresa));

        MetodoCobroCreateRequest req = new MetodoCobroCreateRequest();
        req.setTipo("paypal");
        req.setDato("x");

        assertThatThrownBy(() -> service.crear(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tipo no válido");
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("marcar predeterminado de otra empresa lo bloquea el scope")
    void marcar_predeterminado_tenant_ajeno() {
        MetodoCobro m = metodoActivo(2L, MetodoCobro.TIPO_SINPE, "88880000", "8888-0000");
        when(repo.findActivoById(2L)).thenReturn(Optional.of(m));
        doThrow(new TenantAccessDeniedException("Sin acceso a esta empresa"))
                .when(companyScope).assertCanAccess(9L);

        assertThatThrownBy(() -> service.marcarPredeterminado(2L))
                .isInstanceOf(TenantAccessDeniedException.class);
        verify(repo, never()).clearPredeterminado(any());
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("marcar predeterminado inexistente falla")
    void marcar_predeterminado_inexistente() {
        when(repo.findActivoById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.marcarPredeterminado(99L))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("Método de cobro");
        verify(companyScope, never()).assertCanAccess(any());
    }

    private void stubCrearOk() {
        when(sanitizer.cleanWithLimit(any(), anyInt())).thenAnswer(inv -> inv.getArgument(0));
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(9L);
        when(empresaRepo.findById(9L)).thenReturn(Optional.of(empresa));
        when(repo.save(any())).thenAnswer(inv -> {
            MetodoCobro m = inv.getArgument(0);
            m.setId(3L);
            return m;
        });
    }

    private MetodoCobro metodoActivo(Long id, String tipo, String destino, String mascara) {
        MetodoCobro m = new MetodoCobro();
        m.setId(id);
        m.setEmpresa(empresa);
        m.setTipo(tipo);
        m.setDestino(destino);
        m.setMascara(mascara);
        m.setActivo(true);
        return m;
    }
}
