package com.hotclick.agente.seguimiento;

import java.util.Collection;
import java.util.Set;

/**
 * Lista de contactos que pidieron baja (STOP) y no deben recibir mensajes proactivos del bot (recordatorios).
 *
 * <p>Todavía no existe la lista real: mientras ningún bean implemente esta interfaz se usa {@link #NINGUNA}, que
 * no da de baja a nadie. Cuando exista (historia de bajas/STOP) basta publicar un bean que la implemente: el
 * seguimiento lo usa solo. La consulta es POR LOTE para que la implementación real haga una sola consulta.
 */
public interface ListaBajasAgente {

    /** Un contacto de un negocio en un canal (wa_id, PSID o IGSID). */
    record Contacto(Long empresaId, String canal, String contactoExterno) {
        @Override
        public String toString() {
            return "Contacto[empresa=" + empresaId + ", canal=" + canal + "]";
        }
    }

    /** @return el subconjunto de {@code contactos} que está de baja. */
    Set<Contacto> dadosDeBaja(Collection<Contacto> contactos);

    /** Implementación por defecto: nadie está de baja. */
    ListaBajasAgente NINGUNA = contactos -> Set.of();
}
