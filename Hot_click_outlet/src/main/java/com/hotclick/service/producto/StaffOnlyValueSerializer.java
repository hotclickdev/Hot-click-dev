package com.hotclick.service.producto;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;

/** Serializa el valor solo para admin / miembros de negocio; si no, null. */
public class StaffOnlyValueSerializer extends JsonSerializer<Object> {

    @Override
    public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (!SkuVisibility.puedeVer() || value == null) {
            gen.writeNull();
            return;
        }
        serializers.defaultSerializeValue(value, gen);
    }
}
