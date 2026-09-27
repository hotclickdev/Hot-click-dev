package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DescuentoSinpePublicoServiceTest {

    private final EmpresaRepository repo = mock(EmpresaRepository.class);
    private final DescuentoSinpePublicoService service = new DescuentoSinpePublicoService(repo);

    private static Empresa empresa(long id, String pct) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setPctDescuentoSinpe(pct == null ? null : new BigDecimal(pct));
        return e;
    }

    @Test
    void soloDevuelveNegociosConDescuento() {
        when(repo.findAllById(List.of(7L, 8L, 9L)))
            .thenReturn(List.of(empresa(7, "5.00"), empresa(8, "0"), empresa(9, null)));

        Map<Long, BigDecimal> resultado = service.porEmpresa(List.of(7L, 8L, 9L));

        assertThat(resultado).containsOnlyKeys(7L);
        assertThat(resultado.get(7L)).isEqualByComparingTo("5");
    }

    @Test
    void sinIdsNoConsulta() {
        List<Long> soloNulos = new ArrayList<>(Arrays.asList((Long) null));

        assertThat(service.porEmpresa(soloNulos)).isEmpty();
        verify(repo, never()).findAllById(anyList());
    }

    @Test
    void acotaLaCantidadDeNegociosYQuitaRepetidos() {
        List<Long> muchos = new ArrayList<>(LongStream.rangeClosed(1, 50).boxed().toList());
        muchos.add(0, 1L);
        List<Long> esperados = LongStream.rangeClosed(1, DescuentoSinpePublicoService.MAX_EMPRESAS_POR_CONSULTA)
            .boxed().toList();
        when(repo.findAllById(esperados)).thenReturn(List.of());

        service.porEmpresa(muchos);

        verify(repo).findAllById(esperados);
    }
}
