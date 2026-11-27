package com.hotclick.service.fiscal.fec;

import com.hotclick.model.Empresa;
import com.hotclick.model.FecCompra;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FecCompraRepository;
import com.hotclick.service.ClaveNumericaService;
import com.hotclick.service.ConsecutivoFiscalService;
import com.hotclick.service.XmlFecBuilder;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.service.fiscal.ConfiguracionFiscalService.Fec;
import com.hotclick.service.fiscal.SituacionFiscal;
import com.hotclick.service.fiscal.fec.FecModelos.CompraEmpresa;
import com.hotclick.service.fiscal.fec.FecModelos.Item;
import com.hotclick.service.fiscal.fec.FecModelos.Reporte;
import com.hotclick.service.fiscal.fec.FecModelos.Resultado;
import com.hotclick.service.hacienda.CedulaEmisor;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Genera la Factura Electrónica de Compra (tipo 08) de cada negocio para una quincena. No hace nada, y lo dice,
 * mientras el régimen de HotClick no sea TRADICIONAL o {@code fec_habilitada} esté apagada. Idempotente: una FEC
 * por negocio y quincena (índice único en V245).
 */
@Service
public class FecService {

    static final String MENSAJE_APAGADA = "FEC desactivada: régimen SIMPLIFICADO";
    private static final Logger log = LoggerFactory.getLogger(FecService.class);

    private final ConfiguracionFiscalService config;
    private final FecAgregacionService agregacion;
    private final EmpresaRepository empresaRepo;
    private final FecCompraRepository fecRepo;
    private final ConsecutivoFiscalService consecutivos;
    private final ClaveNumericaService claves;
    private final XmlFecBuilder builder;
    private final String cabysGenerico;

    public FecService(ConfiguracionFiscalService config, FecAgregacionService agregacion,
                      EmpresaRepository empresaRepo, FecCompraRepository fecRepo,
                      ConsecutivoFiscalService consecutivos, ClaveNumericaService claves, XmlFecBuilder builder,
                      @Value("${hotclick.fec.cabys-generico:}") String cabysGenerico) {
        this.config = config;
        this.agregacion = agregacion;
        this.empresaRepo = empresaRepo;
        this.fecRepo = fecRepo;
        this.consecutivos = consecutivos;
        this.claves = claves;
        this.builder = builder;
        this.cabysGenerico = cabysGenerico;
    }

    public Reporte generar(FecPeriodo periodo) {
        if (!config.fecActiva()) {
            log.info("[fec] {} (periodo {} a {}): no se genera nada", MENSAJE_APAGADA, periodo.desde(), periodo.hasta());
            return new Reporte(false, MENSAJE_APAGADA, periodo, List.of());
        }
        Fec fec = config.fec();
        Empresa emisor = empresaRepo.findById(Constants.EMPRESA_PLATAFORMA_ID)
            .orElseThrow(() -> new IllegalStateException("No existe la empresa plataforma para emitir la FEC"));
        List<Item> items = new ArrayList<>();
        for (CompraEmpresa compra : agregacion.compras(periodo)) {
            items.add(generarUna(periodo, emisor, compra, fec));
        }
        long nuevas = items.stream().filter(i -> i.resultado() == Resultado.GENERADA).count();
        log.info("[fec] periodo {} a {}: {} generada(s), {} negocio(s) revisados",
            periodo.desde(), periodo.hasta(), nuevas, items.size());
        return new Reporte(true, nuevas + " FEC generada(s)", periodo, items);
    }

    private Item generarUna(FecPeriodo periodo, Empresa emisor, CompraEmpresa compra, Fec fec) {
        Long empresaId = compra.vendedor().empresaId();
        SituacionFiscal situacion = SituacionFiscal.desde(compra.vendedor().situacion()).orElse(null);
        if (situacion == SituacionFiscal.NO_INSCRITO && !fec.permitirNoInscrito()) {
            return omitida(empresaId, "NO_INSCRITO no permitido (interruptor apagado)", compra);
        }
        if (situacion != SituacionFiscal.REGIMEN_SIMPLIFICADO && situacion != SituacionFiscal.NO_INSCRITO) {
            return omitida(empresaId, "El negocio factura por su cuenta (no requiere FEC)", compra);
        }
        if (fecRepo.existsByEmpresa_IdAndPeriodoDesdeAndPeriodoHasta(empresaId, periodo.desde(), periodo.hasta())) {
            return new Item(empresaId, Resultado.YA_EXISTIA, "Ya generada para la quincena", compra.monto());
        }
        try {
            LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
            // Valida todo antes de reservar el consecutivo, para no dejar huecos por datos incompletos.
            XmlFecBuilder.validarEmisor(emisor);
            XmlFecBuilder.cedulaVendedor(compra.vendedor());
            String cedulaEmisor = CedulaEmisor.normalizar(emisor.getCedulaJuridica());
            long seq = consecutivos.siguienteNumero(emisor.getId(), FecCompra.TIPO);
            String consecutivo = ClaveNumericaService.buildNumeroConsecutivo(FecCompra.TIPO, seq);
            String clave = claves.generar(cedulaEmisor, consecutivo, ahora);
            String xml = builder.construir(emisor, compra.vendedor(), clave, consecutivo, ahora,
                compra.lineas(), cabysGenerico);

            FecCompra f = new FecCompra();
            f.setEmpresa(empresaRepo.getReferenceById(empresaId));
            f.setPeriodoDesde(periodo.desde());
            f.setPeriodoHasta(periodo.hasta());
            f.setMontoCompra(compra.monto());
            f.setClaveNumerica(clave);
            f.setNumeroConsecutivo(consecutivo);
            f.setXml(xml);
            f.setAmbiente(emisor.getAmbienteHacienda());
            fecRepo.save(f);
            return new Item(empresaId, Resultado.GENERADA, null, compra.monto());
        } catch (DataIntegrityViolationException e) {
            return new Item(empresaId, Resultado.YA_EXISTIA, "Ya generada para la quincena", compra.monto());
        } catch (RuntimeException e) {
            log.warn("[fec] negocio={} omitido: {}", empresaId, e.getMessage());
            return omitida(empresaId, e.getMessage(), compra);
        }
    }

    private static Item omitida(Long empresaId, String motivo, CompraEmpresa compra) {
        return new Item(empresaId, Resultado.OMITIDA, motivo, compra.monto());
    }
}
