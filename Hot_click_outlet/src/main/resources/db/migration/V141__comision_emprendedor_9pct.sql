-- V141: Sube comisión del plan EMPRENDEDOR de 8% (mín. ₡400) a 9% (mín. ₡700), all-in.

UPDATE hot_click_plan_tb
SET comision_porcentaje = 9.00,
    descripcion = 'Plan gratuito. Comisión 9% por venta (mín. ₡700), cubre pasarela y plataforma.'
WHERE nombre = 'EMPRENDEDOR';
