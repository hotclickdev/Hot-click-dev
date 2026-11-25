package com.hotclick.agente.campana;

import com.hotclick.agente.campana.ConsentimientoRepositorio.Destino;
import com.hotclick.agente.interno.HasherInterno;
import com.hotclick.service.TotpSecretEncryptionService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Resuelve un segmento a los destinos CON consentimiento activo del negocio. El segmento solo restringe: sin
 * consentimiento no hay destino, sea cual sea el segmento.
 */
@Service
public class SegmentoService {

    private static final Logger log = LoggerFactory.getLogger(SegmentoService.class);
    static final int LOTE_HASHES = 500;

    private final SegmentoRepositorio segmentos;
    private final ConsentimientoRepositorio consentimientos;
    private final HasherInterno hasher;
    private final TotpSecretEncryptionService cifrado;

    public SegmentoService(SegmentoRepositorio segmentos, ConsentimientoRepositorio consentimientos,
                           HasherInterno hasher, TotpSecretEncryptionService cifrado) {
        this.segmentos = segmentos;
        this.consentimientos = consentimientos;
        this.hasher = hasher;
        this.cifrado = cifrado;
    }

    /** Destinos con consentimiento ACTIVO que cumplen el segmento, sin repetidos. */
    public List<Destino> resolver(Long empresaId, Segmento seg) {
        if (seg.tipo() == Segmento.Tipo.TODOS) {
            return consentimientos.activos(empresaId, SegmentoRepositorio.TOPE);
        }
        LocalDateTime desde = LocalDateTime.now(Constants.ZONA_CR).minusDays(seg.dias());
        List<String> contactos = switch (seg.tipo()) {
            case COMPRADORES_RECIENTES -> segmentos.compradores(empresaId, desde);
            case INTERES_CATEGORIA -> segmentos.interesadosEnCategoria(empresaId, seg.categoriaId(), desde);
            case LEADS -> descifrar(segmentos.leadsCifrados(empresaId, desde));
            case TODOS -> List.of();
        };
        Set<String> hashes = new LinkedHashSet<>();
        for (String c : contactos) hashes.add(hasher.contacto(empresaId, "WHATSAPP", c));
        List<Destino> out = new ArrayList<>();
        for (List<String> lote : partir(new ArrayList<>(hashes))) {
            out.addAll(consentimientos.activosEntre(empresaId, lote));
        }
        return out;
    }

    private List<String> descifrar(List<String> cifrados) {
        List<String> claros = new ArrayList<>();
        for (String c : cifrados) {
            try {
                claros.add(cifrado.decryptContactoLead(c));
            } catch (RuntimeException e) {
                log.warn("[campana-segmento] contacto de lead no descifrable: {}", e.getClass().getSimpleName());
            }
        }
        return claros;
    }

    static <T> List<List<T>> partir(List<T> lista) {
        List<List<T>> out = new ArrayList<>();
        for (int i = 0; i < lista.size(); i += LOTE_HASHES) {
            out.add(lista.subList(i, Math.min(lista.size(), i + LOTE_HASHES)));
        }
        return out;
    }
}
