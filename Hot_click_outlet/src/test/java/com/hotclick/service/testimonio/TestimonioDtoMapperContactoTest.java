package com.hotclick.service.testimonio;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.Testimonio;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.contacto.ContactoPublicoService;
import com.hotclick.service.contacto.ContactoTextoPublico;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("[NEGOCIO] Reseñas públicas: contacto oculto en el comentario si el plan no tiene contacto directo")
class TestimonioDtoMapperContactoTest {

    @ParameterizedTest(name = "plan {0} → contacto visible={1}")
    @CsvSource({"EMPRENDEDOR, false", "GRATUITO, false", "PYME, true", "NEGOCIO_PLUS, true"})
    void comentarioSegunPlan(String plan, boolean conContacto) {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findNombrePlanEfectivo(42L)).thenReturn(Optional.of(plan));
        TestimonioDtoMapper mapper = new TestimonioDtoMapper(new ContactoTextoPublico(new ContactoPublicoService(repo)));

        Empresa empresa = new Empresa();
        empresa.setId(42L);
        Producto producto = new Producto();
        producto.setEmpresa(empresa);
        producto.setNombreProducto("Mesa Luna");
        Testimonio t = new Testimonio();
        t.setProducto(producto);
        t.setComentario("Excelente, pagué ₡17.500. Escríbanle a ventas@casaluna.cr o al 8888.8888");

        Map<String, Object> m = mapper.toPublicMap(t);

        assertThat(m.get("productoNombre")).isEqualTo("Mesa Luna");
        assertThat(m.get("comentario")).isEqualTo(conContacto
            ? "Excelente, pagué ₡17.500. Escríbanle a ventas@casaluna.cr o al 8888.8888"
            : "Excelente, pagué ₡17.500. Escríbanle a [contacto oculto] o al [contacto oculto]");
    }
}
