package com.hotclick.service.facturacion;

import com.hotclick.dto.ComprobanteEmitido;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.NoSuchElementException;

@Service
public class FacturaConsultaService {

    static final int PAGINA_MAX = 50;

    private final ComprobanteFiscalRepository comprobanteRepo;
    private final CompanyScope companyScope;

    public FacturaConsultaService(ComprobanteFiscalRepository comprobanteRepo, CompanyScope companyScope) {
        this.comprobanteRepo = comprobanteRepo;
        this.companyScope = companyScope;
    }

    @Transactional(readOnly = true)
    public Page<ComprobanteEmitido> listar(int page, int size, String estado,
                                            LocalDate fechaDesde, LocalDate fechaHasta) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) {
            empresaId = Constants.EMPRESA_PLATAFORMA_ID;
        }
        LocalDateTime desde = fechaDesde != null ? fechaDesde.atStartOfDay() : null;
        LocalDateTime hasta = fechaHasta != null ? fechaHasta.atTime(23, 59, 59) : null;
        return comprobanteRepo.findByEmpresaIdConFiltros(
            empresaId, estado, desde, hasta, pagina(page, size)
        ).map(ComprobanteEmitido::de);
    }

    @Transactional(readOnly = true)
    public ComprobanteEmitido detalle(Long id) {
        return ComprobanteEmitido.de(cargar(id));
    }

    private ComprobanteFiscal cargar(Long id) {
        ComprobanteFiscal comprobante = comprobanteRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Comprobante no encontrado: " + id));
        companyScope.assertCanAccess(comprobante.getEmpresa().getId());
        return comprobante;
    }

    private static PageRequest pagina(int page, int size) {
        int pagina = Math.max(page, 0);
        int tamano = Math.min(Math.max(size, 1), PAGINA_MAX);
        return PageRequest.of(pagina, tamano, Sort.by("fechaEmision").descending());
    }
}
