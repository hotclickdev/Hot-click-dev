package com.hotclick.service.facturacion;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.FirmaDigitalService;
import com.hotclick.service.XmlFacturaBuilder;
import com.hotclick.service.hacienda.XmlFacturaSchemaValidator;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Arma, firma y valida contra el XSD oficial el XML de un comprobante, en una transacción
 * de solo lectura corta (para cargar pedidos e ítems lazy). El envío HTTP va después, fuera de ella.
 */
@Component
public class ComprobanteXmlPreparer {

    /** Lo necesario para el POST, ya desacoplado de la sesión JPA. */
    public record Preparado(Long comprobanteId, String clave, String xmlFirmado, Empresa empresa) {}

    private final ComprobanteFiscalRepository comprobanteRepo;
    private final PedidoRepository pedidoRepository;
    private final XmlFacturaBuilder xmlBuilder;
    private final FirmaDigitalService firmaService;
    private final XmlFacturaSchemaValidator schemaValidator;

    public ComprobanteXmlPreparer(ComprobanteFiscalRepository comprobanteRepo,
                                  PedidoRepository pedidoRepository,
                                  XmlFacturaBuilder xmlBuilder,
                                  FirmaDigitalService firmaService,
                                  XmlFacturaSchemaValidator schemaValidator) {
        this.comprobanteRepo = comprobanteRepo;
        this.pedidoRepository = pedidoRepository;
        this.xmlBuilder = xmlBuilder;
        this.firmaService = firmaService;
        this.schemaValidator = schemaValidator;
    }

    @Transactional(readOnly = true)
    public Preparado preparar(Long comprobanteId) {
        ComprobanteFiscal cf = comprobanteRepo.findById(comprobanteId)
            .orElseThrow(() -> new IllegalStateException("El comprobante " + comprobanteId + " no existe"));
        Empresa empresa = cf.getEmpresa();
        String xml = xmlDe(cf, empresa);
        String firmado = firmaService.firmar(xml, empresa);
        schemaValidator.validar(firmado, ComprobanteFiscal.TIPO_FACTURA.equals(cf.getTipo()));
        // Forzar la carga de los campos de Empresa que usa el cliente HTTP antes de salir de la sesión.
        empresa.getAmbienteHacienda();
        return new Preparado(cf.getId(), cf.getClaveNumerica(), firmado, empresa);
    }

    private String xmlDe(ComprobanteFiscal cf, Empresa empresa) {
        if (cf.getCompra() != null && cf.getCompra().getId() != null) {
            List<Pedido> paquetes = pedidoRepository.findByCompra_IdOrderByNumeroPaqueteAsc(cf.getCompra().getId());
            return xmlBuilder.construir(cf, empresa, paquetes);
        }
        if (cf.getPedido() == null) {
            throw new IllegalStateException("El comprobante no tiene compra ni pedido");
        }
        return xmlBuilder.construir(cf, empresa, cf.getPedido());
    }
}
