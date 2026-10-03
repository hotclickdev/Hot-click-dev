package com.hotclick.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.BeanDescription;
import com.fasterxml.jackson.databind.SerializationConfig;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.BeanPropertyWriter;
import com.fasterxml.jackson.databind.ser.BeanSerializerModifier;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Omite del JSON los campos internos de Producto y Bodega salvo para el dueño o ADMIN.
 * De Bodega el público solo recibe {@link #BODEGA_PUBLICOS} (más la dirección si hay retiro).
 * Varios endpoints públicos devuelven la entidad completa; filtrar aquí cubre a todos.
 */
public class CamposInternosSerializerModifier extends BeanSerializerModifier {

    static final Set<String> PRODUCTO_INTERNOS = Set.of(
        "precioCompra", "margenGanancia", "roiPorcentaje", "costoAlmacenaje", "linkAmazon",
        "proveedorPrincipal", "clasificacionAbc", "demandaDiariaAvg", "tiempoReordenDias",
        "stockMinimo", "stockMaximo", "fechaUltimaCompra", "fechaUltimaVenta", "numeroLocal", "sku");

    /**
     * Lo único que la API pública necesita de una bodega: agrupar el carrito por origen (id),
     * mostrar de dónde sale el paquete (nombre, provincia, cantón) y ofrecer retiro en tienda.
     * Lista blanca: cualquier campo nuevo de Bodega queda oculto al público hasta que se agregue acá.
     */
    static final Set<String> BODEGA_PUBLICOS = Set.of("id", "nombreBodega", "provincia", "canton", "permiteRetiroCliente");

    /** El checkout la muestra para retiro en tienda; sin retiro no hay motivo para publicarla. */
    static final Set<String> BODEGA_SOLO_CON_RETIRO = Set.of("direccionExacta");

    /**
     * Contacto directo del negocio cuando un endpoint devuelve la entidad Empresa (p. ej. cotización pública).
     * Solo lo ven el dueño o ADMIN, o cualquiera si el plan es PYME o NEGOCIO_PLUS (ContactoPublicoPolicy).
     */
    static final Set<String> EMPRESA_CONTACTO = Set.of("correoEmpresa", "telefonoEmpresa", "numeroWhatsapp", "instagram");

    private final transient LongNullablePredicate puedeVerInternos;
    private final transient LongNullablePredicate permiteContactoPublico;

    public CamposInternosSerializerModifier(LongNullablePredicate puedeVerInternos) {
        this(puedeVerInternos, empresaId -> false);
    }

    public CamposInternosSerializerModifier(LongNullablePredicate puedeVerInternos,
                                            LongNullablePredicate permiteContactoPublico) {
        this.puedeVerInternos = puedeVerInternos;
        this.permiteContactoPublico = permiteContactoPublico;
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
            return filtrarBodega(props);
        }
        if (Empresa.class.isAssignableFrom(tipo)) {
            return envolver(props, EMPRESA_CONTACTO, bean -> {
                Long id = ((Empresa) bean).getId();
                return puedeVerInternos.test(id) || permiteContactoPublico.test(id);
            });
        }
        return props;
    }

    /** Teléfono, correo, encargado, coordenadas, horarios, capacidad y auditoría: solo dueño o ADMIN. */
    private List<BeanPropertyWriter> filtrarBodega(List<BeanPropertyWriter> props) {
        Predicate<Object> esDelDueno = bean -> puedeVerInternos.test(((Bodega) bean).getEmpresaId());
        Predicate<Object> conRetiro = bean -> Boolean.TRUE.equals(((Bodega) bean).getPermiteRetiroCliente())
            || esDelDueno.test(bean);
        List<BeanPropertyWriter> resultado = new ArrayList<>(props.size());
        for (BeanPropertyWriter p : props) {
            String nombre = p.getName();
            if (BODEGA_PUBLICOS.contains(nombre)) {
                resultado.add(p);
            } else {
                resultado.add(new CampoCondicional(p, BODEGA_SOLO_CON_RETIRO.contains(nombre) ? conRetiro : esDelDueno));
            }
        }
        return resultado;
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
