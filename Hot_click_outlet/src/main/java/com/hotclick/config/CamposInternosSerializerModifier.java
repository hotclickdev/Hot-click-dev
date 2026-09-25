package com.hotclick.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.BeanDescription;
import com.fasterxml.jackson.databind.SerializationConfig;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.BeanPropertyWriter;
import com.fasterxml.jackson.databind.ser.BeanSerializerModifier;
import com.hotclick.model.Bodega;
import com.hotclick.model.Producto;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Omite del JSON los campos internos de Producto y Bodega salvo para el dueño o ADMIN.
 * Varios endpoints públicos devuelven la entidad completa; filtrar aquí cubre a todos.
 */
public class CamposInternosSerializerModifier extends BeanSerializerModifier {

    static final Set<String> PRODUCTO_INTERNOS = Set.of(
        "precioCompra", "margenGanancia", "roiPorcentaje", "costoAlmacenaje", "linkAmazon",
        "proveedorPrincipal", "clasificacionAbc", "demandaDiariaAvg", "tiempoReordenDias",
        "stockMinimo", "stockMaximo", "fechaUltimaCompra", "fechaUltimaVenta", "numeroLocal");

    static final Set<String> BODEGA_INTERNOS = Set.of("correoContacto", "encargadoNombre", "capacidadMaxima");

    /** El checkout los necesita para retiro en tienda; sin retiro no hay motivo para publicarlos. */
    static final Set<String> BODEGA_SOLO_CON_RETIRO = Set.of("direccionExacta", "telefono", "latitud", "longitud");

    private final transient LongNullablePredicate puedeVerInternos;

    public CamposInternosSerializerModifier(LongNullablePredicate puedeVerInternos) {
        this.puedeVerInternos = puedeVerInternos;
    }

    @Override
    public List<BeanPropertyWriter> changeProperties(SerializationConfig config, BeanDescription desc,
                                                     List<BeanPropertyWriter> props) {
        Class<?> tipo = desc.getBeanClass();
        if (Producto.class.isAssignableFrom(tipo)) {
            return envolver(props, PRODUCTO_INTERNOS,
                bean -> puedeVerInternos.test(((Producto) bean).getEmpresaId()));
        }
        if (Bodega.class.isAssignableFrom(tipo)) {
            Predicate<Object> esDelDueno = bean -> puedeVerInternos.test(((Bodega) bean).getEmpresaId());
            List<BeanPropertyWriter> filtradas = envolver(props, BODEGA_INTERNOS, esDelDueno);
            return envolver(filtradas, BODEGA_SOLO_CON_RETIRO,
                bean -> Boolean.TRUE.equals(((Bodega) bean).getPermiteRetiroCliente()) || esDelDueno.test(bean));
        }
        return props;
    }

    /** Lista mutable: Jackson quita propiedades después (p. ej. por @JsonIgnoreProperties en la referencia). */
    private static List<BeanPropertyWriter> envolver(List<BeanPropertyWriter> props, Set<String> nombres,
                                                     Predicate<Object> visible) {
        List<BeanPropertyWriter> resultado = new ArrayList<>(props.size());
        for (BeanPropertyWriter p : props) {
            resultado.add(nombres.contains(p.getName()) ? new CampoCondicional(p, visible) : p);
        }
        return resultado;
    }

    /** Admite empresaId null: un recurso sin empresa solo lo ve ADMIN. */
    @FunctionalInterface
    public interface LongNullablePredicate {
        boolean test(Long empresaId);
    }

    static final class CampoCondicional extends BeanPropertyWriter {

        private final transient Predicate<Object> visible;

        CampoCondicional(BeanPropertyWriter base, Predicate<Object> visible) {
            super(base);
            this.visible = visible;
        }

        @Override
        public void serializeAsField(Object bean, JsonGenerator gen, SerializerProvider prov) throws Exception {
            if (visible.test(bean)) {
                super.serializeAsField(bean, gen, prov);
            }
        }

        @Override
        public void serializeAsElement(Object bean, JsonGenerator gen, SerializerProvider prov) throws Exception {
            if (visible.test(bean)) {
                super.serializeAsElement(bean, gen, prov);
            } else {
                serializeAsPlaceholder(bean, gen, prov);
            }
        }
    }
}
