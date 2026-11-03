package com.hotclick.dto.json;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;
import java.math.BigDecimal;

/**
 * QA7 POS: Jackson acepta por defecto 1.5 en un Integer y lo trunca a 1 (ACCEPT_FLOAT_AS_INT).
 * Para cantidades eso cobra/descuenta una unidad distinta a la pedida: se rechaza todo valor
 * no entero (→ HttpMessageNotReadableException → 400). 2.0 se acepta como 2.
 */
public class CantidadEnteraDeserializer extends StdDeserializer<Integer> {

    public CantidadEnteraDeserializer() {
        super(Integer.class);
    }

    @Override
    public Integer deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonToken t = p.currentToken();
        if (t == JsonToken.VALUE_NUMBER_INT) {
            return p.getIntValue();
        }
        if (t == JsonToken.VALUE_NUMBER_FLOAT) {
            BigDecimal v = p.getDecimalValue();
            if (v.stripTrailingZeros().scale() <= 0) {
                try {
                    return v.intValueExact();
                } catch (ArithmeticException e) {
                    // fuera de rango: cae al rechazo
                }
            }
            return (Integer) ctxt.handleWeirdNumberValue(Integer.class, v, "la cantidad debe ser un número entero");
        }
        if (t == JsonToken.VALUE_STRING) {
            String s = p.getText().trim();
            try {
                return Integer.valueOf(s);
            } catch (NumberFormatException e) {
                return (Integer) ctxt.handleWeirdStringValue(Integer.class, s, "la cantidad debe ser un número entero");
            }
        }
        return (Integer) ctxt.handleUnexpectedToken(Integer.class, p);
    }

    @Override
    public Integer getNullValue(DeserializationContext ctxt) {
        return null;
    }
}
