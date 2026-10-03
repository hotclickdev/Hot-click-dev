package com.hotclick.scheduler;

import com.hotclick.service.wallet.WalletPayoutAdminService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class PayoutAutoApprovalSchedulerTest {

    @Test
    void noApruebaRetirosYConservaElUmbral() {
        assertEquals(50_000L, Constants.UMBRAL_AUTO_APROBACION_PAYOUT);
        assertFalse(Arrays.stream(PayoutAutoApprovalScheduler.class.getDeclaredFields())
                .anyMatch(campo -> campo.getType().equals(WalletPayoutAdminService.class)));
        assertDoesNotThrow(() -> new PayoutAutoApprovalScheduler().autoAprobarPayoutsPequenos());
    }
}
