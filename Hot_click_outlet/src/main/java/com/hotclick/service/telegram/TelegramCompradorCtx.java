package com.hotclick.service.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Carrito y datos del comprador mientras arma el pedido (JSON en la sesión del chat). Nunca guarda tarjetas.
 * Se borra al crear el pedido: la dirección y el pin no quedan en el contexto del chat.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class TelegramCompradorCtx {

    private static final ObjectMapper JSON = new ObjectMapper();

    public static final String RETIRO = "RETIRO";
    public static final String DOMICILIO = "DOMICILIO";

    public Map<Long, Integer> carrito = new LinkedHashMap<>();
    public String entrega;
    public String nombre;
    public String telefono;
    public String correo;
    public String provincia;
    public String canton;
    public String fuente;
    public String direccionTexto;
    public String url;
    public Double lat;
    public Double lng;

    public static TelegramCompradorCtx desde(String json) {
        if (json == null || json.isBlank()) return new TelegramCompradorCtx();
        try {
            return JSON.readValue(json, TelegramCompradorCtx.class);
        } catch (Exception e) {
            return new TelegramCompradorCtx();
        }
    }

    public String aJson() {
        try {
            return JSON.writeValueAsString(this);
        } catch (Exception e) {
            return "{}";
        }
    }

    public int unidades() {
        return carrito.values().stream().mapToInt(Integer::intValue).sum();
    }

    public boolean esDomicilio() {
        return DOMICILIO.equals(entrega);
    }

    /** Borra la ubicación (dato personal) conservando el resto. */
    public void olvidarUbicacion() {
        fuente = null;
        direccionTexto = null;
        url = null;
        lat = null;
        lng = null;
    }
}
