package com.hotclick.service.facturacion;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ClaveNumericaService;
import com.hotclick.service.ConsecutivoFiscalService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class FacturacionEmisionSupport {

    private static final Logger log = LoggerFactory.getLogger(FacturacionEmisionSupport.class);

    private final ComprobanteFiscalRepository comprobanteRepo;
    private final ConsecutivoFiscalService consecutivoService;
    private final ClaveNumericaService claveService;
    private final CompanyScope companyScope;

    public FacturacionEmisionSupport(ComprobanteFiscalRepository comprobanteRepo,
                                     ConsecutivoFiscalService consecutivoService,
                                     ClaveNumericaService claveService,
                                     CompanyScope companyScope) {
        this.comprobanteRepo    = comprobanteRepo;
        this.consecutivoService = consecutivoService;
        this.claveService       = claveService;
        this.companyScope       = companyScope;
    }

    @Transactional
    public ComprobanteFiscal emitir(Pedido pedido, String tipo) {
        Empresa empresa = pedido.getEmpresa();
        if (empresa == null) {
            throw new IllegalStateException("El pedido no tiene empresa asociada");
        }
        companyScope.assertCanAccess(empresa.getId());

        Long pedidoId = pedido.getId();
        if (comprobanteRepo.existsByPedidoIdAndEstadoIn(pedidoId,
                List.of(ComprobanteFiscal.ESTADO_PENDIENTE,
                        ComprobanteFiscal.ESTADO_ENVIADO,
                        ComprobanteFiscal.ESTADO_ACEPTADO))) {
            throw new IllegalStateException("Ya existe un comprobante activo para el pedido " + pedidoId);
        }

        String tipoFinal = (tipo != null && !tipo.isBlank()) ? tipo : ComprobanteFiscal.TIPO_TIQUETE;

        long numSeq = consecutivoService.siguienteNumero(empresa.getId(), tipoFinal);
        String numConsecutivo = ClaveNumericaService.buildNumeroConsecutivo(tipoFinal, numSeq);

        String cedulaEmisor = empresa.getCedulaJuridica() != null
            ? empresa.getCedulaJuridica() : "000000000000";
        String clave = claveService.generar(cedulaEmisor, numConsecutivo, LocalDateTime.now(Constants.ZONA_CR));

        ComprobanteFiscal cf = new ComprobanteFiscal();
        cf.setEmpresa(empresa);
        cf.setPedido(pedido);
        cf.setTipo(tipoFinal);
        cf.setClaveNumerica(clave);
        cf.setNumeroConsecutivo(numConsecutivo);
        cf.setEstado(ComprobanteFiscal.ESTADO_PENDIENTE);
        cf.setAmbiente(empresa.getAmbienteHacienda());
        cf.setTotalFactura(pedido.getTotalPedido());
        cf = comprobanteRepo.save(cf);

        log.info("[facturacion] Comprobante creado id={} clave={} tipo={} empresa={} ambiente={}",
            cf.getId(), clave, tipoFinal, empresa.getId(), empresa.getAmbienteHacienda());

        return cf;
    }
}
