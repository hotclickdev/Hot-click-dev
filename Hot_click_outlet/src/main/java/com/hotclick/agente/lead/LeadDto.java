package com.hotclick.agente.lead;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lead para el CRM. El listado trae solo el contacto enmascarado; el detalle agrega el contacto descifrado
 * ({@code contacto}) para que el dueño del lead pueda responder. Nunca incluye hash ni el blob cifrado.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LeadDto(Long id, TipoLead tipo, String canal, String contactoEnmascarado, String contacto,
                      String nombre, String tipoNegocio, String interes, EstadoLead estado, UUID sesionId,
                      LocalDateTime creadoEn) {

    /** Sin contacto, nombre ni interés del lead (AG-14 H-07). */
    @Override
    public String toString() {
        return "LeadDto[id=" + id + ", tipo=" + tipo + ", estado=" + estado + "]";
    }

    static LeadDto de(LeadRepository.Fila f, String contactoClaro) {
        String mascara = f.ultimos4() == null ? null : "****" + f.ultimos4();
        return new LeadDto(f.id(), f.tipo(), f.canal(), mascara, contactoClaro, f.nombre(), f.tipoNegocio(),
            f.interes(), f.estado(), f.sesionId(), f.creadoEn());
    }
}
