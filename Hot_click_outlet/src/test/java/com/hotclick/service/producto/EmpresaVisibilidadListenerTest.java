package com.hotclick.service.producto;

import com.hotclick.model.Empresa;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** BUG-S1-12: suspender o apagar un negocio vacía el catálogo público cacheado. */
class EmpresaVisibilidadListenerTest {

    private final ProductoCacheEvictor evictor = mock(ProductoCacheEvictor.class);
    private final EmpresaVisibilidadListener listener = new EmpresaVisibilidadListener();

    @SuppressWarnings("unchecked")
    EmpresaVisibilidadListenerTest() {
        ObjectProvider<ProductoCacheEvictor> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(evictor);
        ReflectionTestUtils.setField(listener, "evictor", provider);
    }

    private Empresa cargada(String estado, boolean visible) {
        Empresa e = new Empresa();
        e.setEstadoEmpresa(estado);
        e.setVisibilidadPublica(visible);
        listener.alCargar(e);
        return e;
    }

    @Test
    void suspenderVaciaElCatalogo() {
        Empresa e = cargada("ACTIVO", true);
        e.setEstadoEmpresa("SUSPENDIDO");
        e.setVisibilidadPublica(false);
        listener.alActualizar(e);
        verify(evictor, times(1)).evictProductosPublicos();
        // un segundo flush sin cambios no vuelve a vaciar
        listener.alActualizar(e);
        verify(evictor, times(1)).evictProductosPublicos();
    }

    @Test
    void apagarVisibilidadOReactivarTambien() {
        Empresa e = cargada("ACTIVO", true);
        e.setVisibilidadPublica(false);
        listener.alActualizar(e);
        Empresa s = cargada("SUSPENDIDO", false);
        s.setEstadoEmpresa("ACTIVO");
        s.setVisibilidadPublica(true);
        listener.alActualizar(s);
        verify(evictor, times(2)).evictProductosPublicos();
    }

    @Test
    void cambiosQueNoTocanLoPublicoNoVacian() {
        Empresa e = cargada("ACTIVO", true);
        e.setNombreComercial("Otro nombre");
        listener.alActualizar(e);
        Empresa p = cargada("PENDIENTE_APROBACION", false);
        p.setEstadoEmpresa("RECHAZADO");
        listener.alActualizar(p);
        verify(evictor, never()).evictProductosPublicos();
    }
}
