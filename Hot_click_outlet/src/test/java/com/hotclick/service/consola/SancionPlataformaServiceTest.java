package com.hotclick.service.consola;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SancionPlataformaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SancionPlataformaServiceTest {

    @Mock private SancionPlataformaRepository sancionRepo;
    @Mock private EmpresaRepository empresaRepo;
    @Mock private AuditoriaAdminRegistroService auditoria;
    @Mock private CompanyScope companyScope;
    @InjectMocks private SancionPlataformaService service;

    @Test
    void sinMotivoNoTocaLaBase() {
        assertThatThrownBy(() -> service.crear(7L, "LEVE", " ", "1"))
            .isInstanceOf(IllegalArgumentException.class);
        verify(sancionRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
