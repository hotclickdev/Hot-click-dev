package com.hotclick.service.facturacion;

import com.hotclick.service.FacturacionService;
import com.hotclick.service.payment.CompraPagadaEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** El tiquete se emite solo después del commit del pago, nunca ante un rollback. */
class TiqueteCompraListenerTest {

    @Configuration
    @EnableTransactionManagement(proxyTargetClass = true)
    static class Cfg {
        @Bean DataSource ds() {
            return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build();
        }
        @Bean PlatformTransactionManager txm(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean FacturacionService facturacionService() { return mock(FacturacionService.class); }
        @Bean TiqueteCompraListener listener(FacturacionService f) { return new TiqueteCompraListener(f); }
    }

    private AnnotationConfigApplicationContext ctx;
    private FacturacionService facturacion;
    private TransactionTemplate tx;

    @BeforeEach
    void setUp() {
        ctx = new AnnotationConfigApplicationContext(Cfg.class);
        facturacion = ctx.getBean(FacturacionService.class);
        tx = new TransactionTemplate(ctx.getBean(PlatformTransactionManager.class));
    }

    @AfterEach
    void tearDown() { ctx.close(); }

    @Test
    void commit_emiteTiquete() {
        tx.executeWithoutResult(s -> ctx.publishEvent(new CompraPagadaEvent(55L)));
        verify(facturacion, times(1)).emitirTiqueteDeCompra(55L);
    }

    @Test
    void rollback_noEmite() {
        tx.executeWithoutResult(s -> { ctx.publishEvent(new CompraPagadaEvent(55L)); s.setRollbackOnly(); });
        verify(facturacion, never()).emitirTiqueteDeCompra(any());
    }
}
