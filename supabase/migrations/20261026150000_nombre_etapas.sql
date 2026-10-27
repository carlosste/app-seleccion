-- Nombre que la empresa le da a cada etapa (por ejemplo, "Prueba técnica de voz").
-- Si es null, la app muestra el nombre por defecto del tipo.
alter table public.vacante_etapas add column nombre text;
