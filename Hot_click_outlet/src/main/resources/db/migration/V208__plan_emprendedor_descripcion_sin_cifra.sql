-- Aditiva e idempotente (27-oct-2026): la descripción del plan EMPRENDEDOR ya no lleva el cupo fijo "70".
-- El cupo real vive en hotclick.trial-emprendedor.cupo (TRIAL_EMPRENDEDOR_CUPO) y se publica en /api/public/emprende/cupos.
-- Solo reescribe el texto de una fila existente; sin DDL, sin borrados. Segunda ejecución: no encuentra nada que cambiar.
UPDATE hot_click_plan_tb
   SET descripcion = REPLACE(descripcion, 'primeros 70 negocios', 'primeros negocios')
 WHERE nombre = 'EMPRENDEDOR'
   AND descripcion LIKE '%primeros 70 negocios%';
